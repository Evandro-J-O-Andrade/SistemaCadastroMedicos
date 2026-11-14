// src/hooks/useTTS.ts
// Hook compartilhado de Text-to-Speech (Web Speech API)
// Prioriza voz Google pt-BR, com fila de mensagens e fallback
import { useState, useCallback, useEffect } from 'react';

interface TTSConfig {
  vozAtiva: boolean;
  preferenciaVoz: string | null;
  taxa: number;
  tom: number;
}

const DEFAULT_CONFIG: TTSConfig = {
  vozAtiva: true,
  preferenciaVoz: null,
  taxa: 1,
  tom: 1,
};

interface MensagemFila {
  texto: string;
  prioridade: 'baixa' | 'normal' | 'alta';
  resolver: () => void;
}

export function useTTS() {
  const [config, setConfig] = useState<TTSConfig>(DEFAULT_CONFIG);
  const [fila, setFila] = useState<MensagemFila[]>([]);
  const [falando, setFalando] = useState(false);

  const getVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    return window.speechSynthesis.getVoices();
  }, []);

  const getGoogleVoiceBR = useCallback(() => {
    const voices = getVoices();
    return (
      voices.find((v) => /google/i.test(v.name) && v.lang === 'pt-BR') ||
      voices.find((v) => v.lang === 'pt-BR' && /female/i.test(v.name.toLowerCase())) ||
      voices.find((v) => v.lang === 'pt-BR') ||
      null
    );
  }, [getVoices]);

  useEffect(() => {
    if (!config.vozAtiva || fila.length === 0 || falando) return;

    const { texto, prioridade, resolver } = fila[0];

    const synth = window.speechSynthesis;
    if (!synth) {
      resolver();
      setFila((f) => f.slice(1));
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = config.taxa;
    utterance.pitch = config.tom;

    const voz = config.preferenciaVoz
      ? getVoices().find((v) => v.name === config.preferenciaVoz)
      : getGoogleVoiceBR();

    if (voz) utterance.voice = voz;

    setFalando(true);

    utterance.onend = () => {
      setFalando(false);
      resolver();
      setFila((f) => f.slice(1));
    };

    utterance.onerror = () => {
      setFalando(false);
      resolver();
      setFila((f) => f.slice(1));
    };

    synth.speak(utterance);
  }, [config, fila, falando, getVoices, getGoogleVoiceBR]);

  const falar = useCallback(
    (texto: string, prioridade: 'baixa' | 'normal' | 'alta' = 'normal') => {
      if (!texto || !config.vozAtiva) return;
      return new Promise<void>((resolver) => {
        const item: MensagemFila = { texto, prioridade, resolver };
        if (prioridade === 'alta') {
          setFila((f) => [item, ...f]);
        } else {
          setFila((f) => [...f, item]);
        }
      });
    },
    [config.vozAtiva]
  );

  const toggleVoz = useCallback(() => {
    setConfig((prev) => {
      const novo = !prev.vozAtiva;
      if (!novo) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
      return { ...prev, vozAtiva: novo };
    });
    return !config.vozAtiva;
  }, [config.vozAtiva]);

  const setPreferenciaVoz = useCallback((nome: string | null) => {
    setConfig((prev) => ({ ...prev, preferenciaVoz: nome }));
  }, []);

  const setTaxa = useCallback((taxa: number) => {
    setConfig((prev) => ({ ...prev, taxa: Math.min(10, Math.max(0.1, taxa)) }));
  }, []);

  const limparFila = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setFila([]);
    setFalando(false);
  }, []);

  return {
    vozAtiva: config.vozAtiva,
    falando,
    falar,
    toggleVoz,
    setPreferenciaVoz,
    setTaxa,
    limparFila,
    getVozStatus: () => config.vozAtiva,
  };
}
