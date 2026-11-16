# GATE 1 — AppSec: Matriz RLS e Políticas de Segurança

**Projeto:** SistemaCadastroMedicos\
**Escopo:** Row-Level Security (RLS) no PostgreSQL/Supabase, políticas de isolamento multi-tenant e multiunidade.\
**Princípio:** Fail-closed. Sem contexto de sessão válido = nenhuma linha visível.

---

## 1. Princípios de Segurança

| Princípio | Definição |
|-----------|-----------|
| **Fail-closed** | Tabelas com RLS habilitada bloqueiam todas as linhas quando não há contexto de sessão válido. |
| **Contexto a partir de claims** | As políticas leem `request.jwt.claims.person_id`, `.tenant_id` e `.unit_id` definidas por `fn_set_session_contexto()`. |
| **Nunca confie no frontend** | `tenant_id`, `person_id` e `unit_id` enviados livremente pelo cliente são ignorados. Somente os claims validados pelo banco são usados. |
| **Isolamento estrito** | Uma pessoa só enxerga linhas de tenants/unidades onde é membro ativo. |
| **Auditoria obrigatória** | Todas as escritas em tabelas com dados sensíveis são registradas em `audit_events` via trigger. |

---

## 2. Habilitação de RLS por Tabela

| Tabela | RLS | Motivo |
|--------|-----|--------|
| `people` | ENABLED | Dados pessoais sensíveis (RGPD/LGPD) |
| `auth_identity_links` | ENABLED | Mapeamento auth.users ↔ people |
| `tenants` | ENABLED | Isolamento multi-tenant |
| `units` | ENABLED | Isolamento multiunidade dentro do tenant |
| `tenant_settings` | ENABLED | Configurações por tenant |
| `tenant_memberships` | ENABLED | Vínculos pessoa-tenant |
| `unit_memberships` | ENABLED | Vínculos pessoa-unidade |
| `roles` | ENABLED | Metadados de papel |
| `permissions` | ENABLED | Metadados de permissão |
| `role_permissions` | ENABLED | Mapeamento papel-permissão |
| `role_assignments` | ENABLED | Atribuições de papel com escopo |
| `audit_events` | ENABLED | Trilha de auditoria (apendice-only) |

Todas as tabelas acima recebem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`

---

## 3. Políticas RLS por Tabela

### 3.1 people

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| people_own_tenant_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = people.id AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | N/A |
| people_own_tenant_insert | INSERT | N/A | `fn_current_person_id() IS NOT NULL AND fn_person_has_permission(fn_current_person_id(), 'people', 'create', fn_current_tenant_id(), fn_current_unit_id())` |
| people_own_tenant_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = people.id AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'people', 'update', fn_current_tenant_id(), fn_current_unit_id())` |
| people_own_tenant_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = people.id AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'people', 'delete', fn_current_tenant_id(), fn_current_unit_id())` |

### 3.2 auth_identity_links

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| links_own_person_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = person_id AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | N/A |
| links_own_person_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'people', 'create', fn_current_tenant_id(), fn_current_unit_id())` |
| links_own_person_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = person_id AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'people', 'update', fn_current_tenant_id(), fn_current_unit_id())` |

### 3.3 tenants

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| tenants_member_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = id AND tm.ativo = true)` | N/A |
| tenants_member_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'tenants', 'create', NULL, NULL)` |
| tenants_member_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'tenants', 'update', id, NULL)` |
| tenants_member_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'tenants', 'delete', id, NULL)` |

### 3.4 units

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| units_member_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = tenant_id AND tm.ativo = true)` | N/A |
| units_own_unit_read | SELECT | `EXISTS (SELECT 1 FROM unit_memberships um WHERE um.person_id = fn_current_person_id() AND um.unit_id = id AND um.ativo = true)` | N/A |
| units_member_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'units', 'create', tenant_id, NULL)` |
| units_member_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = tenant_id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'units', 'update', tenant_id, NULL)` |
| units_member_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = tenant_id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'units', 'delete', tenant_id, NULL)` |

### 3.5 tenant_settings

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| settings_tenant_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = tenant_id AND tm.ativo = true)` | N/A |
| settings_tenant_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'tenant_settings', 'create', tenant_id, NULL)` |
| settings_tenant_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = tenant_id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'tenant_settings', 'update', tenant_id, NULL)` |
| settings_tenant_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = tenant_id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'tenant_settings', 'delete', tenant_id, NULL)` |

### 3.6 tenant_memberships

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| memberships_tenant_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm2 WHERE tm2.person_id = fn_current_person_id() AND tm2.tenant_id = tenant_memberships.tenant_id AND tm2.ativo = true)` | N/A |
| memberships_own_read | SELECT | `person_id = fn_current_person_id()` | N/A |
| memberships_tenant_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'memberships', 'create', tenant_id, NULL)` |
| memberships_tenant_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm2 WHERE tm2.person_id = fn_current_person_id() AND tm2.tenant_id = tenant_memberships.tenant_id AND tm2.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'memberships', 'update', tenant_id, NULL)` |
| memberships_tenant_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm2 WHERE tm2.person_id = fn_current_person_id() AND tm2.tenant_id = tenant_memberships.tenant_id AND tm2.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'memberships', 'delete', tenant_id, NULL)` |

### 3.7 unit_memberships

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| umemberships_tenant_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = unit_memberships.tenant_id AND tm.ativo = true)` | N/A |
| umemberships_own_read | SELECT | `person_id = fn_current_person_id()` | N/A |
| umemberships_tenant_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'memberships', 'create', tenant_id, unit_id)` |
| umemberships_tenant_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = unit_memberships.tenant_id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'memberships', 'update', tenant_id, unit_id)` |
| umemberships_tenant_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = unit_memberships.tenant_id AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'memberships', 'delete', tenant_id, unit_id)` |

### 3.8 roles

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| roles_tenant_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | N/A |
| roles_global_read | SELECT | `fn_person_has_permission(fn_current_person_id(), 'roles', 'read', NULL, NULL)` | N/A |
| roles_tenant_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'roles', 'create', fn_current_tenant_id(), NULL)` |
| roles_tenant_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'roles', 'update', fn_current_tenant_id(), NULL)` |
| roles_tenant_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'roles', 'delete', fn_current_tenant_id(), NULL)` |

### 3.9 permissions

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| permissions_read | SELECT | `fn_person_has_permission(fn_current_person_id(), 'permissions', 'read', fn_current_tenant_id(), fn_current_unit_id())` | N/A |
| permissions_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'permissions', 'create', fn_current_tenant_id(), NULL)` |
| permissions_update | UPDATE | `fn_person_has_permission(fn_current_person_id(), 'permissions', 'update', fn_current_tenant_id(), fn_current_unit_id())` | `fn_person_has_permission(fn_current_person_id(), 'permissions', 'update', fn_current_tenant_id(), fn_current_unit_id())` |
| permissions_delete | DELETE | `fn_person_has_permission(fn_current_person_id(), 'permissions', 'delete', fn_current_tenant_id(), fn_current_unit_id())` | `fn_person_has_permission(fn_current_person_id(), 'permissions', 'delete', fn_current_tenant_id(), fn_current_unit_id())` |

### 3.10 role_permissions

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| rp_tenant_read | SELECT | `EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND r.sistema = true) OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | N/A |
| rp_tenant_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', fn_current_tenant_id(), NULL)` |
| rp_tenant_update | UPDATE | `EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND r.sistema = true) OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', fn_current_tenant_id(), NULL)` |
| rp_tenant_delete | DELETE | `EXISTS (SELECT 1 FROM roles r WHERE r.id = role_permissions.role_id AND r.sistema = true) OR EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', fn_current_tenant_id(), NULL)` |

### 3.11 role_assignments

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| ra_tenant_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | N/A |
| ra_own_read | SELECT | `person_id = fn_current_person_id()` | N/A |
| ra_tenant_insert | INSERT | N/A | `fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', tenant_id, unit_id)` |
| ra_tenant_update | UPDATE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', tenant_id, unit_id)` |
| ra_tenant_delete | DELETE | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = fn_current_tenant_id() AND tm.ativo = true)` | `fn_person_has_permission(fn_current_person_id(), 'roles', 'assign', tenant_id, unit_id)` |

### 3.12 audit_events

| Nome da política | Comando | Condição (USING) | Com Condição de Verificação (WITH CHECK) |
|------------------|---------|------------------|------------------------------------------|
| audit_tenant_read | SELECT | `EXISTS (SELECT 1 FROM tenant_memberships tm WHERE tm.person_id = fn_current_person_id() AND tm.tenant_id = tenant_id AND tm.ativo = true)` | N/A |
| audit_own_read | SELECT | `pessoa_id = fn_current_person_id()` | N/A |
| audit_system_insert | INSERT | N/A | `true` (apenas sistema/triggers podem inserir; cliente não insere diretamente) |
| audit_no_update | UPDATE | `false` | `false` (audit_events é append-only) |
| audit_no_delete | DELETE | `false` | `false` (audit_events é append-only) |

---

## 4. Proteção de Tabelas do Sistema

Tabelas que nunca devem ser modificadas diretamente pelo cliente:

- `audit_events`: apenas inserts via trigger ou função de sistema. UPDATE e DELETE bloqueados por política `false`.
- `auth_identity_links`: apenas inserts via `fn_set_session_contexto()` ou fluxo de cadastro validado.
- `roles` com `sistema = true`: proteção adicional via trigger que bloqueia alteração/supersede de papéis do sistema (root, admin).

---

## 5. Triggers de Auditoria

```sql
-- Exemplo de trigger genérico (aplicável a pessoas, tenants, units, memberships, roles, assignments)
CREATE OR REPLACE FUNCTION trg_audit_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_acao TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_acao := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'delete';
  END IF;

  INSERT INTO audit_events (
    pessoa_id,
    auth_user_id,
    tenant_id,
    unit_id,
    recurso,
    acao,
    entidade,
    entidade_id,
    dados_anteriores,
    dados_novos,
    resultado,
    criado_em
  ) VALUES (
    fn_current_person_id(),
    (current_setting('request.jwt.claims.sub', true))::UUID,
    fn_current_tenant_id(),
    fn_current_unit_id(),
    TG_TABLE_NAME,
    v_acao,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD),
    to_jsonb(NEW),
    'sucesso',
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
```

Cada tabela sensível recebe um trigger `AFTER INSERT OR UPDATE OR DELETE` chamando `trg_audit_event()`.

---

## 6. Configuração Supabase Requerida

| Configuração | Valor | Observação |
|--------------|-------|------------|
| `RLS habilitado` | Todas as tabelas listadas | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| `Forçar RLS no proprietário` | NÃO | O proprietário da tabela (postgres) ignora RLS; as aplicações conectam como `anon` ou `authenticated` |
| `JWT claims` | `person_id`, `tenant_id`, `unit_id` | Definidos por `fn_set_session_contexto()` após login |
| `Anon key` | Somente leitura pública | Nunca usada para escrita sem autenticação |
| `Service role key` | Somente backend | Nunca exposta ao frontend; usada apenas por `fn_set_session_contexto` (SECURITY DEFINER) |

---

## 7. Matriz de Isolamento Esperada

| Cenário | Resultado esperado |
|---------|-------------------|
| Usuário sem login (anon) | 0 linhas em todas as tabelas com RLS |
| Usuário logado sem `auth_identity_links` | 0 linhas (fail-closed, não consegue definir contexto) |
| Usuário logado com tenant A, consulta tenant B | 0 linhas de tenant B |
| Usuário logado com unidade 1, consulta unidade 2 (mesmo tenant) | 0 linhas de unidade 2 (exceto se membro) |
| ROOT global sem tenant definido | Acesso global (bypass explícito, auditado) |
| Tentativa de UPDATE em `audit_events` | Bloqueado por política `false` |
| Tentativa de DELETE em `audit_events` | Bloqueado por política `false` |

---

**Próximo:** criar as migrations SQL de RLS (`007_rls_policies.sql`) e o arquivo de triggers de auditoria. Não aplicar no Supabase sem autorização.
