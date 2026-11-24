# Gate 2.1 — Plano de Testes (QA/AppSec)

**Status:** especificado. **Execução automatizada pendente** (ambiente local PostgreSQL/Supabase com `auth.uid()`/roles não disponível neste workspace; Docker/porta 54322 indisponíveis).

## Ambiente requerido
- PostgreSQL com extensões `pgcrypto`; schema/função `auth.uid()` compatível com Supabase (ou stub controlado para testes).
- Roles: `authenticated`, `anon` (e `service_role` se aplicável).
- Aplicar em ordem: `20261116080000`–`20261116080006` (Gate 1) + `20261118070000`–`20261118070002` (Gate 2.1) + dados de teste controlados.

## Casos obrigatórios

| # | Cenário | Esperado |
|---:|---|---|
| 1 | Identidade inexistente / sem `auth_identity_links` | `fn_auth_bootstrap_v2` falha (fail-closed, ex. `identity_not_linked`); acesso negado |
| 2 | Pessoa inativa (`people.ativo=false`) | Bootstrap/contexto negados |
| 3 | Sem role ativo | `no_active_role` (fail-closed) |
| 4 | Role revogada (`role_assignments.ativo=false` ou role inativa) | Permissões/roles efetivos não concedidos |
| 5 | Tentativa de assumir identidade de terceiros | `fn_set_session_contexto` deriva de `auth.uid()` (sem parâmetro de auth_user); `fn_person_has_permission` guard bloqueia consulta de outro `person_id` |
| 6 | Tenant não autorizado / não membro | `fn_set_session_contexto` retorna false; sem claims válidas |
| 7 | Unidade não autorizada | `fn_set_session_contexto` retorna false |
| 8 | ROOT global legítimo | Acesso global conforme assignment ROOT (tenant NULL) auditável; escopo correto |
| 9 | Escalada de privilégios | Sem concessão via parâmetros/claims cliente; RBAC/RLS negam |
| 10 | Falsificação de auditoria | INSERT direto em `audit_events` negado por RLS; eventos gravados por trigger/função confiável |
| 11 | Primeiro acesso incompleto | `fn_onboarding_status`/bootstrap sinalizam flags pendentes; liberação bloqueada até concluir etapas server-side |
| 12 | Aceite legal inexistente/desatualizado | `terms_pending`/`responsibility_pending` conforme documentos ativos obrigatórios |
| 13 | Sessão expirada / `auth.uid()` NULL | Funções protegidas falham fechado |
| 14 | Isolamento tenant/unidade | Leitura/escrita cruzada negada pelas policies e verificações de escopo |

## Execução (quando ambiente disponível)
- Rodar suíte SQL em transações isoladas (ROLLBACK) por cenário.
- Registrar evidências (queries + resultados) em `docs/gate2/evidencias_testes_gate2_1.md`.
- Separar regressões do Gate 1 de falhas novas do Gate 2.1.
- Executar `npm run build`, `npx tsc --noEmit`, `npm run lint` e registrar delta vs baseline pré-existente.

## Critério de aceite
- Todos os casos críticos (1–14) aprovados com evidência.
- Nenhuma regressão de segurança no CORE.
- Parecer GO/NO-GO independente.