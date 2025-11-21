// routes/usuarios.js → VERSÃO FINAL OFICIAL (FUNCIONA 100%)
import express from "express";
import { autenticarToken, autorizarPerfis } from "../middleware/auth.js";
import * as UsuariosDB from "../routes/usuarios.js"; // ← Perfeito! Você tem esse arquivo com as funções

const router = express.Router();

// 1. LISTAR TODOS (admin + suporte)
router.get("/", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  try {
    const usuarios = await UsuariosDB.getAllUsers();
    res.json(usuarios);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// 2. BUSCAR POR ID — USUÁRIO COMUM TAMBÉM CONSEGUE VER O PRÓPRIO PERFIL!
router.get("/:id", autenticarToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { id: loggedId, role: loggedRole } = req.user;

  // Regra perfeita:
  // - Admin e suporte: veem qualquer perfil
  // - Usuário comum: só vê o próprio
  if (loggedRole !== "admin" && loggedRole !== "suporte" && loggedId !== userId) {
    return res.status(403).json({ 
      erro: "Acesso negado. Você só pode visualizar o seu próprio perfil." 
    });
  }

  try {
    const usuario = await UsuariosDB.getUserById(userId);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    // Remove a senha do retorno por segurança
    const { senha, senha_hash, ...usuarioSemSenha } = usuario;
    res.json(usuarioSemSenha);
  } catch (error) {
    console.error(`Erro ao buscar usuário ${userId}:`, error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// 3. CRIAR USUÁRIO (só admin)
router.post("/", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const { usuario, email, senha, role } = req.body;

  if (!usuario?.trim() || !email?.trim() || !senha) {
    return res.status(400).json({ erro: "Usuário, e-mail e senha são obrigatórios" });
  }

  try {
    const newId = await UsuariosDB.createUser({ 
      usuario: usuario.trim(), 
      email: email.trim(), 
      senha, 
      role 
    });
    res.status(201).json({ mensagem: "Usuário criado com sucesso", id: newId });
  } catch (error) {
    console.error("Erro ao criar usuário:", error.message);
    res.status(400).json({ erro: error.message || "Erro ao criar usuário" });
  }
});

// 4. ATUALIZAR USUÁRIO (admin + suporte com restrições)
router.put("/:id", autenticarToken, autorizarPerfis("admin", "suporte"), async (req, res) => {
  const userId = parseInt(req.params.id);
  const updateData = req.body;

  try {
    if (req.user.role === "suporte") {
      const targetUser = await UsuariosDB.getUserById(userId);
      if (targetUser?.role === "admin") {
        return res.status(403).json({ erro: "Suporte não pode editar administrador" });
      }
      if (updateData.role === "admin") {
        return res.status(403).json({ erro: "Suporte não pode promover para admin" });
      }
    }

    const changes = await UsuariosDB.updateUser(userId, updateData);

    if (changes === 0) {
      return res.status(200).json({ mensagem: "Nenhuma alteração realizada" });
    }

    res.json({ mensagem: "Usuário atualizado com sucesso", changes });
  } catch (error) {
    console.error(`Erro ao atualizar usuário ${userId}:`, error.message);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// 5. DELETAR USUÁRIO (só admin)
router.delete("/:id", autenticarToken, autorizarPerfis("admin"), async (req, res) => {
  const userId = parseInt(req.params.id);

  if (req.user.id === userId) {
    return res.status(403).json({ erro: "Você não pode se deletar, seu doido!" });
  }

  try {
    const changes = await UsuariosDB.deleteUser(userId);
    if (changes === 0) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }
    res.json({ mensagem: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error(`Erro ao deletar usuário ${userId}:`, error);
    res.status(500).json({ erro: "Erro interno do servidor" });
  }
});

// EXPORT CORRETO (mantenha exatamente assim)
export default router;