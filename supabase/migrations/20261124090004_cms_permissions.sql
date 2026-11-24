-- 20261124090004_cms_permissions.sql
-- Permissões CMS explícitas no RBAC

INSERT INTO permissions (nome, descricao, ativo) VALUES
  ('cms.read', 'Leitura de definições CMS', true),
  ('cms.create', 'Criação de páginas CMS', true),
  ('cms.update', 'Edição de páginas CMS', true),
  ('cms.publish', 'Publicação de versões CMS', true),
  ('cms.rollback', 'Rollback de versões CMS', true),
  ('cms.manage', 'Gestão completa do CMS', true)
ON CONFLICT (nome) DO NOTHING;

-- ROOT global gets all CMS permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.nome = 'root' AND p.nome LIKE 'cms.%'
ON CONFLICT DO NOTHING;

-- Admin gets cms.read, cms.create, cms.update, cms.publish, cms.rollback (scoped to tenant)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.nome = 'admin' AND p.nome IN ('cms.read', 'cms.create', 'cms.update', 'cms.publish', 'cms.rollback')
ON CONFLICT DO NOTHING;

-- Gestor gets cms.read, cms.create, cms.update (scoped to units)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.nome = 'gestor' AND p.nome IN ('cms.read', 'cms.create', 'cms.update')
ON CONFLICT DO NOTHING;
