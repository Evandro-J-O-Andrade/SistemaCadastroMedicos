-- 20261128090200_ui_seed_navigation.sql
-- CHECK BOULER 24H / Database-Driven UI/UX — Navegação derivada das células.
-- PREPARADA PARA REVISÃO. NÃO EXECUTAR NO SUPABASE SEM AUTORIZAÇÃO ESPECÍFICA.
-- Depende de: ui_navigation_items, ui_component_definitions (20261124090001).
-- IDEMPOTENTE: INSERT ... WHERE NOT EXISTS (chave tenant NULL tratada com IS NULL),
-- para NÃO duplicar células/menus já existentes. Conferir contra linhas atuais antes de rodar.
-- required_permissions alinhado ao RBAC (recurso.acao); descoberta não concede acesso.

-- Componentes de navegação/célula (catálogo homologado). Idempotente por key.
INSERT INTO ui_component_definitions (key, nome, tipo, schema, versao, ativo)
SELECT v.key, v.nome, v.tipo, v.schema_json::jsonb, '1.0.0', true
FROM (VALUES
  ('cell.nav.dashboard',   'Nav: Início',          'navigation', '{"icon":"Home"}'),
  ('cell.nav.admin',       'Nav: Admin Master',    'navigation', '{"icon":"LayoutDashboard"}'),
  ('cell.nav.medicos',     'Nav: Médicos',         'navigation', '{"icon":"Stethoscope"}'),
  ('cell.nav.plantoes',    'Nav: Plantões',        'navigation', '{"icon":"CalendarClock"}'),
  ('cell.nav.producao',    'Nav: Produção',        'navigation', '{"icon":"BarChart3"}'),
  ('cell.nav.usuarios',    'Nav: Usuários',        'navigation', '{"icon":"UserPlus"}'),
  ('cell.nav.relatorios',  'Nav: Relatórios',      'navigation', '{"icon":"BarChart3"}')
) AS v(key, nome, tipo, schema_json)
WHERE NOT EXISTS (SELECT 1 FROM ui_component_definitions c WHERE c.key = v.key);

-- Itens de navegação globais (tenant_id NULL). Idempotente por (key, tenant_id IS NULL).
-- Nunca duplica: só insere a chave que ainda não existe para tenant global.
INSERT INTO ui_navigation_items (key, tenant_id, parent_key, ordem, label, icon, rota, cell_id, required_permissions, ativo)
SELECT v.key, NULL, v.parent_key, v.ordem, v.label, v.icon, v.rota, v.cell_id, v.required_permissions::text[], true
FROM (VALUES
  ('nav.dashboard.home',  NULL, 0,  'Início',        'Home',           '/',                      'dashboard',   '{}'),
  ('nav.admin.master',    NULL, 10, 'Admin Master',  'LayoutDashboard','/dashboard/admin-master','admin-master','{platform.read}'),
  ('nav.admin.tenants',   NULL, 11, 'Tenants',       'Building2',      '/admin/tenants',         'admin-master','{platform.read}'),
  ('nav.admin.legal',     NULL, 12, 'Documentos Legais','FileText',    '/admin/documentos-legais','admin-master','{platform.read}'),
  ('nav.medicos.list',    NULL, 20, 'Médicos',       'Stethoscope',    '/medicos',               'medicos',     '{medicos.read}'),
  ('nav.plantoes.list',   NULL, 30, 'Plantões',      'CalendarClock',  '/plantao',               'plantoes',    '{plantoes.read}'),
  ('nav.producao.list',   NULL, 40, 'Produção',      'BarChart3',      '/relatorios',            'producao',    '{producao.read}'),
  ('nav.usuarios.list',   NULL, 50, 'Usuários',      'UserPlus',       '/cadastro-usuarios',     'usuarios',    '{usuarios.read}'),
  ('nav.relatorios.center',NULL,60,'Relatórios',    'BarChart3',      '/relatorios',            'relatorios',  '{relatorios.read}')
) AS v(key, parent_key, ordem, label, icon, rota, cell_id, required_permissions)
WHERE NOT EXISTS (
  SELECT 1 FROM ui_navigation_items n
  WHERE n.key = v.key AND n.tenant_id IS NULL
);

COMMENT ON TABLE ui_navigation_items IS 'Navegação Database-Driven por célula/contexto; descoberta não concede acesso (RBAC/RLS autorizam).';