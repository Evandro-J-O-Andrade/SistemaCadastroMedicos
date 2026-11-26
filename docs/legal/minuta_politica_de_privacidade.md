# Política de Privacidade — Gestão Médica Alpha Enterprise (v1.0)

> **Status: VERSÃO 1.0 PARA APROVAÇÃO INSTITUCIONAL E REVISÃO JURÍDICA/DPO.**
> Apresentada para **ciência**, não como consentimento genérico. A ciência não
> substitui bases legais específicas de tratamento. Não declara conformidade integral.

## 1. Identificação e contato
**Operadora:** New Wave Sistemas Digital, CNPJ 29.328.524/0001-98, com sede em Poá, Estado de São Paulo.
**Plataforma:** Gestão Médica Alpha Enterprise (SaaS multi-tenant de gestão médica).
**Canal de privacidade:** newwavesistemasdigital@hotmail.com.
**Encarregado (DPO):** designação formal pendente de avaliação e ato interno, conforme o art. 41 da LGPD e a regulamentação da ANPD. A disponibilização de e-mail de contato não equivale à designação formal de Encarregado.

## 2. Categorias de dados
2.1. **Cadastrais de usuários:** nome, e-mail, vínculo, papel/permissões.
2.2. **Profissionais:** cadastro de médicos, escalas e plantões.
2.3. **Assistenciais (sensíveis, saúde):** registros de atendimentos e informações clínicas inseridas pelo tenant.
2.4. **Técnicos e de segurança:** logs de acesso, trilha de auditoria, IP, user_agent, evidências de aceite.
2.5. **Autenticação:** credenciais protegidas por hash, não armazenadas em texto claro.

## 3. Finalidades
3.1. Autenticação e controle de acesso por papéis (RBAC).
3.2. Operação dos módulos de cadastro, escalas, atendimentos e relatórios.
3.3. Segurança, prevenção a fraudes e auditoria.
3.4. Cumprimento de obrigações legais e regulatórias.

## 4. Bases legais (LGPD)
4.1. Execução de contrato e procedimentos preliminares (art. 7º, V).
4.2. Obrigação legal/regulatória (art. 7º, II).
4.3. Tutela da saúde, por profissional de saúde, para dados sensíveis (art. 11, II, "f"), quando aplicável.
4.4. Legítimo interesse (art. 7º, IX) para segurança e auditoria, com avaliação de proporcionalidade.
[PENDENTE JURÍDICO: validar a base legal por atividade de tratamento.]

## 5. Dados sensíveis de saúde
5.1. Recebem proteção reforçada: minimização, controle de acesso por RLS, segregação e trilha de auditoria.

## 6. Controlador e operador
6.1. O tenant/estabelecimento de saúde atua como controlador dos dados de seus usuários e pacientes; a Operadora atua como operadora, nos termos do contrato.
6.2. [PENDENTE JURÍDICO/CONTRATUAL: detalhar papéis por atividade e módulo.]

## 7. Compartilhamento e subprocessadores
7.1. Apenas serviços efetivamente contratados e verificados são relacionados como subprocessadores. Até a verificação, consta:
- **Hospedagem/banco de dados e autenticação:** Supabase (subprocessador em uso). [PENDENTE: confirmar escopo contratual e localidade de armazenamento.]
- **E-mail:** [PENDENTE: identificar o provedor efetivamente utilizado.]
- **Observabilidade:** [PENDENTE: identificar eventual provedor.]
7.2. Não há venda de dados.
7.3. Compartilhamento com autoridades mediante requisição legal.
7.4. [PENDENTE: eventuais transferências internacionais de dados só serão declaradas após verificação.]

## 8. Medidas de segurança (art. 46)
8.1. Mecanismos efetivamente adotados, conforme evidências técnicas:
- Criptografia em trânsito (TLS/HTTPS) — [PENDENTE: confirmar configuração].
- Controle de acesso por papéis (RBAC) — implementado.
- Row Level Security (RLS) no banco — implementado.
- Segregação multi-tenant — implementada na arquitetura; isolamento sujeito a testes.
- Trilha de auditoria — implementada.
- Minimização de dados — diretriz adotada; eficácia depende dos fluxos.
8.2. [PENDENTE TÉCNICO: criptografia em repouso, criptografia de backups e gestão de chaves não declaradas como comprovadas até validação.]

## 9. Retenção e eliminação
9.1. A retenção observa a vigência contratual e os prazos legais aplicáveis por categoria:
- **Prontuários e registros assistenciais:** prazo legal aplicável, observado o mínimo de 20 anos a partir do último registro quando enquadrados na Lei nº 13.787/2018.
- **Registros de acesso (logs):** mínimo de 6 meses, quando aplicável o art. 15 do Marco Civil da Internet (Lei nº 12.965/2014).
- **Auditoria:** prazo conforme finalidade, obrigações legais e rastreabilidade.
- **Dados cadastrais:** durante a finalidade legítima, com conservação posterior apenas quando justificada.
- **Backups:** conforme política técnica implementada.
9.2. Não há eliminação automática enquanto a política de retenção por categoria não estiver homologada.

## 10. Direitos dos titulares (art. 18)
10.1. Confirmação, acesso, correção, anonimização, portabilidade, informação sobre compartilhamento e oposição, nos termos da LGPD.
10.2. O titular exerce direitos perante o controlador (tenant); a Operadora colabora como operadora.

## 11. Incidentes (art. 48 e ANPD)
11.1. Procedimentos de identificação, resposta e comunicação de incidentes à ANPD e ao controlador quando aplicável.
[PENDENTE JURÍDICO: definir prazos e fluxo formal de comunicação.]

## 12. Atualizações e versionamento
12.1. Esta Política pode ser atualizada; alterações materiais serão comunicadas e poderão exigir novo aceite de ciência, preservando o histórico.

## 13. Canal de privacidade
newwavesistemasdigital@hotmail.com.

---
*Versão 1.0 para ciência e revisão jurídica/DPO. Campos [PENDENTE ...] dependem de decisão jurídica/técnica e não devem ser presumidos. Não declara conformidade integral sem auditoria e comprovação.*