-- 20261126120000_gate3_02_onboarding_lgpd_no_skip.sql
-- Correção da regra de onboarding LGPD:
-- fn_onboarding_status() não deve marcar termos/responsabilidade como concluídos
-- quando NÃO existe documento legal ativo e obrigatório publicado.
-- Regra: a etapa fica PENDENTE se (a) não há documento ativo obrigatório do tipo,
-- ou (b) existe documento ativo obrigatório sem aceite correspondente.
-- Assim o fluxo não pula a etapa LGPD e não abre o Welcome indevidamente.
-- Não modifica histórico publicado. Reaplicável (CREATE OR REPLACE).

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
  v_terms_pending BOOLEAN := true;
  v_resp_pending BOOLEAN := true;
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

  -- Termos de uso: pendente se não há documento ativo obrigatório publicado,
  -- ou se há documento ativo obrigatório sem aceite correspondente.
  SELECT
    (NOT EXISTS (
       SELECT 1 FROM legal_documents ld
       WHERE ld.ativo = true AND ld.obrigatorio = true AND ld.tipo = 'terms_of_use'
     )
     OR EXISTS (
       SELECT 1 FROM legal_documents ld
       WHERE ld.ativo = true AND ld.obrigatorio = true AND ld.tipo = 'terms_of_use'
         AND NOT EXISTS (
           SELECT 1 FROM legal_acceptances la
           WHERE la.person_id = v_person_id AND la.legal_document_id = ld.id
         )
     ))
  INTO v_terms_pending;

  -- Responsabilidade: mesma regra dos termos.
  SELECT
    (NOT EXISTS (
       SELECT 1 FROM legal_documents ld
       WHERE ld.ativo = true AND ld.obrigatorio = true AND ld.tipo = 'responsibility'
     )
     OR EXISTS (
       SELECT 1 FROM legal_documents ld
       WHERE ld.ativo = true AND ld.obrigatorio = true AND ld.tipo = 'responsibility'
         AND NOT EXISTS (
           SELECT 1 FROM legal_acceptances la
           WHERE la.person_id = v_person_id AND la.legal_document_id = ld.id
         )
     ))
  INTO v_resp_pending;

  RETURN jsonb_build_object(
    'must_change_password', COALESCE(v_must_change, true),
    'terms_pending', COALESCE(v_terms_pending, true),
    'responsibility_pending', COALESCE(v_resp_pending, true),
    'welcome_pending', NOT COALESCE(v_welcome_completed, false)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_onboarding_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_onboarding_status(UUID) TO authenticated;

COMMENT ON FUNCTION fn_onboarding_status(UUID) IS
  'Status de onboarding (server-side, stateless). LGPD não é pulada: termos/responsabilidade ficam pendentes quando não há documento ativo obrigatório publicado ou há documento sem aceite.';