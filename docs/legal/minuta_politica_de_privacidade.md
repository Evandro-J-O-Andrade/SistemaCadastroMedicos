# Política de Privacidade — Gestão Médica Alpha Enterprise (v1.0)

> **Status: VERSÃO 1.0 PARA APROVAÇÃO INSTITUCIONAL E REVISÃO JURÍDICA/DPO.**
> Apresentada para **ciência**, não como consentimento genérico. A ciência não
> substitui bases legais específicas de tratamento. Não declara conformidade integral.

## 1. Identificação e contato
**Operadora:** New Wave Sistemas Digital, CNPJ 29.328.524/0001-98, com sede em Poá, Estado de São Paulo.
**Plataforma:** Gestão Médica Alpha Enterprise (SaaS multi-tenant de gestão médica).
**Canal de privacidade:** newwavesistemasdigital@hotmail.com.
**Encarregado (DPO):** a designação formal do Encarregado, quando ocorrer, será comunicada por meio do canal de privacidade acima, conforme o art. 41 da LGPD e a regulamentação da ANPD. A disponibilização do canal de contato não equivale, por si só, à designação formal.

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

## 4. Bases legais (LGPD) por atividade
4.1. **Atividades da Operadora (New Wave):** hospedagem, autenticação, segurança e auditoria apoiam-se em execução de contrato e procedimentos preliminares (art. 7º, V), obrigação legal/regulatória (art. 7º, II) e legítimo interesse (art. 7º, IX) para segurança, com avaliação de proporcionalidade.
4.2. **Atividades do estabelecimento de saúde controlador:** os registros assistenciais e dados sensíveis de saúde apoiam-se nas bases legais definidas pelo controlador, inclusive tutela da saúde por profissional de saúde (art. 11, II, "f"), quando aplicável.
4.3. A Operadora atua como operadora e segue as instruções documentadas do controlador.

## 5. Dados sensíveis de saúde
5.1. Recebem proteção reforçada: minimização, controle de acesso por RLS, segregação e trilha de auditoria.

## 6. Controlador e operador
6.1. O tenant/estabelecimento de saúde é o **controlador** dos dados de seus usuários e pacientes; a New Wave Sistemas Digital é a **operadora**, nos termos do contrato.
6.2. O detalhamento de papéis por módulo consta do contrato específico de cada cliente.

## 7. Compartilhamento e subprocessadores
7.1. A hospedagem, o banco de dados e a autenticação são operados por **Supabase**, na condição de subprocessador.
7.2. A Plataforma poderá utilizar provedores de e-mail e de observabilidade; a identificação de cada subprocessador, a finalidade e a localidade de armazenamento serão disponibilizadas por meio do canal de privacidade após verificação contratual, não sendo aqui presumidas.
7.3. Não há venda de dados.
7.4. Compartilhamento com autoridades ocorre mediante requisição legal.
7.5. Eventuais transferências internacionais dependem da localidade de armazenamento do provedor de hospedagem e serão informadas após confirmação; não são declaradas enquanto não verificadas.

## 8. Medidas de segurança (art. 46)
8.1. Mecanismos efetivamente adotados, conforme evidências técnicas:
- Controle de acesso por papéis (RBAC) — implementado.
- Row Level Security (RLS) no banco — implementado.
- Segregação multi-tenant — implementada na arquitetura; isolamento sujeito a testes.
- Trilha de auditoria — implementada.
- Minimização de dados — diretriz adotada.
- Criptografia em trânsito (TLS/HTTPS) — prevista na infraestrutura de hospedagem.
8.2. Criptografia em repouso, criptografia de backups e gestão de chaves não são declaradas como comprovadas nesta versão; serão objeto de verificação técnica e documentadas quando confirmadas.

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
11.1. Incidentes de segurança são objeto de procedimentos de identificação e resposta, com comunicação à ANPD e ao controlador quando aplicável, nos termos do art. 48 da LGPD e da regulamentação da ANPD, observados os prazos legais.

## 12. Atualizações e versionamento
12.1. Esta Política pode ser atualizada; alterações materiais serão comunicadas e poderão exigir novo aceite de ciência, preservando o histórico.

## 13. Canal de privacidade
newwavesistemasdigital@hotmail.com.

---
*Versão 1.0 para ciência e revisão jurídica/DPO. As declarações de subprocessadores adicionais, localidade de armazenamento, criptografia em repouso/backups e designação do Encarregado permanecem condicionadas à verificação técnica/contratual e serão incluídas quando confirmadas. Não declara conformidade integral sem auditoria e comprovação.*