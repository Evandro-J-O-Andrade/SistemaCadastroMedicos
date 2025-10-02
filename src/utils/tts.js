// src/utils/tts.js

let vozAtiva = true;  // Estado global da voz

// Função para falar qualquer mensagem
export function falarMensagem(texto) {
  if (!vozAtiva || !texto) return;

  // Limpa qualquer fala anterior
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang = "pt-BR";  // Português Brasil
  utterance.rate = 1;         // Velocidade
  utterance.pitch = 1;        // Tom

  window.speechSynthesis.speak(utterance);
}

// Função para ligar/desligar a voz
export function toggleVoz() {
  vozAtiva = !vozAtiva;

  // Se desligou, cancela qualquer fala em andamento
  if (!vozAtiva) window.speechSynthesis.cancel();

  return vozAtiva; // Retorna o novo estado
}

// Função para verificar se a voz está ativa
export function getVozStatus() {
  return vozAtiva;
}
