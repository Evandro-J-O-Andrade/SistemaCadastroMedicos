// docs/gate1/arquitetura_core.md
# GATE 1 — Arquitetura CORE do Gestão Médica Alpha

**Projeto:** SistemaCadastroMedicos\
**Supabase Project ID:** susztkudafpxcxkmahbj\
**Banco:** PostgreSQL 17 (Supabase)\
**Arquitetura:** People-First, Multi-tenant, Multiunidade, Database-Driven UI/UX\
**Escopo:** Modelagem, revisão técnica e preparação de artefatos locais. Não aplicar SQL remoto.

---

## 1. Princípios de Projeto

| Princípio | Definição |
|-----------|-----------|
| **People-First** | A pessoa física (`people`) é a identidade canônica, independente de cargo, papel ou vínculo. |
| **Identidade ≠ Autenticação ≠ Autorização** | `auth.users` (Supabase Auth) autentica. `people` identifica a pessoa. `roles` + `permissions` autorizam. |
| **Fail-closed** | Nenhuma permissão é concedida por padrão. A ausência de vínculo ativo nega acesso. |
| **Contexto confiável** | `tenant_id` e `person_id` vêm exclusivamente de claims do JWT (`request.jwt.claims`), nunca do corpo da requisição do frontend. |
| **Isolamento por tenant e unidade** | RLS garante que dados de um tenant/unidade não vazem para outro. |
| **Bypass auditável** | ROOT tem bypass, mas toda execução é registrada em `audit_events`. |

---

## 2. Contratos entre Entidades

### 2.1 auth.users ↔ people (Contrato de Identidade)

Supabase Auth gerencia `auth.users` (id, email, senha criptografada, confirmação, MFA).  
`people` é a entidade canônica de pessoa física no domínio da aplicação.

**Contrato:**  
- Cada `auth.users.id` (UUID) mapeia para **exatamente um** `people.id` (UUID).  
- O mapeamento é feito por `auth_identity_links(auth_user_id → people_id)`, 1:1, obrigatório.  
- `people.nome` é a fonte da verdade para exibição; `auth.users.email` é a fonte para login.  
- Uma pessoa sem `auth_identity_links` não pode autenticar no sistema (fail-closed).  
- Uma pessoa pode existir em `people` sem ainda ter vínculo em `auth_identity_links` (cadastro prévio), mas não acessa.

### 2.2 people ↔ tenants (Contrato de Organização)

- Uma pessoa pode pertencer a **zero ou mais** tenants.  
- O vínculo é materializado por `tenant_memberships(person_id → tenant_id, ativo)`.  
- Apenas pessoas com `tenant_memberships.ativo = true` enxergam dados daquele tenant.

### 2.3 people ↔ units (Contrato de Unidade)

- Uma pessoa pode pertencer a **zero ou mais** unidades, sempre dentro de um tenant.  
- O vínculo é materializado por `unit_memberships(person_id → unit_id, tenant_id, ativo)`.  
- `unit_memberships.tenant_id` é redundante propositalmente (desnormalização de segurança): evita joins cruzados e garante que a unidade pertença ao tenant do contexto.

### 2.4 people ↔ roles (Contrato de Papel)

- Uma pessoa pode ter **zero ou mais** papéis, cada um com escopo opcional de tenant e/ou unidade.  
- Materializado por `role_assignments(person_id → role_id, tenant_id?, unit_id?, ativo)`.  
- Papel sem tenant é global (ex.: ROOT). Papel com tenant é restrito a esse tenant.  
- Papel com tenant e unidade é restrito à interseção.

### 2.5 Contexto Ativo de Sessão

Após login, o frontend define via `set_config` (RPC confiável):
- `request.jwt.claims.person_id` → UUID da pessoa autenticada
- `request.jwt.claims.tenant_id` → UUID do tenant ativo na sessão
- `request.jwt.claims.unit_id` → UUID da unidade ativa na sessão (opcional)

Funções SQL `fn_current_person_id()` e `fn_current_tenant_id()` lêem esses claims.  
RLS usa essas funções para filtrar linhas.  
O frontend **não** pode injetar `tenant_id` livremente; apenas o RPC de contexto (chamado após login validado) define os claims.

---

## 3. Separação de Responsabilidades

| Camada | Responsabilidade | Tabelas |
|--------|------------------|---------|
| Autenticação | Verificar credenciais, gerenciar sessão, MFA | `auth.users` (Supabase Auth, não tocamos) |
| Identidade | Pessoa canônica, dados pessoais | `people`, `auth_identity_links` |
| Organização | Tenants, unidades, configurações | `tenants`, `units`, `tenant_settings` |
| Vínculos | Quem pertence a onde, ativo/inativo | `tenant_memberships`, `unit_memberships` |
| Autorização | Papéis, permissões, atribuições com escopo | `roles`, `permissions`, `role_permissions`, `role_assignments` |
| Contexto | Claims de sessão, pessoa ativa, tenant ativo | JWT claims + `set_config` |
| Auditoria | Quem, o quê, quando, onde, resultado | `audit_events` |

---

## 4. Dependências entre Módulos

```
auth.users (Supabase Auth, externo ao schema public)
       │
       ▼
auth_identity_links ──► people ──┬──► tenant_memberships ──► tenants
       │                         │                         │
       │                         └──► unit_memberships ─────► units
       │
       └──► role_assignments ──► roles ──┬──► role_permissions ──► permissions
                                         │
                                         └──► (escopo: tenant_id, unit_id)
```

Módulos de domínio (Plantão, Produção Médica, Relatórios, etc.) dependem exclusivamente do CORE acima. Nenhum módulo de domínio referencia `auth.users` diretamente; todos referenciam `people.id` via `fn_current_person_id()`.

---

## 5. Regras de Negócio do CORE

1. **Única identidade por pessoa:** `auth_identity_links` é 1:1 e único em ambos os lados.
2. **Vínculo ativo obrigatório:** `tenant_memberships.ativo` e `unit_memberships.ativo` controlam visibilidade.
3. **Papel sem escopo = global:** Apenas ROOT pode ter `role_assignments` sem `tenant_id` (ou com `tenant_id` NULL para acesso cross-tenant).
4. **Unidade exige tenant:** `unit_memberships.tenant_id` deve coincidir com `tenants.id` da unidade referenciada.
5. **Primeiro administrador:** Bootstrap controlado — primeira pessoa a se cadastrar em um tenant novo recebe papel `admin` apenas após validação manual por ROOT ou fluxo de convite.
6. **Revogação desativa, não exclui:** `ativo = false` em memberships e role_assignments; dados históricos preservados.
7. **Auditoria obrigatória:** Todas as escritas em tabelas de domínio geram evento em `audit_events`.

---

## 6. O que NÃO fazemos nesta fase

- Não executar SQL no Supabase.
- Não aplicar migrations 001–010 antigas como estão.
- Não usar `hasPermission()` retornando `true` indiscriminadamente.
- Não confiar em `tenant_id` enviado pelo frontend como prova de autorização.
- Não criar usuários reais ou dados de produção.
- Não alterar páginas TSX nesta fase.

---

**Próximo gate:** Revisão cruzada dos artefatos, solicitação de autorização para implantação do Gate 1 no Supabase.
