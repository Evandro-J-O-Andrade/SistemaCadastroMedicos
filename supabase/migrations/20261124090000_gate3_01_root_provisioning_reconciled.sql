-- 20261124090000_gate3_01_root_provisioning_reconciled.sql
-- Gate 3.1 (reconciliado): NÃO substitui a função remota fn_provision_verified_initial_root.
-- A função remota (signature: (uuid, text, text)) é mais restritiva e deve ser preservada.
-- Esta migration é um no-op para reconciliar o histórico sem sobrescrever o provisionamento ROOT.
-- Função remota preservada com todas as garantias: service_role, email confirmado, exclusividade ROOT, advisory lock.

SELECT 1; -- no-op
