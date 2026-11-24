-- 20261118070002_gate2_03_auth_bootstrap.sql
-- Gate 2.1.2 (local): RPC de bootstrap de identidade/autorização (contrato AuthProvider).
-- Sem argumentos manipuláveis; identidade derivada de auth.uid() (stateless por requisição).
-- Fail-closed. Contrato de permissions inclui efetivas para ROOT (UI + backend coerentes).
-- NÃO modifica histórico publicado. NÃO executar em remoto sem autorização.

CREATE OR REPLACE FUNCTION fn_auth_bootstrap_v2()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid UUID;
  v_person_id UUID;
  v_full_name TEXT;
  v_email TEXT;
  v_roles TEXT[];
  v_permissions TEXT[];
  v_memberships JSONB;
  v_onboarding JSONB;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Identidade canônica: auth.uid() -> auth_identity_links -> people (ativa)
  SELECT p.id, p.nome, p.email
  INTO v_person_id, v_full_name, v_email
  FROM auth_identity_links ail
  JOIN people p ON p.id = ail.person_id
  WHERE ail.auth_user_id = v_auth_uid
    AND p.ativo = true
  LIMIT 1;

  IF v_person_id IS NULL THEN
    RAISE EXCEPTION 'identity_not_linked' USING ERRCODE = '28000';
  END IF;

  -- Papéis ativos
  SELECT COALESCE(array_agg(DISTINCT r.nome ORDER BY r.nome), ARRAY[]::TEXT[])
  INTO v_roles
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
  WHERE ra.person_id = v_person_id
    AND ra.ativo = true
    AND r.ativo = true;

  IF array_length(v_roles, 1) IS NULL OR array_length(v_roles, 1) = 0 THEN
    RAISE EXCEPTION 'no_active_role' USING ERRCODE = '28000';
  END IF;

  -- Permissões efetivas:
  -- * ROOT GLOBAL (assignment tenant_id NULL): todas permissões ativas (bypass global backend/UI).
  -- * ROOT escopado a tenant: todas permissões ativas no contrato/bootstrap para coerência de papel,
  --   porém SEM bypass global em RLS/fn_is_root; acesso efetivo limitado por memberships/escopo/tenant.
  -- * Demais papéis: permissões consolidadas via RBAC ativo.
  IF EXISTS (
    SELECT 1
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    WHERE ra.person_id = v_person_id
      AND ra.ativo = true
      AND r.ativo = true
      AND r.nome = 'root'
  ) THEN
    SELECT COALESCE(array_agg(DISTINCT p.nome ORDER BY p.nome), ARRAY[]::TEXT[])
    INTO v_permissions
    FROM permissions p
    WHERE p.ativo = true;
  ELSE
    SELECT COALESCE(array_agg(DISTINCT p.nome ORDER BY p.nome), ARRAY[]::TEXT[])
    INTO v_permissions
    FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    JOIN role_permissions rp ON rp.role_id = r.id AND rp.ativo = true
    JOIN permissions p ON p.id = rp.permission_id AND p.ativo = true
    WHERE ra.person_id = v_person_id
      AND ra.ativo = true
      AND r.ativo = true;
  END IF;

  -- Memberships (ativos). ROOT global pode não ter membership explícita; retorna lista vazia.
  SELECT COALESCE(jsonb_agg(m ORDER BY m->>'tenant_nome'), '[]'::jsonb)
  INTO v_memberships
  FROM (
    SELECT jsonb_build_object(
      'tenant_id', t.id,
      'tenant_nome', t.nome,
      'unit_ids', COALESCE((
        SELECT jsonb_agg(um.unit_id)
        FROM unit_memberships um
        WHERE um.person_id = v_person_id
          AND um.tenant_id = t.id
          AND um.ativo = true
      ), '[]'::jsonb)
    ) AS m
    FROM tenant_memberships tm
    JOIN tenants t ON t.id = tm.tenant_id
    WHERE tm.person_id = v_person_id
      AND tm.ativo = true
      AND t.ativo = true
  ) sub;

  -- Estado de onboarding (server-side, stateless)
  BEGIN
    v_onboarding := fn_onboarding_status(v_person_id);
  EXCEPTION WHEN undefined_function THEN
    v_onboarding := jsonb_build_object(
      'must_change_password', true,
      'terms_pending', true,
      'responsibility_pending', true,
      'welcome_pending', true
    );
  END;

  IF v_onboarding IS NULL OR jsonb_typeof(v_onboarding) <> 'object' OR (v_onboarding ? 'error') THEN
    v_onboarding := jsonb_build_object(
      'must_change_password', true,
      'terms_pending', true,
      'responsibility_pending', true,
      'welcome_pending', true
    );
  END IF;

  RETURN jsonb_build_object(
    'person_id', v_person_id,
    'full_name', v_full_name,
    'email', COALESCE(v_email, ''),
    'roles', to_jsonb(v_roles),
    'permissions', to_jsonb(COALESCE(v_permissions, ARRAY[]::TEXT[])),
    'memberships', COALESCE(v_memberships, '[]'::jsonb),
    'must_change_password', COALESCE((v_onboarding->>'must_change_password')::boolean, true),
    'terms_pending', COALESCE((v_onboarding->>'terms_pending')::boolean, true),
    'responsibility_pending', COALESCE((v_onboarding->>'responsibility_pending')::boolean, true),
    'welcome_pending', COALESCE((v_onboarding->>'welcome_pending')::boolean, true)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_auth_bootstrap_v2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_auth_bootstrap_v2() TO authenticated;

COMMENT ON FUNCTION fn_auth_bootstrap_v2() IS
  'Bootstrap de identidade/autorização (Gate 2.1.2): stateless via auth.uid(), fail-closed, sem args manipuláveis; contrato compatível com AuthProvider.';
