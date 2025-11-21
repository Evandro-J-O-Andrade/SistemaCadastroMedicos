// utils/jwt.js

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Obtém a chave secreta das variáveis de ambiente ou usa um padrão
// Garanta que esta chave seja única e complexa no seu arquivo .env!
const SECRET = process.env.JWT_SECRET || 'uma_chave_secreta_muito_forte_e_longa_aqui'; 
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Cria um token JWT assinado para autenticação.
 * @param {object} payload - Dados a serem incluídos no token (ex: { id, usuario, role }).
 * @returns {string} O token JWT gerado.
 */
export const jwtSign = (payload) => {
    // Adiciona o tempo de expiração
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN }); 
};

/**
 * Verifica se um token JWT é válido e retorna o payload decodificado.
 * @param {string} token - O token JWT.
 * @returns {object} O payload decodificado (dados do usuário).
 * @throws {JsonWebTokenError} Se o token for inválido, expirado ou tiver problemas.
 */
export const jwtVerify = (token) => {
    // Verifica a assinatura e a validade do token
    return jwt.verify(token, SECRET);
};