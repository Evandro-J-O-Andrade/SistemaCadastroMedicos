// src/pages/Relatorios.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import GraficoBarra from './GraficoBarra.jsx';
import GraficoPizza from './GraficoPizza.jsx';
import GraficoLinha from './GraficoLinha.jsx';
import GraficoArea from './GraficoArea.jsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getEspecialidadeInfo } from '../api/especialidades';
import './Relatorios.css';
import './mobile.css';

dayjs.locale('pt-br');

interface ProductionEntry {
  id: string;
  medico_nome: string;
  crm: string;
  especialidade: string;
  data: string;
  hora: string;
  turno: string;
  quantidade: number;
}

interface CardMedicoProps {
  medico: string;
  especialidade: string;
  dia: string;
  dias: { dia: string; totalDia: number; items: ProductionEntry[] }[];
  totalOverall: number;
}

function CardMedico({ medico, especialidade, dia, dias, totalOverall }: CardMedicoProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const items = dias[0]?.items || [];
  const totalAtendimentos = items.reduce((soma, i) => soma + Number(i.quantidade || 0), 0);

  const crms = [...new Set(items.map((i) => i.crm || '—'))];
  const crm = crms.join(', ');

  const especialidades = [...new Set(items.map((i) => i.especialidade || '—'))];
  const especialidadeDisplay = especialidades.join(', ');

  const atendimentosStr = items.map((i) => `${i.quantidade} às ${i.hora}`).join(', ');

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx && (ctx as any)._chartInstance) {
        (ctx as any)._chartInstance.destroy();
      }

      const labels = items.map((i) => i.hora);
      const data = items.map((i) => Number(i.quantidade || 0));
      const backgroundColor = items.map((i) => getEspecialidadeInfo(i.especialidade || '—').cor || '#36A2EB');

      const ctx2d = chartRef.current.getContext('2d');
      if (ctx2d) {
        const chartInstance = new Chart(ctx2d, {
          type: 'bar',
          data: {
            labels,
            datasets: [{ label: 'Atendimentos por Horário', data, backgroundColor }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } },
          },
        });

        (ctx2d as any)._chartInstance = chartInstance;
      }
    }

    return () => {
      if (chartRef.current && (chartRef.current as any)._chartInstance) {
        (chartRef.current as any)._chartInstance.destroy();
      }
    };
  }, [items]);

  const espInfo = getEspecialidadeInfo(especialidadeDisplay || '—');
  const Icone = espInfo.icone;

  return (
    <div
      style={{
        border: '1px solid #1f4e78',
        borderRadius: 8,
        padding: 20,
        margin: 10,
        maxWidth: 350,
        backgroundColor: '#F7FBFF',
        color: '#003366',
        fontSize: 13,
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <h2 style={{ fontWeight: '700', fontSize: 18, marginBottom: 15 }}>
        {medico} - {especialidade} - {dia}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-around' }}>
        <div>
          <strong>CRM</strong>
          <div>{crm}</div>
        </div>
        <div style={{ maxWidth: '200px' }}>
          <strong>ATENDIMENTOS</strong>
          <div>{atendimentosStr || 'Nenhum'}</div>
        </div>
        <div>
          <strong>ATENDIMENTOS DE OUTROS PROFISSIONAIS</strong>
          <div>{totalOverall - totalAtendimentos}</div>
        </div>
        <div>
          <strong>ESPECIALIDADE</strong>
          <div style={{ color: espInfo.cor || '#003366', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icone && typeof Icone === 'function' && React.createElement(Icone, { size: 16, style: { marginRight: 5 } })}
            {especialidadeDisplay}
          </div>
        </div>
      </div>
      <div>
        <strong>TOTAL ATENDIMENTOS</strong>
        <div>{totalAtendimentos}</div>
      </div>
      <canvas ref={chartRef} style={{ height: 200, width: '200%' }} />
    </div>
  );
}

export default function Relatorios() {
  const { user } = useAuth();
  const hoje = dayjs().format('YYYY-MM-DD');

  const [plantoes, setPlantoes] = useState<ProductionEntry[]>([]);
  const [medicosData, setMedicosData] = useState<any[]>([]);
  const [medicoQuery, setMedicoQuery] = useState('');
  const [crmQuery, setCrmQuery] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [dataDe, setDataDe] = useState(hoje);
  const [horaDe, setHoraDe] = useState('07:00');
  const [dataAte, setDataAte] = useState(hoje);
  const [horaAte, setHoraAte] = useState('19:00');
  const [visao, setVisao] = useState('profissional');
  const [tipoGrafico, setTipoGrafico] = useState('pizza');
  const [linhas, setLinhas] = useState<any[]>([]);
  const [gerado, setGerado] = useState(false);
  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [ordem, setOrdem] = useState('alfabetica');

  const [mensagemGlobal, setMensagemGlobal] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('');

  useEffect(() => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(mensagemGlobal);
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = synth.getVoices();
    const vozGoogleBR = voices.find((v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('google'));
    if (vozGoogleBR) utterance.voice = vozGoogleBR;

    synth.speak(utterance);

    const handleVoicesChanged = () => {
      const v2 = synth.getVoices();
      const vg = v2.find((v) => v.lang === 'pt-BR' && v.name.toLowerCase().includes('google'));
      if (vg) utterance.voice = vg;
    };
    synth.addEventListener('voiceschanged', handleVoicesChanged);
    return () => synth.removeEventListener('voiceschanged', handleVoicesChanged);
  }, [mensagemGlobal]);

  const graficoRefs = useRef<Record<string, HTMLCanvasElement>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const tabelaRef = useRef<HTMLDivElement>(null);

  const normalizeString = (str: string | null | undefined) =>
    !str ? '' : String(str).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const carregarDados = useCallback(async () => {
    if (!user) return;
    try {
      const { data: medicos, error: medError } = await supabase
        .from('medical_professionals')
        .select('*, person(*), medical_professional_specialties(specialties(nome))')
        .eq('ativo', true);

      if (!medError && medicos) {
        const lista = medicos.map((m: any) => ({
          id: m.id,
          nome: m.person?.nome || m.nome_social || '',
          crm: m.crm || '',
          especialidade: m.medical_professional_specialties?.[0]?.specialties?.nome || '—',
        }));
        setMedicosData(lista);
      }

      const { data: prod, error: prodError } = await supabase
        .from('production_entries')
        .select('*')
        .order('criado_em', { ascending: true });

      if (!prodError && prod) {
        const lista: ProductionEntry[] = prod.map((p: any) => ({
          id: p.id,
          medico_nome: p.medico_nome || '',
          crm: p.crm || '',
          especialidade: p.especialidade || '',
          data: p.data_referencia || '',
          hora: p.hora || '',
          turno: p.periodo_medico || '—',
          quantidade: Number(p.quantidade || 0),
        }));
        setPlantoes(lista);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  }, [user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const parsePlantaoDate = (dataStr: string | null | undefined, horaStr: string | null | undefined) => {
    if (!dataStr) return null;
    if (String(dataStr).includes('-')) {
      return new Date(`${dataStr}T${horaStr || '00:00'}`);
    }
    const [dia, mes, ano] = String(dataStr).split('/');
    return new Date(`${ano}-${mes}-${dia}T${horaStr || '00:00'}`);
  };

  const filtrarPorDataHora = (
    dados: ProductionEntry[],
    inicio: Date,
    fim: Date,
    horaDe: string,
    horaAte: string
  ) => {
    return dados.filter((p) => {
      const registro = parsePlantaoDate(p.data, p.hora);
      if (!registro) return false;
      let okDataHora = registro >= inicio && registro <= fim;

      if (horaDe === '00:00' && horaAte === '23:59') {
        return okDataHora;
      } else if (horaDe === '19:00' && horaAte === '07:00') {
        const horaRegistro = registro.getHours() * 60 + registro.getMinutes();
        const limInicio = 19 * 60;
        const limFim = 7 * 60;
        const dataRegistro = new Date(registro);
        dataRegistro.setHours(0, 0, 0, 0);

        if (registro >= inicio && horaRegistro >= limInicio) {
          return true;
        } else {
          const inicioDiaSeguinte = new Date(dataRegistro);
          inicioDiaSeguinte.setDate(inicioDiaSeguinte.getDate() + 1);
          inicioDiaSeguinte.setHours(0, 0, 0, 0);
          const fimTurno = new Date(inicioDiaSeguinte);
          fimTurno.setHours(7, 0, 0, 0);
          if (registro >= inicioDiaSeguinte && registro <= fimTurno && horaRegistro <= limFim) {
            return true;
          }
        }
      } else {
        const horaRegistro = dayjs(registro).format('HH:mm');
        return (horaRegistro >= horaDe && horaRegistro <= horaAte) && okDataHora;
      }
      return false;
    });
  };

  const filtrarRelatorio = useCallback(() => {
    setMensagemGlobal('');
    const nomeBusca = normalizeString(medicoQuery);
    const crmBusca = crmQuery.trim();
    const espBusca = normalizeString(especialidade);

    if (nomeBusca) {
      const encontrouMedico = medicosData.some((m) => normalizeString(m.nome) === nomeBusca);
      if (!encontrouMedico) {
        setMensagemGlobal('Médico não encontrado no sistema.');
        setTipoMensagem('erro');
        setLinhas([]);
        setGerado(false);
        return;
      }
    }

    const dadosCompletos = plantoes.map((p) => {
      const medico = medicosData.find(
        (m) => m.crm === p.crm || normalizeString(m.nome) === normalizeString(p.medico_nome)
      );
      return {
        medico: p.medico_nome,
        crm: p.crm || medico?.crm || '—',
        especialidade: p.especialidade || (medico?.especialidade || '—'),
        data: p.data,
        hora: p.hora,
        turno: p.turno || '—',
        quantidade: Number(p.quantidade || 0),
      };
    });

    let inicio = dataDe ? (parsePlantaoDate(dataDe, horaDe || '07:00') || new Date(0)) : new Date(0);
    let fim = dataAte ? (parsePlantaoDate(dataAte, horaAte || '19:00') || new Date()) : new Date();

    let filtrados: any[];
    if (crmBusca) {
      filtrados = dadosCompletos.filter((p) => p.crm === crmBusca);
      if (espBusca) {
        filtrados = filtrados.filter((p) => normalizeString(p.especialidade) === espBusca);
      }
    } else if (nomeBusca) {
      filtrados = dadosCompletos.filter((p) => normalizeString(p.medico) === nomeBusca);
      if (espBusca) {
        filtrados = filtrados.filter((p) => normalizeString(p.especialidade) === espBusca);
      }
    } else if (espBusca) {
      filtrados = dadosCompletos.filter((p) => normalizeString(p.especialidade) === espBusca);
    } else {
      filtrados = dadosCompletos;
    }

    filtrados = filtrarPorDataHora(filtrados, inicio, fim, horaDe, horaAte);

    if (filtrados.length === 0) {
      let mensagem = 'Nenhum dado encontrado com os filtros selecionados!. Preencha-os Corretamente!';
      if (nomeBusca && espBusca) mensagem = 'Especialidade sem registro para esse médico.';
      else if (nomeBusca && !espBusca) mensagem = 'Médico sem registros.';
      else if (!nomeBusca && espBusca) mensagem = 'Especialidade sem registros.';
      setMensagemGlobal(mensagem);
      setTipoMensagem('erro');
      setLinhas([]);
      setGerado(false);
      return;
    } else {
      setMensagemGlobal('');
    }

    const agrup = filtrados.reduce((acc: Record<string, any>, p: any) => {
      const diaFormatado = dayjs(p.data, ['YYYY-MM-DD', 'DD/MM/YYYY']).format('DD/MM/YYYY');
      const key = `${p.medico}||${p.especialidade}||${diaFormatado}`;

      if (!acc[key]) {
        acc[key] = {
          chave: `${p.medico} - ${p.especialidade} - ${diaFormatado}`,
          medico: p.medico,
          especialidade: p.especialidade,
          dia: diaFormatado,
          totalDia: 0,
          items: [],
        };
      }

      acc[key].totalDia += Number(p.quantidade || 0);
      acc[key].items.push(p);
      return acc;
    }, {});

    const linhasAgrupadas = Object.values(agrup).map((g: any) => ({
      chave: g.chave,
      medico: g.medico,
      especialidade: g.especialidade,
      dia: g.dia,
      totalDia: g.totalDia,
      items: g.items,
    }));

    setLinhas(linhasAgrupadas);
    setGerado(true);
    setTipoMensagem('sucesso');

    setTimeout(() => {
      linhasAgrupadas.forEach((grupo) =>
        gerarGrafico({ ...grupo, dias: [{ dia: grupo.dia, totalDia: grupo.totalDia, items: grupo.items }] })
      );
    }, 100);
  }, [
    plantoes,
    medicosData,
    medicoQuery,
    crmQuery,
    especialidade,
    dataDe,
    horaDe,
    dataAte,
    horaAte,
    filtrarPorDataHora,
  ]);

  useEffect(() => {
    if (!gerado || !linhas.length) return;

    const getLastTimestamp = (grupo: any) => {
      const all = (grupo.items || []).map((i: any) => {
        const d = parsePlantaoDate(i.data, i.hora);
        return d ? d.getTime() : 0;
      });
      if (!all.length) return 0;
      return Math.max(...all);
    };

    let newLinhas = [...linhas];
    if (ordem === 'alfabetica') {
      newLinhas.sort((a: any, b: any) => a.chave.localeCompare(b.chave));
    } else if (ordem === 'ultimo') {
      newLinhas.sort((a: any, b: any) => getLastTimestamp(b) - getLastTimestamp(a));
    }
    setLinhas(newLinhas);
  }, [ordem, gerado, linhas]);

  const limparResultados = () => {
    setLinhas([]);
    setGerado(false);
    setMensagemGlobal('');
    setTipoMensagem('');
  };

  const limpar = () => {
    setMedicoQuery('');
    setCrmQuery('');
    setEspecialidade('');
    setDataDe(hoje);
    setHoraDe('07:00');
    setDataAte(hoje);
    setHoraAte('19:00');
    setVisao('profissional');
    setTipoGrafico('pizza');
    setOrdem('alfabetica');
    limparResultados();
    setMostrarListaMedicos(false);
  };

  const gerarChartData = (grupo: any) => {
    const items = grupo.dias ? grupo.dias.flatMap((d: any) => d.items) : grupo.items || [];
    const labels = items.map((i: any) => `${dayjs(i.data, ['YYYY-MM-DD', 'DD/MM/YYYY']).format('DD/MM/YYYY')} ${i.hora}`);
    const data = items.map((i: any) => Number(i.quantidade || 0));
    const backgroundColor = items.map((i: any) => getEspecialidadeInfo(i.especialidade || '—').cor || '#36A2EB');
    return { labels, datasets: [{ label: 'Quantidade de Atendimentos', data, backgroundColor }] };
  };

  const gerarGrafico = (grupo: any) => {
    const ctx = graficoRefs.current[grupo.chave];
    if (!ctx) return;

    if ((ctx as any)._chartInstance && typeof (ctx as any)._chartInstance.destroy === 'function') {
      try {
        (ctx as any)._chartInstance.destroy();
      } catch {
        // ignore
      }
    }

    const cfg = {
      type: (tipoGrafico === 'pizza' ? 'pie' : tipoGrafico) as any,
      data: gerarChartData(grupo),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#003366', font: { size: 14, weight: '500' } },
          },
        },
        layout: { padding: { top: 20, bottom: 20 } },
        scales: tipoGrafico !== 'pizza' && {
          x: { ticks: { color: '#003366' }, grid: { color: '#e0e0e0' } },
          y: { ticks: { color: '#003366' }, grid: { color: '#e0e0e0' } },
        },
      },
    };

    const chartInstance = new Chart(ctx.getContext('2d') as CanvasRenderingContext2D, cfg);
    (ctx as any)._chartInstance = chartInstance;
  };

  const gerarResumoPorEspecialidade = (linhasParam: any[]) => {
    const totais: Record<string, number> = {};
    linhasParam.forEach((grupo) => {
      (grupo.items || []).forEach((item: any) => {
        const espKey = item.especialidade || '—';
        if (!totais[espKey]) totais[espKey] = 0;
        totais[espKey] += Number(item.quantidade || 0);
      });
    });
    return Object.keys(totais).map((esp) => `${esp}: ${totais[esp]} atendimentos`);
  };

  const gerarChartDataConsolidadoPorMedico = (linhasParam: any[]) => {
    const totais: Record<string, number> = {};
    linhasParam.forEach((grupo) => {
      const medico = grupo.medico;
      if (!totais[medico]) totais[medico] = 0;
      const reduceValue = grupo.items ? grupo.items.reduce((s: number, i: any) => s + Number(i.quantidade || 0), 0) : 0;
      totais[medico] += Number(grupo.totalDia || reduceValue || 0);
    });
    const labels = Object.keys(totais);
    const data = labels.map((label) => totais[label]);
    const backgroundColor = labels.map((label) => {
      const encontro = medicosData.find((m) => normalizeString(m.nome) === normalizeString(label));
      const esp = encontro?.especialidade || '—';
      return getEspecialidadeInfo(esp).cor || '#36A2EB';
    });
    return { labels, datasets: [{ label: 'Quantidade', data, backgroundColor }] };
  };

  const gerarChartDataConsolidadoPorEspecialidade = (linhasParam: any[]) => {
    const totais: Record<string, number> = {};
    linhasParam.forEach((grupo) => {
      const espKey = grupo.especialidade || (grupo.items && grupo.items[0]?.especialidade) || '—';
      if (!totais[espKey]) totais[espKey] = 0;
      const reduceValue = grupo.items ? grupo.items.reduce((s: number, i: any) => s + Number(i.quantidade || 0), 0) : 0;
      totais[espKey] += Number(grupo.totalDia || reduceValue || 0);
    });
    const labels = Object.keys(totais);
    const data = labels.map((lab) => totais[lab]);
    const backgroundColor = labels.map((lab) => getEspecialidadeInfo(lab).cor || '#36A2EB');
    return { labels, datasets: [{ label: 'Quantidade', data, backgroundColor }] };
  };

  const renderGraficoDinamico = (data: any) => {
    switch (tipoGrafico) {
      case 'barra':
        return <GraficoBarra data={data} />;
      case 'linha':
        return <GraficoLinha data={data} />;
      case 'area':
        return <GraficoArea data={data} />;
      case 'pizza':
      default:
        return <GraficoPizza data={data} />;
    }
  };

  const gerarPDF = () => {
    if (!linhas.length) {
      alert('Não há dados para gerar o PDF.');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('DASHBOARD DE PRODUTIVIDADE MÉDICA', 14, 20);

    linhas.forEach((grupo, indexGrupo) => {
      const dadosTabela = (grupo.items || []).map((item: any) => [
        item.medico,
        item.crm,
        item.especialidade,
        dayjs(item.data).format('DD/MM/YYYY'),
        item.hora,
        item.quantidade,
      ]);

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 30,
        head: [['Médico', 'CRM', 'Especialidade', 'Data', 'Hora', 'Quantidade']],
        body: dadosTabela,
        theme: 'grid',
        headStyles: { fillColor: [31, 78, 120], textColor: 255 },
        bodyStyles: { textColor: 0 },
        styles: { fontSize: 10 },
      });

      if (indexGrupo < linhas.length - 1) doc.addPage();
    });

    doc.save(`relatorio_${dayjs().format('DDMMYYYY_HHmm')}.pdf`);
  };

  const exportExcel = () => {
    if (!linhas.length) {
      alert('Não há dados para exportar o Excel.');
      return;
    }
    const wb = XLSX.utils.book_new();
    linhas.forEach((grupo) => {
      const wsData = [
        ['Médico', 'CRM', 'Especialidade', 'Data', 'Hora', 'Quantidade'],
        ...(grupo.items || []).map((p: any) => [
          p.medico,
          p.crm,
          p.especialidade,
          dayjs(p.data, ['YYYY-MM-DD', 'DD/MM/YYYY']).format('DD/MM/YYYY'),
          dayjs(p.hora, 'HH:mm').format('HH:mm'),
          p.quantidade,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, `${grupo.chave}`.substring(0, 31));
    });
    XLSX.writeFile(wb, `relatorio_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
  };

  const totalOverall = linhas.reduce((acc, g) => {
    const reduceValue = g.items ? g.items.reduce((s: number, i: any) => s + Number(i.quantidade || 0), 0) : 0;
    return acc + Number(g.totalDia || reduceValue || 0);
  }, 0);

  return (
    <div className="relatorios-wrap">
      <div className="relatorios-header">
        <h1>DASHBOARD DE GESTÃO DE PRODUTIVIDADE MÉDICA</h1>
      </div>

      {mensagemGlobal && (
        <div className={`mensagem-global ${tipoMensagem}`}>
          <p>{mensagemGlobal}</p>
        </div>
      )}

      <div className="relatorios-controles card">
        <div className="grid-3">
          <div className="field">
            <label>Visão</label>
            <select value={visao} onChange={(e) => setVisao(e.target.value)}>
              <option value="profissional">Profissional</option>
              <option value="especialidade">Especialidade</option>
            </select>
          </div>

          <div className="field">
            <label>Tipo de Gráfico</label>
            <select value={tipoGrafico} onChange={(e) => setTipoGrafico(e.target.value)}>
              <option value="barra">Barra</option>
              <option value="linha">Linha</option>
              <option value="pizza">Pizza</option>
              <option value="area">Área</option>
            </select>
          </div>

          <div className="field">
            <label>Intervalo</label>
            <select
              value={`${horaDe}-${horaAte}`}
              onChange={(e) => {
                const [inicio, fim] = e.target.value.split('-');
                setHoraDe(inicio);
                setHoraAte(fim);
              }}
            >
              <option value="07:00-19:00">07:00h-19:00h</option>
              <option value="19:00-07:00">19:00h-07:00h</option>
              <option value="00:00-23:59">00h-23h59 (completo)</option>
            </select>
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Especialidade</label>
            <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
              <option value="">Todas</option>
              {[...new Set(medicosData.map((m) => m.especialidade))].map((esp) => (
                <option key={esp} value={esp}>
                  {esp}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Médico</label>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input
                ref={inputRef}
                value={medicoQuery}
                onChange={(e) => setMedicoQuery(e.target.value)}
                placeholder="Todos"
                onFocus={() => setMostrarListaMedicos(true)}
                onBlur={() => setTimeout(() => setMostrarListaMedicos(false), 200)}
              />
              <span
                style={{ cursor: 'pointer', marginLeft: '5px' }}
                onClick={() => {
                  setMedicoQuery('');
                  setCrmQuery('');
                  setMostrarListaMedicos(true);
                }}
              >
                🔍
              </span>
              {mostrarListaMedicos && (
                <div
                  style={{
                    border: '1px solid #5f5a5aff',
                    maxHeight: '310px',
                    overflowY: 'auto',
                    background: '#fcf1f1ff',
                    position: 'absolute',
                    top: '30px',
                    width: '350px',
                    zIndex: 10,
                  }}
                >
                  {medicosData
                    .filter((m) => normalizeString(m.nome).includes(normalizeString(medicoQuery)))
                    .map((m) => (
                      <div
                        key={m.id}
                        style={{ padding: '5px', cursor: 'pointer' }}
                        onMouseDown={() => {
                          setMedicoQuery(m.nome);
                          setCrmQuery(m.crm || '');
                          setMostrarListaMedicos(false);
                        }}
                      >
                        {m.nome}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <label>CRM</label>
            <input type="text" value={crmQuery} onChange={(e) => setCrmQuery(e.target.value)} />
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label>Data/Hora Início</label>
            <input type="date" value={dataDe} onChange={(e) => setDataDe(e.target.value)} />
            <input type="time" value={horaDe} onChange={(e) => setHoraDe(e.target.value)} />
          </div>

          <div className="field">
            <label>Data/Hora Fim</label>
            <input type="date" value={dataAte} onChange={(e) => setDataAte(e.target.value)} />
            <input type="time" value={horaAte} onChange={(e) => setHoraAte(e.target.value)} />
          </div>
        </div>

        <div className="grid-3" style={{ marginTop: '10px' }}>
          <div className="field">
            <label>Ordenar por</label>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value)}>
              <option value="alfabetica">Alfabética</option>
              <option value="ultimo">Último Atendimento</option>
            </select>
          </div>
        </div>

        <div className="botoes-relatorio" style={{ marginTop: '15px', display: 'flex', gap: '20px' }}>
          <button style={{ fontSize: '16px', padding: '10px 60px' }} onClick={filtrarRelatorio}>
            Gerar Relatórios
          </button>
          <button style={{ fontSize: '16px', padding: '10px 100px' }} onClick={limpar}>
            Limpar
          </button>
          <button style={{ fontSize: '16px', padding: '10px 115px' }} onClick={gerarPDF}>
            Exportar PDF
          </button>
          <button style={{ fontSize: '16px', padding: '10px 115px' }} onClick={exportExcel}>
            Exportar Excel
          </button>
        </div>
      </div>

      {gerado && visao === 'profissional' && (
        <section ref={tabelaRef} className="relatorios-tabela" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
          {linhas.map((grupo) => (
            <CardMedico
              key={grupo.chave}
              medico={grupo.medico}
              especialidade={grupo.especialidade}
              dia={grupo.dia}
              dias={[{ dia: grupo.dia, totalDia: grupo.totalDia, items: grupo.items }]}
              totalOverall={totalOverall}
            />
          ))}
        </section>
      )}

      {gerado && linhas.length > 0 && (
        <div className="grafico-container">
          <h3 style={{ textAlign: 'center', marginBottom: 20 }}>
            Gráfico Consolidado {visao === 'profissional' ? 'por Médico' : 'por Especialidade'}
          </h3>
          {renderGraficoDinamico(
            visao === 'profissional'
              ? gerarChartDataConsolidadoPorMedico(linhas)
              : gerarChartDataConsolidadoPorEspecialidade(linhas)
          )}
          {visao === 'especialidade' && (
            <div style={{ marginTop: 15, textAlign: 'center', fontWeight: '600', color: '#003366' }}>
              {gerarResumoPorEspecialidade(linhas).join(' | ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
