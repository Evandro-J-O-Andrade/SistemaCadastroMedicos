// routes/atendimentos.js
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/**
 * GET /atendimentos/:plantao_id
 * Lista atendimentos por plantão
 */
router.get("/:plantao_id", autenticarToken, async (req, res) => {
  const { plantao_id } = req.params;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      "SELECT * FROM atendimentos WHERE plantao_id = ? ORDER BY criado_em DESC",
      [plantao_id]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar atendimentos" });
  } finally {
    await db.close();
  }
});

/**
 * GET /atendimentos
 * Lista atendimentos com filtros opcionais
 */
router.get("/", autenticarToken, async (req, res) => {
  const { plantao_id, paciente_nome, procedimento, data_inicio, data_fim } = req.query;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    let sql = "SELECT * FROM atendimentos WHERE 1=1";
    const params = [];
    if (plantao_id) { sql += " AND plantao_id = ?"; params.push(plantao_id); }
    if (paciente_nome) { sql += " AND paciente_nome LIKE ?"; params.push(`%${paciente_nome}%`); }
    if (procedimento) { sql += " AND procedimento LIKE ?"; params.push(`%${procedimento}%`); }
    if (data_inicio) { sql += " AND date(criado_em) >= date(?)"; params.push(data_inicio); }
    if (data_fim) { sql += " AND date(criado_em) <= date(?)"; params.push(data_fim); }
    sql += " ORDER BY criado_em DESC";
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar atendimentos" });
  } finally {
    await db.close();
  }
});

/**
 * POST /atendimentos
 * Cria um atendimento
 */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { plantao_id, paciente_nome, procedimento, hora, obs } = req.body;
  if (!plantao_id || !paciente_nome || !hora) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  }
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run(
      "INSERT INTO atendimentos (plantao_id, paciente_nome, procedimento, hora, obs, criado_em) VALUES (?, ?, ?, ?, ?, datetime('now'))",
      [plantao_id, paciente_nome, procedimento || null, hora, obs || null]
    );
    res.status(201).json({ id: r.lastID });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar atendimento" });
  } finally {
    await db.close();
  }
});

/**
 * PUT /atendimentos/:id
 * Atualiza atendimento
 */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  const { paciente_nome, procedimento, hora, obs } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = [];
    const valores = [];
    if (paciente_nome) { campos.push("paciente_nome = ?"); valores.push(paciente_nome); }
    if (procedimento !== undefined) { campos.push("procedimento = ?"); valores.push(procedimento); }
    if (hora) { campos.push("hora = ?"); valores.push(hora); }
    if (obs !== undefined) { campos.push("obs = ?"); valores.push(obs); }

    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo informado" });

    valores.push(id);
    const r = await db.run(`UPDATE atendimentos SET ${campos.join(", ")} WHERE id = ?`, valores);
    if (r.changes === 0) return res.status(404).json({ error: "Atendimento não encontrado" });

    res.json({ msg: "Atualizado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao atualizar atendimento" });
  } finally {
    await db.close();
  }
});

/**
 * DELETE /atendimentos/:id
 * Exclui atendimento
 */
router.delete("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run("DELETE FROM atendimentos WHERE id = ?", [id]);
    if (r.changes === 0) return res.status(404).json({ error: "Atendimento não encontrado" });
    res.json({ msg: "Excluído" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir atendimento" });
  } finally {
    await db.close();
  }
});

/**
 * POST /atendimentos/relatorio
 * Relatório de atendimentos por período
 */
router.post("/relatorio", autenticarToken, autorizarPerfis("admin", "suporte", "usuario"), async (req, res) => {
  const { dataInicio, dataFim } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      `SELECT a.id, a.plantao_id, a.paciente_nome, a.procedimento, a.hora, a.obs, a.criado_em,
              m.nome AS medico, m.crm, GROUP_CONCAT(e.nome, ', ') AS especialidades
       FROM atendimentos a
       LEFT JOIN plantoes p ON a.plantao_id = p.id
       LEFT JOIN medicos m ON p.medico_id = m.id
       LEFT JOIN medico_especialidade me ON m.id = me.medico_id
       LEFT JOIN especialidades e ON me.especialidade_id = e.id
       WHERE date(a.criado_em) BETWEEN date(?) AND date(?)
       GROUP BY a.id
       ORDER BY a.criado_em DESC`,
      [dataInicio || "1900-01-01", dataFim || "2999-12-31"]
    );
    res.json({ periodo: { de: dataInicio, ate: dataFim }, total: rows.length, registros: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro gerar relatório" });
  } finally {
    await db.close();
  }
});

export default router;
