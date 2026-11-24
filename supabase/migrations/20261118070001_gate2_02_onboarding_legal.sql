-- 20261118070001_gate2_02_onboarding_legal.sql
-- Gate 2.1.2 (local, IAM): primeiro acesso, termos versionados e responsabilidade.
-- Estados persistentes no banco; escrita de estado sensível restrita a mecanismos confiáveis.
-- NÃO modifica histórico publicado. NÃO executar em remoto sem autorização.

-- ============================================
-- Documentos legais versionados
-- ============================================
CREATE TABLE IF NOT EXISTS legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- ex: terms_of_use, responsibility, privacy_notice
  versao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  conteudo_hash TEXT,
  url_referencia TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  escopo_roles TEXT[] NOT NULL DEFAULT ARRAY['root','admin','gestor','operador_ti','suporte','auditor'],
  ativo BOOLEAN NOT NULL DEFAULT true,
  publicado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, versao)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_tipo_ativo ON legal_documents (tipo, ativo);
CREATE INDEX IF NOT EXISTS idx_legal_documents_obrigatorio ON legal_documents (obrigatorio);

DROP TRIGGER IF EXISTS legal_documents_updated_at ON legal_documents;
CREATE TRIGGER legal_documents_updated_at
BEFORE UPDATE ON legal_documents FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- Aceites de documentos legais (evidência)
-- ============================================
CREATE TABLE IF NOT EXISTS legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  legal_document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  auth_user_id UUID, -- auth.uid() no momento do aceite (evidência)
  ip TEXT,
  user_agent TEXT,
  evidencia JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (person_id, legal_document_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_person ON legal_acceptances (person_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_document ON legal_acceptances (legal_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_accepted_at ON legal_acceptances (accepted_at);

-- ============================================
-- Estado de onboarding do usuário (server-controlled)
-- ============================================
CREATE TABLE IF NOT EXISTS user_onboarding (
  person_id UUID PRIMARY KEY REFERENCES people(id) ON DELETE CASCADE,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  password_changed_at TIMESTAMPTZ,
  welcome_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_must_change ON user_onboarding (must_change_password);

DROP TRIGGER IF EXISTS user_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER user_onboarding_updated_at
BEFORE UPDATE ON user_onboarding FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- RLS
-- ============================================
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Documentos legais: leitura para autenticados (necessário ao fluxo de aceite)
DROP POLICY IF EXISTS legal_documents_read ON legal_documents;
CREATE POLICY legal_documents_read ON legal_documents
  FOR SELECT TO authenticated
  USING (ativo = true);

-- Escrita de documentos legais: apenas permissão administrativa explícita
DROP POLICY IF EXISTS legal_documents_insert ON legal_documents;
CREATE POLICY legal_documents_insert ON legal_documents
  FOR INSERT TO authenticated
  WITH CHECK (fn_person_has_permission(fn_resolve_person_id(), 'legal_documents', 'manage', NULL, NULL));
DROP POLICY IF EXISTS legal_documents_update ON legal_documents;
CREATE POLICY legal_documents_update ON legal_documents
  FOR UPDATE TO authenticated
  USING (fn_person_has_permission(fn_resolve_person_id(), 'legal_documents', 'manage', NULL, NULL))
  WITH CHECK (fn_person_has_permission(fn_resolve_person_id(), 'legal_documents', 'manage', NULL, NULL));
DROP POLICY IF EXISTS legal_documents_delete ON legal_documents;
CREATE POLICY legal_documents_delete ON legal_documents
  FOR DELETE TO authenticated
  USING (fn_person_has_permission(fn_resolve_person_id(), 'legal_documents', 'manage', NULL, NULL));

-- Aceites: usuário lê os próprios; escrita direta bloqueada (usar função controlada)
DROP POLICY IF EXISTS legal_acceptances_read_own ON legal_acceptances;
CREATE POLICY legal_acceptances_read_own ON legal_acceptances
  FOR SELECT TO authenticated
  USING (person_id = fn_resolve_person_id());

DROP POLICY IF EXISTS legal_acceptances_no_direct_insert ON legal_acceptances;
CREATE POLICY legal_acceptances_no_direct_insert ON legal_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS legal_acceptances_no_direct_update ON legal_acceptances;
CREATE POLICY legal_acceptances_no_direct_update ON legal_acceptances
  FOR UPDATE TO authenticated
  USING (false);
DROP POLICY IF EXISTS legal_acceptances_no_direct_delete ON legal_acceptances;
CREATE POLICY legal_acceptances_no_direct_delete ON legal_acceptances
  FOR DELETE TO authenticated
  USING (false);

-- Onboarding: usuário lê o próprio; escrita direta bloqueada
DROP POLICY IF EXISTS user_onboarding_read_own ON user_onboarding;
CREATE POLICY user_onboarding_read_own ON user_onboarding
  FOR SELECT TO authenticated
  USING (person_id = fn_resolve_person_id());

DROP POLICY IF EXISTS user_onboarding_no_direct_insert ON user_onboarding;
CREATE POLICY user_onboarding_no_direct_insert ON user_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS user_onboarding_no_direct_update ON user_onboarding;
CREATE POLICY user_onboarding_no_direct_update ON user_onboarding
  FOR UPDATE TO authenticated
  USING (false);
DROP POLICY IF EXISTS user_onboarding_no_direct_delete ON user_onboarding;
CREATE POLICY user_onboarding_no_direct_delete ON user_onboarding
  FOR DELETE TO authenticated
  USING (false);

-- ============================================
-- Funções controladas (server-side)
-- ============================================

-- Garante existência do estado de onboarding para a pessoa autenticada
CREATE OR REPLACE FUNCTION fn_ensure_onboarding_state(p_person_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_current UUID := fn_resolve_person_id();
BEGIN
  v_person_id := COALESCE(p_person_id, v_current);
  IF v_person_id IS NULL THEN
    RETURN;
  END IF;
  -- Apenas própria pessoa ou administrador com permissão explícita
  IF v_current IS NOT NULL AND v_person_id <> v_current
     AND NOT fn_person_has_permission(v_current, 'onboarding', 'manage', NULL, NULL) THEN
    RETURN;
  END IF;

  INSERT INTO user_onboarding (person_id, must_change_password)
  VALUES (v_person_id, true)
  ON CONFLICT (person_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_ensure_onboarding_state(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_ensure_onboarding_state(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION fn_ensure_onboarding_state(UUID) TO service_role;

-- Registrar aceite de documento legal (evidência vinculada à identidade autenticada)
CREATE OR REPLACE FUNCTION fn_accept_legal_document(
  p_document_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_evidencia JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_auth_uid UUID;
  v_accept_id UUID;
  v_doc_active BOOLEAN;
BEGIN
  v_auth_uid := auth.uid();
  v_person_id := fn_resolve_person_id();

  IF v_auth_uid IS NULL OR v_person_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT ativo INTO v_doc_active FROM legal_documents WHERE id = p_document_id;
  IF v_doc_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'document_not_active';
  END IF;

  INSERT INTO legal_acceptances (person_id, legal_document_id, accepted_at, auth_user_id, ip, user_agent, evidencia)
  VALUES (v_person_id, p_document_id, now(), v_auth_uid, p_ip, p_user_agent, COALESCE(p_evidencia, '{}'))
  ON CONFLICT (person_id, legal_document_id) DO UPDATE
    SET accepted_at = EXCLUDED.accepted_at,
        auth_user_id = EXCLUDED.auth_user_id,
        ip = EXCLUDED.ip,
        user_agent = EXCLUDED.user_agent,
        evidencia = EXCLUDED.evidencia
  RETURNING id INTO v_accept_id;

  -- Auditoria: executada como definer em contexto confiável (fn_audit_log não exposta ao cliente)
  PERFORM fn_audit_log('legal_documents', 'accept', 'legal_acceptances', v_accept_id, NULL,
    jsonb_build_object('document_id', p_document_id, 'auth_user_id', v_auth_uid), 'sucesso', NULL, NULL);

  RETURN v_accept_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_accept_legal_document(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_accept_legal_document(UUID, TEXT, TEXT, JSONB) TO authenticated;

-- Marcar troca de senha concluída
-- P0: NÃO pode ser invocada pelo frontend para auto-declarar troca sem evidência confiável do Supabase Auth.
-- Permitido apenas a contexto confiável (service_role / backend/hook administrativo).
CREATE OR REPLACE FUNCTION fn_mark_password_changed(p_person_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_role TEXT := COALESCE(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    (CASE
      WHEN COALESCE(current_setting('request.jwt.claims', true), '') <> ''
      THEN (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
      ELSE NULL
    END),
    current_setting('request.jwt.role', true)
  );
BEGIN
  -- Exigir contexto de serviço confiável (não cliente autenticado comum).
  -- Transição permitida apenas a componente servidor autorizado (service_role) após evidência de troca no Auth.
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'forbidden: password change must be confirmed by trusted server-side evidence';
  END IF;

  v_person_id := p_person_id;
  IF v_person_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO user_onboarding (person_id, must_change_password)
  VALUES (v_person_id, true)
  ON CONFLICT (person_id) DO NOTHING;

  UPDATE user_onboarding
  SET must_change_password = false,
      password_changed_at = now(),
      updated_at = now()
  WHERE person_id = v_person_id;

  PERFORM fn_audit_log('auth', 'password_changed', 'user_onboarding', v_person_id, NULL,
    jsonb_build_object('must_change_password', false, 'confirmed_by', 'service_role'), 'sucesso', NULL, NULL);

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_mark_password_changed(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_mark_password_changed(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION fn_mark_password_changed(UUID) TO service_role;

-- Marcar welcome concluído (apenas para a própria identidade autenticada, com onboarding prévio atendido)
CREATE OR REPLACE FUNCTION fn_complete_welcome()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_status JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  v_person_id := fn_resolve_person_id();
  IF v_person_id IS NULL THEN
    RETURN false;
  END IF;

  v_status := fn_onboarding_status(v_person_id);
  -- Exigir senha alterada e termos/responsabilidade aceitos antes de concluir welcome
  IF COALESCE((v_status->>'must_change_password')::boolean, true)
     OR COALESCE((v_status->>'terms_pending')::boolean, true)
     OR COALESCE((v_status->>'responsibility_pending')::boolean, true) THEN
    RETURN false;
  END IF;

  INSERT INTO user_onboarding (person_id, must_change_password)
  VALUES (v_person_id, true)
  ON CONFLICT (person_id) DO NOTHING;

  UPDATE user_onboarding
  SET welcome_completed_at = now(),
      updated_at = now()
  WHERE person_id = v_person_id;

  PERFORM fn_audit_log('onboarding', 'welcome_completed', 'user_onboarding', v_person_id, NULL,
    jsonb_build_object('welcome_completed', true), 'sucesso', NULL, NULL);

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_complete_welcome() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_complete_welcome() TO authenticated;

-- Status de onboarding (server-side, stateless)
CREATE OR REPLACE FUNCTION fn_onboarding_status(p_person_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_person_id UUID;
  v_current UUID := fn_resolve_person_id();
  v_must_change BOOLEAN := true;
  v_welcome_completed BOOLEAN := false;
  v_terms_pending BOOLEAN := false;
  v_resp_pending BOOLEAN := false;
BEGIN
  v_person_id := COALESCE(p_person_id, v_current);
  IF v_person_id IS NULL THEN
    RETURN jsonb_build_object(
      'must_change_password', true,
      'terms_pending', true,
      'responsibility_pending', true,
      'welcome_pending', true
    );
  END IF;

  -- Só expõe status próprio (ou admin com permissão explícita)
  IF v_current IS NOT NULL AND v_person_id <> v_current
     AND NOT fn_person_has_permission(v_current, 'onboarding', 'read', NULL, NULL) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  -- Garantir registro de estado existe (via definer)
  INSERT INTO user_onboarding (person_id, must_change_password)
  VALUES (v_person_id, true)
  ON CONFLICT (person_id) DO NOTHING;

  SELECT COALESCE(uo.must_change_password, true),
         (uo.welcome_completed_at IS NOT NULL)
  INTO v_must_change, v_welcome_completed
  FROM user_onboarding uo
  WHERE uo.person_id = v_person_id;

  -- Pendente se existir documento ativo obrigatório do tipo sem aceite correspondente
  SELECT EXISTS (
    SELECT 1 FROM legal_documents ld
    WHERE ld.ativo = true AND ld.obrigatorio = true AND ld.tipo = 'terms_of_use'
      AND NOT EXISTS (
        SELECT 1 FROM legal_acceptances la
        WHERE la.person_id = v_person_id AND la.legal_document_id = ld.id
      )
  ) INTO v_terms_pending;

  SELECT EXISTS (
    SELECT 1 FROM legal_documents ld
    WHERE ld.ativo = true AND ld.obrigatorio = true AND ld.tipo = 'responsibility'
      AND NOT EXISTS (
        SELECT 1 FROM legal_acceptances la
        WHERE la.person_id = v_person_id AND la.legal_document_id = ld.id
      )
  ) INTO v_resp_pending;

  RETURN jsonb_build_object(
    'must_change_password', COALESCE(v_must_change, true),
    'terms_pending', COALESCE(v_terms_pending, false),
    'responsibility_pending', COALESCE(v_resp_pending, false),
    'welcome_pending', NOT COALESCE(v_welcome_completed, false)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_onboarding_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_onboarding_status(UUID) TO authenticated;

COMMENT ON TABLE legal_documents IS 'Documentos legais versionados (termos, responsabilidade, privacidade) para aceite auditável.';
COMMENT ON TABLE legal_acceptances IS 'Evidências de aceite de documentos legais por pessoa autenticada.';
COMMENT ON TABLE user_onboarding IS 'Estado persistente de onboarding/primeiro acesso (server-controlled). Troca de senha confirmada apenas por mecanismo confiável (service_role).';
