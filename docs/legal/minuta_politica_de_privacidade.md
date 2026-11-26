# Política de Privacidade — Gestão Médica Alpha Enterprise (v1.0)

> **Status: VERSÃO 1.0 PARA APROVAÇÃO INSTITUCIONAL E REVISÃO JURÍDICA/DPO.**
> Apresentada para **ciência**, não como consentimento genérico. A ciência não
> substitui bases legais específicas de tratamento. Não declara conformidade integral.

## 1. Identificação e contato
**Operadora:** New Wave Sistemas Digital, CNPJ 29.328.524/0001-98, com sede em Poá, Estado de São Paulo.
**Plataforma:** Gestão Médica Alpha Enterprise (SaaS multi-tenant de gestão médica).
**Canal de privacidade:** newwavesistemasdigital@hotmail.com.
**Encarregado (DPO):** a designação formal do Encarregado, quando ocorrer, será comunicada pelo canal acima, conforme o art. 41 da LGPD e a regulamentação da ANPD. A disponibilização do canal não equivale, por si só, à designação formal.

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

## 4. Bases legais por atividade (dados comuns e sensíveis)
4.1. **Dados comuns (cadastrais, profissionais, técnicos):**
- Execução de contrato e procedimentos preliminares (art. 7º, V) para cadastro, autenticação e operação dos módulos.
- Obrigação legal/regulatória (art. 7º, II) para guarda de registros de acesso e auditoria.
- Legítimo interesse (art. 7º, IX) para segurança e prevenção a fraudes, com avaliação de proporcionalidade.
4.2. **Dados sensíveis de saúde (art. 11):**
- Tutela da saúde por profissional de saúde (art. 11, II, "f"), quando aplicável e a cargo do estabelecimento de saúde controlador.
- As demais hipóteses do art. 11 são definidas pelo controlador conforme a atividade assistencial.
4.3. A base legal de cada tratamento é definida pela atividade correspondente; a Operadora segue as instruções documentadas do controlador.

## 5. Dados sensíveis de saúde
5.1. Recebem proteção reforçada: minimização, controle de acesso por RLS, segregação e trilha de auditoria.

## 6. Papéis (controlador e operador) por atividade
6.1. **Dados tratados em nome dos estabelecimentos de saúde (tenants):** o tenant/estabelecimento é o **controlador** e a New Wave atua como **operadora**, nos termos do contrato.
6.2. **Dados próprios da Operadora** (ex.: contato do canal de privacidade, dados de cobrança/contrato e registros de segurança da própria operação): a New Wave atua como **controladora** desses tratamentos, com base legal própria.
6.3. O detalhamento de papéis por módulo consta do contrato específico de cada cliente.

## 7. Compartilhamento, subprocessadores e transferências internacionais
7.1. **Inventário de subprocessadores (verificável):**
| Finalidade | Subprocessador | Situação |
|---|---|---|
| Hospedagem, banco de dados e autenticação | Supabase | Em uso (verificar escopo contratual e localidade de armazenamento) |
| E-mail | [a identificar] | Não presumido; informar após verificação |
| Observabilidade | [a identificar] | Não presumido; informar após verificação |
7.2. Não há venda de dados. Compartilhamento com autoridades ocorre mediante requisição legal.
7.3. **Transferências internacionais:** eventuais transferências dependem da localidade de armazenamento dos subprocessadores e seguem a Resolução CD/ANPD nº 19/2024 e mecanismos aplicáveis. Não se presume localização de dados; a confirmação e o(s) mecanismo(s) serão informados após verificação contratual e técnica.

## 8. Medidas de segurança (art. 46)
8.1. Mecanismos efetivamente adotados, conforme evidências técnicas:
- Controle de acesso por papéis (RBAC) — implementado.
- Row Level Security (RLS) no banco — implementado.
- Segregação multi-tenant — implementada na arquitetura; isolamento sujeito a testes.
- Trilha de auditoria — implementada.
- Minimização de dados — diretriz adotada.
- Criptografia em trânsito (TLS/HTTPS) — prevista na infraestrutura de hospedagem.
8.2. Criptografia em repouso, criptografia de backups e gestão de chaves não são declaradas como comprovadas nesta versão; serão verificadas e documentadas quando confirmadas.

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

## 11. Resposta a incidentes de segurança (art. 48 e Resolução CD/ANPD nº 15/2024)
11.1. **Fluxo:** a Operadora comunica **imediatamente** o incidente ao controlador (tenant) afetado, com as informações disponíveis para a avaliação de risco.
11.2. **Comunicação à ANPD e titulares:** cabe ao controlador avaliar a relevância e, quando exigível, comunicar à ANPD e aos titulares em **até 3 (três) dias úteis** da ciência do incidente, na forma da Resolução CD/ANPD nº 15/2024, ressalvadas as exceções nela previstas.
11.3. A Operadora coopera com o controlador na apuração, contenção e documentação do incidente.

## 12. Atualizações e versionamento
12.1. Esta Política pode ser atualizada; alterações materiais serão comunicadas e poderão exigir novo aceite de ciência, preservando o histórico.

## 13. Canal de privacidade
newwavesistemasdigital@hotmail.com.

---
*Versão 1.0 para ciência e revisão jurídica/DPO. Declarações condicionadas à verificação: subprocessadores adicionais, localidade de armazenamento/transferências internacionais, criptografia em repouso/backups e designação do Encarregado. Não declara conformidade integral sem auditoria e comprovação.*