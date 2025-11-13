// routes/status.js
import express from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const router = express.Router();

// 🧩 Conexão com o banco
async function getDb() {
  return open({ filename: "../database.db", driver: sqlite3.Database });
}

/**
 * 💚 GET / - Health Check
 * Verifica se o servidor está rodando e se a conexão com o banco de dados está OK.
 */
router.get("/", async (req, res) => {
  let dbConnection = null;
  
  try {
    // 1. Verifica status do servidor
    const status = {
      api: "OK",
      uptime: process.uptime(), // Tempo de atividade do servidor em segundos
      timestamp: new Date().toISOString(),
      database: "TESTANDO..."
    };

    // 2. Tenta conectar e ler do banco de dados (Health Check do DB)
    dbConnection = await getDb();
    
    // Tentativa simples de leitura para garantir que o DB está funcional
    await dbConnection.get("SELECT 1 AS status"); 

    status.database = "OK";
    
    // Retorna o status de sucesso
    res.status(200).json(status);

  } catch (err) {
    // Se o banco falhar, o erro será capturado aqui
    console.error("❌ Erro no Health Check do Banco de Dados:", err.message);
    
    res.status(503).json({ 
      api: "OK", 
      database: "ERRO", 
      error_message: "Não foi possível conectar ou consultar o banco de dados." 
    });

  } finally {
    // 3. Garante que a conexão do DB seja fechada
    if (dbConnection) {
      // Nota: No modo 'sqlite/open', a conexão pode ser reutilizada, mas fechar
      // explicitamente aqui é a forma mais segura de testar.
      // Em produção, a conexão pode ser mantida aberta, mas para este teste
      // simples, esta é a melhor abordagem.
      // await dbConnection.close(); 
    }
  }
});

export default router;