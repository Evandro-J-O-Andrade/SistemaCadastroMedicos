-- 20261124090000_gate3_01_root_provisioning_reconciled.sql
-- Gate 3.1 (reconciliado): alinha a função de provisionamento ROOT com a versão remota.
-- Signature: fn_provision_verified_initial_root(UUID, TEXT, TEXT) — 3 parâmetros.
-- Substitui a versão anterior (20261124080000) que tinha 4 parâmetros e era incompatível.
-- NÃO reaplica migrations existentes. NÃO altera senhas. NÃO insere em auth.users.

-- ============================================
-- 1. Remover versão anterior se existir (idempotente)
-- ============================================
DROP FUNCTION IF EXISTS fn_provision_verified_initial_root(UUID, TEXT, TEXT, TEXT);

-- ============================================
-- 2. Criar versão reconciliada (3 parâmetros, compatível com remoto)
-- ============================================
CREATE OR REPLACE FUNCTION fn_provision_verified_initial_root(
  p_auth_user_id UUID,
  p_nome TEXT,
  p_email TEXT DEFAULT NULL
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
  v_existe_link BOOLEAN;
  v_existe_root BOOLEAN;
  v_email_final TEXT;
BEGIN
  -- Advisory lock para serializar provisionamento concorrente
  PERFORM pg_advisory_xact_lock(987654321);

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

  -- Verificar e-mail real: não permitir e-mail arbitrário diferente do Auth verificado
  IF p_email IS NOT NULL AND btrim(p_email) <> '' AND lower(btrim(p_email)) <> lower(v_auth_user.email) THEN
    RAISE EXCEPTION 'email_mismatch: provided email does not match verified auth email'
      USING ERRCODE = '28000';
  END IF;

  -- Exclusividade do primeiro ROOT global: bloquear segundo ROOT para pessoa diferente
  IF EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    WHERE r.nome = 'root' AND ra.ativo = true AND ra.tenant_id IS NULL
      AND ra.person_id NOT IN (
        SELECT ail.person_id FROM auth_identity_links ail WHERE ail.auth_user_id = p_auth_user_id
      )
  ) THEN
    RAISE EXCEPTION 'root_already_exists: a global ROOT already exists for a different person'
      USING ERRCODE = '23505';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM auth_identity_links WHERE auth_user_id = p_auth_user_id
  ) INTO v_existe_link;

  IF v_existe_link THEN
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
    v_email_final := COALESCE(NULLIF(btrim(COALESCE(p_email, '')), ''), v_auth_user.email);

    INSERT INTO people (nome, email, ativo)
    VALUES (btrim(p_nome), v_email_final, true)
    RETURNING id INTO v_person_id;

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

  -- Criar assignment ROOT global (tenant_id NULL) — idempotente
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

REVOKE EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION fn_provision_verified_initial_root(UUID, TEXT, TEXT) IS
  'Provisiona o primeiro ROOT global de maneira transacional. Exige identidade Auth verificada e contexto service_role. Signature reconciliada com remoto (3 params). Gate 3.1.';