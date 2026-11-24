-- 20261118070004_gate2_05_grants_and_coherence.sql
-- Gate 2.1.4 (local): privilégios mínimos para authenticated/anon (compatíveis com RLS) e coerência ROOT scoped.
-- NÃO modifica histórico publicado. NÃO executar em remoto sem autorização.
--
-- CORREÇÃO DE SEGURANÇA (Gate 2.4):
--   * Revoga TRUNCATE de todas as tabelas CORE para PUBLIC, anon e authenticated.
--     TRUNCATE não é protegido por RLS no PostgreSQL e deve estar restrito.
--   * Revoga INSERT, UPDATE, DELETE direto de tabelas CORE para authenticated.
--     Escritas sensíveis devem ser feitas apenas por funções SECURITY DEFINER.
--   * Mantém apenas SELECT para authenticated nas tabelas CORE; RLS restringe
--     as linhas visíveis por pessoa/tenant.
--   * anon permanece sem acesso a tabelas sensíveis.
--   * Adiciona funções RPC transacionais para operações administrativas que
--     anteriormente usavam escrita direta em tabelas CORE pelo frontend.
--   * fn_audit_log permanece restrita a service_role (escrita de auditoria
--     apenas por triggers SECURITY DEFINER e funções confiáveis).

-- ============================================
-- 0. Revogar privilégios perigosos de todas as tabelas CORE
--    (execução idempotente: segura mesmo se já revogados)
-- ============================================

REVOKE TRUNCATE ON TABLE
  people,
  auth_identity_links,
  tenants,
  units,
  tenant_settings,
  tenant_memberships,
  unit_memberships,
  roles,
  permissions,
  role_permissions,
  role_assignments,
  audit_events
FROM PUBLIC, anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE
  people,
  auth_identity_links,
  tenants,
  units,
  tenant_settings,
  tenant_memberships,
  unit_memberships,
  roles,
  permissions,
  role_permissions,
  role_assignments,
  audit_events
FROM PUBLIC, anon, authenticated;

-- ============================================
-- 1. Privilégios de schema
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- ============================================
-- 2. Tabelas core/IAM: apenas SELECT para authenticated.
--    RLS/policies restringem linhas e operações.
--    Escritas são feitas por funções SECURITY DEFINER.
-- ============================================

GRANT SELECT ON TABLE
  people,
  auth_identity_links,
  tenants,
  units,
  tenant_settings,
  tenant_memberships,
  unit_memberships,
  roles,
  permissions,
  role_permissions,
  role_assignments
TO authenticated;

-- ============================================
-- 3. Onboarding/legal: leitura sob RLS; escritas sensíveis por funções SECURITY DEFINER
-- ============================================

GRANT SELECT ON TABLE
  legal_documents,
  legal_acceptances,
  user_onboarding
TO authenticated;

-- ============================================
-- 4. Auditoria: leitura sob RLS; sem escrita direta por cliente
-- ============================================

GRANT SELECT ON TABLE audit_events TO authenticated;

-- ============================================
-- 5. anon: sem acesso a tabelas sensíveis nesta fase
--    (bootstrap/login via Auth; dados via authenticated)
-- ============================================

REVOKE ALL ON TABLE
  people, auth_identity_links, tenants, units, tenant_settings,
  tenant_memberships, unit_memberships, roles, permissions,
  role_permissions, role_assignments, legal_documents, legal_acceptances,
  user_onboarding, audit_events
FROM anon;

-- ============================================
-- 6. Garantir que sequences (se houver) não sejam expostas desnecessariamente;
--    UUIDs usam gen_random_uuid()
-- ============================================

COMMENT ON TABLE audit_events IS 'Trilha de auditoria: escrita apenas por triggers e funções SECURITY DEFINER. INSERT/UPDATE/DELETE direto revogado para clientes.';

-- ============================================
-- 7. Funções RPC transacionais para operações administrativas
--    (substituem escrita direta em tabelas CORE pelo frontend)
-- ============================================

-- 7.1. Desativar usuário: marca role_assignments como inativo para uma pessoa
--      Usada pelo CadastroUsuarios (excluirUsuario).
CREATE OR REPLACE FUNCTION fn_desativar_usuario(
  p_person_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_existe BOOLEAN;
  v_target_is_root_global BOOLEAN;
BEGIN
  v_caller := fn_resolve_person_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Somente ROOT global ou admin com permissão pode desativar
  IF NOT fn_is_root(v_caller) THEN
    IF NOT fn_person_has_permission(v_caller, 'role_assignments', 'update', NULL, NULL) THEN
      RAISE EXCEPTION 'forbidden: insuficiente permissão para desativar usuário' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Verificar se a pessoa existe
  SELECT EXISTS (SELECT 1 FROM people WHERE id = p_person_id AND ativo = true)
  INTO v_existe;
  IF NOT v_existe THEN
    RETURN false;
  END IF;

  -- Verificar se a pessoa-alvo é ROOT global (apenas ROOT global pode desativar outro ROOT global)
  SELECT EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    WHERE ra.person_id = p_person_id
      AND ra.ativo = true
      AND r.ativo = true
      AND r.nome = 'root'
      AND ra.tenant_id IS NULL
  ) INTO v_target_is_root_global;

  IF v_target_is_root_global AND NOT fn_is_root(v_caller) THEN
    RAISE EXCEPTION 'forbidden: nao eh possivel desativar conta ROOT global' USING ERRCODE = '42501';
  END IF;

  -- Verificar escopo de tenant: admin subordinado so pode desativar pessoas
  -- em tenants dos quais e membro; ROOT global nao tem essa restricao
  IF NOT fn_is_root(v_caller) THEN
    IF NOT EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = p_person_id
        AND tm.ativo = true
        AND EXISTS (
          SELECT 1 FROM tenant_memberships my
          WHERE my.person_id = v_caller
            AND my.tenant_id = tm.tenant_id
            AND my.ativo = true
        )
    ) THEN
      RAISE EXCEPTION 'forbidden: pessoa-alvo fora do escopo de tenant autorizado' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Desativar role_assignments ativos da pessoa
  UPDATE role_assignments
  SET ativo = false, updated_at = now()
  WHERE person_id = p_person_id AND ativo = true;

  PERFORM fn_audit_log(
    'role_assignments', 'deactivate_user', 'role_assignments',
    p_person_id, NULL,
    jsonb_build_object('person_id', p_person_id, 'desativado_por', v_caller),
    'sucesso', NULL, NULL
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_desativar_usuario(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_desativar_usuario(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION fn_desativar_usuario(UUID) TO authenticated;

-- 7.2. Atualizar dados de pessoa (nome, email, telefone, documento, data_nascimento)
--      Usada pelo CadastroUsuarios (salvarUsuario - atualizar existente).
CREATE OR REPLACE FUNCTION fn_atualizar_pessoa(
  p_person_id UUID,
  p_nome TEXT,
  p_email TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_documento TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_existe BOOLEAN;
  v_target_is_root_global BOOLEAN;
BEGIN
  v_caller := fn_resolve_person_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  -- Somente ROOT global ou admin com permissão pode atualizar
  IF NOT fn_is_root(v_caller) THEN
    IF NOT fn_person_has_permission(v_caller, 'people', 'update', NULL, NULL) THEN
      RAISE EXCEPTION 'forbidden: insuficiente permissão para atualizar pessoa' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Verificar se a pessoa existe
  SELECT EXISTS (SELECT 1 FROM people WHERE id = p_person_id AND ativo = true)
  INTO v_existe;
  IF NOT v_existe THEN
    RETURN false;
  END IF;

  -- Verificar se a pessoa-alvo é ROOT global (apenas ROOT global pode atualizar outro ROOT global)
  SELECT EXISTS (
    SELECT 1 FROM role_assignments ra
    JOIN roles r ON r.id = ra.role_id
    WHERE ra.person_id = p_person_id
      AND ra.ativo = true
      AND r.ativo = true
      AND r.nome = 'root'
      AND ra.tenant_id IS NULL
  ) INTO v_target_is_root_global;

  IF v_target_is_root_global AND NOT fn_is_root(v_caller) THEN
    RAISE EXCEPTION 'forbidden: nao eh possivel atualizar conta ROOT global' USING ERRCODE = '42501';
  END IF;

  -- Verificar escopo de tenant: admin subordinado so pode atualizar pessoas
  -- em tenants dos quais e membro; ROOT global nao tem essa restricao
  IF NOT fn_is_root(v_caller) THEN
    IF NOT EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.person_id = p_person_id
        AND tm.ativo = true
        AND EXISTS (
          SELECT 1 FROM tenant_memberships my
          WHERE my.person_id = v_caller
            AND my.tenant_id = tm.tenant_id
            AND my.ativo = true
        )
    ) THEN
      RAISE EXCEPTION 'forbidden: pessoa-alvo fora do escopo de tenant autorizado' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Atualizar dados da pessoa
  UPDATE people
  SET nome = COALESCE(btrim(p_nome), nome),
      email = NULLIF(btrim(COALESCE(p_email, '')), ''),
      telefone = NULLIF(btrim(COALESCE(p_telefone, '')), ''),
      documento = NULLIF(btrim(COALESCE(p_documento, '')), ''),
      data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
      updated_at = now()
  WHERE id = p_person_id;

  PERFORM fn_audit_log(
    'people', 'update', 'people',
    p_person_id, NULL,
    jsonb_build_object('person_id', p_person_id, 'atualizado_por', v_caller),
    'sucesso', NULL, NULL
  );

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_atualizar_pessoa(UUID, TEXT, TEXT, TEXT, TEXT, DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_atualizar_pessoa(UUID, TEXT, TEXT, TEXT, TEXT, DATE) FROM authenticated;
GRANT EXECUTE ON FUNCTION fn_atualizar_pessoa(UUID, TEXT, TEXT, TEXT, TEXT, DATE) TO authenticated;

-- fn_audit_log permanece restrita a service_role (conforme 70000).
-- Nenhum GRANT EXECUTE para authenticated: escrita de auditoria é feita
-- apenas por triggers SECURITY DEFINER e funções confiáveis, nunca diretamente
-- pelo cliente. As funções de negócio (fn_desativar_usuario, fn_atualizar_pessoa)
-- chamam fn_audit_log internamente via SECURITY DEFINER.
-- ============================================

COMMENT ON FUNCTION fn_desativar_usuario(UUID) IS 'Desativa role_assignments de uma pessoa (RPC transacional para CadastroUsuarios). Gate 2.4.';
COMMENT ON FUNCTION fn_atualizar_pessoa(UUID, TEXT, TEXT, TEXT, TEXT, DATE) IS 'Atualiza dados de pessoa (RPC transacional para CadastroUsuarios). Gate 2.4.';