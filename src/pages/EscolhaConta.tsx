// src/pages/EscolhaConta.tsx
// Troca de acesso — seleção operacional de conta/ambiente/perfil autorizados.
// Acionada SOMENTE pelo CTA "Trocar de conta" (ou quando há múltiplos contextos).
// 100% dados reais (memberships do bootstrap); validade imposta por RLS no servidor.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ShieldCheck, Hospital } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useActiveContext } from '../core/context/ContextProvider';
import type { ResolvedContext } from '../core/context/contextResolver';
import { useContextEntry } from '../core/context/useContextEntry';
import '../styles/pages/escolha-conta.css';

export default function EscolhaConta() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contexts } = useActiveContext();
  const { enter, busy, error } = useContextEntry();

  const [selectedKey, setSelectedKey] = useState<string>(contexts[0]?.key ?? '');
  const [unitId, setUnitId] = useState<string | null>(null);

  const selected = useMemo(
    () => contexts.find((c) => c.key === selectedKey) ?? null,
    [contexts, selectedKey],
  );

  const pickContext = (ctx: ResolvedContext) => {
    setSelectedKey(ctx.key);
    setUnitId(ctx.unitIds[0] ?? null);
  };

  const confirmar = async () => {
    if (!selected) return;
    await enter({ ...selected, selectedUnitId: unitId });
    navigate('/inicio', { replace: true });
  };

  return (
    <div className="escolha-page">
      <div className="escolha-card">
        <button className="escolha-back" onClick={() => navigate('/welcome', { replace: true })}>
          <ArrowLeft aria-hidden /> Voltar
        </button>

        <p className="escolha-eyebrow">Selecionar ambiente</p>
        <h1 className="escolha-title">Onde deseja trabalhar?</h1>
        <p className="escolha-sub">
          Exibimos apenas os ambientes com acesso autorizado para {user?.nome || user?.email || 'sua conta'}.
        </p>

        {error && <p role="alert" className="escolha-alert">{error}</p>}

        <div className="escolha-list">
          {contexts.map((ctx) => {
            const isSel = ctx.key === selectedKey;
            return (
              <button
                key={ctx.key}
                type="button"
                onClick={() => pickContext(ctx)}
                className={`escolha-item ${isSel ? 'is-sel' : ''}`}
              >
                <Building2 className="escolha-item-icon" aria-hidden />
                <span className="escolha-item-body">
                  <span className="escolha-item-title">{ctx.label}</span>
                  <span className="escolha-item-meta">
                    {ctx.isGlobal
                      ? 'Administração global da plataforma'
                      : `${ctx.unitIds.length} unidade(s) autorizada(s)`}
                  </span>
                </span>
                {isSel && <CheckCircle2 className="escolha-check" aria-hidden />}
              </button>
            );
          })}
          {contexts.length === 0 && (
            <p className="escolha-empty">Nenhum ambiente autorizado. Procure o administrador.</p>
          )}
        </div>

        {selected && !selected.isGlobal && selected.unitIds.length > 1 && (
          <div className="escolha-units">
            <p className="escolha-units-label">Unidade de atendimento</p>
            <div className="escolha-units-grid">
              {selected.unitIds.map((uid, i) => {
                const isSel = uid === unitId;
                return (
                  <button
                    key={uid}
                    type="button"
                    onClick={() => setUnitId(uid)}
                    className={`escolha-unit ${isSel ? 'is-sel' : ''}`}
                  >
                    <Hospital aria-hidden />
                    <span className="truncate">Unidade {i + 1}</span>
                    {isSel && <CheckCircle2 className="ml-auto" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="escolha-actions">
          <button className="escolha-btn" onClick={() => void confirmar()} disabled={!selected || busy}>
            {busy ? 'Entrando…' : 'Confirmar acesso'}
            <ArrowRight aria-hidden />
          </button>
          <span className="escolha-trust">
            <ShieldCheck aria-hidden /> Acesso validado por permissões
          </span>
        </div>
      </div>
    </div>
  );
}