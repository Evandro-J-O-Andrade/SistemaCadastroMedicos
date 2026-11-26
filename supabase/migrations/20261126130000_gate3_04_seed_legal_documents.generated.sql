-- GERADO por scripts/publish_legal_docs.ps1 — NÃO EXECUTADO automaticamente.
-- Requer aprovação institucional, revisão jurídica e autorização expressa.
DO $$
DECLARE
  v_versao TEXT := '1.0';
BEGIN
  INSERT INTO legal_documents (tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo)
  VALUES ('terms_of_use', v_versao, 'Termos de Uso', E'# Termos de Uso — Gestão Médica Alpha Enterprise (v1.0)

## 1. Identificação
**Operadora:** New Wave Sistemas Digital, CNPJ 29.328.524/0001-98, com sede na Comarca de Poá, Estado de São Paulo, representada por seu CEO, Evandro Andrade.
**Plataforma:** Gestão Médica Alpha Enterprise — software SaaS multi-tenant para gestão médica, cadastro de profissionais, escalas e plantões, produção de atendimentos, relatórios e controle de acesso por perfis.
**Contato institucional e de privacidade:** newwavesistemasdigital@hotmail.com.

## 2. Cadastro, autenticação e acesso
2.1. O acesso é individual, nominal e intransferível, mediante credenciais pessoais e autenticação no provedor de identidade.
2.2. O cadastro de usuários é realizado pelo administrador do tenant. O primeiro acesso exige definição de senha pessoal e aceite destes Termos e do Termo de Responsabilidade.
2.3. O usuário declara que suas informações cadastrais são verdadeiras e compromete-se a mantê-las atualizadas.
2.4. A autenticação e o controle de acesso por papéis (RBAC) são aplicados; a segurança efetiva é imposta no banco por Row Level Security (RLS).

## 3. Uso permitido
3.1. Utilizar a Plataforma exclusivamente para fins assistenciais e administrativos legítimos do tenant.
3.2. É proibido: inserir conteúdo ilícito, burlar controles de segurança, realizar engenharia reversa, revender acesso sem autorização ou comprometer a integridade dos dados.

## 4. Credenciais individuais
4.1. O usuário responde pela guarda de sua senha e por toda atividade sob sua conta.
4.2. É vedado o compartilhamento de credenciais.

## 5. Perfis e permissões (RBAC)
5.1. O acesso é concedido por papéis (ex.: root, admin, gestor, operador_ti, suporte, auditor), com permissões por recurso e ação.
5.2. O ROOT global (sem tenant) possui acesso administrativo amplo; ROOT vinculado a tenant e demais papéis têm acesso escopado.

## 6. Segregação multi-tenant
6.1. Os dados são segregados por tenant e por unidade. O acesso a dados de outro tenant é vedado e bloqueado por RLS.

## 7. Responsabilidades contratuais, disponibilidade e suporte
7.1. Obrigações, níveis de serviço (SLA), horários de atendimento, condições comerciais e suporte constam do contrato específico de cada cliente.
7.2. A Operadora não garante disponibilidade de 100%; envida esforços razoáveis, sujeita a manutenções programadas e eventos fora de seu controle.

## 8. Proteção de dados pessoais e sensíveis
8.1. O tratamento observa a LGPD (Lei 13.709/2018) e a Política de Privacidade da Plataforma.
8.2. Dados de saúde recebem proteção reforçada, com base legal apropriada, minimização e controle de acesso.

## 9. Confidencialidade e segurança
9.1. O usuário e o tenant obrigam-se a manter sigilo sobre dados de pacientes, profissionais e da organização.
9.2. A Operadora aplica medidas técnicas e administrativas de segurança (art. 46 da LGPD) conforme evidências técnicas, sem prometer segurança absoluta.

## 10. Suspensão e encerramento
10.1. O descumprimento pode ensejar suspensão do acesso.
10.2. Na rescisão, aplicam-se as regras contratuais de retenção e eliminação de dados, ressalvadas obrigações legais de guarda (ver seção 11).

## 11. Retenção e eliminação de dados
11.1. A retenção observa a vigência contratual e os prazos legais aplicáveis por categoria:
- **Prontuários e registros assistenciais sujeitos à guarda legal:** prazo legal aplicável, observado o mínimo de 20 anos a partir do último registro quando enquadrados na Lei nº 13.787/2018.
- **Registros de acesso à aplicação (logs):** mínimo de 6 meses, quando aplicável o art. 15 do Marco Civil da Internet (Lei nº 12.965/2014).
- **Auditoria de operações:** prazo definido conforme finalidade, obrigações legais e necessidade de rastreabilidade.
- **Dados cadastrais de médicos e usuários:** durante a finalidade legítima, com conservação posterior apenas quando justificada.
- **Backups:** conforme política de retenção e eliminação tecnicamente implementada.
11.2. Não há eliminação automática enquanto a política de retenção por categoria não estiver homologada.
11.3. A Operadora (fornecedora SaaS) distingue suas obrigações das atribuídas ao estabelecimento de saúde controlador dos dados.

## 12. Versionamento e novo aceite
12.1. Estes Termos podem ser atualizados. Alterações materiais exigirão novo aceite, preservando o histórico de versões e aceites anteriores.

## 13. Legislação aplicável e foro
13.1. Aplica-se a legislação brasileira.
13.2. Fica eleito o foro da Comarca de Poá, Estado de São Paulo, para dirimir eventuais controvérsias decorrentes destes Termos, ressalvadas as hipóteses de competência legal obrigatória e os direitos assegurados pela legislação brasileira, inclusive pelo Código de Defesa do Consumidor, quando aplicável.', 'c859a67862c380408b6fb6dd0478d750', true, true)
  ON CONFLICT (tipo, versao) DO NOTHING;
  INSERT INTO legal_documents (tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo)
  VALUES ('responsibility', v_versao, 'Termo de Responsabilidade', E'# Termo de Responsabilidade — Gestão Médica Alpha Enterprise (v1.0)

## 1. Compromisso profissional
Ao aceitar este Termo, o usuário declara utilizar a Plataforma Gestão Médica Alpha Enterprise, operada por New Wave Sistemas Digital (CNPJ 29.328.524/0001-98), com sede em Poá/SP, em ambiente profissional, comprometendo-se com o uso responsável, a confidencialidade e a legislação aplicável, em especial a LGPD (Lei 13.709/2018) e as normas deontológicas de sua profissão.

## 2. Veracidade dos registros
2.1. O usuário é integralmente responsável pelos dados que insere (cadastro de médicos, escalas, plantões, atendimentos e relatórios).
2.2. Compromete-se a inserir informações verídicas, completas e atualizadas, vedado o registro falso ou de terceiros sem base legal legítima.

## 3. Sigilo
3.1. O usuário obriga-se a manter sigilo sobre dados de pacientes e de outros profissionais, usando-os apenas para as finalidades assistenciais e administrativas autorizadas.
3.2. É vedada a divulgação, cópia ou extração indevida de dados.

## 4. Proteção de dados de médicos e pacientes
4.1. O usuário trata dados pessoais e sensíveis de saúde conforme a LGPD e as bases legais aplicáveis, observando minimização e finalidade.

## 5. Credenciais
5.1. O usuário responde pela guarda de suas credenciais e por toda atividade sob sua conta.
5.2. É proibido compartilhar credenciais.

## 6. Acesso a outros tenants
6.1. É vedado acessar, tentar acessar ou extrair dados de outros tenants ou unidades aos quais não esteja vinculado.

## 7. Incidentes e acessos suspeitos
7.1. O usuário deve comunicar imediatamente ao administrador do tenant qualquer incidente de segurança ou acesso suspeito.

## 8. Registros de plantões e atendimentos
8.1. Os registros de plantões, escalas e atendimentos devem refletir a realidade assistencial, vedado o registro por terceiros não autorizados.

## 9. Auditoria
9.1. O usuário tem ciência de que ações sensíveis (aceites, alterações e acessos) podem ser registradas em trilha de auditoria, para segurança e conformidade.

## 10. Conformidade legal e profissional
10.1. O usuário compromete-se a cumprir a LGPD e as normas profissionais aplicáveis aos registros assistenciais.

## 11. Declaração
11.1. Ao marcar "Li e aceito o Termo de Responsabilidade", o usuário manifesta, de forma livre e esclarecida, concordância integral com este Termo.', 'c643bdcfa836ea491f7a7a4fe978243f', true, true)
  ON CONFLICT (tipo, versao) DO NOTHING;
  INSERT INTO legal_documents (tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo)
  VALUES ('privacy_notice', v_versao, 'Política de Privacidade (LGPD)', E'# Política de Privacidade — Gestão Médica Alpha Enterprise (v1.0)

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
newwavesistemasdigital@hotmail.com.', '8f48ac8e65e42619634d02cc1bb7e6a0', false, true)
  ON CONFLICT (tipo, versao) DO NOTHING;
END;
$$;

