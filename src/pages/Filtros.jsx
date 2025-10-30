import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
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
} from "chart.js";
import { Pie } from "react-chartjs-2"; // Mantendo Pie aqui
import * as FaIcons from "react-icons/fa";

// 1. IMPORT DO ARQUIVO CSS EXTERNO
import "./Filtros.css";

// 2. IMPORTAÇÕES DE MÓDULOS DO PROJETO
// Assumindo que Filtros.jsx está em src/pages e os módulos em src/utils, src/services, etc.

// 2.1. Funções de Serviços e Utilitários
import { getDadosConsolidados } from "../services/dataServices"; 
import { getEspecialidadeInfo, especialidades as especialidadesList } from "../api/especialidades.js"; 
import { fmtDate } from "../utils/index.js"; // Para formatar data na tabela
import { gerarPDF, gerarExcel } from "../utils/relatorioService.js";
import { GlobalController, LocalStorageService } from "../pages/GlobalController.jsx"; // Serviços de Storage
import { falarMensagem } from "../utils/tts.js"; // IMPORT TTS CORRIGIDO

// 2.2. Componentes de Gráfico Separados
import GraficoBarra from "./GraficoBarra.jsx";
import GraficoArea from "./GraficoArea.jsx"; 
import GraficoPizza from "./GraficoPizza.jsx";
import GraficoLinha from "./GraficoLinha.jsx";

// Configuração do ChartJS (necessário para todos os tipos de gráfico)
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

dayjs.locale("pt-br");


// =========================================
// 3. COMPONENTE CARD DE MÉTRICA (Auxiliar)
// =========================================
const MetricCard = ({ title, value, color, icon }) => {
  const IconComponent = FaIcons[icon] || FaIcons.FaChartBar; // Fallback icon

  return (
    // Classes: .card e .metric-card do Filtros.css
    <div className="card metric-card">
      <div className="icon" style={{ color: color }}>
        <IconComponent size={24} />
      </div>
      <div className="info">
        <p className="title">{title}</p>
        <span className="value">{value}</span>
      </div>
    </div>
  );
};


// =========================================
// 4. COMPONENTE PRINCIPAL: FILTROS
// =========================================

export default function Filtros() {
  const [dataInicio, setDataInicio] = useState(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
  const [dataFim, setDataFim] = useState(dayjs().format("YYYY-MM-DD"));
  const [horaDe, setHoraDe] = useState("07:00");
  const [horaAte, setHoraAte] = useState("19:00");
  const [medico, setMedico] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [tabelaDetalhada, setTabelaDetalhada] = useState([]);
  const [opcoesMedicos, setOpcoesMedicos] = useState([]);
  const [opcoesEspecialidades, setOpcoesEspecialidades] = useState([]);
  
  // Estado para Mensagens Globais / Feedback (Usado em conjunto com o TTS)
  const [mensagem, setMensagem] = useState(""); 

  // Função adaptada para buscar os dados de atendimentos detalhados
  const processarDadosParaTabela = (dadosAgrupados) => {
      // Mapeia os dados agrupados de volta para uma lista detalhada (flat)
      return dadosAgrupados.flatMap(g => 
        (g.items || []).map(p => ({
            ...p,
            medico: g.medico, 
            crm: p.crm || g.crm,
            data: p.data,
            periodo: p.periodo || (p.hora && (p.hora < '12:00' ? 'Manhã' : 'Tarde/Noite')),
            atendimentos: p.quantidade,
            // Correção: Use o nome da especialidade do grupo, se o item detalhado não tiver
            especialidade: p.especialidade || g.especialidade, 
        }))
      );
  }

  const handleAplicarFiltros = (e) => {
    e?.preventDefault(); 
    
    // Assumindo que getDadosConsolidados foi importado corretamente de dataServices.js
    const getDados = typeof getDadosConsolidados === 'function' ? getDadosConsolidados : () => [];
    
    const filtros = {
      dataInicio,
      dataFim,
      horaDe,
      horaAte,
      medico,
      especialidade,
    };
    
    const dados = getDados(filtros);
    setDadosFiltrados(dados);
    
    // Gera a lista detalhada para a tabela
    const detalhes = processarDadosParaTabela(dados);
    setTabelaDetalhada(detalhes);
    
    // 📢 TTS e Mensagem Global (Corrigido)
    const totalAtendimentos = dados.reduce((sum, d) => sum + d.atendimentos, 0);
    const msg = `Filtros aplicados. ${totalAtendimentos} atendimentos encontrados.`;
    setMensagem(msg);
    falarMensagem(msg);
    setTimeout(() => setMensagem(""), 5000); // Limpa a mensagem após 5 segundos
  };

  useEffect(() => {
    // ⚙️ Lógica de carregamento de opções (Corrigido para usar GlobalController e especialidades.js)
    
    // Médicos: usa GlobalController para buscar lista de médicos do localStorage
    const medicos = GlobalController.getMedicos(); 
    setOpcoesMedicos(medicos.map(m => m.nome));

    // Especialidades: usa lista de especialidades (API/estática ou LocalStorage se migrou)
    // Usando a lista de especialidades estáticas ou do localStorage
    const especialidadesBrutas = especialidadesList || LocalStorageService.getItem("especialidades") || []; 
    setOpcoesEspecialidades(especialidadesBrutas.map(e => e.nome));
    
    handleAplicarFiltros();
    
    // Listener para atualização de dados (se houver novo cadastro, por exemplo)
    window.addEventListener('dadosAtualizados', handleAplicarFiltros);
    return () => window.removeEventListener('dadosAtualizados', handleAplicarFiltros);
  }, []);
  
  const handleLimparFiltros = () => {
    setDataInicio(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
    setDataFim(dayjs().format("YYYY-MM-DD"));
    setHoraDe("07:00");
    setHoraAte("19:00");
    setMedico("");
    setEspecialidade("");
    setDadosFiltrados([]);
    setTabelaDetalhada([]);
    
    const msg = "Filtros e dados limpos.";
    setMensagem(msg);
    falarMensagem(msg);
    setTimeout(() => setMensagem(""), 4000);
  };

  // Funções de Relatório
  const relatorioPDF = () => {
    const filename = gerarPDF(tabelaDetalhada);
    const msg = `Relatório PDF gerado: ${filename}`;
    setMensagem(msg);
    falarMensagem(msg);
    setTimeout(() => setMensagem(""), 4000);
  }
  
  const relatorioExcel = () => {
    const filename = gerarExcel(tabelaDetalhada);
    const msg = `Relatório Excel gerado: ${filename}`;
    setMensagem(msg);
    falarMensagem(msg);
    setTimeout(() => setMensagem(""), 4000);
  }
  
  const getCorEspecialidade = (nome) => getEspecialidadeInfo(nome)?.cor || '#999999';

  // Processamento de dados para gráficos (Memoizado para performance)
  const medicoData = useMemo(() => {
    const labels = dadosFiltrados.map(d => d.medico);
    const data = dadosFiltrados.map(d => d.atendimentos);
    
    return {
      labels,
      datasets: [{
        label: 'Atendimentos',
        data,
        backgroundColor: dadosFiltrados.map(d => getCorEspecialidade(d.especialidade)),
      }],
    };
  }, [dadosFiltrados]);

  const especialidadeData = useMemo(() => {
    const map = dadosFiltrados.reduce((acc, curr) => {
      const esp = curr.especialidade;
      acc[esp] = (acc[esp] || 0) + curr.atendimentos;
      return acc;
    }, {});

    const labels = Object.keys(map);
    const data = Object.values(map);
    const colors = labels.map(getCorEspecialidade);

    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
      }],
    };
  }, [dadosFiltrados]);

  const timelineData = useMemo(() => {
    const map = {};
    tabelaDetalhada.forEach(p => { 
        const data = fmtDate(p.data, 'YYYY-MM-DD');
        map[data] = (map[data] || 0) + (Number(p.atendimentos) || 0);
    });

    const labels = Object.keys(map).sort();
    const data = labels.map(l => map[l]);
    
    // Opções para a linha (GraficoArea)
    const corPrincipal = getCorEspecialidade(dadosFiltrados[0]?.especialidade || 'Clinica Médica');

    return {
      labels: labels.map(d => dayjs(d).format('DD/MM')),
      datasets: [{
        label: 'Total Diário',
        data,
        borderColor: corPrincipal,
        backgroundColor: corPrincipal + '40', // Cor com transparência para a área
        fill: true,
      }],
    };
  }, [tabelaDetalhada, dadosFiltrados]);

  // =========================================
  // 5. RENDERIZAÇÃO (Com classes CSS personalizadas)
  // =========================================

  return (
    <div className="filtros-container">
      <h1>Relatórios e Gráficos de Plantões</h1>
      
      {/* Mensagem Global (TTS) - Classe .mensagem-global */}
      {mensagem && <p className="mensagem-global">{mensagem}</p>}


      {/* Grid de Cards de Resumo - Usa .grid-3 e .card */}
      <div className="grid-3">
        <MetricCard 
            title="Total de Atendimentos" 
            value={dadosFiltrados.reduce((sum, d) => sum + d.atendimentos, 0)} 
            color="#1f4e78" 
            icon="FaUserMd" 
        />
        <MetricCard 
            title="Total de Médicos Únicos" 
            value={new Set(dadosFiltrados.map(d => d.medico)).size} 
            color="#27AE60" 
            icon="FaUsers" 
        />
        <MetricCard 
            title="Média de Atendimentos" 
            value={(dadosFiltrados.reduce((sum, d) => sum + d.atendimentos, 0) / (new Set(tabelaDetalhada.map(d => fmtDate(d.data, 'YYYY-MM-DD'))).size || 1)).toFixed(2)} 
            color="#F39C12" 
            icon="FaChartLine" 
        />
      </div>

      {/* Card de Filtros - Usa .card */}
      <div className="card">
        <h3>Filtros de Dados</h3>
        <form onSubmit={handleAplicarFiltros}>
          
          {/* Grid de Filtros - Usa .filtros-grid e .input-group */}
          <div className="filtros-grid">
            
            {/* Input Médico - Usa .input-group e <select> */}
            <div className="input-group">
              <label htmlFor="medico">Médico/CRM</label>
              <select 
                id="medico" 
                value={medico} 
                onChange={(e) => setMedico(e.target.value)}
                // Aplica a classe de estilo do input/select
                className="input-select" 
              >
                <option value="">Todos os Médicos</option>
                {opcoesMedicos.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Especialidade - Usa .input-group e <select> */}
            <div className="input-group">
              <label htmlFor="especialidade">Especialidade</label>
              <select 
                id="especialidade" 
                value={especialidade} 
                onChange={(e) => setEspecialidade(e.target.value)}
                // Aplica a classe de estilo do input/select
                className="input-select"
              >
                <option value="">Todas as Especialidades</option>
                {opcoesEspecialidades.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Data Início - Usa .input-group e <input> */}
            <div className="input-group">
              <label htmlFor="dataInicio">Data Início</label>
              <input
                type="date"
                id="dataInicio"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                // Aplica a classe de estilo do input
                className="input-field"
              />
            </div>

            {/* Input Data Fim - Usa .input-group e <input> */}
            <div className="input-group">
              <label htmlFor="dataFim">Data Fim</label>
              <input
                type="date"
                id="dataFim"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                // Aplica a classe de estilo do input
                className="input-field"
              />
            </div>

            {/* Input Hora De - Usa .input-group e <input> */}
            <div className="input-group">
              <label htmlFor="horaDe">Hora De</label>
              <input
                type="time"
                id="horaDe"
                value={horaDe}
                onChange={(e) => setHoraDe(e.target.value)}
                // Aplica a classe de estilo do input
                className="input-field"
              />
            </div>
            
            {/* Input Hora Até - Usa .input-group e <input> */}
            <div className="input-group">
              <label htmlFor="horaAte">Hora Até</label>
              <input
                type="time"
                id="horaAte"
                value={horaAte}
                onChange={(e) => setHoraAte(e.target.value)}
                // Aplica a classe de estilo do input
                className="input-field"
              />
            </div>

          </div>
          
          {/* Botões de Ação - Usa .botoes-acao, .btn-primario, .btn-secundario */}
          <div className="botoes-acao">
            <button type="submit" className="btn-primario">
              <FaIcons.FaFilter size={14} style={{ marginRight: '8px' }} /> Aplicar Filtros
            </button>
            <button type="button" className="btn-secundario" onClick={handleLimparFiltros}>
              <FaIcons.FaEraser size={14} style={{ marginRight: '8px' }} /> Limpar Filtros
            </button>
          </div>
        </form>
      </div>

      {/* Container de Gráficos - Usa .graficos-container */}
      {dadosFiltrados.length > 0 && (
        <div className="graficos-container">
          <h2>Análise Gráfica</h2>
          
          {/* Grid de Gráficos - Usa .grid-graficos e .grafico-wrapper */}
          <div className="grid-graficos">
            
            {/* Gráfico de Barras por Médico (Componente Externo) */}
            <div className="grafico-wrapper">
              <h3>Atendimentos por Médico (Total)</h3>
              {/* Substituído <Bar> pelo componente importado */}
              <GraficoBarra data={medicoData} /> 
            </div>

            {/* Gráfico de Pizza por Especialidade (Mantido interno, pois não havia componente Pie dedicado) */}
            <div className="grafico-wrapper">
              <h3>Atendimentos por Especialidade (Pizza)</h3>
              <Pie data={especialidadeData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
            
            {/* Gráfico de Linha/Área por Data (Componente Externo) */}
            <div className="grafico-wrapper">
              <h3>Atendimentos por Data (Linha do Tempo)</h3>
              {/* Substituído <Line> pelo componente GraficoArea/Linha importado */}
              <GraficoArea data={timelineData} /> 
            </div>

          </div>
        </div>
      )}

      {/* Tabela de Detalhes (Relatório) - Usa .tabela-detalhes, .tabela-wrapper, .tabela-estilizada */}
      {tabelaDetalhada.length > 0 && (
        <div className="tabela-detalhes">
          <h2>Relatório Detalhado</h2>

          <div className="botoes-acao">
            <button className="btn-primario" onClick={relatorioPDF}>
              <FaIcons.FaFilePdf size={14} style={{ marginRight: '8px' }} /> Gerar PDF
            </button>
            <button className="btn-secundario" onClick={relatorioExcel}>
              <FaIcons.FaFileExcel size={14} style={{ marginRight: '8px' }} /> Gerar Excel
            </button>
          </div>

          <div className="tabela-wrapper">
            <table className="tabela-estilizada">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Médico</th>
                  <th>CRM</th>
                  <th>Especialidade</th>
                  <th>Período</th>
                  <th>Atendimentos</th>
                </tr>
              </thead>
              <tbody>
                {tabelaDetalhada.map((p, index) => (
                  <tr 
                    key={index} 
                    // Adicionando um destaque de cor na linha baseado na especialidade
                    style={{ borderLeft: `5px solid ${getCorEspecialidade(p.especialidade)}` }} 
                  >
                    <td>{fmtDate(p.data)}</td>
                    <td>{p.medico}</td>
                    <td>{p.crm}</td>
                    <td>{p.especialidade}</td>
                    <td>{p.periodo}</td>
                    {/* Usando classe se existir ou inline style para negrito */}
                    <td className="atendimentos-value">{p.atendimentos}</td> 
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mensagem de Sem Dados - Usa .sem-dados */}
      {tabelaDetalhada.length === 0 && dadosFiltrados.length === 0 && (
        <p className="sem-dados">Nenhum dado encontrado para os filtros aplicados.</p>
      )}

    </div>
  );
}