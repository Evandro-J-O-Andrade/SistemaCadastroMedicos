# Parecer Gate 2.1 — Fundação segura de identidade (local)

**Projeto:** Gestão Médica Alpha Enterprise  
**Data:** 18/11/2026  
**Escopo autorizado:** desenvolvimento e testes locais do Gate 2.1 (sem implantação remota).  
**Parecer:** **NO-GO (condicional)** para ativar fluxo produtivo / implantar — **GO condicionado** apenas para avanço local controlado após validação em ambiente compatível.

## Entregáveis produzidos (locais)

1. **Migrations incrementais (não aplicam histórico publicado):**
   - `supabase/migrations/20261118070000_gate2_01_security_hardening.sql`
   - `supabase/migrations/20261118070001_gate2_02_onboarding_legal.sql`
   - `supabase/migrations/20261118070002_gate2_03_auth_bootstrap.sql`
2. **Contrato e documentação:**
   - `docs/gate2/gate2_1_migrations_relatorio.md`
   - `docs/gate2/contrato_auth_bootstrap_v2.md`
   - `docs/gate2/plano_integracao_frontend.md`
   - `docs/gate2/plano_testes_gate2_1.md`

## O que foi endereçado no design (DBA/AppSec/IAM)

- **Bootstrap:** `fn_auth_bootstrap_v2()` sem argumentos, identidade derivada de `auth.uid()` → `auth_identity_links` → `people` ativa, fail-closed (sem vínculo/sem papel ativo).
- **Contexto:** `fn_set_session_contexto` passa a derivar identidade de `auth.uid()` (remove `p_auth_user_id` arbitrário do cliente) e valida memberships (ROOT tratado explicitamente).
- **RBAC:** ajuste de escopo em `fn_person_has_permission` (assignment global/tenant-wide) mantendo guard anti-vazamento.
- **Auditoria:** remoção de INSERT livre em `audit_events`; trigger `SECURITY DEFINER`; `fn_audit_log` controlado; autoria derivada do contexto autenticado.
- **Onboarding legal:** tabelas `legal_documents`, `legal_acceptances`, `user_onboarding` com RLS restritiva e funções controladas para aceite/evidência, marcação de troca de senha e conclusão de welcome; `fn_onboarding_status` server-side.

## Validações executadas

| Item | Resultado |
|---|---|
| `npm run build` (Vite) | **OK** (avisos pré-existentes: export/chunk) |
| Aplicação das migrations Gate 1+2.1 em banco local limpo | **Não executada** — Docker/Supabase local indisponível; `psql` em `127.0.0.1:54322` recusou conexão |
| Suíte QA/AppSec automatizada (14 cenários) | **Não executada** — requer ambiente com `auth.uid()`/roles Supabase |

## Bloqueios e pendências críticas

1. **Homologação obrigatória em ambiente compatível:** aplicar `20261116080000-006` + `20261118070000-002` em PostgreSQL/Supabase local e executar testes negativos/positivos com evidências.
2. **Coerência RLS × contexto:** validar que políticas existentes (007) e o uso de `set_config(..., true)` (transacional) atendem ao fluxo PostgREST/cliente; ajustar se necessário.
3. **Provisionamento ROOT real:** `evandro_j.o.a@hotmail.com` permanece **não confirmado**; sem atribuição automática por e-mail, sem senha fixa, sem conta duplicada.
4. **HTTP 400 Supabase Auth:** causa ainda depende de evidência (`code`/`status` ou Response do `/auth/v1/token`) e da existência/confirmação da conta no Auth.
5. **Frontend:** integração do `AuthProvider`/guards do Gate 2 **não ativada** (preservado estado atual); `database.ts` e fluxos legados ainda desalinhados do schema/contratos futuros.

## Restrições respeitadas
- Nenhuma migration aplicada no Supabase remoto.
- Nenhum `supabase db push` real.
- Nenhum commit, push ou deploy.
- Domínio médico/plantão/relatórios não alterado.

## Recomendação (próximo passo)
1. Subir ambiente local compatível e executar suíte `docs/gate2/plano_testes_gate2_1.md` com evidências.
2. Revisar/ajustar migrations conforme resultados (incrementais adicionais, sem reescrever histórico).
3. Após GO independente: integrar Auth Provider/Dispatcher/guards de forma controlada e só então planejar implantação remota (dry-run → autorização explícita).  
**GO para implantação ou login produtivo: negado neste momento.**