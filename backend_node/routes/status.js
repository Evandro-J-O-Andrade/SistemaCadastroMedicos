import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
const router = express.Router();
const DB_FILE = process.env.DB_PATH || "./db/database.db";

router.get("/", async (req, res) => {
  try {
    const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
    await db.get("SELECT 1 as ok");
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    res.json({ api: "OK", database: "OK", tables: tables.map(t => t.name), timestamp: new Date().toISOString() });
    db.close();
  } catch (e) {
    console.error("Status error:", e);
    res.status(503).json({ api: "OK", database: "ERRO", error: e.message });
  }
});

export default router;
