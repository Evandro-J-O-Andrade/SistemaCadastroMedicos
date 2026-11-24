-- 20261124080000_gate3_01_root_provisioning.sql
-- Gate 3.1 (local): provisionamento transacional do primeiro ROOT global.
-- Exige identidade Auth verificada (email_confirmed_at IS NOT NULL) e execução por service_role.
-- NÃO modifica histórico publicado (Gate 1/Gate 2 preservados). NÃO executar em remoto sem autorização.
-- NÃO insere em auth.users diretamente; recebe auth_user_id como parâmetro.

-- ============================================
-- 1. Função de provisionamento ROOT (service_role only)
-- ============================================

CREATE OR REPLACE FUNCTION fn_provision_verified_initial_root(
  p_auth_user_id UUID,
  p_nome TEXT,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_auth_user RECORD;
  v_person_id UUID;
  v_root_role_id UUID;
  v_existe_person BOOLEAN;
  v_existe_link BOOLEAN;
  v_existe_root BOOLEAN;
BEGIN
  -- Exigir contexto de serviço confiável (service_role)
  v_role := COALESCE(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    (CASE WHEN COALESCE(current_setting('request.jwt.claims', true), '') <> ''
          THEN (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
          ELSE NULL END),
    current_setting('request.jwt.role', true)
  );

  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden: root provisioning requires service_role context'
      USING ERRCODE = '42501';
  END IF;

  IF p_auth_user_id IS NULL OR btrim(COALESCE(p_nome, '')) = '' THEN
    RAISE EXCEPTION 'invalid_input: auth_user_id and nome are required';
  END IF;

  -- Verificar se o usuário Auth existe e está confirmado
  SELECT id, email, email_confirmed_at, confirmed_at
  INTO v_auth_user
  FROM auth.users
  WHERE id = p_auth_user_id;

  IF v_auth_user IS NULL THEN
    RAISE EXCEPTION 'auth_user_not_found: no auth.users record with id %', p_auth_user_id
      USING ERRCODE = '28000';
  END IF;

  IF v_auth_user.email_confirmed_at IS NULL AND v_auth_user.confirmed_at IS NULL THEN
    RAISE EXCEPTION 'auth_user_not_confirmed: email must be verified before root provisioning'
      USING ERRCODE = '28000';
  END IF;

  -- Verificar se já existe person vinculada a este auth_user
  SELECT EXISTS (
    SELECT 1 FROM auth_identity_links WHERE auth_user_id = p_auth_user_id
  ) INTO v_existe_link;

  IF v_existe_link THEN
    -- Se já existe link, verificar se já tem ROOT global
    SELECT ail.person_id INTO v_person_id
    FROM auth_identity_links ail
    WHERE ail.auth_user_id = p_auth_user_id
    LIMIT 1;

    SELECT EXISTS (
      SELECT 1 FROM role_assignments ra
      JOIN roles r ON r.id = ra.role_id
      WHERE ra.person_id = v_person_id
        AND ra.ativo = true
        AND r.ativo = true
        AND r.nome = 'root'
        AND ra.tenant_id IS NULL
    ) INTO v_existe_root;

    IF v_existe_root THEN
      RETURN jsonb_build_object(
        'status', 'already_provisioned',
        'person_id', v_person_id,
        'auth_user_id', p_auth_user_id,
        'message', 'ROOT global already exists for this auth user'
      );
    END IF;
  ELSE
    -- Criar pessoa
    INSERT INTO people (nome, email, ativo)
    VALUES (
      btrim(p_nome),
      COALESCE(NULLIF(btrim(COALESCE(p_email, '')), ''), v_auth_user.email),
      true
    )
    RETURNING id INTO v_person_id;

    -- Criar vínculo auth_identity_links
    INSERT INTO auth_identity_links (person_id, auth_user_id)
    VALUES (v_person_id, p_auth_user_id);
  END IF;

  -- Obter role_id do 'root'
  SELECT id INTO v_root_role_id
  FROM roles
  WHERE nome = 'root' AND ativo = true
  LIMIT 1;

  IF v_root_role_id IS NULL THEN
    RAISE EXCEPTION 'root_role_not_found: no active role named root exists'
      USING ERRCODE = 'P0001';
  END IF;

  -- Criar assignment ROOT global (tenant_id NULL)
  INSERT INTO role_assignments (person_id, role_id, tenant_id, unit_id, ativo)
  VALUES (v_person_id, v_root_role_id, NULL, NULL, true)
  ON CONFLICT DO NOTHING;

  -- Garantir estado de onboarding
  INSERT INTO user_onboarding (person_id, must_change_password)
  VALUES (v_person_id, true)
  ON CONFLICT (person_id) DO NOTHING;

  -- Auditoria
  PERFORM fn_audit_log(
    'auth', 'root_provisioned', 'people',
    v_person_id, NULL,
    jsonb_build_object(
      'auth_user_id', p_auth_user_id,
      'confirmed', true,
      'provisioned_by', 'service_role'
    ),
    'sucesso', NULL, NULL
  );

  RETURN jsonb_build_object(
    'status', 'provisioned',
    'person_id', v_person_id,
    'auth_user_id', p_auth_user_id,
    'message', 'ROOT global provisioned successfully'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT, TEXT) IS
  'Provisiona o primeiro ROOT global de maneira transacional. Exige identidade Auth verificada e contexto service_role. Gate 3.1.';
