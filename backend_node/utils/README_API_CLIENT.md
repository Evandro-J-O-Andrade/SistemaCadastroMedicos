# API Client (dicas para integrar o frontend)

- A variável de ambiente que o frontend deve usar para falar com o backend:
  REACT_APP_API_URL=http://localhost:5000

- Rotas principais:
  POST /auth/login             -> { username, senha }  => { user, token }
  GET  /auth/check             -> (Authorization: Bearer <token>)
  POST /auth/recuperar-senha   -> { username } => envia pedido para o admin (email)
  POST /auth/reset-senha/:token -> { senha }  => usado pelo admin para reset

  GET  /medicos                -> lista médicos (Auth)
  GET  /medicos/pesquisa?nome=&crm= -> pesquisa (Auth)
  POST /medicos                -> cria (Auth admin)
  PUT  /medicos/:id            -> atualiza (Auth admin)
  DELETE /medicos/:id          -> exclui (Auth admin)

  GET  /plantoes               -> lista plantões (Auth)
  GET  /plantoes/filtro?data=&medico_id=&especialidade_id= -> filtro (Auth)
  POST /plantoes               -> cria (Auth admin/suporte)
  PUT  /plantoes/:id           -> atualiza (Auth admin/suporte)
  DELETE /plantoes/:id         -> exclui (Auth admin/suporte)

  GET  /especialidades         -> lista (Auth)
  POST /especialidades         -> cria (Auth admin)

  GET  /atendimentos/:plantao_id -> lista atendimentos (Auth)
  POST /atendimentos           -> cria atendimento (Auth admin/suporte)

  GET  /relatorio/plantao
  GET  /relatorio/data
  GET  /relatorio/atendimentos?id_medico=&id_especialidade=&data_inicio=&data_fim=

- Certifique-se de enviar o header:
  Authorization: Bearer <token>

- Para desenvolvimento netlify + backend local:
  defina CORS_ORIGIN no .env do backend para http://localhost:5173

