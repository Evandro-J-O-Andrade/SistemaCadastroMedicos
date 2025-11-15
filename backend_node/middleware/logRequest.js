import { open } from "sqlite";
import sqlite3 from "sqlite3";
import dotenv from "dotenv";
dotenv.config();

const DB_FILE = process.env.DB_PATH || "./db/database.db";

export async function logRequest(req, res, next) {
  try {
    const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
    const user = req.user ? req.user.username : null;
    await db.run(
      "INSERT INTO audit_logs (rota, metodo, usuario, ip, payload, resultado) VALUES (?, ?, ?, ?, ?, ?)",
      [req.path, req.method, user, req.ip, JSON.stringify(req.body || {}), null]
    );
    await db.close();
  } catch (e) {
    // não bloquear requisição se falhar log
    console.error("Erro audit log:", e.message);
  } finally {
    next();
  }
}
