# Checklist de Homologação — Gestão Médica Enterprise

Data: 28/11/2026 · Critério de aprovação obrigatório por página/célula.
**Regra:** uma página só é "pronta" quando os 10 itens estão marcados. Build verde não homologa.

## Como usar
- Cada célula tem sua própria linha de status (0/10 → 10/10).
- "Visualmente bonita" não é critério. Exige integração real, estados, RBAC/RLS e verificação.
- Dados sintéticos só em testes automatizados isolados; nunca na UI.

## Os 10 itens
1. UI Enterprise Premium com identidade visual própria
2. Componentes, cards, sections e layouts responsivos
3. Microinterações, transições e feedback visual (respeitando `prefers-reduced-motion`)
4. Formulários completos com validações (integradas ao schema do banco)
5. CRUD funcional conectado ao Supabase (persistência real; sem sucesso falso)
6. Indicadores e gráficos com dados reais quando aplicável (ou estado vazio honesto)
7. RBAC/RLS e isolamento entre tenants (fail-closed)
8. Loading, empty, error e success states
9. Dark/light e acessibilidade (teclado, foco, contraste, ARIA)
10. TypeScript, testes e build aprovados

## Status por célula
| Célula | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Progresso |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BemVindo (recepção) | ☐ | ☐ | ☐ | — | — | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| EscolhaConta (troca) | ☐ | ☐ | ☐ | — | — | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Início (portal indicadores) | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Admin Master (ROOT) | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Gestão de Tenants | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Unidades | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Usuários e permissões | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Médicos | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Especialidades | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Plantões e escalas | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Produção médica | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Importação em lote | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Relatórios e analytics | ☐ | ☐ | ☐ | — | — | ☐ | ☐ | ☐ | ☐ | ☐ | 0/10 |
| Configurações e auditoria | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ | ☐ | ☐ | 0/10 |

Legenda: ☐ pendente · ☑ concluído · — não aplicável à célula.