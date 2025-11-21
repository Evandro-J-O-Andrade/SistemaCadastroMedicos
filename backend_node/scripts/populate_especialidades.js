import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import dotenv from "dotenv";
import { especialidades } from "../src/api/especialidades.js"; // ajuste o caminho

dotenv.config();

const DB_FILE = path.join(process.cwd(), process.env.DB_PATH || "./db/database.db");

async function populateEspecialidades() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  try {
    let count = 0;
    for (const esp of especialidades) {
      const exists = await db.get("SELECT id FROM especialidades WHERE nome = ?", [esp.nome]);
      if (!exists) {
        await db.run(
          "INSERT INTO especialidades (nome, descricao) VALUES (?, ?)",
          [esp.nome, esp.nome] // pode colocar esp.descricao se quiser
        );
        count++;
      }
    }
    console.log(`✅ ${count} especialidades inseridas com sucesso`);
  } catch (err) {
    console.error("Erro ao popular especialidades:", err);
  } finally {
    await db.close();
  }
}

populateEspecialidades();
