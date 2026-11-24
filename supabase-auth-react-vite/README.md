# Supabase Auth + Rotas Protegidas — React/Vite/TypeScript

Kit de integração (NÃO está aplicado no seu repositório nem no Supabase remoto).

## Resultado
- Login com `signInWithPassword`
- Verificação remota da sessão inicial com `getUser`
- Atualização de estado por `onAuthStateChange`
- Logout e retorno para `/login`
- Rotas privadas com React Router `<Outlet />` e `<Navigate />`
- Retorno à URL privada desejada depois do login
- Mensagens de loading e falha sem revelar detalhes técnicos

## Passos de integração
1. Confirmar que o projeto Supabase correto está visível no conector; não confundir com os bancos J&S e Angel.
2. Instalar `@supabase/supabase-js` com versão fixa e registrar o lockfile; já ter `react-router-dom` no projeto.
3. Copiar `.env.example` para `.env.local` e preencher URL/chave **publishable** do seu projeto. Nunca enviar `service_role`/secret ao navegador.
4. Copiar `src/lib/supabase.ts`, `src/auth/AuthProvider.tsx`, `src/auth/RequireAuth.tsx` e adaptar o login existente usando `LoginExample.tsx` como referência (preserve o layout atual).
5. Editar **somente o seu `main.tsx`/`main.jsx` existente** para garantir `<BrowserRouter>` acima de `<App>`. Se já existe Router, não criar outro. Isso resolve o erro `useNavigate() may be used only in the context of a <Router>` quando é causado pela hierarquia.
6. Adaptar as rotas atuais de `App.tsx`/`App.jsx` usando `examples/App.routes.example.tsx`: rotas públicas fora do guard; privadas dentro de `<Route element={<RequireAuth />}>`.
7. No dashboard Supabase, revisar Authentication → Providers → Email; Authentication → URL Configuration com site URL e redirect URLs apropriadas. Verificar fluxo de confirmação de e-mail/recuperação de senha.
8. Inspecionar tabelas, tenant/unidade, papéis e RLS antes de publicar. **NÃO** criar política permissiva `USING(true)` para dados de médicos/pacientes. O guard no React não substitui autorização no banco.
9. Fazer testes: rota privada sem login; login; refresh com sessão; logout; sessão inválida; usuário sem privilégio; vazamento entre tenants/unidades. Rodar build/testes da aplicação real.

## Importante
- App já tem AuthContext/ProtectedRoute? **Integrar à implementação existente em vez de duplicar providers**.
- O Supabase mostrado pela conexão atual só lista `js-empregos` e `Angel Cosmeticos`; o projeto médico `susztkudafpxcxkmahbj` devolveu erro de permissão. Nenhuma migração ou configuração foi aplicada remotamente.
- O exemplo de `Medicos` presume um arquivo `src/pages/Medicos.tsx` conforme a conversa anterior; ajuste nomes e caminhos para a árvore real do seu repositório.

Docs oficiais:
- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/reference/javascript/auth-onauthstatechange
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://supabase.com/docs/guides/database/postgres/row-level-security
