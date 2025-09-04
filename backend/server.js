// server.js
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para buscar CRM pelo nome do médico
app.get("/buscar-crm", async (req, res) => {
  const nome = req.query.nome;
  if (!nome) {
    return res.status(400).json({ error: "Informe o nome do médico" });
  }

  try {
    // Monta a URL de pesquisa no site do CREMESP
    const url = `https://guiamedico.cremesp.org.br/?q=${encodeURIComponent(nome)}`;

    // Faz o request para o site
    const response = await fetch(url);
    const html = await response.text();

    // Carrega o HTML no cheerio
    const $ = cheerio.load(html);

    // Aqui você precisa inspecionar o site e ajustar o seletor
    // Exemplo (ajustar de acordo com a estrutura real do site):
    let resultados = [];
    $(".medico-item").each((i, el) => {
      const nomeMedico = $(el).find(".nome").text().trim();
      const crm = $(el).find(".crm").text().trim();
      resultados.push({ nome: nomeMedico, crm });
    });

    if (resultados.length === 0) {
      return res.json({ mensagem: "Nenhum médico encontrado." });
    }

    res.json(resultados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar dados do CREMESP" });
  }
});

// Use 5000 as default port if process.env.PORT is not available
const PORT = typeof globalThis.process !== "undefined" && globalThis.process.env && globalThis.process.env.PORT ? globalThis.process.env.PORT : 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
});
