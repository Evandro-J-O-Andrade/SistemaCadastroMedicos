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
 * Lista atendimentos por plantao
 */
router.get("/:plantao_id", autenticarToken, async (req, res) => {
  const { plantao_id } = req.params;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT * FROM atendimentos WHERE plantao_id = ? ORDER BY criado_em DESC", [plantao_id]);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro listar atendimentos" }); } finally { db.close(); }
});

/**
 * POST /atendimentos
 * Cria um atendimento
 */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { plantao_id, paciente_nome, procedimento, hora, obs } = req.body;
  if (!plantao_id || !paciente_nome || !hora) return res.status(400).json({ error: "Campos obrigatórios ausentes" });
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run("INSERT INTO atendimentos (plantao_id, paciente_nome, procedimento, hora, obs, criado_em) VALUES (?, ?, ?, ?, ?, datetime('now'))", [plantao_id, paciente_nome, procedimento || null, hora, obs || null]);
    res.status(201).json({ id: r.lastID });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro criar atendimento" }); } finally { db.close(); }
});

/**
 * PUT /atendimentos/:id
 * Atualiza atendimento (opcional)
 */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  const { paciente_nome, procedimento, hora, obs } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = []; const vals = [];
    if (paciente_nome) { campos.push("paciente_nome = ?"); vals.push(paciente_nome); }
    if (procedimento !== undefined) { campos.push("procedimento = ?"); vals.push(procedimento); }
    if (hora) { campos.push("hora = ?"); vals.push(hora); }
    if (obs !== undefined) { campos.push("obs = ?"); vals.push(obs); }
    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo" });
    vals.push(id);
    const r = await db.run(`UPDATE atendimentos SET ${campos.join(", ")} WHERE id = ?`, vals);
    if (r.changes === 0) return res.status(404).json({ error: "Atendimento não encontrado" });
    res.json({ msg: "Atualizado" });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro atualizar atendimento" }); } finally { db.close(); }
});

export default router;
