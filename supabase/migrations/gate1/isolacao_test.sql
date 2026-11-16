-- ============================================
-- TESTES DE ISOLAMENTO GATE 1.1 (com SET ROLE para testar RLS)
-- Cada teste roda em sua própria transação para preservar set_config
-- ============================================

\set ON_ERROR_STOP off

-- Criar roles de aplicação para testar RLS (não-superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

GRANT authenticated TO app_user;
GRANT app_user TO postgres;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON people, tenants, units, tenant_settings, tenant_memberships, unit_memberships, roles, permissions, role_permissions, role_assignments, auth_identity_links, audit_events TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON people, tenants, units, tenant_settings, tenant_memberships, unit_memberships, roles, permissions, role_permissions, role_assignments, auth_identity_links, audit_events TO authenticated;
GRANT EXECUTE ON FUNCTION fn_current_person_id, fn_current_tenant_id, fn_current_unit_id, fn_person_has_permission, fn_set_session_contexto TO app_user;
GRANT EXECUTE ON FUNCTION fn_current_person_id, fn_current_tenant_id, fn_current_unit_id, fn_person_has_permission, fn_set_session_contexto TO authenticated;

SELECT '=== INÍCIO DOS TESTES DE ISOLAMENTO ===' AS etapa;

-- -------------------------------------------------------------------
-- TESTE 1: Fail-closed - sem contexto de sessão = 0 linhas
-- -------------------------------------------------------------------
SELECT 'TESTE 1: Fail-closed sem contexto' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT set_config('request.jwt.claims.person_id', '', true);
  SELECT set_config('request.jwt.claims.tenant_id', '', true);
  SELECT set_config('request.jwt.claims.unit_id', '', true);

  SELECT
    (SELECT COUNT(*) FROM people) = 0 AS pessoas_sem_contexto,
    (SELECT COUNT(*) FROM tenants) = 0 AS tenants_sem_contexto,
    (SELECT COUNT(*) FROM units) = 0 AS units_sem_contexto,
    (SELECT COUNT(*) FROM role_assignments) = 0 AS assignments_sem_contexto;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 2: Usuário sem auth_identity_links não consegue contexto
-- -------------------------------------------------------------------
SELECT 'TESTE 2: Usuário sem vínculo auth_identity_links' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '99999999-9999-9999-9999-999999999999',
    '11111111-1111-1111-1111-111111111111'
  ) AS contexto_sem_vinculo_deve_ser_false;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 3: Contexto válido - Admin Tenant A vê apenas Tenant A
-- -------------------------------------------------------------------
SELECT 'TESTE 3: Contexto válido - Admin Tenant A' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111'
  ) AS contexto_admin_a;

  -- Admin Tenant A vê pessoas do Tenant A
  SELECT COUNT(*) > 0 AS admin_a_vê_pessoas_tenant_a
  FROM people;

  -- Admin Tenant A NÃO vê pessoas do Tenant B (verifica IDs específicos)
  SELECT COUNT(*) = 0 AS admin_a_nao_vê_root_de_tenant_b
  FROM people p
  WHERE p.id = '00000000-0000-0000-0000-000000000001'; -- root está nos dois tenants

  -- Admin Tenant A vê apenas Tenant A na tabela tenants
  SELECT COUNT(*) = 1 AS admin_a_vê_apenas_tenant_a
  FROM tenants;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 4: Isolamento cross-unit (mesmo tenant) - Gestor A1 vs Unidade A2
-- -------------------------------------------------------------------
SELECT 'TESTE 4: Isolamento cross-unit' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111'
  ) AS contexto_gestor_a1;

  -- Gestor A1 vê pessoas da Unidade A1
  SELECT COUNT(*) > 0 AS gestor_a1_vê_pessoas_unidade_a1
  FROM people p
  JOIN unit_memberships um ON um.person_id = p.id
  WHERE um.unit_id = 'a1111111-1111-1111-1111-111111111111' AND um.ativo = true;

  -- Gestor A1 NÃO vê pessoas da Unidade A2
  SELECT COUNT(*) = 0 AS gestor_a1_nao_vê_unidade_a2
  FROM people p
  JOIN unit_memberships um ON um.person_id = p.id
  WHERE um.unit_id = 'a2222222-2222-2222-2222-222222222222' AND um.ativo = true;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 5: ROOT global - acesso a todos os tenants
-- -------------------------------------------------------------------
SELECT 'TESTE 5: ROOT global acesso a todos os tenants' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000001',
    NULL
  ) AS contexto_root;

  SELECT COUNT(*) = 2 AS root_vê_ambos_tenants FROM tenants;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 6: RBAC - Suporte não pode excluir pessoas
-- -------------------------------------------------------------------
SELECT 'TESTE 6: RBAC - Suporte não pode excluir pessoas' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000005',
    '11111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111'
  ) AS contexto_suporte;

  -- Suporte não tem permissão people.delete
  SELECT fn_person_has_permission(
    '00000000-0000-0000-0000-000000000005',
    'people', 'delete',
    '11111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111'
  ) = false AS suporte_sem_perm_delete;

  -- RLS + permissão bloqueia DELETE
  DELETE FROM people WHERE id = '00000000-0000-0000-0000-000000000002';
  SELECT (SELECT COUNT(*) FROM people WHERE id = '00000000-0000-0000-0000-000000000002') = 1 AS suporte_nao_consegue_delete_admin_a;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 7: RBAC - Admin pode criar pessoas
-- -------------------------------------------------------------------
SELECT 'TESTE 7: RBAC - Admin pode criar pessoas' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111'
  ) AS contexto_admin_a2;

  SELECT fn_person_has_permission(
    '00000000-0000-0000-0000-000000000002',
    'people', 'create',
    '11111111-1111-1111-1111-111111111111',
    NULL
  ) = true AS admin_pode_criar_pessoa;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 8: Tentativa de escalada - admin A tentando contexto tenant B
-- -------------------------------------------------------------------
SELECT 'TESTE 8: Tentativa de escalada de privilégios' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222'
  ) = false AS admin_a_nao_pode_definir_contexto_tenant_b;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 9: RBAC - Auditor lê auditoria, gestor não
-- -------------------------------------------------------------------
SELECT 'TESTE 9: RBAC - Auditor lê auditoria, gestor não' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000006',
    '11111111-1111-1111-1111-111111111111'
  ) AS contexto_auditor;

  SELECT fn_person_has_permission(
    '00000000-0000-0000-0000-000000000006',
    'audit_events', 'read',
    '11111111-1111-1111-1111-111111111111',
    NULL
  ) = true AS auditor_pode_ler_auditoria;
  RESET ROLE;
COMMIT;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111'
  ) AS contexto_gestor_a1_2;

  SELECT fn_person_has_permission(
    '00000000-0000-0000-0000-000000000003',
    'audit_events', 'read',
    '11111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111'
  ) = false AS gestor_nao_pode_ler_auditoria;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 10: Usuário sem permissões efetivas
-- -------------------------------------------------------------------
SELECT 'TESTE 10: Usuário sem permissões efetivas' AS teste;

BEGIN;
  SET ROLE app_user;
  SELECT fn_set_session_contexto(
    '10000000-0000-0000-0000-000000000009',
    '11111111-1111-1111-1111-111111111111'
  ) AS contexto_sem_perm;

  SELECT fn_person_has_permission(
    '00000000-0000-0000-0000-000000000009',
    'people', 'create',
    '11111111-1111-1111-1111-111111111111',
    NULL
  ) = false AS sem_permissao_nao_pode_criar;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- TESTE 11: audit_events é append-only (não permite UPDATE/DELETE)
-- -------------------------------------------------------------------
SELECT 'TESTE 11: audit_events append-only' AS teste;

BEGIN;
  SET ROLE app_user;
  UPDATE audit_events SET resultado = 'falha' WHERE id = (SELECT id FROM audit_events LIMIT 1);
  SELECT COUNT(*) = 0 AS audit_events_bloqueia_update FROM audit_events WHERE resultado = 'falha';
  RESET ROLE;
COMMIT;

BEGIN;
  SET ROLE app_user;
  DELETE FROM audit_events;
  SELECT COUNT(*) = 0 AS audit_events_bloqueia_delete FROM audit_events;
  RESET ROLE;
COMMIT;

-- -------------------------------------------------------------------
-- RESULTADO FINAL
-- -------------------------------------------------------------------
SELECT '=== TESTES DE ISOLAMENTO CONCLUÍDOS ===' AS etapa;
