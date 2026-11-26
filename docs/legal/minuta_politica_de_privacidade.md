# MINUTA — Política de Privacidade (privacy_notice) v1.0

> **Status: RASCUNHO para revisão jurídica/DPO.** Não aprovado, não autorizado para
> produção. Plataforma: Gestão Médica Alpha Enterprise (SaaS multi-tenant).
> Finalidade da publicação: **ciência** (aclarar que o aceite é de ciência, não
> consentimento para tratamento — ver seção 7 e nota final).

## 1. Quem somos
A operadora da Plataforma Gestão Médica Alpha Enterprise ("operadora") fornece
software SaaS para gestão de profissionais médicos, escalas, atendimentos e
relatórios. O cliente/organização contratante ("tenant") é o controlador dos dados
inseridos; a operadora atua como operadora, nos termos do contrato e da LGPD.

## 2. Dados tratados
2.1. **Dados cadastrais de usuários:** nome, e-mail, vínculo, papel/permissões.
2.2. **Dados profissionais:** cadastro de médicos, escalas e plantões.
2.3. **Dados assistenciais (sensíveis, saúde):** registros de atendimentos e
informações clínicas inseridas pelo tenant.
2.4. **Dados técnicos e de segurança:** logs de acesso, trilha de auditoria, IP,
user_agent, evidências de aceite.
2.5. **Dados de autenticação:** credenciais protegidas (hash), não armazenadas em
texto claro.

## 3. Finalidades
3.1. Autenticação e controle de acesso por papéis (RBAC).
3.2. Operação dos módulos de cadastro, escalas, atendimentos e relatórios.
3.3. Segurança, prevenção a fraudes e auditoria.
3.4. Cumprimento de obrigações legais e regulatórias.

## 4. Bases legais (LGPD)
4.1. Execução de contrato e procedimentos preliminares (art. 7º, V).
4.2. Obrigação legal/regulatória (art. 7º, II).
4.3. Tutela da saúde, por profissional de saúde (art. 11, II, "f") para dados
sensíveis, quando aplicável.
4.4. Legítimo interesse (art. 7º, IX) para segurança e auditoria, com avaliação de
proporcionalidade.

## 5. Compartilhamento
5.1. Dados podem ser processados por subprocessadores de infraestrutura (hospedagem,
e-mail, observabilidade) sob contrato e dever de sigilo.
5.2. Compartilhamento com autoridades mediante requisição legal.
5.3. Não há venda de dados.

## 6. Segurança
6.1. Medidas técnicas e administrativas: criptografia em trânsito, controle de
acesso, segregação multi-tenant, trilha de auditoria e minimização.
6.2. Plano de resposta a incidentes e comunicação à ANPD/controlador quando aplicável.

## 7. Retenção e eliminação
7.1. Dados mantidos durante a vigência contratual e por prazos legais aplicáveis
(ex.: normas de guarda de prontuário).
7.2. Na rescisão, eliminação ou anonimização conforme contrato e lei, ressalvada
retenção legal.

## 8. Direitos do titular
8.1. Confirmação, acesso, correção, anonimização, portabilidade, informação sobre
compartilhamento e oposição, nos termos da LGPD.
8.2. O titular deve exercer direitos perante o controlador (tenant); a operadora
colabora como operadora.
8.3. Canal do DPO/Encarregado: [inserir contato].

## 9. Natureza do aceite
9.1. O aceite desta Política é de **ciência** quanto às práticas de privacidade, e
não substitui as bases legais específicas de tratamento.
9.2. Tratamentos que dependam de consentimento específico serão coletados em tela
própria, se aplicável.

## 10. Atualizações
10.1. Esta Política pode ser atualizada; alterações materiais serão comunicadas e
poderão exigir novo aceite de ciência.

---
*Minuta sujeita a revisão e aprovação jurídica/DPO. Confirmar: papéis
controlador/operadora por módulo, bases legais de dados de saúde, prazos de retenção,
contato do Encarregado e subprocessadores. Decidir se `privacy_notice` permanece
`obrigatorio=false` (ciência, não bloqueia onboarding) — coerente com a seção 9.*