# Gate 2.1 — Migrations incrementais (local)

**Data:** 18/11/2026  
**Base:** Gate 1.4 publicado (`20261116080000`–`20261116080006`, commit `3115219`). **Histórico publicado não modificado.**  
**Escopo:** correções de segurança, onboarding legal/primeiro acesso e bootstrap de identidade. **Sem aplicação remota, sem `db push`, sem provisionamento real.**

## Inventário (ordem de aplicação)

| Ordem | Arquivo | Objetivo |
|---:|---|---|
| 1 | `supabase/migrations/20261118070000_gate2_01_security_hardening.sql` | Endurecimento: auditoria server-side (trigger `SECURITY DEFINER`, sem INSERT direto em `audit_events`), `fn_audit_log`, correção de escopo em `fn_person_has_permission`, substituição de `fn_set_session_contexto` para derivar de `auth.uid()` (remove `p_auth_user_id` arbitrário), helper `fn_resolve_current_person`. |
| 2 | `supabase/migrations/20261118070001_gate2_02_onboarding_legal.sql` | Tabelas `legal_documents`, `legal_acceptances`, `user_onboarding` (RLS), funções controladas: `fn_accept_legal_document`, `fn_mark_password_changed`, `fn_complete_welcome`, `fn_onboarding_status`, `fn_ensure_onboarding_state`. |
| 3 | `supabase/migrations/20261118070002_gate2_03_auth_bootstrap.sql` | RPC `fn_auth_bootstrap_v2()` (sem args, `auth.uid()`, fail-closed) retornando contrato tipado para frontend. |

## Correções de segurança endereçadas (design)

- **Identidade/contexto:** `fn_set_session_contexto` não aceita mais `auth_user_id` do chamador; usa `auth.uid()` e valida `auth_identity_links` + `people.ativo` + memberships (ROOT global tratado explicitamente).
- **RBAC:** `fn_person_has_permission` passa a considerar assignment global (`tenant_id NULL`) e tenant-wide (`unit_id NULL`) de forma consistente no escopo solicitado, mantendo guard anti-vazamento.
- **Auditoria:** remoção de `WITH CHECK (true)` para INSERT em `audit_events`; inserção via trigger `SECURITY DEFINER`/`fn_audit_log`; campos de autoria derivados do contexto autenticado.
- **Onboarding/aceites:** evidências persistidas em tabelas próprias, escrita por funções controladas (não pelo frontend direto).

## Dependências e observações

- Requer objetos do Gate 1 (`trg_set_updated_at`, `fn_current_*`, tabelas CORE/IAM, RLS). Assume extensão/ambiente com `auth.uid()` disponível (Supabase).
- **Validação pendente:** execução em banco local limpo com stack Supabase (roles `authenticated/anon`, schema `auth`) e suíte de testes negativos/positivos — **não executada** neste ambiente (Docker/Supabase local indisponível; `psql` local na porta 54322 recusou conexão).
- **Provisionamento ROOT:** não realizado. Bootstrap ROOT deve ser procedimento administrativo protegido e auditado (separado).

## Riscos residuais (para auditoria)

- Claims de sessão via `set_config(..., true)` são transacionais; adequação para PostgREST multi-request deve ser validada (pode exigir estratégia adicional/JWT custom ou RLS baseada em `auth.uid()` direto).
- `fn_auth_bootstrap_v2` consolida permissões efetivas; políticas que dependem de `fn_current_tenant_id()` exigem contexto definido de forma compatível com o fluxo real.
- Necessário revisar se políticas existentes (007) permanecem coerentes com a nova semântica de escopo ROOT/multi-tenant.
