import Joi from "joi";

export const schemas = {
  usuario: Joi.object({
    username: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_-]+$/).required(),
    senha: Joi.string().min(6).required(),
    tipo: Joi.string().valid("admin", "suporte", "usuario").default("usuario"),
    email: Joi.string().email().allow("").optional(),
  }),
  medico: Joi.object({
    nome: Joi.string().min(3).required(),
    crm: Joi.string().pattern(/^[A-Za-z0-9-]{3,20}$/).required(),
    observacoes: Joi.string().allow("").optional(),
    ativo: Joi.boolean().optional(),
    especialidades: Joi.array().min(1).items(
      Joi.object({ id: Joi.number().integer().required(), is_primaria: Joi.boolean().required() })
    ).required()
  }),
  plantao: Joi.object({
    medico_id: Joi.number().integer().required(),
    data: Joi.date().iso().required(),
    hora_inicio: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    hora_fim: Joi.string().pattern(/^[0-9]{2}:[0-9]{2}$/).required(),
    status: Joi.string().valid("Agendado", "Confirmado", "Cancelado", "Realizado").default("Agendado"),
    observacoes: Joi.string().allow("").optional()
  }),
  especialidade: Joi.object({
    nome: Joi.string().min(2).required(),
    descricao: Joi.string().allow("").optional(),
  })
};

export function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.unknown(false).validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    next();
  };
}
