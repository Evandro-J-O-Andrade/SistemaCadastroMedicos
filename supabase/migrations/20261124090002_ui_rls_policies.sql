-- 20261124090002_ui_rls_policies.sql
-- RLS Policies para tabelas ui_* do CMS Database-Driven
-- Schema real: tenant_memberships, unit_memberships, role_assignments, roles, auth_identity_links
-- Sem bypass por tenant_id IS NULL. Configurações globais editáveis apenas por ROOT.

-- Helper: resolve person_id from auth.uid()
-- (inline subquery used in policies)

-- ui_component_definitions: global catalog. Read all authenticated. Write only ROOT.
CREATE POLICY "component_defs_read" ON ui_component_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "component_defs_write" ON ui_component_definitions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid()
        AND r.nome = 'root'
        AND ra.ativo = true
        AND r.ativo = true
        AND ra.tenant_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid()
        AND r.nome = 'root'
        AND ra.ativo = true
        AND r.ativo = true
        AND ra.tenant_id IS NULL
    )
  );

-- ui_layout_definitions: same as components
CREATE POLICY "layout_defs_read" ON ui_layout_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "layout_defs_write" ON ui_layout_definitions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid()
        AND r.nome = 'root'
        AND ra.ativo = true
        AND r.ativo = true
        AND ra.tenant_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid()
        AND r.nome = 'root'
        AND ra.ativo = true
        AND r.ativo = true
        AND ra.tenant_id IS NULL
    )
  );

-- ui_page_definitions: tenant-scoped. ROOT can access all. Admin/gestor scoped to tenant.
CREATE POLICY "page_defs_read" ON ui_page_definitions FOR SELECT TO authenticated
  USING (
    -- ROOT global
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid()
        AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    -- Tenant member
    tenant_id IN (
      SELECT tm.tenant_id FROM auth_identity_links ail
      JOIN tenant_memberships tm ON tm.person_id = ail.person_id
      WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
    )
  );

CREATE POLICY "page_defs_write" ON ui_page_definitions FOR ALL TO authenticated
  USING (
    -- ROOT global can write any
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid()
        AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    -- Admin/gestor of the tenant
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_page_definitions.tenant_id
      )
    )
  )
  WITH CHECK (
    -- Same as USING for writes
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid()
        AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_page_definitions.tenant_id
      )
    )
  );

-- ui_page_versions: follow page ownership
CREATE POLICY "page_versions_read" ON ui_page_versions FOR SELECT TO authenticated
  USING (
    page_id IN (SELECT id FROM ui_page_definitions)
  );

CREATE POLICY "page_versions_write" ON ui_page_versions FOR ALL TO authenticated
  USING (
    page_id IN (
      SELECT pd.id FROM ui_page_definitions pd
      WHERE
        -- ROOT
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid()
            AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        -- Admin/gestor of tenant
        (
          pd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = pd.tenant_id
          )
        )
    )
  )
  WITH CHECK (
    page_id IN (
      SELECT pd.id FROM ui_page_definitions pd
      WHERE
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid()
            AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        (
          pd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = pd.tenant_id
          )
        )
    )
  );

-- ui_page_blocks: follow version -> page
CREATE POLICY "page_blocks_read" ON ui_page_blocks FOR SELECT TO authenticated
  USING (page_version_id IN (SELECT id FROM ui_page_versions));
CREATE POLICY "page_blocks_write" ON ui_page_blocks FOR ALL TO authenticated
  USING (
    page_version_id IN (
      SELECT pv.id FROM ui_page_versions pv
      JOIN ui_page_definitions pd ON pd.id = pv.page_id
      WHERE
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid()
            AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        (
          pd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = pd.tenant_id
          )
        )
    )
  )
  WITH CHECK (
    page_version_id IN (
      SELECT pv.id FROM ui_page_versions pv
      JOIN ui_page_definitions pd ON pd.id = pv.page_id
      WHERE
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid()
            AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        (
          pd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = pd.tenant_id
          )
        )
    )
  );

-- ui_navigation_items: tenant-scoped
CREATE POLICY "nav_items_read" ON ui_navigation_items FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL OR tenant_id IN (
      SELECT tm.tenant_id FROM auth_identity_links ail
      JOIN tenant_memberships tm ON tm.person_id = ail.person_id
      WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
  );

CREATE POLICY "nav_items_write" ON ui_navigation_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_navigation_items.tenant_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_navigation_items.tenant_id
      )
    )
  );

-- ui_dashboard_definitions: tenant-scoped
CREATE POLICY "dash_defs_read" ON ui_dashboard_definitions FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL OR tenant_id IN (
      SELECT tm.tenant_id FROM auth_identity_links ail
      JOIN tenant_memberships tm ON tm.person_id = ail.person_id
      WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
  );

CREATE POLICY "dash_defs_write" ON ui_dashboard_definitions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_dashboard_definitions.tenant_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_dashboard_definitions.tenant_id
      )
    )
  );

-- ui_widget_instances: follow dashboard
CREATE POLICY "widget_instances_read" ON ui_widget_instances FOR SELECT TO authenticated
  USING (dashboard_id IN (SELECT id FROM ui_dashboard_definitions));
CREATE POLICY "widget_instances_write" ON ui_widget_instances FOR ALL TO authenticated
  USING (
    dashboard_id IN (
      SELECT dd.id FROM ui_dashboard_definitions dd
      WHERE
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        (
          dd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = dd.tenant_id
          )
        )
    )
  )
  WITH CHECK (
    dashboard_id IN (
      SELECT dd.id FROM ui_dashboard_definitions dd
      WHERE
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        (
          dd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = dd.tenant_id
          )
        )
    )
  );

-- ui_form_definitions: tenant-scoped
CREATE POLICY "form_defs_read" ON ui_form_definitions FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL OR tenant_id IN (
      SELECT tm.tenant_id FROM auth_identity_links ail
      JOIN tenant_memberships tm ON tm.person_id = ail.person_id
      WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
  );

CREATE POLICY "form_defs_write" ON ui_form_definitions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_form_definitions.tenant_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_form_definitions.tenant_id
      )
    )
  );

-- ui_form_fields: follow form
CREATE POLICY "form_fields_read" ON ui_form_fields FOR SELECT TO authenticated
  USING (form_id IN (SELECT id FROM ui_form_definitions));
CREATE POLICY "form_fields_write" ON ui_form_fields FOR ALL TO authenticated
  USING (
    form_id IN (
      SELECT fd.id FROM ui_form_definitions fd
      WHERE
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        (
          fd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = fd.tenant_id
          )
        )
    )
  )
  WITH CHECK (
    form_id IN (
      SELECT fd.id FROM ui_form_definitions fd
      WHERE
        EXISTS (
          SELECT 1 FROM auth_identity_links ail
          JOIN role_assignments ra ON ra.person_id = ail.person_id
          JOIN roles r ON r.id = ra.role_id
          WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
        )
        OR
        (
          fd.tenant_id IN (
            SELECT tm.tenant_id FROM auth_identity_links ail
            JOIN tenant_memberships tm ON tm.person_id = ail.person_id
            WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
          )
          AND EXISTS (
            SELECT 1 FROM auth_identity_links ail
            JOIN role_assignments ra ON ra.person_id = ail.person_id
            JOIN roles r ON r.id = ra.role_id
            WHERE ail.auth_user_id = auth.uid()
              AND r.nome IN ('admin', 'gestor')
              AND ra.ativo = true AND r.ativo = true
              AND ra.tenant_id = fd.tenant_id
          )
        )
    )
  );

-- ui_filter_definitions: tenant-scoped
CREATE POLICY "filter_defs_read" ON ui_filter_definitions FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL OR tenant_id IN (
      SELECT tm.tenant_id FROM auth_identity_links ail
      JOIN tenant_memberships tm ON tm.person_id = ail.person_id
      WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
  );

CREATE POLICY "filter_defs_write" ON ui_filter_definitions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_filter_definitions.tenant_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_filter_definitions.tenant_id
      )
    )
  );

-- ui_tenant_overrides: tenant-scoped
CREATE POLICY "tenant_overrides_read" ON ui_tenant_overrides FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tm.tenant_id FROM auth_identity_links ail
      JOIN tenant_memberships tm ON tm.person_id = ail.person_id
      WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
  );

CREATE POLICY "tenant_overrides_write" ON ui_tenant_overrides FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_tenant_overrides.tenant_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      tenant_id IN (
        SELECT tm.tenant_id FROM auth_identity_links ail
        JOIN tenant_memberships tm ON tm.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND tm.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = ui_tenant_overrides.tenant_id
      )
    )
  );

-- ui_unit_overrides: unit-scoped
CREATE POLICY "unit_overrides_read" ON ui_unit_overrides FOR SELECT TO authenticated
  USING (
    unit_id IN (
      SELECT um.unit_id FROM auth_identity_links ail
      JOIN unit_memberships um ON um.person_id = ail.person_id
      WHERE ail.auth_user_id = auth.uid() AND um.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
  );

CREATE POLICY "unit_overrides_write" ON ui_unit_overrides FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      unit_id IN (
        SELECT um.unit_id FROM auth_identity_links ail
        JOIN unit_memberships um ON um.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND um.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = (SELECT tenant_id FROM units WHERE id = ui_unit_overrides.unit_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth_identity_links ail
      JOIN role_assignments ra ON ra.person_id = ail.person_id
      JOIN roles r ON r.id = ra.role_id
      WHERE ail.auth_user_id = auth.uid() AND r.nome = 'root' AND ra.ativo = true AND r.ativo = true AND ra.tenant_id IS NULL
    )
    OR
    (
      unit_id IN (
        SELECT um.unit_id FROM auth_identity_links ail
        JOIN unit_memberships um ON um.person_id = ail.person_id
        WHERE ail.auth_user_id = auth.uid() AND um.ativo = true
      )
      AND EXISTS (
        SELECT 1 FROM auth_identity_links ail
        JOIN role_assignments ra ON ra.person_id = ail.person_id
        JOIN roles r ON r.id = ra.role_id
        WHERE ail.auth_user_id = auth.uid()
          AND r.nome IN ('admin', 'gestor')
          AND ra.ativo = true AND r.ativo = true
          AND ra.tenant_id = (SELECT tenant_id FROM units WHERE id = ui_unit_overrides.unit_id)
      )
    )
  );
