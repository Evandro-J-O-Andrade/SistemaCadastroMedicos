<?php
require_once __DIR__ . '/../db.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
$input = json_decode(file_get_contents('php://input'), true) ?? [];

$nome = $input['nome'] ?? null;
$crm = $input['crm'] ?? null;
$especialidade = $input['especialidade'] ?? null;
$data = $input['data'] ?? null;
$hora = $input['hora'] ?? null;
$quantidade = isset($input['quantidade']) ? (int)$input['quantidade'] : 1;
$source = $input['source'] ?? 'web';

if (!$nome || !$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Nome e data são obrigatórios']);
    exit;
}

try {
    $stmt = $pdo->prepare("CALL sp_insert_plantao(:p_nome, :p_crm, :p_esp_nome, :p_data, :p_hora, :p_quantidade, :p_source)");
    $stmt->bindValue(':p_nome', $nome, PDO::PARAM_STR);
    $stmt->bindValue(':p_crm', $crm ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_esp_nome', $especialidade ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_data', $data, PDO::PARAM_STR);
    $stmt->bindValue(':p_hora', $hora ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_quantidade', $quantidade, PDO::PARAM_INT);
    $stmt->bindValue(':p_source', $source ?: null, PDO::PARAM_STR);
    $stmt->execute();
    // se a procedure não retorna id, podemos retornar success
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error', 'detail' => $e->getMessage()]);
}