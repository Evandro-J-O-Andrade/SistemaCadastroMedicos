# Relatório de Pendências e Prontidão — Gate 3.4/3.5 (Minutas v1.0)

Projeto: Gestão Médica Alpha Enterprise · Empresa: New Wave Sistemas Digital (CNPJ 29.328.524/0001-98, Poá/SP)
Contato LGPD: newwavesistemasdigital@hotmail.com
Base: minutas v1.0 versionadas (Termos, Responsabilidade, Privacidade) + este relatório.

## 1. Ajustes da revisão (4 achados) — resolvidos na Privacidade
| Achado | Tratamento aplicado | Onde |
|---|---|---|
| §4 bases legais amplas | Base vinculada a cada atividade, separando dados comuns (art. 7º) e sensíveis (art. 11) | Privacidade §4 |
| §6 New Wave só operadora | Diferenciada: controladora de dados próprios; operadora dos dados dos tenants | Privacidade §6 |
| §7 transferências internacionais | Inventário de subprocessadores + Resolução CD/ANPD nº 19/2024; sem presumir localização | Privacidade §7 |
| §11 sem procedimento | Fluxo: comunicação imediata ao controlador; prazo de 3 dias úteis do controlador à ANPD (Resolução CD/ANPD nº 15/2024) | Privacidade §11 |

## 2. Classificação das declarações
### 2.1 Com evidência técnica/de código
- RBAC, RLS, segregação multi-tenant (arquitetura), trilha de auditoria, minimização (diretriz) — Privacidade §8.1.
- Versionamento de documentos e vínculo de aceites à versão (schema `legal_documents`/`legal_acceptances`).
- Gating LGPD e bloqueio de aceite de minutas (interface).

### 2.2 Depende de verificação (não impede publicar a v1.0, mas não declarar como concluído)
- Escopo contratual e localidade de armazenamento do Supabase.
- Subprocessadores de e-mail e observabilidade.
- Transferências internacionais e mecanismos (Resolução ANPD nº 19/2024).
- Criptografia em repouso, backups e gestão de chaves.
- Designação formal do Encarregado (DPO).

### 2.3 Impede a publicação
- Aprovação institucional do CEO e revisão jurídica profissional final.
- Autorização expressa de publicação no Supabase.
- Execução do template SQL e registro de aceites (somente após 2.3).

## 3. Checklist de conformidade documental
- [x] Dados institucionais (New Wave, CNPJ, sede Poá/SP, canal LGPD).
- [x] Foro (Poá/SP) e SLA por contrato (Termos).
- [x] Retenção por categoria (Lei 13.787/2018; Marco Civil art. 15) sem eliminação automática.
- [x] Bases legais por atividade (comuns x sensíveis).
- [x] Papéis controlador/operador diferenciados.
- [x] Inventário de subprocessadores e transferências internacionais (condicionado).
- [x] Procedimento de incidentes (imediato ao controlador; 3 dias úteis ANPD).
- [x] Política de Privacidade como ciência (não consentimento).
- [x] Versionamento e rastreabilidade preservados.
- [ ] Aprovação institucional (pendente).
- [ ] Revisão jurídica profissional (pendente).
- [ ] Publicação v1.0 no Supabase (não autorizada).

## 4. Parecer de prontidão técnica
- **Código/interface:** pronto (build validado; gating e aceites preservados).
- **Documentos:** coerentes entre si e com o relatório; pendências classificadas e sem afirmações não comprovadas.
- **Bloqueio remanescente:** decisão institucional + revisão jurídica + autorização de publicação. Não executar template, migration ou aceites antes disso.