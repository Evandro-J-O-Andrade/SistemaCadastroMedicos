-- 005_security_functions.sql
-- Gate 1 - AppSec: Funções de contexto e verificação de permissão
-- Lê claims do JWT (request.jwt.claims) definidos via set_config após login válido.
-- Não confia em tenant_id/person_id enviados livremente pelo frontend.
-- Não executar no Supabase sem autorização.

-- ============================================
-- fn_current_person_id(): retorna o ID da pessoa autenticada na sessão
-- Lê do claim request.jwt.claims.person_id (definido por set_config após login).
-- Retorna NULL quando não há pessoa autenticada (fail-closed).
-- ============================================
CREATE OR REPLACE FUNCTION fn_current_person_id()
RETURNS UUID LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims.person_id', true), '')::UUID;
$$;

-- ============================================
-- fn_current_tenant_id(): retorna o ID do tenant ativo na sessão
-- Lê do claim request.jwt.claims.tenant_id (definido por set_config após login).
-- Retorna NULL quando não há tenant ativo (fail-closed).
-- ============================================
CREATE OR REPLACE FUNCTION fn_current_tenant_id()
RETURNS UUID LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims.tenant_id', true), '')::UUID;
$$;

-- ============================================
-- fn_current_unit_id(): retorna o ID da unidade ativa na sessão
-- Lê do claim request.jwt.claims.unit_id.
-- ============================================
CREATE OR REPLACE FUNCTION fn_current_unit_id()
RETURNS UUID LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims.unit_id', true), '')::UUID;
$$;

-- ============================================
-- fn_person_has_permission(): verifica se pessoa tem permissão em um contexto
-- Fail-closed: retorna false por padrão, true apenas quando há vínculo ativo.
-- ROOT tem bypass explícito e auditado.
-- p_tenant_id / p_unit_id quando NULL usam o contexto da sessão (fn_current_*).
-- ============================================
CREATE OR REPLACE FUNCTION fn_person_has_permission(
  p_person_id UUID,
  p_recurso TEXT,
  p_acao TEXT,
  p_tenant_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE PARALLEL SAFE AS $$
DECLARE
  v_count INTEGER;
  v_tenant_id UUID := COALESCE(p_tenant_id, fn_current_tenant_id());
  v_unit_id UUID := COALESCE(p_unit_id, fn_current_unit_id());
BEGIN
  -- 0. Guard anti-vazamento: só permite consultar próprias permissões
  -- RLS policies sempre passam fn_current_person_id(); chamadas diretas com
  -- person_id de terceiros são bloqueadas.
  IF p_person_id IS NOT NULL AND p_person_id <> fn_current_person_id() THEN
    RETURN false;
  END IF;

  -- 1. ROOT: bypass explícito e auditado
  -- ROOT com tenant NULL (global) ou com tenant correspondente ao contexto
  SELECT COUNT(*) INTO v_count
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
  WHERE ra.person_id = p_person_id
    AND ra.ativo = true
    AND r.nome = 'root'
    AND r.ativo = true
    AND (v_tenant_id IS NULL OR ra.tenant_id = v_tenant_id);

  IF v_count > 0 THEN
    RETURN true;
  END IF;

  -- 2. Verificação via role_permissions com escopo
  SELECT COUNT(*) INTO v_count
  FROM role_assignments ra
  JOIN role_permissions rp ON rp.role_id = ra.role_id AND rp.ativo = true
  JOIN permissions p ON p.id = rp.permission_id AND p.ativo = true
  JOIN roles r ON r.id = ra.role_id AND r.ativo = true
  WHERE ra.person_id = p_person_id
    AND ra.ativo = true
    AND p.recurso = p_recurso
    AND p.acao = p_acao
    AND (v_tenant_id IS NULL OR ra.tenant_id = v_tenant_id)
    AND (v_unit_id IS NULL OR ra.unit_id = v_unit_id);

  RETURN v_count > 0;
END;
$$;

-- ============================================
-- fn_set_session_contexto(): define claims de sessão após login validado
-- Chamado pelo frontend via RPC somente após autenticação bem-sucedida.
-- Define person_id, tenant_id e unit_id no contexto da sessão para RLS.
-- Não aceita tenant_id/person_id arbitrários: valida contra auth_identity_links
-- e tenant_memberships antes de definir os claims.
-- ============================================
CREATE OR REPLACE FUNCTION fn_set_session_contexto(
  p_auth_user_id UUID,
  p_tenant_id UUID,
  p_unit_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_person_id UUID;
  v_membro_tenant BOOLEAN;
  v_membro_unidade BOOLEAN;
BEGIN
  -- 1. Resolver auth_user_id -> person_id via auth_identity_links (vínculo confiável)
  SELECT person_id INTO v_person_id
  FROM auth_identity_links
  WHERE auth_user_id = p_auth_user_id;

  IF v_person_id IS NULL THEN
    RETURN false; -- pessoa não vinculada, fail-closed
  END IF;

  -- 2. Validar que a pessoa é membro ativo do tenant informado
  -- ROOT com tenant_id NULL tem acesso global (pula validação de membership)
  IF p_tenant_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = v_person_id
        AND tm.tenant_id = p_tenant_id
        AND tm.ativo = true
    ) INTO v_membro_tenant;

    IF NOT v_membro_tenant THEN
      RETURN false; -- pessoa não é membro deste tenant, fail-closed
    END IF;
  END IF;

  -- 3. Validar unidade (se informada)
  IF p_unit_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM unit_memberships um
      WHERE um.person_id = v_person_id
        AND um.unit_id = p_unit_id
        AND um.tenant_id = p_tenant_id
        AND um.ativo = true
    ) INTO v_membro_unidade;

    IF NOT v_membro_unidade THEN
      RETURN false; -- pessoa não é membro desta unidade neste tenant, fail-closed
    END IF;
  END IF;

  -- 4. Definir claims de sessão (local à transação/sessão)
  PERFORM set_config('request.jwt.claims.person_id', v_person_id::TEXT, true);
  PERFORM set_config('request.jwt.claims.tenant_id', p_tenant_id::TEXT, true);
  IF p_unit_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims.unit_id', p_unit_id::TEXT, true);
  ELSE
    PERFORM set_config('request.jwt.claims.unit_id', '', true);
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION fn_current_person_id() IS 'Retorna o ID da pessoa autenticada na sessão (claims do JWT).';
COMMENT ON FUNCTION fn_current_tenant_id() IS 'Retorna o ID do tenant ativo na sessão (claims do JWT).';
COMMENT ON FUNCTION fn_current_unit_id() IS 'Retorna o ID da unidade ativa na sessão (claims do JWT).';
COMMENT ON FUNCTION fn_person_has_permission(UUID, TEXT, TEXT, UUID, UUID) IS 'Verifica se pessoa tem permissão atômica em um contexto (fail-closed).';
COMMENT ON FUNCTION fn_set_session_contexto(UUID, UUID, UUID) IS 'Define claims de sessão após login validado, validando vínculos de membership.';

-- Restringir EXECUTE: apenas papel authenticated pode invocar as funções de segurança.
-- PUBLIC e anon NÃO recebem EXECUTE (evita chamadas não autenticadas).
REVOKE EXECUTE ON FUNCTION fn_person_has_permission(UUID, TEXT, TEXT, UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_set_session_contexto(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_person_has_permission(UUID, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_set_session_contexto(UUID, UUID, UUID) TO authenticated;

-- search_path seguro para funções SECURITY DEFINER (previne injeção via search_path)
ALTER FUNCTION fn_person_has_permission(UUID, TEXT, TEXT, UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION fn_set_session_contexto(UUID, UUID, UUID) SET search_path = public, pg_temp;
