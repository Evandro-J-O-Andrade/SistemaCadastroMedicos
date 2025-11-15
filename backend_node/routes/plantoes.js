import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/** list */
router.get("/", autenticarToken, async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const sql = `
      SELECT p.id, p.data, p.hora_inicio, p.hora_fim, p.status, m.nome AS medico_nome, m.crm,
        GROUP_CONCAT(e.nome, ', ') AS especialidades
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY p.id
      ORDER BY p.data DESC, p.hora_inicio ASC
    `;
    const rows = await db.all(sql);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro listar plantoes" }); } finally { db.close(); }
});

/** filtro */
router.get("/filtro", autenticarToken, async (req, res) => {
  const { data, medico_id, especialidade_id } = req.query;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    let sql = `
      SELECT p.id, p.data, p.hora_inicio, p.hora_fim, m.nome AS medico_nome, p.status,
        GROUP_CONCAT(e.nome, ', ') AS especialidades
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE 1=1
    `;
    const params = [];
    if (data) { sql += " AND p.data = ?"; params.push(data); }
    if (medico_id) { sql += " AND p.medico_id = ?"; params.push(medico_id); }
    if (especialidade_id) { sql += " AND e.id = ?"; params.push(especialidade_id); }
    sql += " GROUP BY p.id ORDER BY p.data DESC";
    const rows = await db.all(sql, params);
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro filtro" }); } finally { db.close(); }
});

/** create - evita conflito < 12h */
router.post("/", autenticarToken, autorizarPerfis("admin", "suporte"), validate(schemas.plantao), async (req, res) => {
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;
  const criado_por = req.user.id;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    // verifica conflito: mesmo medico, mesma data, interseção de horários
    const conflict = await db.get(
      "SELECT id FROM plantoes WHERE medico_id = ? AND data = ? AND (hora_inicio < ? AND hora_fim > ?)",
      [medico_id, data, hora_fim, hora_inicio]
    );
    if (conflict) return res.status(409).json({ error: "Conflito de plantão para esse médico nesse horário" });

    const r = await db.run(
      "INSERT INTO plantoes (medico_id, data, hora_inicio, hora_fim, status, observacoes, criado_em, criado_por) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)",
      [medico_id, data, hora_inicio, hora_fim, status || "Agendado", observacoes || null, criado_por]
    );
    res.status(201).json({ id: r.lastID });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro criar plantao" }); } finally { db.close(); }
});

/** update */
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params;
  const { medico_id, data, hora_inicio, hora_fim, status, observacoes } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const campos = []; const valores = [];
    if (medico_id) { campos.push("medico_id = ?"); valores.push(medico_id); }
    if (data) { campos.push("data = ?"); valores.push(data); }
    if (hora_inicio) { campos.push("hora_inicio = ?"); valores.push(hora_inicio); }
    if (hora_fim) { campos.push("hora_fim = ?"); valores.push(hora_fim); }
    if (status) { campos.push("status = ?"); valores.push(status); }
    if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); }
    if (campos.length === 0) return res.status(400).json({ error: "Nenhum campo informado" });
    campos.push("atualizado_em = datetime('now')"); valores.push(id);
    const r = await db.run(`UPDATE plantoes SET ${campos.join(", ")} WHERE id = ?`, valores);
    if (r.changes === 0) return res.status(404).json({ error: "Plantão não encontrado" });
    res.json({ sucesso: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro atualizar" }); } finally { db.close(); }
});

/** delete */
router.delete("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { id } = req.params; const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const r = await db.run("DELETE FROM plantoes WHERE id = ?", [id]);
    if (r.changes === 0) return res.status(404).json({ error: "Plantão não encontrado" });
    res.json({ sucesso: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro excluir" }); } finally { db.close(); }
});

/** relatorio por periodo */
router.post("/relatorio", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const { dataInicio, dataFim } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(`
      SELECT m.nome AS medico, GROUP_CONCAT(e.nome, ', ') AS especialidades, p.data, p.hora_inicio, p.hora_fim, p.status
      FROM plantoes p
      LEFT JOIN medicos m ON p.medico_id = m.id
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE p.data BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY p.data ASC, p.hora_inicio ASC
    `, [dataInicio || "1900-01-01", dataFim || "2999-12-31"]);
    res.json({ periodo: { de: dataInicio, ate: dataFim }, total: rows.length, registros: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro relatorio" }); } finally { db.close(); }
});

export default router;
