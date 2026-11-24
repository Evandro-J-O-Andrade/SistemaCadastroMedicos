# Gate 2.1.4 — Matriz de Testes e Evidências (local)

- **Data:** 2026-11-18
- **Ambiente:** PostgreSQL 17.6 local (`127.0.0.1:54322`, DB `gate213_test`), stub `auth.uid()/auth.role()/auth.email()`, roles `authenticated/anon/service_role/postgres`.
- **Migrations aplicadas (ordem):** `20261116080000`–`20261116080006` (Gate 1, preservado) + `20261118070000`–`20261118070004` (Gate 2.1.2/2.1.4, incrementais, locais).
- **Seed:** controlado (`SETUP_OK`: 8 `auth.users`, 7 `people`/links, 2 tenants, 2 units base, memberships, 3 roles, 3 permissões, 5 role_assignments incl. ROOT global/tenant-scoped, 2 docs legais obrigatórios).

## Correções aplicadas (Gate 2.1.4)

| Área | Correção | Arquivo(s) |
|---|---|---|
| Volatilidade | `fn_onboarding_status` e `fn_auth_bootstrap_v2` passam a `VOLATILE` (garantia de estado/idempotência com INSERT). | `20261118070001_gate2_02_onboarding_legal.sql`, `20261118070002_gate2_03_auth_bootstrap.sql`, DB local |
| Privilégios mínimos | `GRANT USAGE` + `SELECT,INSERT,UPDATE,DELETE` em tabelas core/IAM para `authenticated`; `SELECT` em `legal_documents/acceptances`, `user_onboarding`, `audit_events`; `REVOKE ALL` sensível de `anon`. RLS permanece enforcement. | `20261118070004_gate2_05_grants_and_coherence.sql` |
| ROOT global vs tenant-scoped | `fn_is_root` = **global only** (`ra.tenant_id IS NULL`). `fn_auth_bootstrap_v2` retorna todas permissões ativas para qualquer assignment `root` ativo (coerência contrato/UI) **sem** conceder bypass global em RLS; `fn_person_has_permission` concede no tenant escopado e nega cross-tenant. | `20261118070002_gate2_03_auth_bootstrap.sql`, `20261118070000_gate2_01_security_hardening.sql` |
| Troca de senha confiável | `fn_mark_password_changed` exige contexto `service_role` (claims/JWT/GUC), EXECUTE só `service_role`; cliente autenticado não pode auto-declarar. Evidência DB via contexto de serviço simulado; integração com evento real Supabase Auth pendente. | `20261118070001_gate2_02_onboarding_legal.sql` |
| Auditoria | INSERT direto em `audit_events` negado (RLS/policy + sem grant cliente); `fn_audit_log` restrita (sem EXECUTE authenticated). | `20261118070000_gate2_01_security_hardening.sql`, `70004` |

## Matriz (esperado × obtido)

| # | Cenário | Esperado | Obtido | Evidência |
|---:|---|---|---|---|
| 1 | Identidade inexistente / sem link | fail-closed | **PASS** `identity_not_linked` (nolink 7777, inativo 6666 via join people.ativo) | `C1_nolink`, `C2_inactive` |
| 2 | Pessoa inativa | acesso negado | **PASS** fail-closed (sem identidade ativa resolvida) | `C2_inactive` |
| 3 | Sem role ativo | fail-closed | **PASS** `no_active_role` | `C3_norole` |
| 4 | Role revogada | sem concessão efetiva | **PASS** `no_active_role` após `ativo=false` (restaurado) | `C4_revoked` |
| 5 | Impersonação (permissão de terceiros) | negado | **PASS** self `t`, other `f` | `C5_self`, `C5_other` |
| 6 | Tenant não autorizado | contexto negado | **PASS** own `t`, other `f` | `C6_ctx_own_tenant`, `C6_ctx_other_tenant` |
| 7 | Unidade não autorizada | contexto negado | **PASS** `f` | `C7_ctx_wrong_unit` |
| 8 | ROOT global legítimo | acesso global/auditável; coerente | **PASS** `fn_is_root=t`, bootstrap all perms, RLS vê 2 tenants | `C8_global_is_root`, `C1_root_global`, `RLS_globalroot_tenants` |
| 8b | ROOT tenant-scoped | **sem bypass global**; acesso no tenant; contrato coerente | **PASS** `fn_is_root=f`, bootstrap all perms + membership A, perm in A `t` / in B `f`, RLS vê só Tenant A | `C8_scoped_*`, `RLS_scopedroot_*` |
| 9 | Escalada de privilégios | negada | **PASS** perm não concedida `f`; INSERT `role_assignments`/chamada `fn_audit_log` negados por RLS/privilege | `C9_not_granted`, erros RLS/permission |
| 10 | Falsificação de auditoria | negada; escrita só confiável | **PASS** INSERT direto `audit_events` negado; `fn_audit_log` sem EXECUTE p/ authenticated; eventos de aceite/senha/welcome por fluxos controlados | erros + `AUDIT_recent` (accept/password_changed/welcome_completed, sucesso) |
| 11 | Primeiro acesso incompleto | flags pendentes; bloqueio | **PASS** pendências iniciais; welcome bloqueado antes de aceite/senha | `ONB_status`, `ONB_welcome_before/pwd_pending` |
| 12 | Aceite legal versionado | evidência; pendência atualizada | **PASS** `fn_accept_legal_document` grava aceite+audit; `terms/responsibility_pending` passam a false; doc inexistente rejeitado (lote anterior) | `ONB_accept_*`, `ONB_status_after_accepts` |
| 13 | Sessão expirada / `auth.uid()` NULL | fail-closed | **PASS** `not_authenticated` | `C13_null_auth` |
| 14 | Isolamento tenant/unidade (com grants) | leitura/escrita própria permitida, cruzada negada | **PASS (parcial)** tenants/units: userA vê só A/A1 (e A2 após seed), sem ver B/B1, UPDATE cross-tenant 0; userB vê só B; scoped root só A; anon sem acesso. Unit-only member (tenant+unit A2) vê units A1/A2 e tenant A, não B. | `RLS_userA/B_*`, `RLS_scopedroot_*`, `RLS_unit_member_*`, anon erro |
| 14b | Isolamento intra-tenant `people` (visibilidade compartilhada) | membros do mesmo tenant veem pessoas do tenant (esperado) | **PASS (após 70005)** userA vê 4 pessoas do tenant A (Admin/User/No Role/Scoped Root), não vê pessoa do tenant B. userB vê só pessoa do tenant B. Correção: `fn_persons_share_active_tenant` (SECURITY DEFINER) + policies `people/auth_identity_links` por co-membership real. | `RLS_userA_people_visible_fix` n=4, `RLS_userA_sees_B_person` n=0, `RLS_userB_people_visible` n=1 |
| 15 | Troca de senha confirmada por fluxo confiável | só serviço autorizado; não auto-declarável | **PASS (DB)** `fn_mark_password_changed` EXECUTE negado a authenticated; em contexto `service_role` retorna `t`, atualiza estado e audita; welcome completa após confirmação. **Integração com evento Supabase Auth (hook/edge/server)** não implementada neste repo/escopo. | `ONB_mark_pwd_client` negado, `ONB_mark_pwd_service` ok, `ONB_status_final` |

## Observações técnicas

- `fn_set_session_contexto` permanece best-effort/transacional (GUC) e stateless no modelo alvo; políticas migradas para `auth.uid()/membership/fn_is_root` (70003).
- Grants em tabelas são necessários para PostgREST/role alcançar RLS; não substituem policies. `anon` revogado das tabelas sensíveis.
- `auth.uid/role` em teste são stubs (`request.jwt.claim.*`); validação final deve ocorrer em stack Supabase real (PostgREST/JWT) em homologação.
- `RLS_userA_people_visible=1` indica provável limitação de visibilidade intra-tenant via RLS aninhada em `tenant_memberships` — **não usar como evidência de isolamento correto multiusuário** até correção.
- Frontend/Auth Provider **não ativado**. `fn_auth_bootstrap_v2` mantém contrato (`person_id, full_name, email, roles, permissions[], memberships[], must_change_password, terms_pending, responsibility_pending, welcome_pending`) compatível com Gate 2 (ZIP) em formato; integração de chamada/guards/Dispatcher permanece pendente e controlada.
- Histórico Gate 1 (`20261116080000-006`, `gate1/`, `legacy/`) preservado.
