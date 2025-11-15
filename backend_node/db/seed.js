import { open } from "sqlite";
import sqlite3 from "sqlite3";
import bcrypt from "bcrypt";

const DB_FILE = process.env.DB_PATH || "./db/database.db";

async function seed() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  const SALT = 12;

  // admin
  const adminPass = await bcrypt.hash("admin123", SALT);
  await db.run("INSERT OR IGNORE INTO usuarios (username, email, senha, tipo, criado_em) VALUES (?, ?, ?, ?, datetime('now'))", [
    "admin",
    "admin@alpha.com",
    adminPass,
    "admin",
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

  // medicos
  const medicos = [
    { nome: "Dr. Ana C.", crm: "CRM1000", prim: "Cardiologia", secs: ["Clínica Geral"] },
    { nome: "Dr. Beto S.", crm: "CRM2000", prim: "Pediatria", secs: [] },
    { nome: "Dr. Carlos D.", crm: "CRM3000", prim: "Clínica Geral", secs: ["Ortopedia"] }
  ];

  for (const m of medicos) {
    const r = await db.run("INSERT OR IGNORE INTO medicos (nome, crm, observacoes, criado_em) VALUES (?, ?, ?, datetime('now'))", [m.nome, m.crm, "seed"]);
    let medId = r.lastID;
    if (!medId) {
      const ex = await db.get("SELECT id FROM medicos WHERE crm = ?", [m.crm]);
      medId = ex.id;
    }
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
