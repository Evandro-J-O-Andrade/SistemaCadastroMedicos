// src/utils/tts.js

let vozAtiva = true;  // Estado global da voz

// Função helper pra pegar voz Google PT-BR (feminina preferida)
const getGoogleVoice = () => {
  const voices = window.speechSynthesis.getVoices() || [];
  // Prioriza Google PT-BR (geralmente feminina)
  return voices.find(v => /google/i.test(v.name) && v.lang === 'pt-BR') ||
         voices.find(v => v.lang === 'pt-BR' && /female/i.test(v.name.toLowerCase())) ||
         voices.find(v => v.lang === 'pt-BR');
};

// Função para falar qualquer mensagem (com retry pra voz Google)
export function falarMensagem(texto, maxRetries = 3) {  // Aumentei pra 3 tentativas
  if (!vozAtiva || !texto) return;

  // Limpa qualquer fala anterior
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(texto);
  utter.lang = "pt-BR";
  utter.rate = 1;
  utter.pitch = 1;

  const voz = getGoogleVoice();
  if (voz) {
    utter.voice = voz;
    window.speechSynthesis.speak(utter);
    console.log('Usando voz Google:', voz.name);  // Log pra debug
    return;
  }

  // Se voices vazias ou sem Google, retry com delay progressivo
  const voicesLoaded = window.speechSynthesis.getVoices().length > 0;
  if (!voicesLoaded || maxRetries > 0) {
    const retryDelay = 200 * (4 - maxRetries);  // 200ms, 400ms, 600ms
    console.log(`Retry ${4 - maxRetries} em ${retryDelay}ms... Voices: ${voicesLoaded ? 'carregadas' : 'aguardando'}`);
    setTimeout(() => {
      falarMensagem(texto, maxRetries - 1);
    }, retryDelay);
    return;
  }

  // Fallback final: fala com default e log
  console.warn('Fallback: Voz default usada (sem Google PT-BR)');
  window.speechSynthesis.speak(utter);
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

// Listener global pra voiceschanged (uma vez só, com retry automático em falas pendentes)
let voicesLoaded = false;
if (window.speechSynthesis) {
  const originalVoicesChanged = window.speechSynthesis.onvoiceschanged;
  window.speechSynthesis.onvoiceschanged = () => {
    voicesLoaded = true;
    console.log('Vozes carregadas:', window.speechSynthesis.getVoices().length);
    if (originalVoicesChanged) originalVoicesChanged();
  };
}