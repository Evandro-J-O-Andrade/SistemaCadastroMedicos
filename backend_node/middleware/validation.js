import Joi from "joi";

// Função genérica de validação
export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ erro: "Dados inválidos", detalhes: errors });
  }
  next();
};

// ===========================================
// SCHEMAS DE VALIDAÇÃO
// ===========================================
export const schemas = {
  usuario: Joi.object({
    // ✅ CORREÇÃO: Mudança de 'username' para 'usuario'
    usuario: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/).required(), 
    senha: Joi.string().min(6).required(),
    // ✅ CORREÇÃO: Mudança de 'tipo' para 'role'
    role: Joi.string().valid("admin", "suporte", "usuario").default("usuario"),
    email: Joi.string().email().allow("").optional()
  }),

  medico: Joi.object({
    nome: Joi.string().min(3).required(),
    crm: Joi.string().pattern(/^[A-Za-z0-9-]{3,20}$/).required(),
    observacoes: Joi.string().allow("").optional(),
    ativo: Joi.boolean().optional(),
    // Assume que especialidades é um array de objetos { id, is_primaria }
    especialidades: Joi.array().min(1).items(
      Joi.object({ id: Joi.number().integer().required(), is_primaria: Joi.boolean().required() })
    ).required()
  }),

  plantao: Joi.object({
    medico_id: Joi.number().integer().required(),
    data: Joi.date().iso().required(), // Espera formato ISO (YYYY-MM-DD)
    hora_inicio: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    hora_fim: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    status: Joi.string().valid("Agendado", "Confirmado", "Cancelado", "Realizado").default("Agendado"),
  }),

  atendimento: Joi.object({
    plantao_id: Joi.number().integer().required(),
    paciente_nome: Joi.string().min(3).required(),
    procedimento: Joi.string().min(3).required(),
    hora: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    obs: Joi.string().allow("").optional(),
  }),

  especialidade: Joi.object({
    nome: Joi.string().min(3).required(),
    descricao: Joi.string().allow("").optional(),
  }),
};