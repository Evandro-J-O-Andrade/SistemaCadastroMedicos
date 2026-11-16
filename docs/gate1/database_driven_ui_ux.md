# GATE 1 — Database-Driven UI/UX: Contratos CORE ↔ UI

**Projeto:** SistemaCadastroMedicos\
**Escopo:** Contratos entre o banco de dados (CORE) e a camada de UI/UX, definindo como a interface reage dinamicamente a permissões, escopos e configurações de tenant.\
**Princípio:** A UI NÃO contém regras de negócio hardcoded. Tudo que varia por tenant, papel ou permissões vem do banco via `tenant_settings`, `role_assignments` e `fn_person_has_permission()`.

---

## 1. Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    UI / UX (React + Supabase)               │
│  • Lê tenant_settings para tema, idioma, módulos habilitados│
│  • Chama fn_person_has_permission() para habilitar ações    │
│  • Exibe apenas dados dentro do escopo do tenant/unidade    │
│  • Nunca hardcoda permissões, papéis ou visibilidade        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ RPC / Supabase client
┌─────────────────────────────────────────────────────────────┐
│                    CORE (PostgreSQL + RLS)                  │
│  • tenant_settings: chave-valor JSONB por tenant            │
│  • role_assignments: papel + escopo (tenant/unidade)        │
│  • fn_person_has_permission(): verificação fail-closed      │
│  • RLS: isolamento físico por tenant/unidade                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Contrato de Contexto de Sessão

### 2.1 Fluxo de inicialização

1. Usuário faz login no Supabase Auth → obtém `auth_user_id` (JWT `sub`).
2. Frontend chama RPC `fn_set_session_contexto(auth_user_id, tenant_id, unit_id?)`.
3. Função valida:
   - `auth_identity_links` resolve `auth_user_id` → `person_id`.
   - `tenant_memberships` confirma que `person_id` é membro ativo do `tenant_id`.
   - `unit_memberships` confirma que `person_id` é membro ativo da `unit_id` dentro do `tenant_id` (se informada).
4. Se válido, define claims de sessão:
   - `request.jwt.claims.person_id`
   - `request.jwt.claims.tenant_id`
   - `request.jwt.claims.unit_id`
5. Retorna `true`/`false`. Se `false`, frontend redireciona para seleção de tenant ou mensagem de erro.

### 2.2 Contrato de resposta da RPC

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sucesso` | boolean | `true` se contexto definido, `false` se falha |
| `person_id` | UUID | ID da pessoa autenticada |
| `tenant_id` | UUID | ID do tenant ativo |
| `unit_id` | UUID\|null | ID da unidade ativa (ou null) |
| `permissoes` | string[] | Lista de `recurso.acao` disponíveis no escopo atual |
| `modulos_habilitados` | string[] | Módulos do tenant_settings para este tenant |
| `tema` | string | Tema visual do tenant (ex: "light", "dark", "medico") |
| `idioma` | string | Idioma do tenant (ex: "pt-BR") |

---

## 3. Contrato de Permissões para UI

### 3.1 Verificação de permissão por ação

A UI chama `fn_person_has_permission(person_id, recurso, acao, tenant_id, unit_id)` via RPC antes de:

| Ação da UI | Permissão verificada | Contexto |
|------------|---------------------|----------|
| Abrir cadastro de pessoa | `people.create` | tenant atual, unidade atual |
| Editar pessoa | `people.update` | tenant atual, unidade atual |
| Excluir pessoa | `people.delete` | tenant atual, unidade atual |
| Listar pessoas | `people.read` / `people.list` | tenant atual |
| Criar tenant | `tenants.create` | global (null) |
| Editar tenant | `tenants.update` | tenant atual |
| Criar unidade | `units.create` | tenant atual |
| Editar unidade | `units.update` | tenant atual |
| Criar membership | `memberships.create` | tenant atual, unidade |
| Atribuir papel | `roles.assign` | tenant atual, unidade |
| Ler auditoria | `audit_events.read` | tenant atual |
| Exportar auditoria | `audit_events.export` | tenant atual |
| Alterar configurações | `tenant_settings.update` | tenant atual |

### 3.2 Contrato de resposta da verificação

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `permitido` | boolean | `true` se a pessoa tem a permissão no escopo |
| `motivo` | string\|null | Motivo da negação (ex: "sem_permissao", "fora_escopo") |

### 3.3 Regras de renderização condicional

- **Botão invisível:** se `permitido = false`, o botão não é renderizado (não apenas desabilitado).
- **Campo somente leitura:** se a pessoa tem `read` mas não `update`, o campo é renderizado como `disabled`.
- **Página inacessível:** se a pessoa não tem nenhuma permissão de leitura no recurso, a rota é redirecionada para `/{recurso}/sem-acesso`.
- **Módulo oculto:** se o módulo não está em `tenant_settings.modulos_habilitados`, o item de menu não aparece.

---

## 4. Contrato de tenant_settings (Database-Driven UI)

### 4.1 Estrutura esperada

Tabela `tenant_settings(tenant_id, chave, valor JSONB)`.

| Chave | Tipo JSONB | Exemplo | Uso na UI |
|-------|-----------|---------|-----------|
| `tema` | string | `"medico_light"` | Classe CSS do tema, cores primárias |
| `idioma` | string | `"pt-BR"` | i18n, formatação de data/moeda |
| `modulos_habilitados` | array de string | `["medicos", "producao", "relatorios"]` | Itens do menu lateral |
| `modulos_visiveis` | array de string | `["medicos", "relatorios"]` | Itens visíveis (podem ser diferentes de habilitados) |
| `campos_obrigatorios_medico` | array de string | `["nome", "crm", "especialidade"]` | Validação no formulário de cadastro |
| `limite_plantao_horas` | integer | `12` | Máximo de horas por plantão |
| `intervalo_plantao_horas` | integer | `36` | Intervalo mínimo entre plantões |
| `logo_url` | string | `https://...` | Logo no header |
| `nome_exibicao` | string | "Clínica Alpha" | Nome exibido no header |
| `fuso_horario` | string | `"America/Sao_Paulo"` | Fuso para exibição de datas |
| `formato_data` | string | `"dd/MM/yyyy"` | Formato de data na UI |
| `formato_hora` | string | `"HH:mm"` | Formato de hora na UI |

### 4.2 Contrato de leitura

```typescript
// Exemplo de uso no frontend
const { data: settings, error } = await supabase
  .from('tenant_settings')
  .select('chave, valor')
  .eq('tenant_id', tenantId)
  .in('chave', ['tema', 'idioma', 'modulos_habilitados', 'limite_plantao_horas']);
```

A UI converte o resultado em um mapa `chave → valor` e consome via contexto React.

---

## 5. Contrato de Módulos e Rotas

### 5.1 Mapeamento módulo → rota

| Módulo | Rota | Permissão mínima para ver |
|--------|------|--------------------------|
| `medicos` | `/medicos` | `people.read` |
| `producao` | `/producao` | `producao.read` |
| `relatorios` | `/relatorios` | `relatorios.read` |
| `filtros` | `/filtros` | `people.read` |
| `cadastro_em_lote` | `/cadastro-em-lote` | `people.create` |
| `usuarios` | `/usuarios` | `people.read` + `roles.read` |
| `auditoria` | `/auditoria` | `audit_events.read` |
| `configuracoes` | `/configuracoes` | `tenant_settings.read` |

### 5.2 Regras de navegação

- Se o usuário tentar acessar uma rota de um módulo não habilitado → redirecionar para `/home` com mensagem de aviso.
- Se o usuário tiver o módulo habilitado mas não a permissão de leitura → redirecionar para `/sem-acesso`.
- O menu lateral é construído dinamicamente a partir de `tenant_settings.modulos_habilitados` + permissões verificadas.

---

## 6. Contrato de Tema e Identidade Visual

### 6.1 Variáveis CSS derivadas do banco

A UI lê `tenant_settings` com chave `tema` e aplica classes CSS dinamicamente:

| Chave | Valor exemplo | Efeito na UI |
|-------|--------------|--------------|
| `tema.cor_primaria` | `"#1a5f7a"` | Cor do header, botões primários |
| `tema.cor_secundaria` | `"#2e8b57"` | Cor de destaques secundários |
| `tema.fonte` | `"Inter"` | Família de fonte |
| `tema.modo` | `"light"`\|`"dark"` | Modo claro/escuro |

### 6.2 Implementação prevista

- Hook `useTenantTheme()` lê `tenant_settings` e aplica variáveis CSS no `:root`.
- Não há temas hardcoded no código; todos vêm do banco.

---

## 7. Contrato de Plantão (12×36) — Pré-requisito Gate 4

Configurações de tenant que regem a lógica de plantão (a ser implementada no Gate 4, mas o contrato de dados é definido aqui):

| Chave | Tipo | Valor padrão | Descrição |
|-------|------|-------------|-----------|
| `plantao_horas` | integer | 12 | Duração do plantão em horas |
| `plantao_intervalo_horas` | integer | 36 | Intervalo mínimo entre plantões |
| `plantao_ativo` | boolean | true | Se o módulo de plantão está ativo |

A UI lerá essas configurações para validar formulários de plantão no futuro.

---

## 8. Contrato de Erros da UI

| Código | HTTP | Significado | Ação da UI |
|--------|------|-------------|------------|
| `sem_contexto` | 401 | Não há contexto de sessão válido | Redirecionar para login/seleção de tenant |
| `sem_permissao` | 403 | Pessoa não tem a permissão requerida | Exibir "Você não tem permissão para esta ação" |
| `fora_escopo` | 403 | Ação fora do escopo do tenant/unidade | Exibir "Esta ação não está disponível no seu escopo atual" |
| `modulo_nao_habilitado` | 403 | Módulo não está em `tenant_settings` | Redirecionar para home |
| `tenant_inativo` | 403 | Tenant está inativo | Exibir "Seu tenant está inativo. Entre em contato com o suporte." |

---

## 9. Exemplo de Uso no Frontend (TypeScript)

```typescript
// src/hooks/useTenantContext.ts
export function useTenantContext() {
  const { data: settings } = useQuery({
    queryKey: ['tenant-settings', tenantId],
    queryFn: () => supabase
      .from('tenant_settings')
      .select('chave, valor')
      .eq('tenant_id', tenantId),
  });

  const modulos = settings?.find(s => s.chave === 'modulos_habilitados')?.valor || [];
  const tema = settings?.find(s => s.chave === 'tema')?.valor || 'medico_light';

  return { modulos, tema, settingsMap: Object.fromEntries(settings?.map(s => [s.chave, s.valor]) || []) };
}

// Verificação de permissão antes de renderizar ação
async function podeCadastrarMedico() {
  const { data } = await supabase.rpc('fn_person_has_permission', {
    p_person_id: personId,
    p_recurso: 'people',
    p_acao: 'create',
    p_tenant_id: tenantId,
    p_unit_id: unitId,
  });
  return data === true;
}
```

---

**Próximo:** QA - Plano de testes de isolamento, seguida do parecer do Auditor Independente e relatório final com solicitação de autorização.
