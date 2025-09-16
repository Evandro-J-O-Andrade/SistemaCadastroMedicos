<?php
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $usuario = $_POST['usuario'] ?? '';

    // Emails de destino
    $to = "evandro_j.o.a@hotmail.com, suportetipoa@alphainstituto.com.br";
    $subject = "Recuperação de senha - Alpha Instituto";
    $message = "Foi solicitado a recuperação de senha para o usuário: $usuario\n\nFavor redefinir a senha e informar ao usuário.";
    $headers = "From: noreply@alphainstituto.com.br\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    if (mail($to, $subject, $message, $headers)) {
        echo json_encode(["status" => "success", "message" => "Email enviado com sucesso."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Falha ao enviar o email."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Método inválido."]);
}
