// routes/medicos.js
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { autenticarToken, autorizarPerfis } from "./auth.js";

const router = express.Router();

// 🧩 Conexão com o banco
async function getDb() {
  return open({ filename: "./database.db", driver: sqlite3.Database });
}

/**
 * ✅ GET - Lista todos os médicos com suas especialidades
 */
router.get("/", autenticarToken, async (req, res) => {
  try {
    const db = await getDb();
    const sql = `
      SELECT 
        m.id,
        m.nome,
        m.crm,
        m.ativo,
        m.criado_em,
        m.observacoes,
        GROUP_CONCAT(
          e.nome || CASE WHEN me.is_primaria = 1 THEN ' (Primária)' ELSE '' END, ', '
        ) AS especialidades
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      GROUP BY m.id
      ORDER BY m.nome ASC;
    `;
    const medicos = await db.all(sql);
    res.json(medicos);
  } catch (err) {
    console.error("❌ Erro ao listar médicos:", err.message);
    res.status(500).json({ error: "Erro ao listar médicos" });
  }
});

/**
 * 🔍 GET /:id - Retorna um médico com todas as especialidades detalhadas
 */
router.get("/:id", autenticarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const sql = `
      SELECT 
        m.id, m.nome, m.crm, m.ativo, m.criado_em, m.observacoes,
        e.id AS especialidade_id,
        e.nome AS especialidade_nome,
        me.is_primaria
      FROM medicos m
      LEFT JOIN medico_especialidade me ON m.id = me.medico_id
      LEFT JOIN especialidades e ON me.especialidade_id = e.id
      WHERE m.id = ?
    `;

    const rows = await db.all(sql, [id]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Médico não encontrado" });

    const medico = {
      id: rows[0].id,
      nome: rows[0].nome,
      crm: rows[0].crm,
      ativo: rows[0].ativo === 1,
      criado_em: rows[0].criado_em,
      observacoes: rows[0].observacoes,
      especialidades: rows
        .filter((r) => r.especialidade_id)
        .map((r) => ({
          id: r.especialidade_id,
          nome: r.especialidade_nome,
          is_primaria: r.is_primaria === 1,
        })),
    };

    res.json(medico);
  } catch (err) {
    console.error("❌ Erro ao buscar médico:", err.message);
    res.status(500).json({ error: "Erro ao buscar médico" });
  }
});

/**
 * ➕ POST - Cadastra novo médico com especialidades
 */
router.post("/", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { nome, crm, observacoes, especialidades } = req.body;

  if (!nome || !crm || !Array.isArray(especialidades))
    return res.status(400).json({ error: "Dados inválidos ou incompletos" });

  const primarias = especialidades.filter((e) => e.is_primaria);
  if (primarias.length !== 1)
    return res.status(400).json({ error: "Deve haver exatamente uma especialidade primária." });

  const db = await getDb();
  try {
    await db.run("BEGIN TRANSACTION;");

    const { lastID } = await db.run(
      `INSERT INTO medicos (nome, crm, observacoes, criado_em) VALUES (?, ?, ?, datetime('now'))`,
      [nome, crm, observacoes || null]
    );

    for (const esp of especialidades) {
      await db.run(
        `INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria)
         VALUES (?, ?, ?)`,
        [lastID, esp.id, esp.is_primaria ? 1 : 0]
      );
    }

    await db.run("COMMIT;");
    res.status(201).json({ id: lastID, nome, crm, especialidades });
  } catch (err) {
    await db.run("ROLLBACK;");
    console.error("❌ Erro ao cadastrar médico:", err.message);
    res.status(500).json({ error: "Erro ao cadastrar médico" });
  }
});

/**
 * ✏️ PUT - Atualiza médico e especialidades
 */
router.put("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { id } = req.params;
  const { nome, crm, observacoes, ativo, especialidades } = req.body;

  if (!id) return res.status(400).json({ error: "ID não informado" });

  const db = await getDb();
  try {
    await db.run("BEGIN TRANSACTION;");

    const campos = [];
    const valores = [];

    if (nome) { campos.push("nome = ?"); valores.push(nome); }
    if (crm) { campos.push("crm = ?"); valores.push(crm); }
    if (observacoes !== undefined) { campos.push("observacoes = ?"); valores.push(observacoes || null); }
    if (ativo !== undefined) { campos.push("ativo = ?"); valores.push(ativo ? 1 : 0); }

    campos.push("atualizado_em = datetime('now')");
    valores.push(id);

    if (campos.length > 1)
      await db.run(`UPDATE medicos SET ${campos.join(", ")} WHERE id = ?`, valores);

    if (Array.isArray(especialidades)) {
      const primarias = especialidades.filter((e) => e.is_primaria);
      if (primarias.length !== 1)
        throw new Error("Deve haver exatamente uma especialidade primária.");

      await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]);
      for (const esp of especialidades) {
        await db.run(
          `INSERT INTO medico_especialidade (medico_id, especialidade_id, is_primaria)
           VALUES (?, ?, ?)`,
          [id, esp.id, esp.is_primaria ? 1 : 0]
        );
      }
    }

    await db.run("COMMIT;");
    res.json({ sucesso: true, id });
  } catch (err) {
    await db.run("ROLLBACK;");
    console.error("❌ Erro ao atualizar médico:", err.message);
    res.status(500).json({ error: err.message || "Erro ao atualizar médico" });
  }
});

/**
 * ❌ DELETE - Remove médico e vínculos
 */
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    await db.run("BEGIN TRANSACTION;");
    await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [id]);
    await db.run("DELETE FROM medicos WHERE id = ?", [id]);
    await db.run("COMMIT;");

    res.json({ sucesso: true });
  } catch (err) {
    console.error("❌ Erro ao excluir médico:", err.message);
    res.status(500).json({ error: "Erro ao excluir médico" });
  }
});

export default router;
