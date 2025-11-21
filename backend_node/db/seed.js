import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const DB_FILE = process.env.DB_PATH || "./db/database.db";

async function seed() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  const SALT = 12;

  // 1. CORREÇÃO: Colunas 'nome' -> 'usuario' e 'tipo' -> 'role'
  const adminPass = await bcrypt.hash("12345", SALT);
  await db.run("INSERT OR IGNORE INTO usuarios (usuario, email, senha, role, criado_em) VALUES (?, ?, ?, ?, datetime('now'))", [
    // O valor 'ADMIN' em maiúsculas será armazenado.
    // O 'COLLATE NOCASE' no init.js garante que o login com 'admin' (minúsculo) funcione.
    "ADMIN", 
    process.env.ADMIN_EMAIL || "admin@alpha.com",
    adminPass,
    "admin" // Valor da coluna 'role'
  ]);

  // especialidades
  const especialidades = [
    { nome: "Cardiologia", descricao: "Doenças do coração" },
    { nome: "Clínica Geral", descricao: "Atendimento primário" },
    { nome: "Pediatria", descricao: "Saúde infantil" },
    { nome: "Ortopedia", descricao: "Sistema músculo-esquelético" }
  ];

  const ids = {};
  for (const e of especialidades) {
    const r = await db.run("INSERT OR IGNORE INTO especialidades (nome, descricao, criado_em) VALUES (?, ?, datetime('now'))", [e.nome, e.descricao]);
    let id = r.lastID;
    if (!id) {
      const ex = await db.get("SELECT id FROM especialidades WHERE nome = ?", [e.nome]);
      id = ex.id;
    }
    ids[e.nome] = id;
  }

  // medicos seed
  const medicos = [
    { nome: "Dr. Ana C.", crm: "CRM1000", prim: "Cardiologia", secs: ["Clínica Geral"] },
    { nome: "Dr. Beto S.", crm: "CRM2000", prim: "Pediatria", secs: [] },
    { nome: "Dr. Carlos D.", crm: "CRM3000", prim: "Clínica Geral", secs: ["Ortopedia"] }
  ];

  for (const m of medicos) {
    // 2. CORREÇÃO: Coluna 'observacoes' -> 'observacao' (singular)
    const r = await db.run("INSERT OR IGNORE INTO medicos (nome, crm, observacao, criado_em) VALUES (?, ?, ?, datetime('now'))", [m.nome, m.crm, "seed"]);
    let medId = r.lastID;
    if (!medId) {
      const ex = await db.get("SELECT id FROM medicos WHERE crm = ?", [m.crm]);
      medId = ex.id;
    }

    // seta especialidade principal
    await db.run(
      "UPDATE medicos SET especialidade_principal_id = ? WHERE id = ?",
      [ids[m.prim], medId]
    );

    // limpa e adiciona especialidades N:N
    await db.run("DELETE FROM medico_especialidade WHERE medico_id = ?", [medId]);
    await db.run("INSERT OR IGNORE INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, 1)", [medId, ids[m.prim]]);
    for (const s of m.secs) {
      await db.run("INSERT OR IGNORE INTO medico_especialidade (medico_id, especialidade_id, is_primaria) VALUES (?, ?, 0)", [medId, ids[s]]);
    }
  }

  console.log("✅ Seed finalizado");
  await db.close();
}

seed().catch((e) => console.error("Erro seed:", e));