-- 20261124090007_password_change_trigger.sql
-- Trigger auditável sobre mudança efetiva de auth.users.encrypted_password
-- Confirma troca de senha somente quando a credencial realmente muda

CREATE OR REPLACE FUNCTION fn_trg_password_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_person_id UUID;
BEGIN
  -- Only fire when encrypted_password actually changes
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Resolve person via auth_identity_links
    SELECT ail.person_id INTO v_person_id
    FROM auth_identity_links ail
    WHERE ail.auth_user_id = NEW.id;

    IF v_person_id IS NOT NULL THEN
      -- Update onboarding (same logic as fn_confirm_password_changed_by_auth_user)
      INSERT INTO user_onboarding (person_id, must_change_password, password_changed_at)
      VALUES (v_person_id, false, now())
      ON CONFLICT (person_id) DO UPDATE
      SET must_change_password = false,
          password_changed_at = now(),
          updated_at = now();

      -- Audit (no password or hash)
      INSERT INTO audit_events (pessoa_id, auth_user_id, recurso, acao, entidade, entidade_id, resultado)
      VALUES (v_person_id, NEW.id, 'auth', 'password_changed', 'user_onboarding', v_person_id, 'sucesso');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (SECURITY DEFINER, runs as postgres)
DROP TRIGGER IF EXISTS trg_password_changed ON auth.users;
CREATE TRIGGER trg_password_changed
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION fn_trg_password_changed();

-- Revoke direct execution of trigger function (it's a trigger, not callable)
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM authenticated;
REVOKE EXECUTE ON FUNCTION fn_trg_password_changed() FROM anon;
