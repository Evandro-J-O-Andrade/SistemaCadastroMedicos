-- 20261124090003_cms_publish_rpcs.sql
-- RPCs transacionais para publicação e rollback de versões CMS

CREATE OR REPLACE FUNCTION fn_publish_page_version(p_version_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version RECORD;
  v_page RECORD;
  v_role TEXT;
BEGIN
  v_role := COALESCE(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    current_setting('request.jwt.role', true)
  );

  IF v_role IS DISTINCT FROM 'service_role' AND v_role IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Lock para evitar concorrência
  PERFORM pg_advisory_xact_lock(hashtext(p_version_id::text));

  SELECT id, page_id, status INTO v_version
  FROM ui_page_versions
  WHERE id = p_version_id
  FOR UPDATE;

  IF v_version IS NULL THEN
    RAISE EXCEPTION 'version_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_version.status = 'published' THEN
    RETURN jsonb_build_object('status', 'already_published', 'version_id', p_version_id);
  END IF;

  IF v_version.status = 'archived' THEN
    RAISE EXCEPTION 'version_archived: cannot publish archived version' USING ERRCODE = 'P0001';
  END IF;

  -- Arquivar publicação anterior da mesma página
  UPDATE ui_page_versions
  SET status = 'archived'
  WHERE page_id = v_version.page_id
    AND status = 'published'
    AND id <> p_version_id;

  -- Publicar nova versão
  UPDATE ui_page_versions
  SET status = 'published', published_at = now()
  WHERE id = p_version_id;

  RETURN jsonb_build_object('status', 'published', 'version_id', p_version_id, 'page_id', v_version.page_id);
END;
$$;

CREATE OR REPLACE FUNCTION fn_rollback_page_version(p_version_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_version RECORD;
BEGIN
  SELECT id, page_id, status INTO v_version
  FROM ui_page_versions
  WHERE id = p_version_id
  FOR UPDATE;

  IF v_version IS NULL THEN
    RAISE EXCEPTION 'version_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_version.status <> 'published' THEN
    RAISE EXCEPTION 'version_not_published' USING ERRCODE = 'P0001';
  END IF;

  -- Arquivar versão publicada
  UPDATE ui_page_versions
  SET status = 'archived'
  WHERE id = p_version_id;

  RETURN jsonb_build_object('status', 'rolled_back', 'version_id', p_version_id, 'page_id', v_version.page_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_publish_page_version(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_rollback_page_version(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_publish_page_version(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION fn_rollback_page_version(UUID) TO authenticated, service_role;
EOF