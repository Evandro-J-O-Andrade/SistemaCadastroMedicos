-- 20261126130000_gate3_04_seed_legal_documents_TEMPLATE.sql
-- TEMPLATE de publicação dos documentos legais obrigatórios (terms_of_use,
-- responsibility) e da Política de Privacidade (privacy_notice).
--
--！！ IMPORTANTE: este arquivo é um TEMPLATE. Ele NÃO contém texto jurídico real.
-- Substitua os marcadores __CONTEUDO_APROVADO_TERMS__ / __CONTEUDO_APROVADO_RESPONSABILIDADE__
-- / __CONTEUDO_APROVADO_PRIVACIDADE__ pelo texto FINAL revisado e aprovado.
-- O bloco DO abaixo ABORTA a transação se qualquer marcador permanecer, evitando
-- publicar conteúdo fictício ou placeholder em produção.
--
-- Requisitos: texto aprovado pelos responsáveis legais/DPO da plataforma.
-- Não registra aceites. Apenas publica documentos ativos e obrigatórios.
-- Idempotente por (tipo, versao): reexecutar com a mesma versão é no-op (ON CONFLICT).

DO $$
DECLARE
  v_terms    TEXT := '__CONTEUDO_APROVADO_TERMS__';
  v_resp     TEXT := '__CONTEUDO_APROVADO_RESPONSABILIDADE__';
  v_priv     TEXT := '__CONTEUDO_APROVADO_PRIVACIDADE__';
  v_versao   TEXT := '1.0';
BEGIN
  IF v_terms LIKE '__CONTEUDO_APROVADO_%'
     OR v_resp LIKE '__CONTEUDO_APROVADO_%'
     OR v_priv LIKE '__CONTEUDO_APROVADO_%' THEN
    RAISE EXCEPTION 'Conteúdo legal não revisado: substitua os marcadores __CONTEUDO_APROVADO_*__ pelo texto aprovado antes de aplicar.';
  END IF;

  INSERT INTO legal_documents (tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo)
  VALUES ('terms_of_use', v_versao, 'Termos de Uso', v_terms, md5(v_terms), true, true)
  ON CONFLICT (tipo, versao) DO NOTHING;

  INSERT INTO legal_documents (tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo)
  VALUES ('responsibility', v_versao, 'Termo de Responsabilidade', v_resp, md5(v_resp), true, true)
  ON CONFLICT (tipo, versao) DO NOTHING;

  INSERT INTO legal_documents (tipo, versao, titulo, conteudo, conteudo_hash, obrigatorio, ativo)
  VALUES ('privacy_notice', v_versao, 'Política de Privacidade (LGPD)', v_priv, md5(v_priv), false, true)
  ON CONFLICT (tipo, versao) DO NOTHING;
END;
$$;