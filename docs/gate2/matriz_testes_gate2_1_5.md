# Gate 2.1.5 — Matriz de Testes e Evidências (local)

- **Data:** 2026-11-18
- **Ambiente:** PostgreSQL 17.6 local (`127.0.0.1:54322`, DB `gate213_test`, container `supabase_db_SistemaCadastroMedicos` healthy). Sem PostgREST/GoTrue/Kong local, sem `supabase/config.toml` — **testes HTTP com JWT real em Supabase local indisponíveis**. Sessões simuladas via `authenticated`/claims GUC e `request.jwt.claim.role`/`auth.role()`.
- **Migrations aplicadas (ordem):** `20261116080000`–`20261116080006` (Gate 1, preservado) + `20261118070000`–`20261118070006` (Gate 2.1.x incrementais, locais, uncommitted).
- **Base:** reseed controlado Gate 2.1.4 + dados adicionais criados pelos testes de registro.

## Correções/entregas (Gate 2.1.5)

| Área | Implementação | Arquivo |
|---|---|---|
| RLS `people` (INSERT/UPDATE/DELETE tenant-scoped) | `fn_has_people_permission_in_any_member_tenant(recurso,acao)` (SECURITY DEFINER, STABLE) autoriza admin com permissão em tenant ativo de membership; policies `people_insert/update/delete` ajustadas sem quebrar root/global/self/co-membership. | `supabase/migrations/20261118070006_gate2_07_people_rls_and_registration.sql` |
| Cadastro transacional seguro | `fn_admin_register_person(tenant_id,nome,email,telefone,documento,data_nascimento,ativo,unit_id)` (SECURITY DEFINER, VOLATILE): valida auth, membership+permissão no tenant alvo, tenant/unidade ativos e coerentes; cria `people` + `tenant_memberships` (+ `unit_memberships`) atomicamente; audita `people/admin_register`; **não** cria usuário Supabase Auth/`auth_identity_link`; **sem** auto-ROOT por e-mail. | `20261118070006_gate2_07_people_rls_and_registration.sql` |
| Prova de troca de senha (servidor/evento) | `fn_confirm_password_changed_by_auth_user(auth_user_id)` (service_role-only, revogado de authenticated) resolve link→pessoa, atualiza `user_onboarding`, audita com `auth_user_id`; `fn_mark_password_changed` já restrita a `service_role` (claims/auth.role). Frontend não pode auto-declarar. | `20261118070001_gate2_02_onboarding_legal.sql`, `20261118070006_gate2_07_people_rls_and_registration.sql` |
| Co-membership/RLS (prévio 70005) | Mantido; visibilidade intra-tenant `people` validada. | `20261118070005_gate2_06_rls_comembership.sql` |

## Matriz (esperado × obtido)

| # | Cenário | Esperado | Obtido | Evidência |
|---:|---|---|---|---|
| R1 | Admin autorizado (tenant A) cadastra pessoa no próprio tenant (RPC transacional) | cria `people`+`tenant_memberships`(+`unit_memberships`) atomicamente, retorna resultado | **PASS** | `rpc_ok` status created com `person_id/tenant_id/unit_id`; registros confirmados em `people`, `tenant_memberships`, `unit_memberships` (ex.: `medA2@example.test` com tenant/unit A; `Medico Tenant A` memberships presentes) |
| R2 | Bloqueio cross-tenant | negado | **PASS** | `rpc_cross_tenant` → `forbidden_tenant_scope` |
| R3 | Unidade inválida/não pertencente ao tenant | negado, sem órfãos | **PASS** | `rpc_wrong_unit` → `invalid_unit_for_tenant` |
| R4 | Usuário sem permissão de criação | negado | **PASS** | `rpc_no_perm` (operador_ti) → `forbidden_tenant_scope`; INSERT direto negado por RLS |
| R5 | Rollback transacional | sem registros órfãos | **PASS** | `DO` com RPC + exceção forçada → `rollback_atomic=0`, `rollback_tm=0` |
| R6 | ROOT tenant-scoped registra em tenant próprio / bloqueado em alheio | permitido em escopo, negado fora | **PASS** | `scoped_root_reg_A` created; `scoped_root_reg_B` → `forbidden_tenant_scope` |
| R7 | ROOT global registra em qualquer tenant (com unit coerente) | permitido | **PASS** | `global_root_reg_B` created (tenant B + unit B1) |
| R8 | Isolamento de leitura/escrita (RLS) preservado | próprio ok, cruzado negado | **PASS (regressão preservada)** | tenants/units visíveis por escopo; cross-tenant invisível/bloqueado; admin vê co-membros tenant A |
| R9 | Confirmação de senha por evento confiável | apenas service_role, por `auth_user_id`; cliente bloqueado | **PASS (DB)** | `pwd_confirm_unknown=f`, `pwd_confirm_known=t` (auth 2222→person bbbb), `user_onboarding.must_change_password=false` + `password_changed_at`; chamada authenticated negada (`permission denied`); auditoria com `confirmed_by=service_role` e `auth_user_id` |
| R10 | `fn_mark_password_changed` não auto-declarável | apenas service_role | **PASS** | sucesso sob `service_role` claim (`auth.role()=service_role`); negado a authenticated (execuções anteriores/execução direta) |
| R11 | Regressão Gate 2.1.4 (bootstrap/ROOT/RLS/auditoria/onboarding) | preservada | **PASS (amostral)** | bootstrap root global/scoped/userA ok/fail-closed conforme identidade; `userA_tenants=1`, `userA_tenantB=0`; aceite/auditoria/welcome validados em 2.1.4/2.1.5 |

## Achados / limitações

| Item | Status | Detalhe |
|---|---|---|
| INSERT direto em `people` por admin tenant-scoped | **Inconsistente/Bloqueado em cenários** | Policy permite por helper, mas sessões authenticated observaram `new row violates row-level security policy` em alguns INSERTs diretos (variabilidade de contexto/avaliação). **Caminho suportado e seguro:** `fn_admin_register_person` (transacional, garante vínculos/escopo). Direct INSERT sem vínculo criaria pessoa órfã/não-escopada — evitar no fluxo admin. |
| Visibilidade de retorno de memberships | **Restrita por RLS/permissão** | Admin sem `memberships.read` não lê linhas de `tenant_memberships/unit_memberships` de terceiros via SELECT (RLS exige self/root/perm), embora RPC crie e retorne IDs; pessoa criada fica visível por co-membership. Ajuste de permissão/policy de leitura pode ser necessário para UX administrativa. |
| `medical_professionals` / CRM / CBO / SIGTAP | **Fora do schema Gate 1 aplicado** | Tabelas existem em `supabase/migrations/legacy/004_medical_catalog.sql` (não aplicadas no conjunto Gate 1/2.1 local). Cadeia completa `people → tenant/unit memberships → medical_professionals` **parcial** (até memberships). Cadastro médico completo depende de migração/controlada do catálogo legado. |
| Integração real Auth (senha/provisionamento) | **PENDENTE** | `fn_confirm_password_changed_by_auth_user`/service_role prontos no DB; falta hook/servidor/Edge Function comprovado acionado por evento real de password change no Supabase Auth. Provisionamento seguro via Supabase Auth/Admin API não implementado/executado (sem remoto; sem auto-ROOT por e-mail). |
| HTTP/JWT real Supabase local | **BLOQUEADO** | Stack local incompleta (apenas DB). Requisições PostgREST independentes com JWT real não executáveis neste ambiente. |
| Isolamento de escrita por unidade (fino) | **PARCIAL** | Unidade validada no RPC (pertence ao tenant); operações diretas em `unit_memberships` dependem de `memberships` permissão/escopo não exercitadas exaustivamente. |

## Restrições respeitadas
- Nenhuma alteração no Supabase remoto; nenhum `db push` real; nenhum provisionamento ROOT real.
- Nenhum commit/push/deploy.
- Gate 1 preservado; Auth Provider Enterprise não ativado; módulos médicos/plantão 12×36/relatórios não alterados.
