-- ============================================================================
-- validate_gate24.sql
-- Gate 2.4 — Validação local de segurança e integridade do CORE People-First
-- Consulta o PostgreSQL local (gate213_test) e verifica:
--   * Existência das 15 tabelas esperadas
--   * Ativação de RLS em cada tabela
--   * Ausência da policy permissiva audit_system_insert
--   * Privilégios de INSERT em audit_events (deve ser revogado para PUBLIC/anon/authenticated)
--   * Privilégios de CREATE no schema public (deve estar restrito)
--   * Existência das funções People-First (SECURITY DEFINER)
-- NÃO modifica o banco. Somente leitura.
-- ============================================================================

\echo '=== GATE 2.4 — VALIDAÇÃO LOCAL DE SEGURANÇA E INTEGRIDADE ==='
\echo ''

-- ----------------------------------------------------------------------------
-- 1. Tabelas esperadas (15)
-- ----------------------------------------------------------------------------
\echo '1. Tabelas esperadas'
SELECT
  t.table_name,
  CASE WHEN it.table_name IS NOT NULL THEN 'EXISTE' ELSE 'AUSENTE' END AS status
FROM (
  VALUES
    ('people'),
    ('auth_identity_links'),
    ('tenants'),
    ('units'),
    ('tenant_settings'),
    ('tenant_memberships'),
    ('unit_memberships'),
    ('roles'),
    ('permissions'),
    ('role_permissions'),
    ('role_assignments'),
    ('audit_events'),
    ('legal_documents'),
    ('legal_acceptances'),
    ('user_onboarding')
) AS t(table_name)
LEFT JOIN information_schema.tables it
  ON it.table_schema = 'public' AND it.table_name = t.table_name
ORDER BY t.table_name;

\echo ''

-- ----------------------------------------------------------------------------
-- 2. RLS ativado por tabela
-- ----------------------------------------------------------------------------
\echo '2. RLS por tabela'
SELECT
  tablename,
  rowsecurity AS rls_ativo
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'people', 'auth_identity_links', 'tenants', 'units', 'tenant_settings',
    'tenant_memberships', 'unit_memberships', 'roles', 'permissions',
    'role_permissions', 'role_assignments', 'audit_events',
    'legal_documents', 'legal_acceptances', 'user_onboarding'
  )
ORDER BY tablename;

\echo ''

-- ----------------------------------------------------------------------------
-- 3. Policies de INSERT em audit_events (nenhuma deve permitir gravação direta)
-- ----------------------------------------------------------------------------
\echo '3. Policies de audit_events'
SELECT
  polname AS policy_name,
  polcmd AS comando,
  pg_get_expr(polqual, polrelid) AS using_clause,
  pg_get_expr(polwithcheck, polrelid) AS with_check_clause
FROM pg_policy
JOIN pg_class ON pg_class.oid = polrelid
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public'
  AND pg_class.relname = 'audit_events'
ORDER BY polname, polcmd;

\echo ''

-- ----------------------------------------------------------------------------
-- 4. Privilégios de INSERT em audit_events (deve estar revogado para PUBLIC/anon/authenticated)
-- ----------------------------------------------------------------------------
\echo '4. Privilégios de INSERT em audit_events'
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'audit_events'
  AND privilege_type = 'INSERT'
ORDER BY grantee;

\echo ''

-- ----------------------------------------------------------------------------
-- 5. Privilégio de CREATE no schema public (deve estar restrito)
-- ----------------------------------------------------------------------------
\echo '5. Privilégios de CREATE no schema public'
SELECT
  nspname AS schema_name,
  nspacl AS acl
FROM pg_namespace
WHERE nspname = 'public';

\echo ''

-- ----------------------------------------------------------------------------
-- 6. Funções People-First (existência e SECURITY DEFINER)
-- ----------------------------------------------------------------------------
\echo '6. Funções de segurança (SECURITY DEFINER)'
SELECT
  proname AS nome_funcao,
  provolatile AS volatilidade,
  prosrc AS corpo
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pronamespace
WHERE pg_namespace.nspname = 'public'
  AND proname IN (
    'fn_current_person_id', 'fn_current_tenant_id', 'fn_current_unit_id',
    'fn_person_has_permission', 'fn_set_session_contexto',
    'fn_resolve_person_id', 'fn_is_root',
    'fn_ensure_onboarding_state', 'fn_accept_legal_document',
    'fn_mark_password_changed', 'fn_complete_welcome', 'fn_onboarding_status',
    'fn_auth_bootstrap_v2', 'fn_persons_share_active_tenant',
    'fn_has_people_permission_in_any_member_tenant',
    'fn_admin_register_person', 'fn_confirm_password_changed_by_auth_user',
    'fn_audit_log', 'trg_audit_event', 'trg_set_updated_at'
  )
ORDER BY proname;

\echo ''

-- ----------------------------------------------------------------------------
-- 7. Verificação específica: audit_system_insert deve estar ausente
-- ----------------------------------------------------------------------------
\echo '7. Verificação: audit_system_insert ausente'
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'CORRETO — policy removida'
       ELSE 'FALHA — policy ainda existe' END AS status_audit_system_insert
FROM pg_policy
JOIN pg_class ON pg_class.oid = polrelid
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public'
  AND pg_class.relname = 'audit_events'
  AND polname = 'audit_system_insert';

\echo ''

-- ----------------------------------------------------------------------------
-- 8. Verificação: nenhuma policy INSERT com WITH CHECK (true) em audit_events
-- ----------------------------------------------------------------------------
\echo '8. Verificação: nenhuma policy INSERT permisiva em audit_events'
SELECT
  CASE WHEN COUNT(*) = 0 THEN 'CORRETO — nenhuma policy INSERT permisiva'
       ELSE 'FALHA — policy INSERT permisiva existe' END AS status_insert_permissivo
FROM pg_policy
JOIN pg_class ON pg_class.oid = polrelid
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE pg_namespace.nspname = 'public'
  AND pg_class.relname = 'audit_events'
  AND polcmd = 'a'
  AND pg_get_expr(polwithcheck, polrelid) IS NULL;

\echo ''
\echo '=== FIM DA VALIDAÇÃO GATE 2.4 ==='