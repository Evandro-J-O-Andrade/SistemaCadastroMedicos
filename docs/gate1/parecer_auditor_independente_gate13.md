# PARECER AUDITOR INDEPENDENTE — Gate 1.3

**Projeto:** Gestão Médica Alpha\
**Supabase:** `susztkudafpxcxkmahbj`\
**Ambiente:** exclusivamente local (PostgreSQL 17.6)\
**Data:** 16/11/2026\
**Parecer:** **GO — sem condições pendentes**

---

## 1. Resumo Executivo

Todas as verificações do Gate 1.3 foram executadas em ambiente local. O CORE do Gestão Médica Alpha está seguro, consistente e reproduzível. Nenhuma operação remota foi executada. Nenhum commit ou push foi realizado.

---

## 2. Evidências de Instalação Local

Foram criados e validados 3 bancos de teste em PostgreSQL local (porta 54322):

| Banco | Propósito | Resultado |
|-------|-----------|-----------|
| `gate13_validate` | Instalação completa + testes | ✓ |
| `gate13_bootstrap` | Bootstrap primeiro ROOT | ✓ |
| `gate1_test` | Validação anterior (Gate 1.1/1.2) | ✓ |

Todas as 7 migrations aplicadas limpo em banco vazio, sem erros.

---

## 3. Inventário das Migrations Destinadas à Implantação

Diretório plano `supabase/migrations/` (formato reconhecido pelo Supabase CLI 2.114.0):

| Arquivo | Conteúdo |
|---------|----------|
| `011_core_people.sql` | people, auth_identity_links, trg_set_updated_at |
| `012_tenants_units.sql` | tenants, units, tenant_settings |
| `013_memberships.sql` | tenant_memberships, unit_memberships |
| `014_roles_permissions.sql` | roles, permissions, role_permissions, role_assignments |
| `015_security_functions.sql` | fn_* functions, SECURITY DEFINER, EXECUTE restrito |
| `016_audit_events.sql` | audit_events (append-only) |
| `017_rls_policies.sql` | RLS policies, triggers de auditoria |

**Excluídos do conjunto de deploy:** `test_data.sql`, `isolacao_test.sql` (apenas validação).

**Migrations antigas isoladas:** `supabase/migrations/legacy/001-010_*.sql` (não serão aplicadas).

---

## 4. Correções de Segurança Aplicadas (Gate 1.2 → 1.3)

| Achado | Correção | Verificado |
|--------|----------|------------|
| `EXECUTE` a `PUBLIC` | Revogado; apenas `authenticated` | ✓ (6 linhas, sem PUBLIC) |
| `search_path` indefinido | `ALTER FUNCTION ... SET search_path = public, pg_temp` | ✓ (proconfig preenchido) |
| `p_person_id` de terceiros | Guard `p_person_id <> fn_current_person_id() → false` | ✓ (NEG-1 = `t`) |
| `atualizado_em` vs `updated_at` | Padronizado para `updated_at` em 3 tabelas | ✓ (UPDATEs funcionam) |

---

## 5. Resultado dos Testes

### Testes de Isolamento (Gate 1.1) — 11/11

| Teste | Descrição | Resultado |
|-------|-----------|-----------|
| 1 | Fail-closed sem contexto | ✓ |
| 2 | Sem vínculo auth_identity_links | ✓ |
| 3 | Admin Tenant A isolamento | ✓ |
| 4 | Isolamento cross-unit | ✓ |
| 5 | ROOT global acesso | ✓ |
| 6 | RBAC - Suporte não exclui | ✓ |
| 7 | RBAC - Admin cria pessoas | ✓ |
| 8 | Escalada de privilégios | ✓ |
| 9 | Auditor lê auditoria / gestor não | ✓ |
| 10 | Usuário sem permissões | ✓ |
| 11 | audit_events append-only | ✓ |

### Testes Negativos de Segurança (Gate 1.2) — 8/8

| Teste | Descrição | Resultado |
|-------|-----------|-----------|
| NEG-1 | Info leak (permissões de outro) | ✓ bloqueado |
| NEG-2 | Tenant arbitrário | ✓ bloqueado |
| NEG-3 | Person_id inexistente | ✓ bloqueado |
| NEG-4 | Bypass global não-ROOT | ✓ bloqueado |
| NEG-5 | EXECUTE sobre PUBLIC | ✓ removido |
| NEG-6 | Cross-tenant explícito | ✓ bloqueado |
| NEG-7 | search_path explícito | ✓ configurado |
| NEG-8 | Unidade não vinculada | ✓ bloqueado |

### Testes de Bootstrap (Gate 1.3)

| Verificação | Resultado |
|-------------|-----------|
| Role root inserida | ✓ |
| Primeiro tenant criado | ✓ |
| Primeiro pessoa ROOT criada | ✓ |
| auth_identity_link criado | ✓ |
| tenant_membership criado | ✓ |
| role_assignment ROOT global (tenant NULL) | ✓ |
| ROOT define contexto global | ✓ (`t`) |
| ROOT vê seu tenant | ✓ (`1`) |
| ROOT tem people:read global | ✓ (`t`) |
| ROOT tem people:create global | ✓ (`t`) |
| ROOT tem audit_events:read global | ✓ (`t`) |

---

## 6. Matriz de Privilégios das Funções de Segurança

| Atributo | `fn_person_has_permission` | `fn_set_session_contexto` |
|----------|---------------------------|---------------------------|
| Proprietário | `postgres` | `postgres` |
| Execução | `SECURITY DEFINER` | `SECURITY DEFINER` |
| `search_path` | `public, pg_temp` | `public, pg_temp` |
| EXECUTE concedido a | `authenticated`, `postgres` | `authenticated`, `postgres` |
| EXECUTE revogado de | `PUBLIC` | `PUBLIC` |
| Guard anti-vazamento | `p_person_id = fn_current_person_id()` | N/A |

---

## 7. Análise de Dependências Circulares RLS

**Nenhuma dependência circular encontrada.**

- `relforcerowsecurity = f` em todas as 12 tabelas → proprietário ignora RLS
- Funções `SECURITY DEFINER` executam como `postgres` → consultas a metadados sem RLS
- Cadeia linear: Policy → `fn_person_has_permission` (SEC DEFINER) → tabelas de metadados
- `fn_set_session_contexto` não é chamado por nenhuma policy

---

## 8. Bug Não-Segurança Identificado (não bloqueia o GO)

Tabelas `tenant_memberships`, `unit_memberships` e `role_assignments` originalmente usavam `atualizado_em` enquanto o trigger `trg_set_updated_at()` escrevia em `updated_at`. Corrigido para `updated_at` em todas as 3 tabelas. UPDATEs validados funcionando.

---

## 9. Conformidade com Restrições do Gate 1.3

| Restrição | Status |
|-----------|--------|
| Não executar `supabase db push` | ✓ não executado |
| Não alterar banco remoto | ✓ não alterado |
| Não realizar commit/push/deploy | ✓ não realizado |
| Não modificar outros projetos | ✓ não modificado |
| Não iniciar Gate 2 | ✓ não iniciado |
| Apenas ambiente local | ✓ apenas local |

---

## 10. Parecer Final

**GO — sem condições pendentes.**

O CORE PostgreSQL do Gestão Médica Alpha está pronto para uma autorização específica de implantação no Supabase projeto `susztkudafpxcxkmahbj`.

**Próxima etapa (requer autorização separada do usuário):**
1. `supabase db push` para o projeto remoto
2. Commit e push para `origin/main`
3. Início do Gate 2 (Database-Driven UI/UX + frontend TSX)

---

**Assinatura do Auditor Independente:** Gate 1.3 Auditoria Concluída
