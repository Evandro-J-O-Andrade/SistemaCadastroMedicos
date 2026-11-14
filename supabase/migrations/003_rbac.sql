-- 003_rbac.sql
-- Segurança: papéis, permissões e atribuições com escopo de contexto (tenant/unidade)

-- Papéis do sistema
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE, -- root, admin, gestor, operador_ti, suporte, auditor
  descricao TEXT,
  nivel INTEGER NOT NULL DEFAULT 1, -- hierarquia de nível
  sistema BOOLEAN NOT NULL DEFAULT false, -- papéis do sistema não podem ser excluídos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Permissões atômicas
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE, -- medicos.create, producao.read, relatorios.export, etc.
  recurso TEXT NOT NULL, -- medicos, producao, relatorios, unidades, usuarios
  acao TEXT NOT NULL, -- create, read, update, delete, list, export, approve, close, configure, audit
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mapeamento papel <-> permissão
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id)
);

-- Atribuição de papel a pessoa em um contexto (tenant e/ou unidade)
CREATE TABLE role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, role_id, tenant_id, unit_id)
);

CREATE INDEX idx_roles_nome ON roles (nome);
CREATE INDEX idx_permissions_recurso_acao ON permissions (recurso, acao);
CREATE INDEX idx_role_assignments_person ON role_assignments (person_id);
CREATE INDEX idx_role_assignments_tenant ON role_assignments (tenant_id);
CREATE INDEX idx_role_assignments_unit ON role_assignments (unit_id);
CREATE INDEX idx_role_assignments_ativo ON role_assignments (ativo);

CREATE TRIGGER roles_updated_at
BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER role_assignments_updated_at
BEFORE UPDATE ON role_assignments FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Função auxiliar: verificar se uma pessoa tem uma permissão em um contexto
CREATE OR REPLACE FUNCTION fn_person_has_permission(
  p_person_id UUID,
  p_recurso TEXT,
  p_acao TEXT,
  p_tenant_id UUID DEFAULT NULL,
  p_unit_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- root passa por tudo
  SELECT COUNT(*) INTO v_count
  FROM role_assignments ra
  JOIN roles r ON r.id = ra.role_id
  WHERE ra.person_id = p_person_id
    AND ra.ativo = true
    AND r.nome = 'root'
    AND (p_tenant_id IS NULL OR ra.tenant_id = p_tenant_id);

  IF v_count > 0 THEN
    RETURN true;
  END IF

  -- Verifica via role_permissions
  SELECT COUNT(*) INTO v_count
  FROM role_assignments ra
  JOIN role_permissions rp ON rp.role_id = ra.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ra.person_id = p_person_id
    AND ra.ativo = true
    AND p.recurso = p_recurso
    AND p.acao = p_acao
    AND (p_tenant_id IS NULL OR ra.tenant_id = p_tenant_id)
    AND (p_unit_id IS NULL OR ra.unit_id = p_unit_id);

  RETURN v_count > 0;
END;
$$;
