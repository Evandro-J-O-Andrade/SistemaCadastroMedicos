<?php
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $stmt = $pdo->query("SELECT id, nome, crm, observacao, especialidade_id FROM medicos ORDER BY nome ASC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error', 'detail' => $e->getMessage()]);
}