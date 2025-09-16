<?php
// enviar_email.php
header('Content-Type: application/json; charset=UTF-8');

// Verifica se foi POST
if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $usuario = $_POST['usuario'] ?? '';

    // Valida se o usuário foi enviado
    if (empty($usuario)) {
        echo json_encode([
            "status" => "error",
            "message" => "Usuário não informado."
        ]);
        exit;
    }

    // Emails de destino - suporte e admin
    $to = "evandro_j.o.a@hotmail.com, suportetipoa@alphainstituto.com.br";

    $subject = "Recuperação de senha - Alpha Instituto";

    $message = "Foi solicitado a recuperação de senha para o usuário: $usuario\n\n";
    $message .= "Favor redefinir a senha e informar ao usuário.";

    $headers = "From: noreply@alphainstituto.com.br\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    // Envia o email
    if (mail($to, $subject, $message, $headers)) {
        echo json_encode([
            "status" => "success",
            "message" => "Email enviado com sucesso."
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "message" => "Falha ao enviar o email. Verifique a configuração do servidor de emails."
        ]);
    }

} else {
    echo json_encode([
        "status" => "error",
        "message" => "Método inválido. Use POST."
    ]);
}
