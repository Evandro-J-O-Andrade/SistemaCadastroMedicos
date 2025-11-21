// routes/medicos.js (CORRIGIDO)
import express from "express";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import db from "../utils/database.js";

const router = express.Router();

/** LISTAR TODOS OS MÉDICOS */
router.get("/", autenticarToken, async (req, res) => {
  try {
    const sql = `       
      -- CORREÇÃO: Usar 'observacao'
      SELECT m.id, m.nome, m.crm, m.ativo, m.criado_em, m.observacao,
        GROUP_CONCAT(e.nome || CASE WHEN me.is_primaria = 1 THEN ' (Primária)' ELSE '' END, ', ') AS especialidades
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY m.id
      ORDER BY m.nome ASC
    `;
    const rows = await db.all(sql);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar médicos" });
  }
});

/** GET MÉDICO POR ID */
router.get("/:id", autenticarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db.all(`       
      -- CORREÇÃO: Usar 'observacao'
      SELECT m.id,m.nome,m.crm,m.ativo,m.criado_em,m.observacao,m.atualizado_em,
             e.id AS especialidade_id, e.nome AS especialidade_nome, me.is_primaria
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE m.id = ?
    `, [id]);

    // ... (restante da lógica de formatação do retorno)
    // ...
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar médico" });
  }
});

/** CRIAR MÉDICO */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), validate(schemas.medico), async (req, res) => {
  // CORREÇÃO: Usar 'observacao' no destructuring do payload
  const { nome, crm, observacao, especialidades } = req.body; 
  const crmUpper = crm.toUpperCase();

  await db.run("BEGIN TRANSACTION");
  try {
    // 1. Inserção do Médico
    // CORREÇÃO: Inserir na coluna 'observacao'
    const r = await db.run(
      "INSERT INTO medicos (nome, crm, observacao, criado_em) VALUES (?, ?, ?, datetime('now'))",
      [nome, crmUpper, observacao || null]
    );
    const id = r.lastID;

    // ... (restante da lógica de especialidades)
    await db.run("COMMIT");
    res.status(201).json({ id, nome });
  } catch (e) {
    await db.run("ROLLBACK");
    // ... (tratamento de erro)
  }
});

/** ATUALIZAR MÉDICO */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  // CORREÇÃO: Usar 'observacao' no destructuring do payload
  const { nome, crm, observacao, ativo, especialidades } = req.body;
  
  const campos = [];
  const valores = [];

  if (nome) { campos.push("nome = ?"); valores.push(nome); }
  if (crm) { campos.push("crm = ?"); valores.push(crm.toUpperCase()); }
  // CORREÇÃO: Mudar campo 'observacoes' para 'observacao'
  if (observacao !== undefined) { campos.push("observacao = ?"); valores.push(observacao || null); }
  if (ativo !== undefined) { campos.push("ativo = ?"); valores.push(ativo ? 1 : 0); }

  // ... (restante da lógica de atualização)
});

// ... (Restante das rotas de exclusão e listagem com filtro - não precisam de correção de coluna)

export default router;