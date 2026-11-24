-- 20261118070006_gate2_07_people_rls_and_registration.sql
-- Gate 2.1.5 (local): correções de autorização para cadastro People-First em tenant,
-- RPC transacional segura (pessoa + vínculos), e endurecimento de onboarding por evidência.
-- Incremental; NÃO modifica histórico publicado (Gate 1/70000-70005 preservados). Não executar em remoto.

-- ============================================
-- 1) Autorização tenant-scoped para operações em people (sem coluna tenant_id)
--    Permite admin autorizado em qualquer tenant ativo do qual é membro; mantém root/global.
-- ============================================

CREATE OR REPLACE FUNCTION fn_has_people_permission_in_any_member_tenant(p_recurso TEXT, p_acao TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tenant_memberships tm
    WHERE tm.person_id = fn_resolve_person_id()
      AND tm.ativo = true
      AND fn_person_has_permission(fn_resolve_person_id(), p_recurso, p_acao, tm.tenant_id, NULL)
  );
$$;

REVOKE EXECUTE ON FUNCTION fn_has_people_permission_in_any_member_tenant(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_has_people_permission_in_any_member_tenant(TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS people_insert ON people;
CREATE POLICY people_insert ON people
  FOR INSERT TO authenticated
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'create', NULL, NULL)
    OR fn_has_people_permission_in_any_member_tenant('people', 'create')
  );

DROP POLICY IF EXISTS people_update ON people;
CREATE POLICY people_update ON people
  FOR UPDATE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR people.id = fn_resolve_person_id()
    OR fn_persons_share_active_tenant(fn_resolve_person_id(), people.id)
  )
  WITH CHECK (
    fn_is_root(fn_resolve_person_id())
    OR (people.id = fn_resolve_person_id())
    OR fn_person_has_permission(fn_resolve_person_id(), 'people', 'update', NULL, NULL)
    OR fn_has_people_permission_in_any_member_tenant('people', 'update')
  );

DROP POLICY IF EXISTS people_delete ON people;
CREATE POLICY people_delete ON people
  FOR DELETE TO authenticated
  USING (
    fn_is_root(fn_resolve_person_id())
    OR (
      (
        fn_person_has_permission(fn_resolve_person_id(), 'people', 'delete', NULL, NULL)
        OR fn_has_people_permission_in_any_member_tenant('people', 'delete')
      )
      AND fn_persons_share_active_tenant(fn_resolve_person_id(), people.id)
    )
  );

-- ============================================
-- 2) Cadastro transacional seguro (People-First, tenant-scoped)
--    Cria pessoa + tenant_membership (+ unit_membership opcional) atomicamente.
--    Não cria usuário Supabase Auth nem auth_identity_link. Sem auto-ROOT por e-mail.
-- ============================================

CREATE OR REPLACE FUNCTION fn_admin_register_person(
  p_tenant_id UUID,
  p_nome TEXT,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_documento TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL,
  p_ativo BOOLEAN DEFAULT true,
  p_unit_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_person_id UUID;
  v_tenant_active BOOLEAN;
  v_unit_tenant UUID;
  v_can_create BOOLEAN := false;
BEGIN
  v_caller := fn_resolve_person_id();
  IF auth.uid() IS NULL OR v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_tenant_id IS NULL OR btrim(COALESCE(p_nome, '')) = '' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  SELECT ativo INTO v_tenant_active FROM tenants WHERE id = p_tenant_id;
  IF v_tenant_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'tenant_not_found_or_inactive';
  END IF;

  -- Autorização: root (global ou escopado ao tenant) OU permissão explícita no tenant
  IF fn_is_root(v_caller) THEN
    -- root global ok; root tenant-scoped deve estar autorizado no tenant alvo
    IF EXISTS (
      SELECT 1 FROM role_assignments ra JOIN roles r ON r.id=ra.role_id
      WHERE ra.person_id=v_caller AND ra.ativo AND r.ativo AND r.nome='root' AND ra.tenant_id IS NULL
    ) OR fn_person_has_permission(v_caller,'people','create',p_tenant_id,NULL)
      OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id=v_caller AND tm.tenant_id=p_tenant_id AND tm.ativo) THEN
      v_can_create := true;
    END IF;
  END IF;
  IF NOT v_can_create AND fn_person_has_permission(v_caller,'people','create',p_tenant_id,NULL) THEN
    v_can_create := true;
  END IF;
  -- Exigir vínculo do chamador ao tenant (exceto root global)
  IF NOT v_can_create OR (
     NOT EXISTS (SELECT 1 FROM role_assignments ra JOIN roles r ON r.id=ra.role_id WHERE ra.person_id=v_caller AND ra.ativo AND r.ativo AND r.nome='root' AND ra.tenant_id IS NULL)
     AND NOT EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id=v_caller AND tm.tenant_id=p_tenant_id AND tm.ativo)
  ) THEN
    RAISE EXCEPTION 'forbidden_tenant_scope';
  END IF;

  IF p_unit_id IS NOT NULL THEN
    SELECT tenant_id INTO v_unit_tenant FROM units WHERE id = p_unit_id AND ativo = true;
    IF v_unit_tenant IS NULL OR v_unit_tenant <> p_tenant_id THEN
      RAISE EXCEPTION 'invalid_unit_for_tenant';
    END IF;
  END IF;

  INSERT INTO people (nome, email, telefone, documento, data_nascimento, ativo)
  VALUES (btrim(p_nome), NULLIF(btrim(COALESCE(p_email,'')),''), NULLIF(btrim(COALESCE(p_telefone,'')),''), NULLIF(btrim(COALESCE(p_documento,'')),''), p_data_nascimento, COALESCE(p_ativo,true))
  RETURNING id INTO v_person_id;

  INSERT INTO tenant_memberships (person_id, tenant_id, ativo)
  VALUES (v_person_id, p_tenant_id, true);

  IF p_unit_id IS NOT NULL THEN
    INSERT INTO unit_memberships (person_id, unit_id, tenant_id, ativo)
    VALUES (v_person_id, p_unit_id, p_tenant_id, true);
  END IF;

  PERFORM fn_audit_log('people', 'admin_register', 'people', v_person_id, NULL,
    jsonb_build_object('tenant_id', p_tenant_id, 'unit_id', p_unit_id, 'has_email', (p_email IS NOT NULL AND btrim(p_email)<>'')),
    'sucesso', p_tenant_id, p_unit_id);

  RETURN jsonb_build_object(
    'person_id', v_person_id,
    'tenant_id', p_tenant_id,
    'unit_id', p_unit_id,
    'status', 'created'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_admin_register_person(UUID, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_admin_register_person(UUID, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, UUID) TO authenticated;

-- ============================================
-- 3) Confirmação de troca de senha por evento Auth confiável (servidor)
--    Aceita auth_user_id do evento (service_role) e resolve pessoa; mantém compatibilidade.
-- ============================================

CREATE OR REPLACE FUNCTION fn_confirm_password_changed_by_auth_user(p_auth_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_role TEXT := COALESCE(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    (CASE WHEN COALESCE(current_setting('request.jwt.claims', true), '') <> '' THEN (current_setting('request.jwt.claims', true)::jsonb ->> 'role') ELSE NULL END),
    current_setting('request.jwt.role', true)
  );
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden: password change must be confirmed by trusted server-side evidence';
  END IF;
  IF p_auth_user_id IS NULL THEN
    RETURN false;
  END IF;
  SELECT person_id INTO v_person_id FROM auth_identity_links WHERE auth_user_id = p_auth_user_id;
  IF v_person_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO user_onboarding (person_id, must_change_password)
  VALUES (v_person_id, true)
  ON CONFLICT (person_id) DO NOTHING;

  UPDATE user_onboarding
  SET must_change_password = false,
      password_changed_at = now(),
      updated_at = now()
  WHERE person_id = v_person_id;

  PERFORM fn_audit_log('auth', 'password_changed', 'user_onboarding', v_person_id, NULL,
    jsonb_build_object('must_change_password', false, 'confirmed_by', 'service_role', 'auth_user_id', p_auth_user_id),
    'sucesso', NULL, NULL);

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_confirm_password_changed_by_auth_user(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_confirm_password_changed_by_auth_user(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION fn_confirm_password_changed_by_auth_user(UUID) TO service_role;

COMMENT ON FUNCTION fn_admin_register_person(UUID, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, UUID) IS
  'Cadastro People-First transacional (pessoa+membership tenant/unit). Sem Auth user/link automático. Gate 2.1.5 local.';
COMMENT ON FUNCTION fn_confirm_password_changed_by_auth_user(UUID) IS
  'Confirma troca de senha apenas em contexto service_role a partir de auth_user_id (evento Auth confiável). Gate 2.1.5 local.';
