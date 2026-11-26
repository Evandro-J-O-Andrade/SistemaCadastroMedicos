-- 20261126120100_gate3_03_reconcile_root_onboarding.sql
-- Reconciliação administrativa do estado de primeiro acesso da conta ROOT.
-- Contexto: a credencial ROOT já foi alterada (senha atual != temporária), porém
-- o controle de onboarding permanece em must_change_password = true e
-- password_changed_at = NULL, prendendo o fluxo em /first-login/change-password.
--
-- Esta migration NÃO altera a senha, NÃO cria outro ROOT e NÃO registra aceites
-- fictícios. Apenas reconcilia o estado de onboarding da conta ROOT global que
-- esteja exatamente no estado travado, com trilha de auditoria.
--
-- Condições de segurança (todas obrigatórias para o UPDATE ocorrer):
--   * person_id possui assignment ROOT global (tenant_id IS NULL) ativo;
--   * user_onboarding.must_change_password = true;
--   * user_onboarding.password_changed_at IS NULL.
-- Idempotente: após a primeira aplicação, o estado deixa de corresponder ao
-- critério e execuções seguintes não afetam nenhuma linha.

DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT uo.person_id, ail.auth_user_id
    FROM user_onboarding uo
    JOIN auth_identity_links ail ON ail.person_id = uo.person_id
    WHERE uo.must_change_password = true
      AND uo.password_changed_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM role_assignments ra
        JOIN roles ro ON ro.id = ra.role_id
        WHERE ra.person_id = uo.person_id
          AND ra.ativo = true
          AND ra.tenant_id IS NULL
          AND ro.nome = 'root'
          AND ro.ativo = true
      )
  LOOP
    UPDATE user_onboarding
    SET must_change_password = false,
        password_changed_at = now(),
        updated_at = now()
    WHERE person_id = r.person_id
      AND must_change_password = true
      AND password_changed_at IS NULL;

    INSERT INTO audit_events (
      pessoa_id, auth_user_id, recurso, acao, entidade, entidade_id,
      dados_anteriores, dados_novos, resultado
    ) VALUES (
      r.person_id, r.auth_user_id,
      'auth', 'onboarding_state_reconciled', 'user_onboarding', r.person_id,
      jsonb_build_object('must_change_password', true, 'password_changed_at', NULL),
      jsonb_build_object(
        'must_change_password', false,
        'password_changed_at', 'now()',
        'reason', 'root credential already changed before trigger installation'
      ),
      'sucesso'
    );

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'ROOT onboarding reconciled for % person(s).', v_count;
END;
$$;