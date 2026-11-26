# Checklist de Pré-Publicação — Gate 3.6

> Somente leitura. **Não executar** migrations, publicação ou aceites sem autorização expressa.

## A. Documentos
- [x] Três minutas v1.0 versionadas.
- [x] Relatório de pendências/prontidão.
- [x] Manifesto de hashes (SHA-256).
- [x] Termo institucional (não assinado).
- [x] Pacote de revisão jurídica.

## B. Validação de integridade
- [ ] Conferir SHA-256 das minutas contra o manifesto.
- [ ] Nenhuma minuta contém marcador de placeholder (`__CONTEUDO_APROVADO_`).
- [ ] Cada documento ≥ 200 caracteres (validação do template).

## C. Banco (Supabase `susztkudafpxcxkmahbj`) — somente leitura
- [ ] Identidade do projeto de destino confirmada.
- [ ] `legal_documents`: colunas `tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo`; unicidade `(tipo, versao)`.
- [ ] `legal_acceptances`: vínculo a `legal_document_id` (versão) e unicidade `(person_id, legal_document_id)`.
- [ ] Tipos: `terms_of_use` (obrigatório), `responsibility` (obrigatório), `privacy_notice` (ciência).
- [ ] RPCs `fn_accept_legal_document` e `fn_auth_bootstrap_v2` presentes.
- [ ] Gating LGPD impede aceite de minutas (documento não publicado).
- [ ] Template SQL compatível com os textos definitivos.

## D. Testes locais
- [x] `npm run build` (compilação).
- [ ] Fluxo planejado: Login → Termos → Responsabilidade → Ciência → Welcome → Dashboard ROOT (não executar em produção).

## E. Bloqueios restantes (impedem publicação)
1. Aprovação institucional assinada.
2. Revisão jurídica profissional.
3. Autorização expressa de publicação.
4. Verificações condicionadas (Supabase/e-mail/observabilidade/transferências/criptografia/DPO) — não impedem a v1.0, mas não declaradas como concluídas.