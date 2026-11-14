// src/pages/Filtros.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import * as FaIcons from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
} from 'chart.js';
import './Filtros.css';
import GraficoBarra from './GraficoBarra.jsx';
import GraficoArea from './GraficoArea.jsx';
import GraficoPizza from './GraficoPizza.jsx';
import GraficoLinha from './GraficoLinha.jsx';
import { getEspecialidadeInfo, especialidades as especialidadesList } from '../api/especialidades';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTTS } from '../hooks/useTTS';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
);
dayjs.locale('pt-br');

interface ProductionEntryRaw {
  id: string;
  medico_nome: string;
  crm: string;
  especialidade: string;
  data: string;
  hora: string;
  quantidade: number;
}

interface MedicoOption {
  id?: string;
  nome: string;
  crm: string;
  especialidade: string;
}

const DEFAULT_HORA_DE = '07:00';
const DEFAULT_HORA_ATE = '19:00';

const normalizeString = (s = '') =>
  String(s || '')
    .toLowerCase()
    .trim()
    .normalize?.('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const parsePlantaoDate = (dataStr: string | null | undefined, horaStr: string | null | undefined) => {
  if (!dataStr) return null;
  let dateObj: Date | null = null;
  if (String(dataStr).includes('-')) {
    dateObj = new Date(`${dataStr}T${horaStr || '00:00'}`);
  } else {
    const parts = String(dataStr).split('/');
    if (parts.length === 3) {
      const [dia, mes, ano] = parts;
      dateObj = new Date(`${ano}-${mes}-${dia}T${horaStr || '00:00'}`);
    } else {
      dateObj = new Date(`${dataStr}T${horaStr || '00:00'}`);
    }
  }
  return isNaN(dateObj.getTime()) ? null : dateObj;
};

const filtrarPorDataHoraLocal = (
  dados: ProductionEntryRaw[],
  inicioDate: Date,
  fimDate: Date,
  horaInicioStr: string,
  horaFimStr: string
) => {
  const horaInicio = horaInicioStr || DEFAULT_HORA_DE;
  const horaFim = horaFimStr || DEFAULT_HORA_ATE;
  return (dados || []).filter((p) => {
    const pData = p.data || '';
    const pHora = p.hora || '';
    const registro = parsePlantaoDate(pData, pHora);
    if (!registro) return false;
    if (registro < inicioDate || registro > fimDate) return false;
    if (horaInicio === '00:00' && horaFim === '23:59') return true;

    const toMinutes = (hhmm: string) => {
      const [hh, mm] = String(hhmm).split(':').map((v) => Number(v || 0));
      return hh * 60 + (mm || 0);
    };
    const recMinutes = registro.getHours() * 60 + registro.getMinutes();
    const startMin = toMinutes(horaInicio);
    const endMin = toMinutes(horaFim);
    if (startMin <= endMin) {
      return recMinutes >= startMin && recMinutes <= endMin;
    } else {
      return recMinutes >= startMin || recMinutes <= endMin;
    }
  });
};

const getMedicoCor = (especialidades: string[] = []) => {
  const primeiraEsp = especialidades[0] || '';
  return getEspecialidadeInfo(primeiraEsp)?.cor || '#1f4e78';
};

const getMedicoIcon = (especialidades: string[] = []) => {
  const primeiraEsp = especialidades[0] || '';
  return getEspecialidadeInfo(primeiraEsp)?.icone || FaIcons.FaUserMd;
};

const getEspecialidadeIcon = (especialidade: string | null | undefined) => {
  return getEspecialidadeInfo(especialidade || '')?.icone || FaIcons.FaUserMd;
};

const MetricCard = ({ title, value, color = '#1f4e78', icon = 'FaChartBar' }: { title: string; value: number | string; color?: string; icon?: string }) => {
  const Icon = FaIcons[icon as keyof typeof FaIcons] || FaIcons.FaChartBar;
  return (
    <div className="card metric-card">
      <div className="icon" style={{ color }}>
        <Icon size={20} />
      </div>
      <div className="info">
        <p className="title">{title}</p>
        <span className="value">{value}</span>
      </div>
    </div>
  );
};

export default function Filtros() {
  const { user } = useAuth();
  const { falar } = useTTS();
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [dadosMedicosRaw, setDadosMedicosRaw] = useState<MedicoOption[]>([]);

  const hoje = dayjs().format('YYYY-MM-DD');
  const [medicoNome, setMedicoNome] = useState('');
  const [medicoCRM, setMedicoCRM] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [horaDe, setHoraDe] = useState(DEFAULT_HORA_DE);
  const [horaAte, setHoraAte] = useState(DEFAULT_HORA_ATE);
  const [turnoPreset, setTurnoPreset] = useState('personalizado');
  const [periodoGranularidade, setPeriodoGranularidade] = useState('dia');
  const [opcoesMedicosObj, setOpcoesMedicosObj] = useState<MedicoOption[]>([]);
  const [sugestoesMedicos, setSugestoesMedicos] = useState<MedicoOption[]>([]);
  const [mostrarSugestoesMedicos, setMostrarSugestoesMedicos] = useState(false);
  const [opcoesEspecialidadesState, setOpcoesEspecialidadesState] = useState<string[]>([]);
  const [mostrarSugestoesEspecialidades, setMostrarSugestoesEspecialidades] = useState(false);
  const [sugestoesEspecialidades, setSugestoesEspecialidades] = useState<{ nome: string }[]>([]);
  const [cardsMedicos, setCardsMedicos] = useState<any[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState<{ aberto: boolean; medico: { nome: string; crm: string; especialidades: string[] } | null; registros: any[] }>({ aberto: false, medico: null, registros: [] });
  const [chartType, setChartType] = useState('pizza');
  const [visao, setVisao] = useState('profissional');
  const [plantaoRawOriginal, setPlantaoRawOriginal] = useState<ProductionEntryRaw[]>([]);

  useEffect(() => {
    carregarDadosIniciais();
    const handleDadosAtualizados = () => carregarDadosIniciais();
    window.addEventListener('dadosAtualizados', handleDadosAtualizados);
    return () => window.removeEventListener('dadosAtualizados', handleDadosAtualizados);
  }, []);

  const carregarDadosIniciais = useCallback(async () => {
    setCarregando(true);
    if (!user) {
      setCarregando(false);
      return;
    }
    try {
      const { data: medicos, error: medError } = await supabase
        .from('medical_professionals')
        .select('*, person(*), medical_professional_specialties(specialties(nome))')
        .eq('ativo', true);

      if (!medError && medicos) {
        const lista: MedicoOption[] = medicos.map((m: any) => ({
          id: m.id,
          nome: m.person?.nome || m.nome_social || '',
          crm: m.crm || '',
          especialidade: m.medical_professional_specialties?.[0]?.specialties?.nome || '—',
        }));
        setDadosMedicosRaw(lista);
      }

      const { data: prod, error: prodError } = await supabase
        .from('production_entries')
        .select('*')
        .order('criado_em', { ascending: true });

      if (!prodError && prod) {
        const lista: ProductionEntryRaw[] = prod.map((p: any) => ({
          id: p.id,
          medico_nome: p.medico_nome || '',
          crm: p.crm || '',
          especialidade: p.especialidade || '',
          data: p.data_referencia || '',
          hora: p.hora || '',
          quantidade: Number(p.quantidade || 0),
        }));
        setPlantaoRawOriginal(lista);
      }
    } catch (err) {
      console.warn('Erro carregando dados iniciais:', err);
    } finally {
      setCarregando(false);
    }
  }, [user]);

  useEffect(() => {
    const medSource = Array.isArray(dadosMedicosRaw) ? dadosMedicosRaw : [];
    const medObjs: MedicoOption[] = medSource.map((m) => ({
      id: m.id,
      nome: m.nome || '',
      crm: String(m.crm || '').trim(),
      especialidade: m.especialidade || '',
    }));
    setOpcoesMedicosObj(medObjs);
    setSugestoesMedicos(medObjs);

    const espSet = new Set<string>();
    medObjs.forEach((m) => {
      if (m.especialidade && m.especialidade !== '—') espSet.add(m.especialidade);
    });
    especialidadesList.forEach((e) => {
      if (e && e.nome) espSet.add(e.nome);
    });
    const espList = Array.from(espSet).sort();
    setOpcoesEspecialidadesState(espList);
    setSugestoesEspecialidades(espList.map((e) => ({ nome: e })));
  }, [dadosMedicosRaw]);

  useEffect(() => {
    if (!medicoNome) {
      setSugestoesMedicos(opcoesMedicosObj);
      return;
    }
    const q = normalizeString(medicoNome);
    setSugestoesMedicos((opcoesMedicosObj || []).filter((m) => normalizeString(m.nome).includes(q)));
  }, [medicoNome, opcoesMedicosObj]);

  useEffect(() => {
    if (!especialidade) {
      setSugestoesEspecialidades(opcoesEspecialidadesState.map((e) => ({ nome: e })));
      return;
    }
    const q = normalizeString(especialidade);
    setSugestoesEspecialidades(
      (opcoesEspecialidadesState || [])
        .filter((e) => normalizeString(e).includes(q))
        .map((e) => ({ nome: e }))
    );
  }, [especialidade, opcoesEspecialidadesState]);

  useEffect(() => {
    if (turnoPreset === '07-19') {
      setHoraDe('07:00');
      setHoraAte('19:00');
    } else if (turnoPreset === '19-07') {
      setHoraDe('19:00');
      setHoraAte('07:00');
    } else if (turnoPreset === 'fechado-23:59') {
      setHoraDe('00:00');
      setHoraAte('23:59');
    } else if (turnoPreset === 'personalizado') {
      // keep existing
    }
  }, [turnoPreset]);

  useEffect(() => {
    if (periodoGranularidade === 'mes') {
      setDataInicio(dayjs().startOf('month').format('YYYY-MM-DD'));
      setDataFim(dayjs().endOf('month').format('YYYY-MM-DD'));
    } else if (periodoGranularidade === 'ano') {
      setDataInicio(dayjs().startOf('year').format('YYYY-MM-DD'));
      setDataFim(dayjs().endOf('year').format('YYYY-MM-DD'));
    } else {
      setDataInicio(hoje);
      setDataFim(hoje);
    }
  }, [periodoGranularidade, hoje]);

  const aplicarFiltros = useCallback(
    (e?: React.FormEvent) => {
      if (e && e.preventDefault) e.preventDefault();
      setMostrarResultados(false);
      setCardsMedicos([]);
      setMensagem('');

      const dInicioStr = dataInicio || hoje;
      const dFimStr = dataFim || hoje;
      const dInicio = dayjs(dInicioStr, ['YYYY-MM-DD', 'DD/MM/YYYY']).startOf('day').toDate();
      const dFim = dayjs(dFimStr, ['YYYY-MM-DD', 'DD/MM/YYYY']).endOf('day').toDate();
      let horaStart = horaDe || DEFAULT_HORA_DE;
      let horaEnd = horaAte || DEFAULT_HORA_ATE;

      const nomeBusca = normalizeString(medicoNome);
      const crmBusca = String(medicoCRM || '').trim();
      const espBusca = normalizeString(especialidade || '');

      const registros = (plantaoRawOriginal || []).map((p) => ({
        ...p,
        medico: p.medico_nome,
        crm: String(p.crm || '').trim(),
        especialidade: p.especialidade || '',
        data: p.data || '',
        hora: p.hora || '',
        quantidade: Number(p.quantidade || 0),
      }));

      let filtrados: ProductionEntryRaw[] = [];
      if (crmBusca) {
        filtrados = registros.filter((r) => String(r.crm) === crmBusca);
        if (espBusca) filtrados = filtrados.filter((r) => normalizeString(r.especialidade) === espBusca);
      } else if (nomeBusca) {
        filtrados = registros.filter((r) => normalizeString(r.medico_nome) === nomeBusca);
        if (espBusca) filtrados = filtrados.filter((r) => normalizeString(r.especialidade) === espBusca);
      } else if (espBusca) {
        filtrados = registros.filter((r) => normalizeString(r.especialidade) === espBusca);
      } else {
        filtrados = registros;
      }

      filtrados = filtrarPorDataHoraLocal(filtrados, dInicio, dFim, horaStart, horaEnd);

      if (!filtrados || filtrados.length === 0) {
        if (nomeBusca) {
          const fuzzy = registros.filter((r) => normalizeString(r.medico_nome).includes(nomeBusca));
          filtrados = filtrarPorDataHoraLocal(fuzzy, dInicio, dFim, horaStart, horaEnd);
        }
      }

      if (!filtrados || filtrados.length === 0) {
        let msg = 'Nenhum dado encontrado para os filtros aplicados.';
        if (nomeBusca && espBusca) msg = 'Especialidade sem registro para esse médico.';
        else if (nomeBusca && !espBusca) msg = 'Médico sem registros no período selecionado.';
        else if (!nomeBusca && espBusca) msg = 'Especialidade sem registros no período selecionado.';
        setMensagem(msg);
        falar(msg);
        setTimeout(() => setMensagem(''), 5000);
        setMostrarResultados(true);
        return;
      }

      const map = new Map<string, any>();
      filtrados.forEach((r) => {
        const key = r.crm || normalizeString(r.medico_nome) || Math.random().toString(36).slice(2, 9);
        if (!map.has(key)) {
          map.set(key, {
            key,
            nome: r.medico_nome || 'Desconhecido',
            crm: r.crm || '',
            especialidadesSet: new Set<string>(),
            registros: [] as ProductionEntryRaw[],
            atendimentosTotal: 0,
          });
        }
        const entry = map.get(key);
        if (r.especialidade) entry.especialidadesSet.add(r.especialidade);
        entry.registros.push(r);
        entry.atendimentosTotal += Number(r.quantidade || 0) || 0;
      });

      let cards = Array.from(map.values()).map((c: any) => ({
        key: c.key,
        nome: c.nome,
        crm: c.crm,
        especialidades: Array.from(c.especialidadesSet),
        registros: c.registros,
        atendimentosTotal: c.atendimentosTotal,
      }));

      if (espBusca) {
        cards = cards.filter((c: any) => c.especialidades.some((e: string) => normalizeString(e) === espBusca));
      }
      if (nomeBusca && !crmBusca) {
        cards = cards.filter((c: any) => normalizeString(c.nome) === nomeBusca || normalizeString(c.nome).includes(nomeBusca));
      }
      cards.sort((a: any, b: any) => (b.atendimentosTotal || 0) - (a.atendimentosTotal || 0));

      setCardsMedicos(cards);
      setMostrarResultados(true);
      const msg = 'Foi encontrado os dados pesquisados.';
      setMensagem(msg);
      falar(msg);
      setTimeout(() => setMensagem(''), 5000);
    },
    [
      dataInicio,
      dataFim,
      hoje,
      horaDe,
      horaAte,
      medicoNome,
      medicoCRM,
      especialidade,
      plantaoRawOriginal,
      filtrarPorDataHoraLocal,
      falar,
    ]
  );

  const handleLimpar = () => {
    setMedicoNome('');
    setMedicoCRM('');
    setEspecialidade('');
    setDataInicio(hoje);
    setDataFim(hoje);
    setHoraDe(DEFAULT_HORA_DE);
    setHoraAte(DEFAULT_HORA_ATE);
    setTurnoPreset('personalizado');
    setPeriodoGranularidade('dia');
    setCardsMedicos([]);
    setMostrarResultados(false);
    setMensagem('Filtros limpos.');
    falar('Filtros limpos.');
    setTimeout(() => setMensagem(''), 3000);
  };

  const abrirDetalhes = (card: any) => {
    setModalDetalhes({
      aberto: true,
      medico: { nome: card.nome, crm: card.crm, especialidades: card.especialidades || [] },
      registros: card.registros || [],
    });
  };

  const fecharDetalhes = () => setModalDetalhes({ aberto: false, medico: null, registros: [] });

  const exportPDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Relatório de Atendimentos Médicos', 14, 20);
      const dadosTabela = cardsMedicos.flatMap((c: any) =>
        c.registros.map((r: any) => [
          c.nome,
          c.crm,
          r.especialidade || '',
          dayjs(r.data).format('DD/MM/YYYY'),
          r.hora || '',
          r.quantidade || 0,
        ])
      );
      (doc as any).autoTable({
        head: [['Médico', 'CRM', 'Especialidade', 'Data', 'Hora', 'Atendimentos']],
        body: dadosTabela,
      });
      doc.save(`relatorio_${dayjs().format('YYYYMMDD_HHmm')}.pdf`);
    });
    setMensagem('PDF gerado.');
    falar('PDF gerado.');
  };

  const exportExcel = () => {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const wsData = [
        ['Médico', 'CRM', 'Especialidade', 'Data', 'Hora', 'Atendimentos'],
        ...cardsMedicos.flatMap((c: any) =>
          c.registros.map((r: any) => [
            c.nome,
            c.crm,
            r.especialidade || '',
            dayjs(r.data).format('DD/MM/YYYY'),
            r.hora || '',
            r.quantidade || 0,
          ])
        ),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
      XLSX.writeFile(wb, `relatorio_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
    });
    setMensagem('Excel gerado.');
    falar('Excel gerado.');
  };

  const totalAtendimentos = useMemo(
    () => cardsMedicos.reduce((s, c) => s + (Number(c.atendimentosTotal) || 0), 0),
    [cardsMedicos]
  );
  const totalMedicos = useMemo(() => cardsMedicos.length, [cardsMedicos]);

  const chartData = useMemo(
    () => ({
      labels: cardsMedicos.map((c) => c.nome),
      data: cardsMedicos.map((c) => c.atendimentosTotal),
    }),
    [cardsMedicos]
  );

  const tabelaDetalhada = useMemo(() => {
    if (!mostrarResultados) return [];
    const regs = cardsMedicos.flatMap((c: any) =>
      c.registros.map((r: any) => ({
        ...r,
        medico: c.nome,
        crm: c.crm,
        especialidade: r.especialidade || c.especialidades?.[0] || '',
        atendimentos: Number(r.quantidade || r.atendimentos || 0),
      }))
    );
    regs.sort((a: any, b: any) => {
      const ad = parsePlantaoDate(a.data, a.hora) || new Date(0);
      const bd = parsePlantaoDate(b.data, b.hora) || new Date(0);
      return bd.getTime() - ad.getTime();
    });
    return regs;
  }, [cardsMedicos, mostrarResultados]);

  const dadosPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    (tabelaDetalhada || []).forEach((r) => {
      let key: string;
      if (periodoGranularidade === 'mes') {
        key = dayjs(r.data, ['YYYY-MM-DD', 'DD/MM/YYYY']).format('YYYY-MM');
      } else if (periodoGranularidade === 'ano') {
        key = dayjs(r.data, ['YYYY-MM-DD', 'DD/MM/YYYY']).format('YYYY');
      } else {
        key = dayjs(r.data, ['YYYY-MM-DD', 'DD/MM/YYYY']).isValid() ? dayjs(r.data).format('YYYY-MM-DD') : String(r.data || '');
      }
      map[key] = (map[key] || 0) + (Number(r.atendimentos) || 0);
    });
    const labels = Object.keys(map).sort();
    const data = labels.map((l) => map[l]);
    const labelFormat = periodoGranularidade === 'mes' ? 'MM/YYYY' : periodoGranularidade === 'ano' ? 'YYYY' : 'DD/MM';
    return {
      labels: labels.map((l) => dayjs(l).format(labelFormat)),
      datasets: [{ label: 'Atendimentos', data, borderColor: '#1f4e78', backgroundColor: '#1f4e7840', fill: true }],
    };
  }, [tabelaDetalhada, periodoGranularidade]);

  const dadosPorEspecialidade = useMemo(() => {
    const map: Record<string, number> = {};
    (tabelaDetalhada || []).forEach((r) => {
      const k = r.especialidade || 'Desconhecida';
      map[k] = (map[k] || 0) + (Number(r.atendimentos) || 0);
    });
    const labels = Object.keys(map);
    const data = labels.map((l) => map[l]);
    const colors = labels.map((l) => getEspecialidadeInfo(l)?.cor || '#888');
    return { labels, datasets: [{ data, backgroundColor: colors }] };
  }, [tabelaDetalhada]);

  const renderGrafico = () => {
    if (!mostrarResultados) return <p className="sem-dados">Clique em "Gerar Filtros" para ver resultados.</p>;
    if (chartType === 'pizza')
      return <GraficoPizza data={visao === 'profissional' ? chartData : dadosPorEspecialidade} />;
    if (chartType === 'barra')
      return <GraficoBarra data={visao === 'profissional' ? chartData : dadosPorEspecialidade} />;
    if (chartType === 'linha') return <GraficoLinha data={dadosPorDia} />;
    if (chartType === 'area') return <GraficoArea data={dadosPorDia} />;
    return <GraficoPizza data={chartData} />;
  };

  const handleDetalhesClickFromTable = (p: any) => {
    const registros = tabelaDetalhada.filter(
      (r) => (p.crm ? r.crm === p.crm : normalizeString(r.medico_nome) === normalizeString(p.medico_nome))
    );
    setModalDetalhes({ aberto: true, medico: { nome: p.medico_nome, crm: p.crm, especialidades: p.especialidade ? [p.especialidade] : [] }, registros });
  };

  if (carregando) {
    return (
      <div className="filtros-container">
        <h1>Relatórios e Filtros</h1>
        <p>Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="filtros-container">
      <h1>Relatórios de Plantões — Filtros Inteligentes</h1>
      <div className="grid-3" style={{ gap: 12, marginBottom: 12 }}>
        <MetricCard title="Total de Atendimentos" value={totalAtendimentos} color="#1f4e78" icon="FaUserMd" />
        <MetricCard title="Total de Médicos" value={totalMedicos} color="#27AE60" icon="FaUsers" />
        <MetricCard title="Período" value={`${dayjs(dataInicio).format('DD/MM/YYYY')} → ${dayjs(dataFim).format('DD/MM/YYYY')}`} color="#F39C12" icon="FaCalendarAlt" />
      </div>
      {mensagem && <div className="mensagem-global">{mensagem}</div>}
      <div className="card">
        <h3>Filtros</h3>
        <form onSubmit={aplicarFiltros}>
          <div className="filtros-grid">
            <div className="input-group autocomplete-group">
              <label>Médico</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={medicoNome}
                  onChange={(e) => {
                    setMedicoNome(e.target.value);
                    setMostrarSugestoesMedicos(true);
                  }}
                  onFocus={() => setMostrarSugestoesMedicos(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesMedicos(false), 150)}
                  placeholder="Nome do médico (opcional)"
                  className="input-field"
                />
                <button type="button" className="btn-icon" onClick={() => setMostrarSugestoesMedicos((s) => !s)}>
                  <FaIcons.FaSearch />
                </button>
              </div>
              {mostrarSugestoesMedicos && sugestoesMedicos.length > 0 && (
                <div className="autocomplete-list" role="listbox" style={{ left: 0, right: 0, maxWidth: '100%' }}>
                  {sugestoesMedicos.map((s, i) => {
                    const corMedico = getMedicoCor([s.especialidade]);
                    const IconMedico = getMedicoIcon([s.especialidade]);
                    return (
                      <div
                        key={i}
                        className="autocomplete-item"
                        onMouseDown={() => {
                          setMedicoNome(s.nome || '');
                          setMedicoCRM(s.crm || '');
                          setMostrarSugestoesMedicos(false);
                        }}
                        style={{ borderLeft: `3px solid ${corMedico}` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: corMedico, fontSize: '1.2em' }}>{React.createElement(IconMedico)}</span>
                          <div>{s.nome}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="input-group">
              <label>CRM</label>
              <input value={medicoCRM} onChange={(e) => setMedicoCRM(e.target.value)} placeholder="CRM (opcional)" className="input-field" />
            </div>
            <div className="input-group autocomplete-group">
              <label>Especialidade</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={especialidade}
                  onChange={(e) => {
                    setEspecialidade(e.target.value);
                    setMostrarSugestoesEspecialidades(true);
                  }}
                  onFocus={() => setMostrarSugestoesEspecialidades(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesEspecialidades(false), 150)}
                  placeholder="Especialidade (opcional)"
                  className="input-field"
                />
                <button type="button" className="btn-icon" onClick={() => setMostrarSugestoesEspecialidades((s) => !s)}>
                  <FaIcons.FaSearch />
                </button>
              </div>
              {mostrarSugestoesEspecialidades && sugestoesEspecialidades.length > 0 && (
                <div className="autocomplete-list" role="listbox" style={{ left: 0, right: 0, maxWidth: '100%' }}>
                  {sugestoesEspecialidades.map((s, i) => {
                    const info = getEspecialidadeInfo(s.nome);
                    const corEsp = info?.cor || '#888';
                    const IconEsp = getEspecialidadeIcon(s.nome);
                    return (
                      <div
                        key={i}
                        className="autocomplete-item"
                        onMouseDown={() => {
                          setEspecialidade(s.nome);
                          setMostrarSugestoesEspecialidades(false);
                        }}
                        style={{ borderLeft: `3px solid ${corEsp}` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: corEsp, fontSize: '1.2em' }}>{React.createElement(IconEsp)}</span>
                          <div>{s.nome}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="input-group">
              <label>Período de Pesquisa</label>
              <select value={periodoGranularidade} onChange={(e) => setPeriodoGranularidade(e.target.value)} className="input-select">
                <option value="dia">Por Dia</option>
                <option value="mes">Por Mês</option>
                <option value="ano">Por Ano</option>
              </select>
            </div>
            <div className="input-group">
              <label>Turno / Preset</label>
              <select value={turnoPreset} onChange={(e) => setTurnoPreset(e.target.value)} className="input-select">
                <option value="personalizado">Personalizado</option>
                <option value="07-19">07:00 - 19:00</option>
                <option value="19-07">19:00 - 07:00</option>
                <option value="fechado-12h">Fechado 12h</option>
                <option value="fechado-23:59">Dia todo</option>
              </select>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} />
                <input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label>Data Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input-field" />
            </div>
            <div className="input-group">
              <label>Data Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input-field" />
            </div>
            <div className="input-group">
              <label>Tipo de Gráfico</label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value)} className="input-select">
                <option value="pizza">Pizza</option>
                <option value="barra">Barra</option>
                <option value="linha">Linha</option>
                <option value="area">Área</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn-primario">
              <FaIcons.FaFilter style={{ marginRight: 8 }} /> Gerar Filtros
            </button>
            <button type="button" className="btn-secundario" style={{ marginLeft: 8 }} onClick={handleLimpar}>
              <FaIcons.FaEraser style={{ marginRight: 8 }} /> Limpar
            </button>
          </div>
        </form>
      </div>

      {mostrarResultados && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primario" onClick={exportPDF}>
                <FaIcons.FaFilePdf style={{ marginRight: 8 }} /> Gerar PDF
              </button>
              <button className="btn-secundario" onClick={exportExcel}>
                <FaIcons.FaFileExcel style={{ marginLeft: 8, marginRight: 8 }} /> Gerar Excel
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="radio" name="visao" checked={visao === 'profissional'} onChange={() => setVisao('profissional')} /> Profissional
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="radio" name="visao" checked={visao === 'especialidade'} onChange={() => setVisao('especialidade')} /> Especialidade
              </label>
            </div>
          </div>
          <div className="grid-cards" style={{ marginTop: 12 }}>
            {cardsMedicos.length === 0 ? (
              <p>Nenhum registro encontrado.</p>
            ) : (
              cardsMedicos.map((c) => {
                const corMedico = getMedicoCor(c.especialidades);
                const IconMedico = getMedicoIcon(c.especialidades);
                const espPreview = (c.especialidades || []).slice(0, 3);
                return (
                  <div key={c.key} className="card-medico" style={{ borderLeft: `5px solid ${corMedico}` }}>
                    <div className="card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: corMedico, fontSize: '1.5em' }}>{React.createElement(IconMedico)}</span>
                        <div>
                          <h4 style={{ margin: 0 }}>{c.nome || 'Desconhecido'}</h4>
                          <small>{c.crm ? `CRM: ${c.crm}` : 'CRM: —'}</small>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>{c.atendimentosTotal}</div>
                        <small>Atendimentos</small>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="chips">
                        {espPreview.map((e: string, i: number) => {
                          const info = getEspecialidadeInfo(e);
                          const chipColor = info?.cor || '#666';
                          const IconEsp = getEspecialidadeIcon(e);
                          return (
                            <span key={i} className="chip" style={{ background: chipColor, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {React.createElement(IconEsp)}
                              {e}
                            </span>
                          );
                        })}
                        {(c.especialidades.length || 0) > 3 && <span className="chip">+{(c.especialidades.length || 0) - 3}</span>}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button className="btn-small" onClick={() => abrirDetalhes(c)}>
                          <FaIcons.FaEye style={{ marginRight: 6 }} /> Ver detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ marginTop: 18 }}>
            <h3>Relatório Detalhado</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button className="btn-primario" onClick={() => { exportPDF(); setMensagem('PDF gerado.'); falar('PDF gerado.'); }}>
                <FaIcons.FaFilePdf style={{ marginRight: 8 }} /> Gerar PDF (tabela)
              </button>
              <button className="btn-secundario" onClick={() => { exportExcel(); setMensagem('Excel gerado.'); falar('Excel gerado.'); }}>
                <FaIcons.FaFileExcel style={{ marginRight: 8 }} /> Gerar Excel (tabela)
              </button>
            </div>
            {tabelaDetalhada.length === 0 ? (
              <p className="sem-dados">Nenhum dado encontrado para os filtros aplicados.</p>
            ) : (
              <div className="tabela-wrapper">
                <table className="tabela-estilizada">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Médico</th>
                      <th>CRM</th>
                      <th>Especialidade</th>
                      <th>Hora</th>
                      <th>Atendimentos</th>
                      <th>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaDetalhada.map((p, idx) => {
                      const corMedicoLinha = getMedicoCor([p.especialidade]);
                      const IconMedicoLinha = getMedicoIcon([p.especialidade]);
                      const IconEspLinha = getEspecialidadeIcon(p.especialidade);
                      const corEsp = getEspecialidadeInfo(p.especialidade)?.cor || '#999';
                      return (
                        <tr key={idx} style={{ borderLeft: `5px solid ${corEsp}` }}>
                          <td>{dayjs(p.data).format('DD/MM/YYYY')}</td>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: corMedicoLinha, fontSize: '1.2em' }}>{React.createElement(IconMedicoLinha)}</span>
                            {p.medico_nome || 'Desconhecido'}
                          </td>
                          <td>{p.crm || '—'}</td>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: corEsp, fontSize: '1.2em' }}>{React.createElement(IconEspLinha)}</span>
                            {p.especialidade || '—'}
                          </td>
                          <td>{p.hora || '—'}</td>
                          <td className="atendimentos-value">{Number(p.quantidade || p.atendimentos || 0)}</td>
                          <td>
                            <button className="btn-detalhes" onClick={() => handleDetalhesClickFromTable(p)}>Ver Detalhes</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {modalDetalhes.aberto && modalDetalhes.medico && (
        <div className="modal-overlay" onClick={fecharDetalhes}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalhes — {modalDetalhes.medico.nome}</h3>
              <button className="btn-icon" onClick={fecharDetalhes}>
                <FaIcons.FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p><strong>CRM:</strong> {modalDetalhes.medico.crm || '—'}</p>
              <p><strong>Especialidades no período:</strong> {(modalDetalhes.medico.especialidades || []).join(', ') || '—'}</p>
              <h4>Plantões</h4>
              {modalDetalhes.registros.length === 0 ? (
                <p>Nenhum plantão encontrado.</p>
              ) : (
                <table className="tabela-estilizada">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Especialidade</th>
                      <th>Atendimentos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalDetalhes.registros.map((r, i) => {
                      const IconEspModal = getEspecialidadeIcon(r.especialidade);
                      const corEspModal = getEspecialidadeInfo(r.especialidade)?.cor || '#999';
                      return (
                        <tr key={i} style={{ borderLeft: `3px solid ${corEspModal}` }}>
                          <td>{dayjs(r.data).format('DD/MM/YYYY')}</td>
                          <td>{r.hora || '—'}</td>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: corEspModal, fontSize: '1.2em' }}>{React.createElement(IconEspModal)}</span>
                            {r.especialidade || '—'}
                          </td>
                          <td>{Number(r.quantidade || r.atendimentos || 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-primario" onClick={() => { exportPDF(); falar('PDF gerado dos plantões.'); }}>
                Exportar PDF (detalhes)
              </button>
              <button className="btn-secundario" onClick={() => { exportExcel(); falar('Excel gerado dos plantões.'); }}>
                Exportar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarResultados && (
        <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #eee' }}>
          <h4>Visualização Gráfica</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="radio" name="visao" checked={visao === 'profissional'} onChange={() => setVisao('profissional')} /> Profissional
              </label>
              <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="radio" name="visao" checked={visao === 'especialidade'} onChange={() => setVisao('especialidade')} /> Especialidade
              </label>
            </div>
          </div>
          {renderGrafico()}
        </div>
      )}
    </div>
  );
}
