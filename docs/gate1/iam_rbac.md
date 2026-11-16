# GATE 1 — IAM / RBAC: Matriz de Permissões e Contrato Auth ↔ People

**Projeto:** SistemaCadastroMedicos\
**Escopo:** Identidade, autenticação, autorização, vínculos contextuais.\
**Requisito central:** `hasPermission()` NÃO retorna `true` indiscriminadamente. Fail-closed por padrão.

---

## 1. Contrato Auth ↔ People

### 1.1 Fluxo de identidade

```
Supabase Auth (auth.users)
         │
         │ login válido (email + senha)
         ▼
auth_identity_links ─────────► people (id UUID)
         │                          │
         │ vínculo 1:1 confiável    │ dados pessoais
         │                          ▼
         │                    tenant_memberships (ativo)
         │                          │
         │                          ▼
         │                    unit_memberships (ativo, dentro do tenant)
         │                          │
         │                          ▼
         │                    role_assignments (papel + escopo)
         │                          │
         │                          ▼
         │                    permissions (recurso.acao)
         ▼
fn_set_session_contexto() define JWT claims:
  request.jwt.claims.person_id = people.id
  request.jwt.claims.tenant_id = tenants.id
  request.jwt.claims.unit_id   = units.id (opcional)
```

### 1.2 Regras do contrato

| Regra | Definição |
|-------|-----------|
| **1:1 obrigatório** | Cada `auth.users.id` mapeia para exatamente um `people.id` via `auth_identity_links`. |
| **Sem link = sem acesso** | Pessoa sem `auth_identity_links` não consegue definir contexto de sessão → RLS nega todas as linhas. |
| **Pessoa ≠ papel** | `people` não tem campo de papel. O papel vem de `role_assignments`, que é contextual. |
| **Múltiplos vínculos** | Uma pessoa pode ter múltiplos `tenant_memberships` e múltiplos `unit_memberships`. |
| **Múltiplos papéis** | Uma pessoa pode ter múltiplos `role_assignments` com escopos diferentes. |
| **Vínculo ativo obrigatório** | Apenas `tenant_memberships.ativo = true` e `unit_memberships.ativo = true` concedem visibilidade. |
| **Unidade exige tenant** | `unit_memberships.tenant_id` deve coincidir com o tenant da unidade. |

### 1.3 Perfis como atribuições contextuais

- Uma pessoa NÃO é "admin" de forma fixa. Ela tem uma ou mais `role_assignments` que podem ser ativas ou inativas.
- O mesmo papel pode ter escopos diferentes em diferentes tenants/unidades.
- Exemplo: João é `operador_ti` no Tenant A (Unidade 1) e `auditor` no Tenant B (sem unidade).
- A revogação de um papel faz `ativo = false` em `role_assignments`; não exclui o registro.

---

## 2. Matriz RBAC por Recurso e Operação

Permissões atômicas seguem o padrão `recurso.acao`. Ausência de permissão = acesso negado (fail-closed).

### 2.1 Catálogo de recursos e ações

| Recurso | Ações atômicas | Descrição |
|---------|---------------|-----------|
| `people` | create, read, update, delete, list, search | Gestão de pessoas físicas |
| `tenants` | create, read, update, delete, list, configure | Gestão de organizações |
| `units` | create, read, update, delete, list, configure | Gestão de unidades |
| `memberships` | create, read, update, delete, list, revoke | Vínculos pessoa-tenant-unidade |
| `roles` | create, read, update, delete, list, assign | Gestão de papéis |
| `permissions` | create, read, update, delete, list | Gestão de permissões atômicas |
| `role_assignments` | create, read, update, delete, list, revoke | Atribuição de papéis |
| `audit_events` | read, list, export | Consultar trilha de auditoria |
| `tenant_settings` | read, update, list | Configurações de tenant |
| `session` | create_context, revoke_context | Definir/revogar contexto de sessão |
| `medicos` | create, read, update, delete, list | (domínio futuro - Gate 4) |
| `producao` | create, read, update, delete, list, close | (domínio futuro - Gate 4) |

### 2.2 Matriz de permissões por perfil

| Recurso\Ação | ROOT | Admin | Gestor | Operador TI | Suporte | Auditor |
|-------------|------|-------|--------|-------------|---------|---------|
| people.create | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✗ | ✗ | ✗ |
| people.read | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| people.update | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✗ | ✗ | ✗ |
| people.delete | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| people.list | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| people.search | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| tenants.create | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| tenants.read | ✓ | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) |
| tenants.update | ✓ | ✓ (próprio) | ✗ | ✗ | ✗ | ✗ |
| tenants.delete | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| tenants.list | ✓ | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) |
| tenants.configure | ✓ | ✓ (próprio) | ✗ | ✗ | ✗ | ✗ |
| units.create | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| units.read | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| units.update | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| units.delete | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| units.list | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| units.configure | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| memberships.create | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| memberships.read | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| memberships.update | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| memberships.delete | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| memberships.revoke | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| memberships.list | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| roles.create | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| roles.read | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| roles.update | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| roles.delete | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| roles.list | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| roles.assign | ✓ | ✓ (seu tenant) | ✗ | ✗ | ✗ | ✗ |
| permissions.read | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| permissions.list | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (sua unidade) | ✓ (seu tenant) |
| audit_events.read | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✗ | ✗ | ✓ (seu tenant) |
| audit_events.list | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✗ | ✗ | ✓ (seu tenant) |
| audit_events.export | ✓ | ✓ (seu tenant) | ✓ (sua unidade) | ✗ | ✗ | ✓ (seu tenant) |
| tenant_settings.read | ✓ | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) |
| tenant_settings.update | ✓ | ✓ (próprio) | ✗ | ✗ | ✗ | ✗ |
| session.create_context | ✓ | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) |
| session.revoke_context | ✓ | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) | ✓ (próprio) |

**Legenda:** ✓ = permitido, ✗ = negado por padrão.\
"Seu tenant" = apenas linhas onde `tenant_id` corresponde ao contexto da sessão.\
"Sua unidade" = apenas linhas onde `unit_id` corresponde ao contexto da sessão.\
"Próprio" = apenas o tenant/unidade do usuário logado.

### 2.3 Regras de escopo

| Perfil | Escopo padrão | Observação |
|--------|--------------|------------|
| ROOT | Global (todos os tenants) | Bypass explícito, auditado em `audit_events` |
| Admin | Seu tenant | Pode gerenciar tudo dentro do próprio tenant |
| Gestor | Sua unidade | Acesso restrito à unidade do contexto |
| Operador TI | Sua unidade | Acesso operacional restrito à unidade |
| Suporte | Sua unidade | Acesso limitado de suporte à unidade |
| Auditor | Seu tenant | Leitura de auditoria, sem escrita |

### 2.4 Restrições de atribuição de papéis

1. **Apenas ROOT pode atribuir o papel ROOT.**
2. **Apenas ROOT ou Admin do tenant pode atribuir papéis dentro desse tenant.**
3. **Não é permitido atribuir um papel com escopo de unidade sem especificar o tenant.**
4. **Revogação de papel:** `ativo = false` em `role_assignments`; não há exclusão física.
5. **Papel sem tenant:** Apenas ROOT pode ter `tenant_id = NULL` em `role_assignments` (garantido por `chk_role_assignment_scoped`).

### 2.5 Prevenção de elevação de privilégios

- O frontend NÃO pode definir `tenant_id` ou `role` livremente.
- O contexto de sessão é definido exclusivamente por `fn_set_session_contexto()`, que valida vínculos em `tenant_memberships` e `unit_memberships`.
- `fn_person_has_permission()` lê os claims de sessão (`fn_current_person_id()`, `fn_current_tenant_id()`) e valida contra `role_assignments` persistidos.
- Não há cache local de permissão no frontend que substitua a verificação do banco.

---

## 3. Fluxo de Criação do Primeiro Administrador (Bootstrap)

1. ROOT cria o tenant via `tenants.insert` (somente ROOT pode criar tenants).
2. ROOT convida a primeira pessoa: cria registro em `people` + `auth_identity_links` (ou aguarda cadastro via Supabase Auth).
3. ROOT cria `tenant_memberships` (ativo) vinculando a pessoa ao tenant.
4. ROOT cria `role_assignments` com `role_id = 'admin'` e `tenant_id = <novo tenant>`.
5. A pessoa faz login no Supabase Auth.
6. O frontend chama `fn_set_session_contexto(auth_user_id, tenant_id)`.
7. O sistema valida o vínculo e define os claims de sessão.
8. A pessoa acessa como admin do tenant.

Somente após esse fluxo, administradores do tenant podem criar outros usuários, unidades e membros.

---

**Não implementado:** `hasPermission()` retornando `true` indiscriminadamente. Toda verificação de permissão no frontend deve chamar o backend (RPC `fn_person_has_permission`) ou confiar no RLS do banco, nunca assumir verdade.
