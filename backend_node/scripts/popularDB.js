// backend_node/scripts/popularDB.js
import path from "path";
import { fileURLToPath } from "url";

// --- Define __dirname para ESM ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Importa o banco de dados ---
import db from "../utils/database.js";

// --- Importa especialidades e função de info ---
import { especialidades, getEspecialidadeInfo } from "../../src/api/especialidades.js";

// --- Importa médicos ---
import { medicos } from "./medicos.js";

async function popularEspecialidades() {
  console.log("🌱 Populando especialidades...");

  for (const esp of especialidades) {
    await db.run(
      `INSERT OR IGNORE INTO especialidades (id, nome, icone, cor, cadastros)
       VALUES (?, ?, ?, ?, ?)`,
      [esp.id, esp.nome, esp.icone, esp.cor, esp.cadastros]
    );
  }

  console.log("✅ Especialidades populadas!");
}

async function popularMedicos() {
  console.log("🌱 Populando médicos...");

  for (const med of medicos) {
    const nomeMedico = typeof med === "string" ? med : med.nome;
    const especialidadeInput = med.especialidade || "Desconhecido";

    const espObj = getEspecialidadeInfo(especialidadeInput); // retorna objeto { id, nome, ... }

    await db.run(
      `INSERT OR IGNORE INTO medicos (nome, crm, observacoes, ativo, especialidade_principal_id, criado_em)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [nomeMedico, med.crm || null, med.observacoes || null, 1, espObj.id || null]
    );

    // Atualiza contagem de cadastros na tabela de especialidades
    await db.run(
      `UPDATE especialidades SET cadastros = cadastros + 1 WHERE id = ?`,
      [espObj.id]
    );
  }

  console.log("✅ Médicos populados!");
}

async function popularBanco() {
  try {
    await popularEspecialidades();
    await popularMedicos();
    console.log("🎉 Banco populado com sucesso!");
    await db.close();
  } catch (err) {
    console.error("❌ Erro ao popular banco:", err);
  }
}

// Executa
popularBanco();
