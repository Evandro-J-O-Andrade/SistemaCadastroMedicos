// middleware/logRequest.js

// ✅ CORRIGIDO: Importa o objeto padrão do database.js
import db from "../utils/database.js"; 
import { jwtVerify } from "../utils/jwt.js"; 

// Função que extrai o username do token JWT (se existir)
function getUsernameFromToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            // Assumimos que o payload JWT tem um campo 'usuario' (ou 'username')
            return jwtVerify(token).usuario || jwtVerify(token).username; 
        } catch (e) {
            // Token inválido ou expirado
            return 'Desconhecido/Token Inválido';
        }
    }
    return 'Público/Não Autenticado';
}

// Middleware de Log de Requisição
export const logRequest = (req, res, next) => {
    // Evita logar rotas que não interessam (ex: health checks, estáticas)
    if (req.path.startsWith('/status') || req.path === '/') {
        return next();
    }
    
    // Captura o corpo da requisição
    const payload = JSON.stringify(req.body);
    
    // Captura o usuário (tentativa de extrair do JWT)
    const usuario = getUsernameFromToken(req);

    // Salva o log após o término da requisição (mesmo se for erro)
    const originalSend = res.send;
    res.send = function (body) {
        // ✅ CORRIGIDO: Chama db.insertAuditLog
        db.insertAuditLog({
            rota: req.path,
            metodo: req.method,
            usuario: usuario,
            ip: req.ip || req.headers['x-forwarded-for'],
            payload: payload.substring(0, 1000), 
            resultado: res.statusCode.toString(),
        }).catch(err => {
            // Erro ao salvar o log de auditoria não deve parar o app
            console.error("Erro ao salvar log de auditoria:", err.message);
        });

        // Chama a função original para enviar a resposta ao cliente
        originalSend.call(this, body);
        return originalSend.apply(res, arguments);
    };

    next();
};