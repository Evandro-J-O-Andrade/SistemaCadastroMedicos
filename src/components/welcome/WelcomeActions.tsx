// src/components/welcome/WelcomeActions.tsx
// CTAs da recepção: primário "Acessar minha gestão" e secundário "Trocar de conta".
// A troca de conta NÃO é conteúdo da recepção: só abre quando acionada.
import { ArrowRight, ArrowLeftRight, Loader2 } from 'lucide-react';

export function WelcomeActions({
  onAcessar,
  onTrocarConta,
  busy = false,
  disabled = false,
}: {
  onAcessar: () => void;
  onTrocarConta: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="welcome-actions">
      <button type="button" className="welcome-btn welcome-btn-primary" onClick={onAcessar} disabled={busy || disabled}>
        {busy ? <Loader2 className="welcome-spin" aria-hidden /> : <ArrowRight aria-hidden />}
        {busy ? 'Acessando…' : 'Acessar minha gestão'}
      </button>
      <button type="button" className="welcome-btn welcome-btn-secondary" onClick={onTrocarConta} disabled={busy}>
        <ArrowLeftRight aria-hidden />
        Trocar de conta
      </button>
    </div>
  );
}