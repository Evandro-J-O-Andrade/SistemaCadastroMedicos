# Gate 2.1 — Contrato `fn_auth_bootstrap_v2()`

**Migration:** `supabase/migrations/20261118070002_gate2_03_auth_bootstrap.sql`  
**Status:** implementado localmente (incremental). **Não aplicado em remoto.**

## Assinatura
```sql
CREATE OR REPLACE FUNCTION fn_auth_bootstrap_v2()
RETURNS JSONB
```
- **Argumentos:** nenhum (não aceita parâmetros manipuláveis pelo frontend).
- **Executor:** `authenticated` (EXECUTE concedido; revogado de PUBLIC).
- **Modo:** `SECURITY DEFINER`, `STABLE`, `SET search_path = public, pg_temp`.
- **Identidade:** derivada exclusivamente de `auth.uid()`.

## Comportamento (fail-closed)
1. Se `auth.uid()` é NULL → `RAISE EXCEPTION 'not_authenticated'` (ERRCODE 28000).
2. Resolve identidade canônica: `auth_identity_links.auth_user_id = auth.uid()` → `people` ativa. Sem vínculo/pessoa ativa → `'identity_not_linked'`.
3. Agrega papéis ativos (`role_assignments.ativo = true`, `roles.ativo = true`). Sem papel ativo → `'no_active_role'`.
4. Consolida permissões efetivas via RBAC (`role_permissions`/`permissions` ativos).
5. Coleta memberships (tenants e `unit_ids` ativos).
6. Obtém estado de onboarding via `fn_onboarding_status(person_id)` (com defaults seguros se indisponível).
7. Retorna JSONB tipado.

## Resposta (contrato esperado pelo frontend Gate 2)
```json
{
  "person_id": "uuid",
  "full_name": "string",
  "email": "string",
  "roles": ["root|admin|gestor|operador_ti|suporte|auditor"],
  "permissions": ["recurso.acao", "..."],
  "memberships": [
    { "tenant_id": "uuid", "tenant_nome": "string", "unit_ids": ["uuid"] }
  ],
  "must_change_password": true,
  "terms_pending": true,
  "responsibility_pending": true,
  "welcome_pending": true
}
```

## Garantias de segurança
- Não confia em `person_id`, `tenant_id`, `roles` ou flags enviados pelo cliente.
- Vínculo de identidade somente via `auth_identity_links` (People-First).
- Falha fechada para conta autenticada sem autorização/vínculo válido.
- Execução com `search_path` fixo.

## Pendências para homologação
- Executar testes automatizados em banco local (impersonação, revogação, isolamento, ROOT global, onboarding pendente).
- Validar integração com `AuthProvider` do Gate 2 **sem ativar fluxo produtivo** até homologação.
- Provisionamento ROOT real permanece bloqueado/não executado.