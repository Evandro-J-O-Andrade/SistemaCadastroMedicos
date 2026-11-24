-- 20261124090001_ui_definitions.sql
-- Tabelas de definição de UI (Database-Driven UI/UX)
-- Configurações JSON não executam JS/SQL; validação por catálogo de componentes permitidos.

-- Componentes de UI permitidos (catálogo)
CREATE TABLE IF NOT EXISTS ui_component_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('layout', 'navigation', 'dashboard', 'widget', 'form', 'block', 'filter', 'action')),
  schema JSONB NOT NULL DEFAULT '{}',
  versao TEXT NOT NULL DEFAULT '1.0.0',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Páginas
CREATE TABLE IF NOT EXISTS ui_page_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  rota TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, tenant_id)
);

CREATE TABLE IF NOT EXISTS ui_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES ui_page_definitions(id) ON DELETE CASCADE,
  versao TEXT NOT NULL,
  layout_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocos de página
CREATE TABLE IF NOT EXISTS ui_page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_version_id UUID NOT NULL REFERENCES ui_page_versions(id) ON DELETE CASCADE,
  component_key TEXT NOT NULL REFERENCES ui_component_definitions(key),
  ordem INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  data_source TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Layouts
CREATE TABLE IF NOT EXISTS ui_layout_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  estrutura JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Navegação
CREATE TABLE IF NOT EXISTS ui_navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  parent_key TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  icon TEXT,
  rota TEXT,
  cell_id TEXT,
  required_permissions TEXT[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, tenant_id)
);

-- Dashboards
CREATE TABLE IF NOT EXISTS ui_dashboard_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, tenant_id)
);

-- Widgets
CREATE TABLE IF NOT EXISTS ui_widget_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES ui_dashboard_definitions(id) ON DELETE CASCADE,
  component_key TEXT NOT NULL REFERENCES ui_component_definitions(key),
  ordem INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  data_source TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Formulários
CREATE TABLE IF NOT EXISTS ui_form_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  entidade TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, tenant_id)
);

CREATE TABLE IF NOT EXISTS ui_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES ui_form_definitions(id) ON DELETE CASCADE,
  campo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  label TEXT NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  validacao JSONB DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Filtros
CREATE TABLE IF NOT EXISTS ui_filter_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  campo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, tenant_id)
);

-- Overrides por tenant/unidade
CREATE TABLE IF NOT EXISTS ui_tenant_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  definition_key TEXT NOT NULL,
  override_config JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, definition_key)
);

CREATE TABLE IF NOT EXISTS ui_unit_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  definition_key TEXT NOT NULL,
  override_config JSONB NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unit_id, definition_key)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ui_page_defs_tenant ON ui_page_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ui_page_versions_page ON ui_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_ui_page_blocks_version ON ui_page_blocks(page_version_id);
CREATE INDEX IF NOT EXISTS idx_ui_nav_tenant ON ui_navigation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ui_dash_tenant ON ui_dashboard_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ui_widgets_dash ON ui_widget_instances(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_ui_forms_tenant ON ui_form_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ui_filters_tenant ON ui_filter_definitions(tenant_id);

-- RLS habilitado
ALTER TABLE ui_component_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_page_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_page_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_layout_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_dashboard_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_filter_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_tenant_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ui_unit_overrides ENABLE ROW LEVEL SECURITY;