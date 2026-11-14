// src/pages/Home.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as FaIcons from 'react-icons/fa';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Home.css';
import './mobile.css';
import LogoAlpha from '../img/Logo_Alpha.png';
import { getEspecialidadeInfo } from '../api/especialidades';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTTS } from '../hooks/useTTS';

const normalizar = (str: string | null | undefined) =>
  str ? String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() : '';

const parseData = (dataStr: string | null | undefined) => {
  if (!dataStr || typeof dataStr !== 'string') return null;
  if (dataStr.includes('/')) {
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
  } else if (dataStr.includes('-')) {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }
  const d = new Date(dataStr);
  return isNaN(d.getTime()) ? null : d;
};

function CardEspecialidades({
  titulo,
  dados,
  mostrarTotal = true,
  porMedico = false,
  paginado = false,
}: {
  titulo: string;
  dados: any[];
  mostrarTotal?: boolean;
  mostrarMedia?: boolean;
  porMedico?: boolean;
  paginado?: boolean;
}) {
  const [expandido, setExpandido] = useState(false);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const itensPorPagina = 10;

  const total = dados.reduce(
    (acc, item) =>
      acc + (Number(item.quantidade || item.totalDiario || item.totalMensal || item.totalAno || item.atendimentos || 0) || 0),
    0
  );

  const paginarDados = () => {
    if (!paginado || dados.length <= itensPorPagina) return dados;
    const inicio = indiceAtual * itensPorPagina;
    return dados.slice(inicio, inicio + itensPorPagina);
  };

  const totalPaginas = paginado ? Math.ceil(dados.length / itensPorPagina) : 1;

  const handleAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (indiceAtual > 0) setIndiceAtual(indiceAtual - 1);
  };

  const handleProximo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (indiceAtual < totalPaginas - 1) setIndiceAtual(indiceAtual + 1);
  };

  const itensExibidos = paginarDados();

  const rootStyle = {
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.35s ease',
    ...(expandido
      ? {
          flex: '1 1 100%',
          maxWidth: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          transform: 'translateY(-4px) scale(1.01)',
        }
      : {}),
  };

  return (
    <div
      className={`card-resumo ${expandido ? 'expandido' : ''}`}
      onClick={() => setExpandido((s) => !s)}
      style={rootStyle as React.CSSProperties}
      aria-expanded={expandido}
    >
      <h3>{titulo}</h3>
      {!expandido ? (
        mostrarTotal && (
          <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
            <strong>Total:</strong> {total}
          </p>
        )
      ) : (
        <div className="lista-especialidades" style={{ marginTop: 4 }}>
          {mostrarTotal && (
            <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>
              <strong>Total:</strong> {total}
            </p>
          )}

          {itensExibidos.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic' }}>Nenhum dado disponível.</p>
          ) : (
            itensExibidos.map((item, idx) => {
              let Icone: any = FaIcons.FaUserMd;
              let cor = '#666';

              if (porMedico && item.especialidade) {
                const espInfo = getEspecialidadeInfo(item.especialidade);
                if (espInfo) {
                  Icone = espInfo.icone || FaIcons.FaUserMd;
                  cor = espInfo.cor || '#666';
                }
              } else {
                if (item.icon) Icone = item.icon;
                if (item.color) cor = item.color;
              }

              return (
                <div
                  key={`${item.medico || item.especialidade}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: '8px 0',
                    fontSize: '0.95rem',
                    lineHeight: 1.3,
                  }}
                >
                  {React.createElement(Icone, { size: 16, style: { color: cor, marginRight: 8 } })}
                  <span style={{ fontWeight: '600' }}>{porMedico ? item.medico : item.especialidade}</span>
                  <span style={{ marginLeft: 'auto', fontWeight: '500' }}>
                    Qt Atendida: {porMedico ? item.quantidade || item.atendimentos : item.totalDiario || item.quantidade || item.atendimentos}
                  </span>
                </div>
              );
            })
          )}

          {paginado && totalPaginas > 1 && (
            <>
              <div className="paginacao-setas-container" style={{ marginTop: 8 }}>
                <button
                  onClick={handleAnterior}
                  disabled={indiceAtual === 0}
                  className="paginacao-seta-btn"
                  aria-label="Página anterior"
                >
                  <FaChevronLeft />
                </button>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  Página {indiceAtual + 1} de {totalPaginas}
                </span>
                <button
                  onClick={handleProximo}
                  disabled={indiceAtual === totalPaginas - 1}
                  className="paginacao-seta-btn"
                  aria-label="Próxima página"
                >
                  <FaChevronRight />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 10 }}>
                <button onClick={handleAnterior} className="btn-pequeno" disabled={indiceAtual === 0}>
                  Anterior
                </button>
                <button onClick={handleProximo} className="btn-pequeno" disabled={indiceAtual === totalPaginas - 1}>
                  Próximo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CardMedias({
  titulo,
  total,
  mediaDia,
  mediaMes,
  totalAno,
  mediasPorEspecialidade,
  mediasPorMedicos,
}: {
  titulo: string;
  total: number;
  mediaDia: number;
  mediaMes: number;
  totalAno: number;
  mediasPorEspecialidade: any[];
  mediasPorMedicos: any[];
}) {
  const [expandido, setExpandido] = useState(false);
  const [visaoAtual, setVisaoAtual] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const itensPorPagina = 10;

  const visoes = [
    { id: 0, titulo: 'Geral', dados: null },
    { id: 1, titulo: 'Por Especialidade', dados: mediasPorEspecialidade },
    { id: 2, titulo: 'Por Médico', dados: mediasPorMedicos },
  ];

  const totalPaginas = visoes[visaoAtual].dados ? Math.ceil(visoes[visaoAtual].dados.length / itensPorPagina) : 1;
  const dadosPagina = visoes[visaoAtual].dados ? visoes[visaoAtual].dados.slice(paginaAtual * itensPorPagina, (paginaAtual + 1) * itensPorPagina) : [];

  const trocarVisao = (id: number) => {
    setVisaoAtual(id);
    setPaginaAtual(0);
  };

  const handleAnteriorPagina = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (paginaAtual > 0) setPaginaAtual(paginaAtual - 1);
  };

  const handleProximoPagina = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (paginaAtual < totalPaginas - 1) setPaginaAtual(paginaAtual + 1);
  };

  const rootStyle = {
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.35s ease',
    ...(expandido
      ? {
          flex: '1 1 100%',
          maxWidth: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          transform: 'translateY(-4px) scale(1.01)',
        }
      : {}),
  };

  return (
    <div
      className={`card-resumo ${expandido ? 'expandido' : ''}`}
      onClick={() => setExpandido((s) => !s)}
      style={rootStyle as React.CSSProperties}
      aria-expanded={expandido}
    >
      <h3>{titulo}</h3>
      {!expandido ? (
        <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
          <strong>Total de atendimentos:</strong> {total}
        </p>
      ) : (
        <>
          {visaoAtual === 0 && (
            <div style={{ marginTop: 6, fontSize: '0.9rem', lineHeight: 1.3 }}>
              <p><strong>Média Por Dia:</strong> {mediaDia}</p>
              <p><strong>Média Por Mês:</strong> {mediaMes}</p>
              <p><strong>Total Por Ano:</strong> {totalAno}</p>
            </div>
          )}

          {(visaoAtual === 1 || visaoAtual === 2) && (
            <>
              {dadosPagina.length === 0 && <p>Nenhum dado disponível.</p>}
              {dadosPagina.map((item, idx) => {
                const isEsp = visaoAtual === 1;
              let Icone: any = FaIcons.FaUserMd;
                let cor = '#666';
                if (isEsp) {
                  if (item.icon) Icone = item.icon;
                  if (item.color) cor = item.color;
                }
                return (
                  <div
                    key={`${isEsp ? item.especialidade : item.medico}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '8px 0',
                      fontSize: '0.95rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {React.createElement(Icone, { size: 16, style: { color: cor, marginRight: 8 } })}
                    <span style={{ fontWeight: '600' }}>{isEsp ? item.especialidade : item.medico}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: '500' }}>
                      Dia: {item.mediaDiaria} | Mês: {item.mediaMes}
                    </span>
                  </div>
                );
              })}

              {totalPaginas > 1 && (
                <div className="paginacao-setas-container" style={{ marginTop: 10 }}>
                  <button onClick={handleAnteriorPagina} disabled={paginaAtual === 0} className="paginacao-seta-btn" aria-label="Anterior página">
                    <FaChevronLeft />
                  </button>
                  <span style={{ fontSize: '0.85rem', color: '#666', padding: '0 10px' }}>
                    Página {paginaAtual + 1} de {totalPaginas}
                  </span>
                  <button onClick={handleProximoPagina} disabled={paginaAtual === totalPaginas - 1} className="paginacao-seta-btn" aria-label="Próxima página">
                    <FaChevronRight />
                  </button>
                </div>
              )}
            </>
          )}

          <div className="card-medias-visoes" style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 15 }} onClick={(e) => e.stopPropagation()}>
            {visoes.map((v) => (
              <button key={v.id} onClick={() => trocarVisao(v.id)} className={`card-medias-visoes-btn ${visaoAtual === v.id ? 'active' : ''}`}>
                {v.titulo}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { falar } = useTTS();

const [plantaoHojeRaw, setPlantaoHojeRaw] = useState<any[]>([]);
const [dadosAtendimentosHoje, setDadosAtendimentosHoje] = useState<any[]>([]);
const [atendimentosHojeTotal, setAtendimentosHojeTotal] = useState(0);
const [totalMes, setTotalMes] = useState(0);
  const [mediaDia, setMediaDia] = useState(0);
  const [mediaMes, setMediaMes] = useState(0);
  const [totalAno, setTotalAno] = useState(0);
  const [medicosCadastrados, setMedicosCadastrados] = useState(0);
  const [especialidadesCount, setEspecialidadesCount] = useState(0);
  const [mediaPorEspecialidade, setMediaPorEspecialidade] = useState<any[]>([]);
  const [mediasPorMedicos, setMediasPorMedicos] = useState<any[]>([]);
  const [dadosDiariosPorEspecialidade, setDadosDiariosPorEspecialidade] = useState<any[]>([]);
  const [totalMediaEspecialidades, setTotalMediaEspecialidades] = useState(0);

  const [expandMedicos, setExpandMedicos] = useState(false);
  const [expandEspecialidades, setExpandEspecialidades] = useState(false);

  const novidades = [
    { id: 1, titulo: 'Sistema atualizado', descricao: 'Nova versão com melhorias no painel de relatórios.' },
    { id: 2, titulo: 'Treinamento disponível', descricao: 'Treinamento online para novos funcionários.' },
    { id: 3, titulo: 'Suporte técnico', descricao: 'Suporte disponível de 8h às 18h.' },
  ];

  const atualizarDados = useCallback(async () => {
    console.log('🔄 Atualizando dados na Home...');
    try {
      let plantaoData: any[] = [];
      let medicosData: any[] = [];

      try {
        const { data: medicos, error: medError } = await supabase
          .from('medical_professionals')
          .select('*, person(*), medical_professional_specialties(specialties(nome))')
          .eq('ativo', true);
        if (!medError && medicos) {
          medicosData = medicos.map((m: any) => ({
            id: m.id,
            nome: m.person?.nome || m.nome_social || '',
            crm: m.crm || '',
            crm_uf: m.crm_uf || '',
            especialidade: m.medical_professional_specialties?.[0]?.specialties?.nome || '—',
            ativo: m.ativo,
          }));
        }

        const { data: prod, error: prodError } = await supabase
          .from('production_entries')
          .select('*')
          .order('criado_em', { ascending: true });
        if (!prodError && prod) {
          plantaoData = prod.map((p: any) => ({
            id: p.id,
            medico_nome: p.medico_nome || '',
            crm: p.crm || '',
            especialidade: p.especialidade || '',
            data: p.data_referencia || '',
            hora: p.hora || '',
            quantidade: Number(p.quantidade || 0),
            periodo_medico: p.periodo_medico,
          }));
        }
      } catch (e) {
        console.warn('Supabase falhou:', e);
      }

      let medicoByNome = new Map<string, any>();
      let medicoByCrm = new Map<string, any>();
      medicosData.forEach((m) => {
        if (m.nome) medicoByNome.set(normalizar(m.nome), m);
        if (m.crm) medicoByCrm.set(String(m.crm), m);
      });

      const plantaoNormalizado = plantaoData.map((p) => ({
        ...p,
        medico: p.medico_nome,
        especialidade: p.especialidade,
      }));

      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth();
      const diasMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

      const plantaoHoje = plantaoNormalizado.filter((p) => {
        const d = parseData(p.data);
        return d && d.toDateString() === hoje.toDateString();
      });

      const atendHojeArr = plantaoHoje
        .map((p) => ({ medico: p.medico, quantidade: p.atendimentos || p.quantidade, especialidade: p.especialidade }))
        .sort((a, b) => (b.quantidade || 0) - (a.quantidade || 0));
      setDadosAtendimentosHoje(atendHojeArr);
      setAtendimentosHojeTotal(plantaoHoje.reduce((acc, p) => acc + (p.atendimentos || p.quantidade || 0), 0));

      const plantaoMes = plantaoNormalizado.filter((p) => {
        const d = parseData(p.data);
        return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
      });
      const totalMesCalc = plantaoMes.reduce((acc, p) => acc + (p.atendimentos || p.quantidade || 0), 0);
      setTotalMes(totalMesCalc);
      setMediaDia(Math.round(totalMesCalc / diasMes));

      const plantaoAno = plantaoNormalizado.filter((p) => {
        const d = parseData(p.data);
        return d && d.getFullYear() === anoAtual;
      });
      const totalAnoCalc = plantaoAno.reduce((acc, p) => acc + (p.atendimentos || p.quantidade || 0), 0);
      setTotalAno(totalAnoCalc);
      setMediaMes(Math.round(totalAnoCalc / 12));

      const mapaDiarioEsp = new Map<string, { nome: string; totalDiario: number }>();
      plantaoHoje.forEach((p) => {
        const esp = p.especialidade || 'Desconhecida';
        const qtd = p.atendimentos || p.quantidade || 0;
        const norm = normalizar(esp);
        if (!mapaDiarioEsp.has(norm)) mapaDiarioEsp.set(norm, { nome: esp, totalDiario: 0 });
        mapaDiarioEsp.get(norm)!.totalDiario += qtd;
      });
      const diariosEsp = Array.from(mapaDiarioEsp.values()).map((item) => {
        const espInfo = getEspecialidadeInfo(item.nome);
        return {
          especialidade: item.nome,
          totalDiario: item.totalDiario,
          icon: espInfo.icone || FaIcons.FaUserMd,
          color: espInfo.cor || '#666',
        };
      }).sort((a, b) => b.totalDiario - a.totalDiario);
      setDadosDiariosPorEspecialidade(diariosEsp);

      setMedicosCadastrados(medicosData.length || 0);
      const espUnicasMedicos = [...new Set(medicosData.map((m) => normalizar(m?.especialidade || '')))].filter(Boolean);
      setEspecialidadesCount(espUnicasMedicos.length);

      const mapaMesEsp = new Map<string, { nome: string; total: number }>();
      plantaoMes.forEach((p) => {
        const esp = p.especialidade || 'Desconhecida';
        const norm = normalizar(esp);
        const qtd = p.atendimentos || p.quantidade || 0;
        if (!mapaMesEsp.has(norm)) mapaMesEsp.set(norm, { nome: esp, total: 0 });
        mapaMesEsp.get(norm)!.total += qtd;
      });
      const mediasEsp = Array.from(mapaMesEsp.values()).map((item) => {
        const mediaDiaria = Math.round(item.total / diasMes);
        const espInfo = getEspecialidadeInfo(item.nome);
        return {
          especialidade: item.nome,
          mediaDiaria,
          mediaMes: 0,
          icon: espInfo.icone || FaIcons.FaUserMd,
          color: espInfo.cor || '#666',
        };
      }).sort((a, b) => b.mediaDiaria - a.mediaDiaria);
      setMediaPorEspecialidade(mediasEsp);

      const mapaMesMed = new Map<string, { nome: string; total: number }>();
      plantaoMes.forEach((p) => {
        const med = p.medico || 'Desconhecido';
        const norm = normalizar(med);
        const qtd = p.atendimentos || p.quantidade || 0;
        if (!mapaMesMed.has(norm)) mapaMesMed.set(norm, { nome: med, total: 0 });
        mapaMesMed.get(norm)!.total += qtd;
      });
      const mediasMed = Array.from(mapaMesMed.values()).map((item) => ({
        medico: item.nome,
        mediaDiaria: Math.round(item.total / diasMes),
        mediaMes: 0,
      })).sort((a, b) => b.mediaDiaria - a.mediaDiaria);
      setMediasPorMedicos(mediasMed);

      setTotalMediaEspecialidades(mediasEsp.reduce((acc, i) => acc + (i.mediaDiaria || 0), 0));
      setPlantaoHojeRaw(plantaoHoje);
      console.log('✅ Dados atualizados na Home!');
    } catch (err) {
      console.error('Erro em atualizarDados:', err);
      setPlantaoHojeRaw([]);
      setDadosAtendimentosHoje([]);
      setAtendimentosHojeTotal(0);
      setTotalMes(0);
      setMediaDia(0);
      setMediaMes(0);
      setTotalAno(0);
      setMedicosCadastrados(0);
      setEspecialidadesCount(0);
      setMediaPorEspecialidade([]);
      setMediasPorMedicos([]);
      setDadosDiariosPorEspecialidade([]);
      setTotalMediaEspecialidades(0);
    }
  }, []);

  useEffect(() => {
    atualizarDados();
    const handleDadosAtualizados = () => atualizarDados();
    window.addEventListener('dadosAtualizados', handleDadosAtualizados);
    window.addEventListener('storage', handleDadosAtualizados);
    return () => {
      window.removeEventListener('dadosAtualizados', handleDadosAtualizados);
      window.removeEventListener('storage', handleDadosAtualizados);
    };
  }, [atualizarDados]);

  const getSessionInfo = () => {
    try {
      if (!user) return { logged: false, token: null, user: null };
      return { logged: true, token: null, user };
    } catch {
      return { logged: false, token: null, user: null };
    }
  };

  const handleEntrar = () => {
    const sess = getSessionInfo();
    if (!sess.logged) {
      falar('Você precisa fazer login para acessar o sistema.');
      navigate('/login');
      return;
    }
    navigate('/home');
  };

  return (
    <div className="home-container">
      <section className="banner">
        <img src={LogoAlpha} alt="Logo da empresa" className="logo-home" />
        <h1>Bem-vindo ao Sistema de Gestão Médica</h1>
        <p>Controle completo de atendimentos, relatórios e histórico do seu time.</p>
      </section>

      <section className="resumo-sistema">
        <CardEspecialidades
          titulo="Total Atendido Hoje (por médico)"
          dados={dadosAtendimentosHoje}
          porMedico={true}
          mostrarMedia={false}
          paginado={true}
        />

        <CardMedias
          titulo="Médias"
          total={totalMes}
          mediaDia={mediaDia}
          mediaMes={mediaMes}
          totalAno={totalAno}
          mediasPorEspecialidade={mediaPorEspecialidade}
          mediasPorMedicos={mediasPorMedicos}
        />

        <div
          className={`card-resumo ${expandMedicos ? 'expandido' : ''}`}
          onClick={() => setExpandMedicos((s) => !s)}
          style={{
            cursor: 'pointer',
            transition: 'all 0.35s ease',
            ...(expandMedicos
              ? {
                  flex: '1 1 100%',
                  maxWidth: '100%',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                  transform: 'translateY(-4px) scale(1.01)',
                }
              : {}),
          }}
          aria-expanded={expandMedicos}
        >
          <h3>Médicos cadastrados</h3>
          {!expandMedicos ? (
            <p>{medicosCadastrados}</p>
          ) : (
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{medicosCadastrados}</p>
              <p style={{ marginTop: 6, color: '#555' }}>Total de médicos cadastrados no sistema.</p>
            </div>
          )}
        </div>

        <div
          className={`card-resumo ${expandEspecialidades ? 'expandido' : ''}`}
          onClick={() => setExpandEspecialidades((s) => !s)}
          style={{
            cursor: 'pointer',
            transition: 'all 0.35s ease',
            ...(expandEspecialidades
              ? {
                  flex: '1 1 100%',
                  maxWidth: '100%',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                  transform: 'translateY(-4px) scale(1.01)',
                }
              : {}),
          }}
          aria-expanded={expandEspecialidades}
        >
          <h3>Especialidades</h3>
          {!expandEspecialidades ? (
            <p>{especialidadesCount}</p>
          ) : (
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{especialidadesCount}</p>
              <p style={{ marginTop: 6, color: '#555' }}>Quantidade de especialidades únicas cadastradas.</p>
            </div>
          )}
        </div>

        <CardEspecialidades
          titulo="Total por Especialidades"
          dados={dadosDiariosPorEspecialidade}
          mostrarMedia={false}
          paginado={true}
        />
      </section>

      <section className="novidades">
        <h2>Novidades</h2>
        <div className="novidades-list">
          {novidades.map((item) => (
            <div key={item.id} className="card-novidade">
              <h4>{item.titulo}</h4>
              <p>{item.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="acesso-rapido">
        <h2>Acesso rápido</h2>
        <button className="btn-login" onClick={handleEntrar}>
          Entrar no Sistema
        </button>
      </section>
    </div>
  );
}
