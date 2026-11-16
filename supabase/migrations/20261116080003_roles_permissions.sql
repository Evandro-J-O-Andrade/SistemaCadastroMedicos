-- 004_roles_permissions.sql
-- Gate 1 - IAM/RBAC: Papéis, permissões atômicas e atribuições com escopo
-- Não executar no Supabase sem autorização.

-- ============================================
-- roles: papéis do sistema (root, admin, gestor, operador_ti, suporte, auditor)
-- ============================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  nivel INTEGER NOT NULL DEFAULT 1,
  sistema BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_roles_nome ON roles (nome);
CREATE INDEX idx_roles_sistema ON roles (sistema);
CREATE INDEX idx_roles_ativo ON roles (ativo);

CREATE TRIGGER roles_updated_at
BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- permissions: permissões atômicas (recurso.acao)
-- Exemplos: medicos.create, producao.read, relatorios.export, unidades.configure
-- ============================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  recurso TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_permissions_recurso_acao ON permissions (recurso, acao);
CREATE INDEX idx_permissions_ativo ON permissions (ativo);

-- ============================================
-- role_permissions: mapeamento papel <-> permissão
-- ============================================
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions (role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions (permission_id);
CREATE INDEX idx_role_permissions_ativo ON role_permissions (ativo);

-- ============================================
-- role_assignments: atribuição de papel a pessoa com escopo
-- Escopo opcional de tenant e/ou unidade.
-- Papel sem tenant = global (apenas ROOT).
-- Papel com tenant = restrito a esse tenant.
-- Papel com tenant + unidade = restrito à interseção.
-- ============================================
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, role_id, tenant_id, unit_id)
);

CREATE INDEX idx_role_assignments_person ON role_assignments (person_id);
CREATE INDEX idx_role_assignments_role ON role_assignments (role_id);
CREATE INDEX idx_role_assignments_tenant ON role_assignments (tenant_id);
CREATE INDEX idx_role_assignments_unit ON role_assignments (unit_id);
CREATE INDEX idx_role_assignments_ativo ON role_assignments (ativo);
CREATE INDEX idx_role_assignments_person_ativo ON role_assignments (person_id, ativo);

CREATE TRIGGER role_assignments_updated_at
BEFORE UPDATE ON role_assignments FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

COMMENT ON TABLE roles IS 'Papéis do sistema (root, admin, gestor, operador_ti, suporte, auditor).';
COMMENT ON TABLE permissions IS 'Permissões atômicas por recurso e ação.';
COMMENT ON TABLE role_permissions IS 'Mapeamento papel <-> permissão.';
COMMENT ON TABLE role_assignments IS 'Atribuição de papel a pessoa com escopo de tenant e/ou unidade.';
