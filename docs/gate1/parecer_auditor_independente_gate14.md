# PARECER AUDITOR INDEPENDENTE — Gate 1.4

**Projeto:** Gestão Médica Alpha\
**Supabase Project ID:** susztkudafpxcxkmahbj\
**Ambiente:** exclusivamente local (PostgreSQL 17.6)\
**Data:** 16/11/2026\
**Parecer:** **GO — sem condições pendentes**

---

## 1. Resumo Executivo

O Gate 1.4 foi executado integralmente em ambiente local. As 7 migrations do CORE foram renomeadas para o padrão timestamp do Supabase CLI 2.114.0, validadas em banco vazio, e todos os 29 testes de segurança e isolamento aprovados. Nenhuma operação remota foi executada. Nenhum commit ou push realizado.

---

## 2. Inventário das 7 Migrations Destinadas à Implantação

| Ordem | Nome do arquivo | SHA-256 | Conteúdo |
|-------|-----------------|---------|----------|
| 1 | `20261116080000_core_people.sql` | `4A65174DC39D22740B903763AFF3307546DC2A56E9FE59E037A0C833B80365D1` | people, auth_identity_links, trg_set_updated_at |
| 2 | `20261116080001_tenants_units.sql` | `05F57A8EC0B926A972F6AB4CF993C74C5BADD393D6616C873DAECD31EB42FD3F` | tenants, units, tenant_settings |
| 3 | `20261116080002_memberships.sql` | `F02F82A74F1F67538A460331AAD93B26732DE338057A04474523294851361AB3` | tenant_memberships, unit_memberships |
| 4 | `20261116080003_roles_permissions.sql` | `01E421136C3FB96E27123C2D60506F0E3862072B8B273AC272C25897ABBEA663` | roles, permissions, role_permissions, role_assignments |
| 5 | `20261116080004_security_functions.sql` | `933519063D08C8F03CE6AD622DD6EA688B1266BD3659AF61251615E272E53550` | fn_* functions, SECURITY DEFINER, EXECUTE restrito |
| 6 | `20261116080005_audit_events.sql` | `495B9075B084CF3429DCA1348D9A34D6E1BB1FB93FEDE317E55C9DD915A449CF` | audit_events (append-only) |
| 7 | `20261116080006_rls_policies.sql` | `FA2C4D10FDBFD296278EC6A922ECB67F2A0A9F7E77C1CA50DBC9F21B3FF93739` | RLS policies, triggers de auditoria |

**Localização:** `supabase/migrations/` (nível plano, reconhecido pelo Supabase CLI 2.114.0)

---

## 3. Migrações Legadas — Isoladas

| Diretório | Quantidade | Status |
|-----------|------------|--------|
| `supabase/migrations/legacy/` | 10 arquivos (001–010) | Isolados, não executáveis |
| `supabase/migrations/gate1/` | 7 originais + test_data.sql + isolacao_test.sql | Apenas referência e testes |

**Confirmação:** Zero migrations legadas no diretório plano executável.

---

## 4. Resultado dos Testes

### Testes de Isolamento (Gate 1.1) — 11/11

| # | Teste | Resultado |
|---|-------|-----------|
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

| # | Teste | Resultado |
|---|-------|-----------|
| NEG-1 | Info leak (permissões de outro) | ✓ bloqueado |
| NEG-2 | Tenant arbitrário | ✓ bloqueado |
| NEG-3 | Person_id inexistente | ✓ bloqueado |
| NEG-4 | Bypass global não-ROOT | ✓ bloqueado |
| NEG-5 | EXECUTE sobre PUBLIC | ✓ removido |
| NEG-6 | Cross-tenant explícito | ✓ bloqueado |
| NEG-7 | search_path explícito | ✓ configurado |
| NEG-8 | Unidade não vinculada | ✓ bloqueado |

### Testes de Papéis e Transição (Gate 1.2) — 7/7

| # | Teste | Resultado |
|---|-------|-----------|
| A | anon não lê people | ✓ |
| B | anon não define contexto | ✓ |
| C | authenticated sem contexto = 0 linhas | ✓ |
| D | Transição de tenant bloqueada | ✓ |
| E | Revogação de membership revoga acesso | ✓ |
| F | authenticated executa fn_person_has_permission | ✓ |
| G | Isolamento de claims entre sessões | ✓ |

### Testes de UPDATE nas Memberships — 3/3

| Tabela | Resultado |
|--------|-----------|
| tenant_memberships | ✓ (updated_at preenchido) |
| unit_memberships | ✓ (updated_at preenchido) |
| role_assignments | ✓ (updated_at preenchido) |

**Total: 29/29 testes aprovados.**

---

## 5. Matriz de Privilígios das Funções de Segurança

| Atributo | `fn_person_has_permission` | `fn_set_session_contexto` |
|----------|---------------------------|---------------------------|
| Proprietário | `postgres` | `postgres` |
| Execução | `SECURITY DEFINER` | `SECURITY DEFINER` |
| `search_path` | `public, pg_temp` | `public, pg_temp` |
| EXECUTE concedido a | `authenticated`, `postgres` | `authenticated`, `postgres` |
| EXECUTE revogado de | `PUBLIC` | `PUBLIC` |
| Guard anti-vazamento | `p_person_id = fn_current_person_id()` | N/A |

---

## 6. Correções Aplicadas (Gate 1.2 → 1.4)

| Achado | Correção |
|--------|----------|
| `EXECUTE` a `PUBLIC` | Revogado; apenas `authenticated` |
| `search_path` indefinido | `search_path = public, pg_temp` |
| `p_person_id` de terceiros | Guard `p_person_id <> fn_current_person_id() → false` |
| `atualizado_em` vs `updated_at` | Padronizado para `updated_at` em 3 tabelas |

---

## 7. Conformidade com Restrições do Gate 1.4

| Restrição | Status |
|-----------|--------|
| Não aplicar SQL remoto | ✓ não aplicado |
| Não criar usuários de produção | ✓ não criado |
| Não executar commit | ✓ não executado |
| Não executar push | ✓ não executado |
| Não executar deploy | ✓ não executado |
| Apenas ambiente local | ✓ apenas local |

---

## 8. Parecer Final

**GO — sem condições pendentes.**

As 7 migrations do CORE estão prontas para implantação no Supabase projeto `susztkudafpxcxkmahbj`.

**Próximas etapas (requerem autorização separada do usuário):**
1. `supabase db push` (após vinculação CLI e verificação do histórico remoto)
2. Commit e push para `origin/main` (após autorização separada)
3. Início do Gate 2 — Database-Driven UI/UX

---

**Assinatura do Auditor Independente:** Gate 1.4 Auditoria Concluída — Parecer GO
