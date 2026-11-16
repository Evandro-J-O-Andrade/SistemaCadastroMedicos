# GATE 1 — QA: Plano de Testes de Isolamento

**Projeto:** SistemaCadastroMedicos\
**Escopo:** Testes de isolamento multi-tenant, multiunidade, RBAC e RLS no banco de dados.\
**Objetivo:** Garantir que nenhum usuário visualize ou modifique dados fora do seu tenant/unidade, e que permissões sejam aplicadas fail-closed.

---

## 1. Estratégia de Testes

| Tipo | Escopo | Ferramenta |
|------|--------|------------|
| Unitário | Funções SQL (`fn_person_has_permission`, `fn_set_session_contexto`, `trg_audit_event`) | pgTAP / pg_unit |
| Integração | RLS por tabela, políticas de SELECT/INSERT/UPDATE/DELETE | Supabase CLI + pgTAP |
| Isolamento | Cross-tenant e cross-unit data leakage | Scripts automatizados com múltiplos usuários |
| E2E | Fluxo completo login → contexto → ação → verificação | Playwright / Cypress |

---

## 2. Usuários de Teste (Fixtures)

Criar no Supabase Auth + `auth_identity_links` + `tenant_memberships` + `role_assignments`:

| Usuário | Email | Papel | Tenant | Unidade | Escopo |
|---------|-------|-------|--------|---------|--------|
| root_global | root@gestao.test | root | (nenhum) | (nenhum) | Global |
| admin_tenant_a | admin@tenant-a.test | admin | Tenant A | (nenhum) | Tenant A completo |
| gestor_unidade_a1 | gestor@tenant-a-un1.test | gestor | Tenant A | Unidade A1 | Apenas Unidade A1 |
| operador_unidade_a1 | operador@tenant-a-un1.test | operador_ti | Tenant A | Unidade A1 | Apenas Unidade A1 |
| suporte_unidade_a1 | suporte@tenant-a-un1.test | suporte | Tenant A | Unidade A1 | Leitura limitada Unidade A1 |
| auditor_tenant_a | auditor@tenant-a.test | auditor | Tenant A | (nenhum) | Leitura Tenant A |
| admin_tenant_b | admin@tenant-b.test | admin | Tenant B | (nenhum) | Tenant B completo |
| gestor_unidade_b1 | gestor@tenant-b-un1.test | gestor | Tenant B | Unidade B1 | Apenas Unidade B1 |

---

## 3. Casos de Teste por Categoria

### 3.1 Autenticação e Contexto de Sessão

| ID | Caso | Entrada | Resultado esperado |
|----|------|---------|-------------------|
| QA-AUTH-01 | Login sem `auth_identity_links` | Usuário válido no auth.users, sem link em `auth_identity_links` | `fn_set_session_contexto()` retorna `false`; 0 linhas visíveis em todas as tabelas com RLS |
| QA-AUTH-02 | Login com tenant inválido | `tenant_id` onde a pessoa não é membro | `fn_set_session_contexto()` retorna `false` |
| QA-AUTH-03 | Login com unidade de outro tenant | `unit_id` que não pertence ao `tenant_id` informado | `fn_set_session_contexto()` retorna `false` |
| QA-AUTH-04 | Login válido, contexto definido | Usuário com vínculos válidos | `fn_set_session_contexto()` retorna `true`; claims definidos |
| QA-AUTH-05 | Contexto sem unit_id | Usuário sem unidade (ex: admin tenant) | `fn_set_session_contexto()` retorna `true` com `unit_id = null` |

### 3.2 Isolamento Multi-Tenant (RLS)

| ID | Caso | Entrada | Resultado esperado |
|----|------|---------|-------------------|
| QA-MT-01 | Admin Tenant A lê tenants | Contexto Tenant A | Apenas Tenant A visível; Tenant B não aparece |
| QA-MT-02 | Admin Tenant A tenta inserir tenant | Contexto Tenant A, `tenants.insert` | Sucesso (admin pode criar tenants) |
| QA-MT-03 | Gestor Unidade A1 lê pessoas | Contexto Unidade A1 | Apenas pessoas com membership ativo em Unidade A1 / Tenant A |
| QA-MT-04 | Gestor Unidade A1 tenta ler pessoas de Unidade B1 | Contexto Unidade A1, filtrar por Tenant B / Unidade B1 | 0 linhas (RLS bloqueia) |
| QA-MT-05 | Admin Tenant A lê pessoas de Tenant B | Contexto Tenant A | 0 linhas de Tenant B |
| QA-MT-06 | ROOT global lê todos os tenants | Contexto ROOT sem tenant | Todos os tenants visíveis |

### 3.3 Isolamento Multi-Unidade (mesmo tenant)

| ID | Caso | Entrada | Resultado esperado |
|----|------|---------|-------------------|
| QA-MU-01 | Gestor Unidade A1 lê unidades | Contexto Tenant A | Unidades do Tenant A visíveis |
| QA-MU-02 | Gestor Unidade A1 lê pessoas de Unidade A2 | Contexto Unidade A1 | 0 pessoas de Unidade A2 (não é membro) |
| QA-MU-03 | Gestor Unidade A1 edita pessoa de Unidade A2 | Contexto Unidade A1, `people.update` em pessoa de A2 | RLS bloqueia UPDATE |
| QA-MU-04 | Operador Unidade A1 lê pessoas de Unidade A1 | Contexto Unidade A1 | Pessoas de A1 visíveis |
| QA-MU-05 | Operador Unidade A1 tenta editar pessoa de Unidade A1 sem permissão update | Contexto Unidade A1, `people.update` | `fn_person_has_permission()` retorna `false`; RLS bloqueia |

### 3.4 RBAC / Permissões Atômicas

| ID | Caso | Entrada | Resultado esperado |
|----|------|---------|-------------------|
| QA-RBAC-01 | Suporte tenta criar pessoa | Contexto Unidade A1, `people.create` | `fn_person_has_permission()` retorna `false`; RLS bloqueia INSERT |
| QA-RBAC-02 | Auditor tenta excluir pessoa | Contexto Tenant A, `people.delete` | `fn_person_has_permission()` retorna `false` |
| QA-RBAC-03 | Admin Tenant A atribui papel gestor | Contexto Tenant A, `roles.assign` | Sucesso se admin tem permissão |
| QA-RBAC-04 | Gestor tenta atribuir papel admin | Contexto Unidade A1, `roles.assign` com role=admin | `fn_person_has_permission()` retorna `false` (gestor não pode atribuir admin) |
| QA-RBAC-05 | ROOT atribui papel root | Contexto ROOT, `roles.assign` com role=root | Sucesso (ROOT pode atribuir ROOT) |
| QA-RBAC-06 | Não-ROOT tenta atribuir papel root | Contexto Admin, `roles.assign` com role=root | `fn_person_has_permission()` retorna `false` |

### 3.5 Audit Events

| ID | Caso | Entrada | Resultado esperado |
|----|------|---------|-------------------|
| QA-AUD-01 | INSERT em pessoa gera audit | `people.insert` com contexto válido | Linha em `audit_events` com `recurso='people'`, `acao='create'`, `pessoa_id` preenchido |
| QA-AUD-02 | UPDATE em pessoa gera audit | `people.update` com contexto válido | Linha em `audit_events` com `dados_anteriores` e `dados_novos` preenchidos |
| QA-AUD-03 | Tentativa de UPDATE em audit_events | `audit_events.update` | RLS política `false` bloqueia |
| QA-AUD-04 | Tentativa de DELETE em audit_events | `audit_events.delete` | RLS política `false` bloqueia |
| QA-AUD-05 | Auditor lê audit_events do próprio tenant | Contexto Tenant A, `audit_events.read` | Apenas eventos de Tenant A visíveis |
| QA-AUD-06 | Gestor tenta ler audit_events | Contexto Unidade A1, `audit_events.read` | `fn_person_has_permission()` retorna `false` (gestor não tem `audit_events.read` na matriz) |

### 3.6 Tenant Settings (Database-Driven UI)

| ID | Caso | Entrada | Resultado esperado |
|----|------|---------|-------------------|
| QA-UI-01 | Ler tema do tenant | `tenant_settings` chave `tema` | Retorna valor JSONB do tenant |
| QA-UI-02 | Ler módulos habilitados | `tenant_settings` chave `modulos_habilitados` | Retorna array de strings |
| QA-UI-03 | UI não vê módulos de outro tenant | Contexto Tenant A, consultar `tenant_settings` de Tenant B | 0 linhas (RLS isolamento) |
| QA-UI-04 | Atualizar tema (admin) | `tenant_settings.update` com contexto admin | Sucesso |
| QA-UI-05 | Atualizar tema (gestor) | `tenant_settings.update` com contexto gestor | `fn_person_has_permission()` retorna `false` |

---

## 4. Scripts de Teste Automatizado (pgTAP)

### 4.1 Exemplo: teste de isolamento cross-tenant

```sql
-- Teste: Admin Tenant A não vê pessoas de Tenant B
SELECT plan(1);

-- Configurar contexto como admin do Tenant A
SELECT fn_set_session_contexto(
  (SELECT auth_user_id FROM auth_identity_links WHERE person_id = (SELECT id FROM people WHERE email = 'admin@tenant-a.test')),
  (SELECT id FROM tenants WHERE slug = 'tenant-a')
);

-- Tentar ler pessoas de Tenant B
SELECT ok(
  (SELECT COUNT(*) FROM people p
   JOIN tenant_memberships tm ON tm.person_id = p.id
   WHERE tm.tenant_id = (SELECT id FROM tenants WHERE slug = 'tenant-b')) = 0,
  'Admin Tenant A não vê pessoas de Tenant B'
);

SELECT * FROM finish();
```

### 4.2 Exemplo: teste de falha fechada (fail-closed)

```sql
-- Teste: Sem contexto de sessão = 0 linhas
SELECT plan(1);

SELECT ok(
  (SELECT COUNT(*) FROM people) = 0,
  'Sem contexto de sessão: zero linhas visíveis (fail-closed)'
);

SELECT * FROM finish();
```

---

## 5. Critérios de Aprovação (Gate 1)

| Critério | Status | Evidência |
|----------|--------|-----------|
| Todas as tabelas CORE têm RLS habilitada | Pendente | `SELECT * FROM pg_policies WHERE ...` |
| `fn_person_has_permission()` retorna false sem vínculo ativo | Pendente | Teste QA-RBAC-01 a QA-RBAC-06 |
| Cross-tenant data leakage = 0 | Pendente | Teste QA-MT-01 a QA-MT-06 |
| Cross-unit data leakage = 0 | Pendente | Teste QA-MU-01 a QA-MU-05 |
| `audit_events` é append-only (sem UPDATE/DELETE) | Pendente | Teste QA-AUD-03, QA-AUD-04 |
| `fn_set_session_contexto()` valida vínculos antes de definir claims | Pendente | Teste QA-AUTH-01 a QA-AUTH-05 |
| `tenant_settings` isolado por tenant | Pendente | Teste QA-UI-01 a QA-UI-05 |

---

## 6. Execução dos Testes

```bash
# 1. Aplicar migrations gate1 em um banco de teste (Supabase local ou projeto de homologação)
supabase db reset --linked

# 2. Executar pgTAP
psql -f tests/gate1/isolacao.sql

# 3. Executar testes E2E (Playwright)
npx playwright test tests/e2e/gate1/

# 4. Gerar relatório de cobertura de isolamento
# Relatório deve mostrar: 0 vazamentos cross-tenant, 0 vazamentos cross-unit
```

---

**Não aplicar no Supabase de produção sem autorização.** Todos os testes devem rodar primeiro em banco de teste isolado.
