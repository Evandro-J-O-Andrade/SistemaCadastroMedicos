-- 20261124090003_cms_publish_rpcs.sql
-- RPCs transacionais para publicação e rollback de versões CMS
-- Validação RBAC no servidor. Lock por page_id. Índice único parcial.

-- Índice único parcial: no máximo uma versão publicada por página
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_published_per_page
  ON ui_page_versions (page_id)
  WHERE status = 'published';

-- Helper: resolve person_id and check CMS permission
CREATE OR REPLACE FUNCTION _cms_check_permission(p_page_id UUID, p_required_role TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_page RECORD;
  v_has_perm BOOLEAN := false;
BEGIN
  -- Resolve person from auth.uid()
  SELECT ail.person_id INTO v_person_id
  FROM auth_identity_links ail
  WHERE ail.auth_user_id = auth.uid();

  IF v_person_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get page
  SELECT id, tenant_id INTO v_page
  FROM ui_page_definitions
  WHERE id = p_page_id;

  IF v_page IS NULL THEN
    RETURN false;
  END IF;

  -- ROOT global: always allowed
  IF EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    WHERE ra.person_id = v_person_id
      AND r.nome = 'root'
      AND ra.ativo = true AND r.ativo = true
      AND ra.tenant_id IS NULL
  ) THEN
    RETURN true;
  END IF;

  -- Admin/gestor of the tenant with CMS permission
  IF v_page.tenant_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.person_id = v_person_id
        AND r.nome = ANY(p_required_role)
        AND ra.ativo = true AND r.ativo = true
        AND ra.tenant_id = v_page.tenant_id
    ) INTO v_has_perm;
  END IF;

  RETURN v_has_perm;
END;
$$;

-- Publish
CREATE OR REPLACE FUNCTION fn_publish_page_version(p_version_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version RECORD;
  v_page_id UUID;
  v_person_id UUID;
BEGIN
  -- Resolve person
  SELECT ail.person_id INTO v_person_id
  FROM auth_identity_links ail
  WHERE ail.auth_user_id = auth.uid();

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no person linked to auth user' USING ERRCODE = '42501';
  END IF;

  -- Get version and lock by page_id
  SELECT id, page_id, status INTO v_version
  FROM ui_page_versions
  WHERE id = p_version_id;

  IF v_version IS NULL THEN
    RAISE EXCEPTION 'version_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_page_id := v_version.page_id;

  -- Advisory lock by page_id (not version_id)
  PERFORM pg_advisory_xact_lock(hashtext(v_page_id::text));

  -- Re-fetch with lock
  SELECT id, page_id, status INTO v_version
  FROM ui_page_versions
  WHERE id = p_version_id
  FOR UPDATE;

  -- RBAC check
  IF NOT _cms_check_permission(v_page_id, ARRAY['root', 'admin', 'gestor']) THEN
    RAISE EXCEPTION 'forbidden: insufficient CMS permissions' USING ERRCODE = '42501';
  END IF;

  -- CMS permission check (must have cms.publish or be root/admin/gestor)
  -- Already covered by role check above

  IF v_version.status = 'published' THEN
    RETURN jsonb_build_object('status', 'already_published', 'version_id', p_version_id);
  END IF;

  IF v_version.status = 'archived' THEN
    RAISE EXCEPTION 'version_archived: cannot publish archived version' USING ERRCODE = 'P0001';
  END IF;

  -- Prevent editing published versions (they should be archived first)
  -- Already handled by status check

  -- Archive previous published version of same page
  UPDATE ui_page_versions
  SET status = 'archived'
  WHERE page_id = v_page_id
    AND status = 'published'
    AND id <> p_version_id;

  -- Publish new version
  UPDATE ui_page_versions
  SET status = 'published', published_at = now()
  WHERE id = p_version_id;

  -- Audit
  INSERT INTO audit_events (pessoa_id, auth_user_id, recurso, acao, entidade, entidade_id, dados_novos, resultado)
  VALUES (v_person_id, auth.uid(), 'cms', 'publish', 'ui_page_versions', p_version_id,
    jsonb_build_object('page_id', v_page_id), 'sucesso');

  RETURN jsonb_build_object('status', 'published', 'version_id', p_version_id, 'page_id', v_page_id);
END;
$$;

-- Rollback
CREATE OR REPLACE FUNCTION fn_rollback_page_version(p_version_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version RECORD;
  v_person_id UUID;
BEGIN
  SELECT ail.person_id INTO v_person_id
  FROM auth_identity_links ail
  WHERE ail.auth_user_id = auth.uid();

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT id, page_id, status INTO v_version
  FROM ui_page_versions
  WHERE id = p_version_id
  FOR UPDATE;

  IF v_version IS NULL THEN
    RAISE EXCEPTION 'version_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT _cms_check_permission(v_version.page_id, ARRAY['root', 'admin', 'gestor']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF v_version.status <> 'published' THEN
    RAISE EXCEPTION 'version_not_published' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_version.page_id::text));

  UPDATE ui_page_versions
  SET status = 'archived'
  WHERE id = p_version_id;

  INSERT INTO audit_events (pessoa_id, auth_user_id, recurso, acao, entidade, entidade_id, dados_novos, resultado)
  VALUES (v_person_id, auth.uid(), 'cms', 'rollback', 'ui_page_versions', p_version_id,
    jsonb_build_object('page_id', v_version.page_id), 'sucesso');

  RETURN jsonb_build_object('status', 'rolled_back', 'version_id', p_version_id, 'page_id', v_version.page_id);
END;
$$;

-- Prevent modifications to blocks of published versions
CREATE OR REPLACE FUNCTION fn_prevent_published_block_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  -- Check OLD version (for UPDATE/DELETE)
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT status INTO v_old_status
    FROM ui_page_versions
    WHERE id = OLD.page_version_id;

    IF v_old_status = 'published' THEN
      RAISE EXCEPTION 'published_version_immutable: cannot modify or move blocks of a published version' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Check NEW version (for INSERT/UPDATE) - prevent moving to published
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT status INTO v_new_status
    FROM ui_page_versions
    WHERE id = NEW.page_version_id;

    IF v_new_status = 'published' THEN
      RAISE EXCEPTION 'published_version_immutable: cannot add or move blocks into a published version' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_published_block_change ON ui_page_blocks;
CREATE TRIGGER trg_prevent_published_block_change
  BEFORE INSERT OR UPDATE OR DELETE ON ui_page_blocks
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_published_block_change();

-- Prevent direct status changes on published versions (only via RPC)
CREATE OR REPLACE FUNCTION fn_prevent_direct_version_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Only allow transition to archived (handled by rollback RPC with audit)
    -- But block direct client updates by checking session role
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
      -- Check if this is being called from within an RPC (service_role context)
      IF current_setting('is_superuser', true) <> 'on' THEN
        RAISE EXCEPTION 'direct_status_change_forbidden: use RPC to change published version status' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_direct_version_status_change ON ui_page_versions;
CREATE TRIGGER trg_prevent_direct_version_status_change
  BEFORE UPDATE ON ui_page_versions
  FOR EACH ROW
  WHEN (OLD.status = 'published')
  EXECUTE FUNCTION fn_prevent_direct_version_status_change();

REVOKE EXECUTE ON FUNCTION fn_publish_page_version(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_rollback_page_version(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_publish_page_version(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_rollback_page_version(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION _cms_check_permission(UUID, TEXT[]) TO authenticated, service_role;
