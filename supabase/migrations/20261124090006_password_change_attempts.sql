-- 20261124090006_password_change_attempts.sql
-- Tabela para rastrear tentativas de troca de senha com proteção contra replay

CREATE TABLE IF NOT EXISTS password_change_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL,
  attempt_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed BOOLEAN NOT NULL DEFAULT false,
  consumed_at TIMESTAMPTZ,
  CONSTRAINT fk_pca_auth_user FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_pca_token ON password_change_attempts (attempt_token);
CREATE INDEX idx_pca_user ON password_change_attempts (auth_user_id);
CREATE INDEX idx_pca_expires ON password_change_attempts (expires_at);

-- RLS: only service_role can access
ALTER TABLE password_change_attempts ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon = no access (service_role bypasses RLS)

-- Cleanup function for expired attempts
CREATE OR REPLACE FUNCTION fn_cleanup_password_change_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM password_change_attempts WHERE expires_at < now() - interval '1 hour';
END;
$$;

REVOKE EXECUTE ON FUNCTION fn_cleanup_password_change_attempts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fn_cleanup_password_change_attempts() TO service_role;
