import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import { schemas, validate } from "../middleware/validation.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/** LIST */
router.get("/", autenticarToken, async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const sql = `
      SELECT m.id, m.nome, m.crm, m.ativo, m.criado_em, m.observacoes,
        GROUP_CONCAT(e.nome || CASE WHEN me.is_primaria = 1 THEN ' (Primária)' ELSE '' END, ', ') AS especialidades
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY m.id ORDER BY m.nome ASC
    `;
    const rows = await db.all(sql);
    res.json(rows);
  } catch (e) {
    console.error(e); res.status(500).json({ error: "Erro ao listar médicos" });
  } finally { db.close(); }
});

/** GET by id */
router.get("/:id", autenticarToken, async (req, res) => {
  const { id } = req.params; const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(`
      SELECT m.id,m.nome,m.crm,m.ativo,m.criado_em,m.observacoes,m.atualizado_em,
             e.id AS especialidade_id, e.nome AS especialidade_nome, me.is_primaria
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE m.id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Médico não encontrado" });
    const medico = {
      id: rows[0].id, nome: rows[0].nome, crm: rows[0].crm, ativo: rows[0].ativo === 1,
      criado_em: rows[0].criado_em, atualizado_em: rows[0].atualizado_em, observacoes: rows[0].observacoes,
      especialidades: rows.filter(r => r.especialidade_id).map(r => ({ id: r.especialidade_id, nome: r.especialidade_nome, is_primaria: r.is_primaria === 1 }))
    };
    res.json(medico);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro ao buscar médico" }); } finally { db.close(); }
});

/** SEARCH (medicos/pesquisa) */
router.get("/pesquisa", autenticarToken, async (req, res) => {
  const { nome, crm } = req.query;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      `SELECT * FROM medicos WHERE (? IS NULL OR nome LIKE '%'||?||'%') AND (? IS NULL OR crm LIKE '%'||?||'%')`,
      [nome || null, nome || null, crm || null, crm || null]
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro na pesquisa" }); } finally { db.close(); }
});

/** CREATE */
router.post("/", autenticarToken, autorizarPerfis("admin"), validate(schemas.medico), async (req, res) => {
  const { nome, crm, observacoes, especialidades } = req.body;
  if (!Array.isArray(especialidades) || especialidades.length === 0) return res.status(400).json({ error: "Especialidades obrigatórias" });
  const prim = especialidades.filter(e => e.is_primaria);
  if (prim.length !== 1) return res.status(400).json({ error: "Deve ter exatamente 1 especialidade primária" });

  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    await db.run("BEGIN TRANSACTION");
    const exists = await db.get("SELECT id FROM medicos WHERE crm = ?", [crm]);
    if (exists) { await db.run("ROLLBACK"); return res.status(409).json({ error: "CRM já cadastrado" }); }
    const r = await db.run("INSERT INTO medicos (nome, crm, observacoes, criado_em) VALUES (?, ?, ?, datetime('now'))", [nome, crm, observacoes || null]);
    const id = r.lastID;
    for (const esp of especialidades) {
      await db.run("INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, ?)", [id, esp.id, esp.is_primaria ? 1 : 0]);
    }
    await db.run("COMMIT");
    res.status(201).json({ id, nome, crm });
  } catch (e) {
    await db.run("ROLLBACK");
    console.error(e); res.status(500).json({ error: "Erro ao cadastrar médico" });
  } finally { db.close(); }
});

/** UPDATE */
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const { nome, crm, observacoes, ativo, especialidades } = req.body;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    await db.run("BEGIN TRANSACTION");
    const campos = []; const valores = [];
    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (crm) { campos.push("crm = ?"); valores.push(crm); }
    if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); }
    if (ativo !== undefined) { campos.push("ativo = ?"); valores.push(ativo ? 1 : 0); }
    if (campos.length > 0) {
      campos.push("atualizado_em = datetime('now')"); valores.push(id);
      const r = await db.run(`UPDATE medicos SET ${campos.join(", ")} WHERE id = ?`, valores);
      if (r.changes === 0) throw new Error("Médico não encontrado");
    }
    if (Array.isArray(especialidades)) {
      const prim = especialidades.filter(e => e.is_primaria);
      if (prim.length !== 1) throw new Error("Deve ter 1 especialidade primária");
      await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]);
      for (const esp of especialidades) {
        await db.run("INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, ?)", [id, esp.id, esp.is_primaria ? 1 : 0]);
      }
    }
    await db.run("COMMIT");
    res.json({ sucesso: true });
  } catch (e) {
    await db.run("ROLLBACK");
    console.error(e); res.status(500).json({ error: e.message || "Erro ao atualizar" });
  } finally { db.close(); }
});

/** DELETE */
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params; const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    await db.run("BEGIN TRANSACTION");
    await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]);
    const r = await db.run("DELETE FROM medicos WHERE id = ?", [id]);
    await db.run("COMMIT");
    if (r.changes === 0) return res.status(404).json({ error: "Médico não encontrado" });
    res.json({ sucesso: true });
  } catch (e) {
    await db.run("ROLLBACK");
    console.error(e);
    if (e.message && e.message.includes("SQLITE_CONSTRAINT")) return res.status(409).json({ error: "Não é possível excluir: possui plantões" });
    res.status(500).json({ error: "Erro ao excluir" });
  } finally { db.close(); }
});

export default router;
