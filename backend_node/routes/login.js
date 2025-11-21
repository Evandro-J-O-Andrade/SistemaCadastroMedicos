import express from "express";
import db from "../utils/database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.post("/login", async (req, res) => {
    // A variável do payload (input) pode continuar sendo 'username'
    const { username, senha } = req.body; 

    if (!username || !senha) return res.status(400).json({ error: "Usuário e senha obrigatórios" });

    try {
        // CORREÇÃO CRÍTICA: Buscar na coluna 'usuario' (não precisa de .toLowerCase() devido ao COLLATE NOCASE)
        const user = await db.get("SELECT * FROM usuarios WHERE usuario = ?", [username]);
        
        if (!user) return res.status(401).json({ error: "Usuário ou senha incorretos" });

        const match = await bcrypt.compare(senha, user.senha);
        if (!match) return res.status(401).json({ error: "Usuário ou senha incorretos" });

        // CORREÇÃO CRÍTICA: O JWT agora usa 'usuario' e 'role'
        const token = jwt.sign(
            { id: user.id, usuario: user.usuario, role: user.role }, 
            process.env.JWT_SECRET || "segredo", 
            { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
        );

        res.json({
            usuario: {
                id: user.id,
                // CORREÇÃO: Retorna 'usuario' e 'role'
                usuario: user.usuario, 
                role: user.role, 
                primeiroLogin: user.primeiro_login === 1
            },
            token
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro no login" });
    }
});

export default router;