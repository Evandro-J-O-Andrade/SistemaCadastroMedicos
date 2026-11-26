# Relatório de Pendências — Gate 3.4 (Minutas v1.0)

Projeto: Gestão Médica Alpha Enterprise · Empresa: New Wave Sistemas Digital (CNPJ 29.328.524/0001-98, Poá/SP)
Contato LGPD: newwavesistemasdigital@hotmail.com

## Resolvidas (cláusula verdadeira e verificável)
| Assunto | Tratamento | Onde |
|---|---|---|
| Foro | Comarca de Poá/SP, ressalvadas competências legais obrigatórias | Termos §13 |
| SLA e suporte | Por contrato específico; sem garantia de 100% | Termos §7 |
| Retenção | Vigência + Lei 13.787/2018 (prontuários, mín. 20 anos) + Marco Civil art. 15 (logs, 6 meses); sem eliminação automática | Termos §11; Privacidade §9 |
| Subprocessador de hospedagem | Supabase (banco + autenticação) declarado | Privacidade §7.1 |
| Bases legais | Diferenciadas por atividade (Operadora x controlador) | Privacidade §4 |
| Papéis controlador/operador | Definidos (tenant = controlador; New Wave = operadora) | Privacidade §6 |
| Segurança comprovada | RBAC, RLS, segregação, auditoria, minimização, TLS em trânsito | Privacidade §8.1 |
| DPO | Canal de privacidade publicado; sem afirmar designação formal | Privacidade §1 |
| Incidentes | Comunicação à ANPD/controlador conforme art. 48 e regulamentação | Privacidade §11 |
| Aceites | terms/responsibility obrigatórios; privacy_notice ciência | Interface LGPD |

## Condicionadas à verificação (impedem declaração, não a publicação da v1.0)
| Pendência | Condição | Onde |
|---|---|---|
| Subprocessadores adicionais (e-mail, observabilidade) | Identificar após verificação contratual | Privacidade §7.2 |
| Localidade de armazenamento / transferências internacionais | Confirmar com provedor | Privacidade §7.5 |
| Criptografia em repouso, backups, gestão de chaves | Verificação técnica | Privacidade §8.2 |
| Designação formal do Encarregado (DPO) | Ato interno, quando ocorrer | Privacidade §1 |

## Impedimento à publicação
- Aprovação institucional do CEO e revisão jurídica final dos textos.
- Autorização expressa de publicação no Supabase.
- Enquanto pendentes, o template SQL não deve ser executado e nenhum aceite é registrado.