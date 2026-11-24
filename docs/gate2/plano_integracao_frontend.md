# Gate 2.1 — Plano de integração Frontend (sem ativação do novo fluxo)

**Status:** preparado localmente. **Não integrado ao runtime.** Frontend atual preservado.

## Objetivo
Substituir gradualmente `src/hooks/useAuth.ts` e estados paralelos por um Auth Provider único alinhado a `fn_auth_bootstrap_v2()`, **somente após** homologação das migrations/funções em ambiente de teste compatível.

## Estratégia segura (incremental)

1. **Contratos/types**
   - Gerar/alinharm `database.ts` ao schema real versionado (Gate 1 + Gate 2.1) em ambiente com DB disponível.
   - Separar tipos do CORE existente dos contratos futuros de domínio médico (não expor tabelas inexistentes como implantadas).

2. **Provider único (sem ativar)**
   - Introduzir `AuthProvider` baseado no contrato do ZIP (`docs/IMPLEMENTACAO.md`) consumindo `fn_auth_bootstrap_v2()` sem argumentos.
   - Manter `useAuth.ts` legado disponível até migração completa das telas.
   - Remover estado paralelo `usuarioLogado/usuarioAtual` em `App.tsx` apenas quando Header/Sidebar/Login consumirem o provider.

3. **Guards e rotas**
   - Mapear rotas existentes para `AccessGuard` (fase/permissão/papel) preservando acessos atuais.
   - Adicionar rotas de onboarding (`/primeiro-acesso/senha`, `/primeiro-acesso/termos`, `/primeiro-acesso/responsabilidade`, `/welcome`, `/acesso-bloqueado`, `/sem-permissao`) apenas com backend/homologação prontos.
   - Não implementar `hasPermission` default-allow; decisão final sempre no servidor/RLS.

4. **Onboarding**
   - Troca de senha e aceites devem chamar funções controladas (`fn_mark_password_changed`, `fn_accept_legal_document`, `fn_complete_welcome`) e/ou evidência server-side confiável — **não** `localStorage`/`user_metadata` como prova.

5. **CRUD de usuários**
   - Migrar para fluxo administrativo protegido (Edge Function/service role no backend), nunca `supabase.auth.signUp` direto no browser para provisionamento administrativo.

## Itens a eliminar (após homologação)
- `useAuth.ts`: busca por `people.id = authUserId` (trocar por bootstrap via `auth_identity_links`), `hasPermission` permissivo, fallback de role.
- `ProtectedRoute.tsx`: bypass genérico de `admin` sem checagem de permissão efetiva.
- `App.tsx`: estados locais de sessão.
- `supabase.ts#setTenantContext`: revisar uso de claims no cliente.

## Critério de ativação
- Migrations Gate 2.1 aplicadas e testadas em ambiente local compatível.
- `fn_auth_bootstrap_v2` validada (contrato + fail-closed).
- Testes QA/AppSec aprovados.
- Parecer GO independente.
