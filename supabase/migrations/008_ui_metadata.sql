-- 008_ui_metadata.sql
-- Interface orientada pelo banco (Database-Driven UI/UX)
-- Configurações de módulos, páginas, formulários, dashboards e temas

-- Módulos da interface (habilitados por tenant)
CREATE TABLE ui_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL, -- central_gestao, cadastro_medicos, levantamento, producao_medica, relatorios, admin
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ui_modules_tenant ON ui_modules (tenant_id);
CREATE INDEX idx_ui_modules_codigo ON ui_modules (codigo);

-- Páginas dentro de um módulo
CREATE TABLE ui_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES ui_modules(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  rota TEXT NOT NULL,
  icone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ui_pages_module ON ui_pages (module_id);

-- Formulários configuráveis (campos, obrigatoriedade, validações)
CREATE TABLE ui_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES ui_pages(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  configuracao JSONB NOT NULL DEFAULT '{}', -- { campos: [...], validacoes: {...}, layout: ... }
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ui_forms_page ON ui_forms (page_id);

-- Temas por tenant (dark/light, cores, logo)
CREATE TABLE ui_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'default',
  modo TEXT NOT NULL DEFAULT 'light' CHECK (modo IN ('light', 'dark')),
  cores JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ui_themes_tenant ON ui_themes (tenant_id);

-- Widgets de dashboard (indicadores configuráveis)
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- metrica, grafico_barra, grafico_pizza, grafico_linha, tabela
  consulta_sql TEXT, -- consulta parametrizada ou nome de view/RPC
  configuracao JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dashboard_widgets_tenant ON dashboard_widgets (tenant_id);

CREATE TRIGGER ui_forms_updated_at
BEFORE UPDATE ON ui_forms FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER ui_themes_updated_at
BEFORE UPDATE ON ui_themes FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
