// utils/database.js → VERSÃO FINAL OFICIAL (TUDO FUNCIONA 100%)
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// ---------- Configuração de Modo ----------
const DB_MODE = process.env.DB_MODE || "sqlite"; // sqlite | php | supabase

// ---------- Config SQLite ----------
const SQLITE_FILE = path.resolve(process.env.DB_PATH || "./db/database.db");

// ---------- Config PHP ----------
const PHP_API_URL = process.env.PHP_API_URL || "http://localhost/sistemaCadastroMedicos/api";

// ---------- Config Supabase ----------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
let supabase;
if (DB_MODE === "supabase" && SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// =======================================================
// ---------- SQLite Clients Helpers ----------
// =======================================================

async function sqliteRun(sql, params = []) {
    const db = await open({ filename: SQLITE_FILE, driver: sqlite3.Database });
    try {
        const result = await db.run(sql, params);
        return result;
    } finally {
        await db.close();
    }
}

async function sqliteGet(sql, params = []) {
    const db = await open({ filename: SQLITE_FILE, driver: sqlite3.Database });
    try {
        const row = await db.get(sql, params);
        return row;
    } finally {
        await db.close();
    }
}

async function sqliteAll(sql, params = []) {
    const db = await open({ filename: SQLITE_FILE, driver: sqlite3.Database });
    try {
        const rows = await db.all(sql, params);
        return rows;
    } finally {
        await db.close();
    }
}

// =======================================================
// ---------- Funções de Acesso a Dados (CRUD/GET) ----------
// =======================================================

async function getUserByUsername(username) {
    switch (DB_MODE) {
        case "sqlite":
            return sqliteGet("SELECT * FROM usuarios WHERE usuario = ?", [username.toLowerCase()]);
        case "php":
            return fetch(`${PHP_API_URL}/usuarios.php?username=${encodeURIComponent(username)}`)
                .then(res => res.json());
        case "supabase":
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .eq("usuario", username.toLowerCase())
                .single();
            if (error) throw error;
            return data;
        default:
            throw new Error("DB_MODE inválido");
    }
}

// FUNÇÃO CORRIGIDA E MELHORADA — ZERA O PRIMEIRO_LOGIN JUNTO COM A SENHA!
async function updateUserPassword(id, hash) {
    switch (DB_MODE) {
        case "sqlite":
            return sqliteRun(
                "UPDATE usuarios SET senha = ?, primeiro_login = 0, atualizado_em = datetime('now') WHERE id = ?",
                [hash, id]
            );
        case "php":
            return fetch(`${PHP_API_URL}/usuarios.php`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, senha: hash, primeiro_login: 0 })
            }).then(res => res.json());
        case "supabase":
            const { error } = await supabase
                .from("usuarios")
                .update({ senha: hash, primeiro_login: 0 })
                .eq("id", id);
            if (error) throw error;
            return true;
        default:
            throw new Error("DB_MODE inválido");
    }
}

async function insertUser({ username, email, senha, role }) { 
    switch (DB_MODE) {
        case "sqlite":
            return sqliteRun(
                "INSERT INTO usuarios (usuario, email, senha, role, primeiro_login, criado_em) VALUES (?, ?, ?, ?, 1, datetime('now'))",
                [username.toLowerCase(), email?.toLowerCase() || null, senha, role]
            );
        case "php":
            return fetch(`${PHP_API_URL}/usuarios.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, senha, role }) 
            }).then(res => res.json());
        case "supabase":
            const { error } = await supabase.from("usuarios").insert([
                { usuario: username.toLowerCase(), email: email?.toLowerCase(), senha, role, primeiro_login: true } 
            ]);
            if (error) throw error;
            return true;
        default:
            throw new Error("DB_MODE inválido");
    }
}

async function listUsers() {
    switch (DB_MODE) {
        case "sqlite":
            return sqliteAll("SELECT id, usuario, email, role, criado_em, atualizado_em FROM usuarios ORDER BY criado_em DESC");
        case "php":
            return fetch(`${PHP_API_URL}/usuarios.php`).then(res => res.json());
        case "supabase":
            const { data, error } = await supabase.from("usuarios")
                .select("id, usuario, email, role, criado_em, atualizado_em")
                .order("criado_em", { ascending: false });
            if (error) throw error;
            return data;
        default:
            throw new Error("DB_MODE inválido");
    }
}

async function insertAuditLog({ rota, metodo, usuario, ip, payload, resultado }) {
    switch (DB_MODE) {
        case "sqlite":
            return sqliteRun(
                "INSERT INTO audit_logs (rota, metodo, usuario, ip, payload, resultado) VALUES (?, ?, ?, ?, ?, ?)",
                [rota, metodo, usuario, ip, payload, resultado]
            );
        case "php":
            return fetch(`${PHP_API_URL}/audit.php`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rota, metodo, usuario, ip, payload, resultado })
            }).then(res => res.json());
        case "supabase":
            const { error } = await supabase.from("audit_logs").insert([
                { rota, metodo, usuario, ip, payload, resultado }
            ]);
            if (error) throw error;
            return true;
        default:
            throw new Error("DB_MODE inválido");
    }
}

// =======================================================
// ---------- Exportação de Funções ----------
// =======================================================

export default { 
    getUserByUsername, 
    updateUserPassword, 
    insertUser, 
    listUsers,
    insertAuditLog
};