-- RLS Policies for ui_* tables
-- Global components/layouts readable by all authenticated; writable by root/admin with cms permissions
-- Pages: readable by tenant members; writable by tenant admins
-- Blocks: follow page ownership

-- ui_component_definitions: global catalog, read all authenticated, write root/admin
CREATE POLICY "component_defs_read" ON ui_component_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "component_defs_write" ON ui_component_definitions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM role_assignments ra JOIN roles r ON r.id = ra.role_id WHERE ra.person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND r.nome IN ('root', 'admin') AND ra.ativo = true));

-- ui_layout_definitions: same as components
CREATE POLICY "layout_defs_read" ON ui_layout_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "layout_defs_write" ON ui_layout_definitions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM role_assignments ra JOIN roles r ON r.id = ra.role_id WHERE ra.person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND r.nome IN ('root', 'admin') AND ra.ativo = true));

-- ui_page_definitions: tenant-scoped read/write
CREATE POLICY "page_defs_read" ON ui_page_definitions FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true));
CREATE POLICY "page_defs_write" ON ui_page_definitions FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor')));

-- ui_page_versions: follow page
CREATE POLICY "page_versions_read" ON ui_page_versions FOR SELECT TO authenticated
  USING (page_id IN (SELECT id FROM ui_page_definitions WHERE tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true)));
CREATE POLICY "page_versions_write" ON ui_page_versions FOR ALL TO authenticated
  USING (page_id IN (SELECT id FROM ui_page_definitions WHERE tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor'))));

-- ui_page_blocks: follow version -> page
CREATE POLICY "page_blocks_read" ON ui_page_blocks FOR SELECT TO authenticated
  USING (page_version_id IN (SELECT id FROM ui_page_versions));
CREATE POLICY "page_blocks_write" ON ui_page_blocks FOR ALL TO authenticated
  USING (page_version_id IN (SELECT pv.id FROM ui_page_versions pv JOIN ui_page_definitions pd ON pd.id = pv.page_id WHERE pd.tenant_id IS NULL OR pd.tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor'))));

-- ui_navigation_items: tenant-scoped
CREATE POLICY "nav_items_read" ON ui_navigation_items FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true));
CREATE POLICY "nav_items_write" ON ui_navigation_items FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor')));

-- ui_dashboard_definitions: tenant-scoped
CREATE POLICY "dash_defs_read" ON ui_dashboard_definitions FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true));
CREATE POLICY "dash_defs_write" ON ui_dashboard_definitions FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor')));

-- ui_widget_instances: follow dashboard
CREATE POLICY "widget_instances_read" ON ui_widget_instances FOR SELECT TO authenticated
  USING (dashboard_id IN (SELECT id FROM ui_dashboard_definitions));
CREATE POLICY "widget_instances_write" ON ui_widget_instances FOR ALL TO authenticated
  USING (dashboard_id IN (SELECT id FROM ui_dashboard_definitions WHERE tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor'))));

-- ui_form_definitions: tenant-scoped
CREATE POLICY "form_defs_read" ON ui_form_definitions FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true));
CREATE POLICY "form_defs_write" ON ui_form_definitions FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor')));

-- ui_form_fields: follow form
CREATE POLICY "form_fields_read" ON ui_form_fields FOR SELECT TO authenticated
  USING (form_id IN (SELECT id FROM ui_form_definitions));
CREATE POLICY "form_fields_write" ON ui_form_fields FOR ALL TO authenticated
  USING (form_id IN (SELECT id FROM ui_form_definitions WHERE tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor'))));

-- ui_filter_definitions: tenant-scoped
CREATE POLICY "filter_defs_read" ON ui_filter_definitions FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true));
CREATE POLICY "filter_defs_write" ON ui_filter_definitions FOR ALL TO authenticated
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor')));

-- ui_tenant_overrides: tenant-scoped
CREATE POLICY "tenant_overrides_read" ON ui_tenant_overrides FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true));
CREATE POLICY "tenant_overrides_write" ON ui_tenant_overrides FOR ALL TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor')));

-- ui_unit_overrides: unit-scoped via tenant
CREATE POLICY "unit_overrides_read" ON ui_unit_overrides FOR SELECT TO authenticated
  USING (unit_id IN (SELECT id FROM units WHERE tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true)));
CREATE POLICY "unit_overrides_write" ON ui_unit_overrides FOR ALL TO authenticated
  USING (unit_id IN (SELECT id FROM units WHERE tenant_id IN (SELECT tenant_id FROM memberships WHERE person_id = (SELECT person_id FROM auth_identity_links WHERE auth_user_id = auth.uid()) AND ativo = true AND role IN ('admin', 'gestor'))));
EOF