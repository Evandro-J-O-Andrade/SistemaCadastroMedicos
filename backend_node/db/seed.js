// db/seed.js (Corrigido e compatível com seu init.js)
import db from "./database.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;
const SENHA_ADMIN = "admin123";

async function seedDatabase() {
  console.log("🌱 Iniciando população inicial do banco de dados...");

  try {
    const senhaHash = await bcrypt.hash(SENHA_ADMIN, SALT_ROUNDS);

    // 1️⃣ Inserir Usuário Administrador
    // Seu banco usa colunas: nome, email, senha, cargo
    await db.run(
      `
      INSERT OR IGNORE INTO usuarios (nome, email, senha, cargo)
      VALUES (?, ?, ?, ?)
      `,
      ["Administrador", "admin@med.com", senhaHash, "admin"]
    );
    console.log("✅ Usuário 'Administrador' criado (se já não existia).");

    // 2️⃣ Inserir Especialidades (se não existirem)
    const especialidades = [
      "Clínica Médica",
      "Pediatria",
      "Cirurgia Geral",
      "Ortopedia",
      "Cardiologia",
      "Ginecologia",
      "Dermatologia",
      "Neurologia",
    ];

    for (const nome of especialidades) {
      await db.run(
        `
        INSERT OR IGNORE INTO especialidades (nome, descricao)
        VALUES (?, ?)
        `,
        [nome, `${nome} - especialidade médica`]
      );
    }
    console.log("✅ Especialidades básicas inseridas.");

    console.log("🌱 População de dados (seed) concluída com sucesso!");
  } catch (err) {
    console.error("❌ ERRO durante o Seed do banco de dados:", err);
  }
}

seedDatabase();
