import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

/**
 * GET /relatorio/plantao
 * Retorna todos os registros da view de atendimentos (paginação opcional)
 */
router.get("/plantao", async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT * FROM vw_relatorio_atendimentos ORDER BY plantao_data DESC");
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro gerar relatório" }); } finally { db.close(); }
});

/**
 * GET /relatorio/data
 * Resumo por data dos atendimentos
 */
router.get("/data", async (req, res) => {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all("SELECT plantao_data AS data, COUNT(*) AS total FROM vw_relatorio_atendimentos GROUP BY plantao_data ORDER BY plantao_data DESC");
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro gerar relatório por data" }); } finally { db.close(); }
});

/**
 * GET /relatorio/atendimentos
 * Filtra atendimentos por médico, especialidade e período
 */
router.get("/atendimentos", async (req, res) => {
  const { id_medico, id_especialidade, data_inicio, data_fim } = req.query;
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  try {
    const rows = await db.all(
      `SELECT * FROM vw_relatorio_atendimentos
       WHERE (? IS NULL OR medico_id = ?)
         AND (? IS NULL OR (especialidades LIKE '%'||?||'%'))
         AND (? IS NULL OR date(plantao_data) >= date(?))
         AND (? IS NULL OR date(plantao_data) <= date(?))`,
      [id_medico || null, id_medico || null, id_especialidade || null, id_especialidade || null, data_inicio || null, data_inicio || null, data_fim || null, data_fim || null]
    );
    res.json(rows);
  } catch (e) { console.error(e); res.status(500).json({ error: "Erro gerar relatório filtrado" }); } finally { db.close(); }
});

export default router;
