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

$dataInicio = $input['dataInicio'] ?? null;
$dataFim = $input['dataFim'] ?? null;
$medico = $input['medico'] ?? null;
$crm = $input['crm'] ?? null;
$especialidade = $input['especialidade'] ?? null;
$horaDe = $input['horaDe'] ?? null;
$horaAte = $input['horaAte'] ?? null;

try {
    $stmt = $pdo->prepare("CALL sp_get_relatorio(:p_data_inicio, :p_data_fim, :p_medico, :p_crm, :p_especialidade, :p_hora_de, :p_hora_ate)");
    $stmt->bindValue(':p_data_inicio', $dataInicio ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_data_fim', $dataFim ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_medico', $medico ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_crm', $crm ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_especialidade', $especialidade ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_hora_de', $horaDe ?: null, PDO::PARAM_STR);
    $stmt->bindValue(':p_hora_ate', $horaAte ?: null, PDO::PARAM_STR);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // consumir quaisquer resultsets adicionais
    while ($stmt->nextRowset()) { /* noop */ }
    echo json_encode(['success' => true, 'data' => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB error', 'detail' => $e->getMessage()]);
}