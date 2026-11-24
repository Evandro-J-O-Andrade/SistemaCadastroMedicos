// src/pages/Plantao.tsx
// Página de Levantamento de Produção Médica (plantão 12×36 da equipe de TI)
// Segue a regra operacional:
// - Turno diurno (07h-19h) levanta a produção do plantão noturno anterior
// - Turno noturno (19h-07h) levanta a produção do plantão diurno daquele dia
// - Os registros permanecem vinculados ao lote ativo até o encerramento do plantão
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTTS } from '../hooks/useTTS';
import {
  getEspecialidadeInfo,
  especialidades as especialidadesList,
} from '../api/especialidades';
import './Plantao.css';
import './mobile.css';

interface PlantaoEntry {
  id: string;
  collection_batch_id: string;
  medical_professional_id: string;
  medico_nome: string;
  crm: string;
  especialidade: string;
  quantidade: number;
  periodo_medico: 'diurno' | 'noturno';
  data_referencia: string;
  hora: string;
  observacao?: string;
  origem: 'manual' | 'importacao' | 'integracao';
  criado_por: string;
  criado_em: string;
}

interface MedicoOption {
  id: string;
  nome: string;
  crm: string;
  crm_uf: string;
  especialidade: string;
}

const normalizeString = (str: string | null | undefined) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const getHoje = () => dayjs().format('YYYY-MM-DD');

// Determina o turno do plantão médico com base na hora
const computePeriodoMedico = (hora: string) => {
  if (!hora) return 'Indefinido';
  const [hStr, mStr] = hora.split(':');
  const h = Number(hStr);
  const m = Number(mStr || 0);
  const minutos = h * 60 + m;
  return minutos >= 7 * 60 && minutos < 19 * 60 ? 'diurno' : 'noturno';
};

export default function Plantao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { falar, vozAtiva, toggleVoz, getVozStatus } = useTTS();

  const [plantaoList, setPlantaoList] = useState<PlantaoEntry[]>([]);
  const [medicosData, setMedicosData] = useState<MedicoOption[]>([]);
  const [medicoInput, setMedicoInput] = useState('');
  const [medicoId, setMedicoId] = useState<string | null>(null);
  const [crm, setCrm] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [dataAtendimento, setDataAtendimento] = useState(getHoje());
  const [horaAtendimento, setHoraAtendimento] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [dataAtual, setDataAtual] = useState(getHoje());
  const [mensagemGlobal, setMensagemGlobal] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState('');
  const [plantaoParaExcluir, setPlantaoParaExcluir] = useState<string | null>(null);
  const [batchAtivo, setBatchAtivo] = useState<{ id: string; shift_id: string; turno: string; data_referencia: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [mostrarListaMedicos, setMostrarListaMedicos] = useState(false);
  const [lupaInput, setLupaInput] = useState('');
  const [mostrarListaLupa, setMostrarListaLupa] = useState(false);
  const [listaFiltradaLupa, setListaFiltradaLupa] = useState<MedicoOption[]>([]);

  const [vozLigada, setVozLigada] = useState(() => getVozStatus());

  // Carregar médicos cadastrados
  useEffect(() => {
    carregarMedicos();
    carregarBatchAtivo();
  }, []);

  const carregarMedicos = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_professionals')
        .select('*, person(*), medical_professional_specialties(specialty_id:specialty_id, nome:specialties(nome))')
        .eq('ativo', true);

      if (!error && data) {
        const lista: MedicoOption[] = data.map((m: any) => ({
          id: m.id,
          nome: m.person?.nome || m.nome_social || '',
          crm: m.crm || '',
          crm_uf: m.crm_uf || '',
          especialidade: m.medical_professional_specialties?.[0]?.nome || '—',
        }));
        setMedicosData(lista);
      }
    } catch (err) {
      console.error('Erro ao carregar médicos:', err);
    }
  };

  // Carregar o batch ativo (lote em andamento) para o usuário logado
  const carregarBatchAtivo = async () => {
    if (!user) return;
    try {
      // Buscar shifts abertos da pessoa logada
      const { data: shifts, error: shiftError } = await supabase
        .from('collection_shifts')
        .select('*')
        .eq('person_id', user.id)
        .eq('status', 'aberto')
        .order('inicio_em', { ascending: false })
        .limit(1);

      if (shiftError || !shifts || shifts.length === 0) {
        // Nenhum shift aberto: criar um novo com base na hora atual
        await criarNovoShift();
        return;
      }

      const shift = shifts[0];
      setBatchAtivo(null);

      // Buscar batch aberto para este shift
      const { data: batches, error: batchError } = await supabase
        .from('collection_batches')
        .select('*')
        .eq('collection_shift_id', shift.id)
        .eq('status', 'aberto')
        .limit(1);

      if (!batchError && batches && batches.length > 0) {
        setBatchAtivo({
          id: batches[0].id,
          shift_id: shift.id,
          turno: shift.turno,
          data_referencia: shift.data_referencia,
        });
        carregarProducaoDoBatch(batches[0].id);
      } else {
        // Criar um novo batch para este shift
        const { data: novoBatch, error: createError } = await supabase
          .from('collection_batches')
          .insert({
            collection_shift_id: shift.id,
            status: 'aberto',
            total_medicos: 0,
            total_atendimentos: 0,
          })
          .select()
          .single();

        if (!createError && novoBatch) {
          setBatchAtivo({
            id: novoBatch.id,
            shift_id: shift.id,
            turno: shift.turno,
            data_referencia: shift.data_referencia,
          });
          carregarProducaoDoBatch(novoBatch.id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar batch ativo:', err);
    }
  };

  const criarNovoShift = async () => {
    if (!user) return;
    const agora = dayjs();
    const hora = agora.hour();
    const turno = hora >= 7 && hora < 19 ? 'diurno' : 'noturno';
    const dataRef = agora.format('YYYY-MM-DD');

    // Para turno noturno após meia-noite, o data_referencia é o dia anterior
    let dataReferencia = dataRef;
    if (turno === 'noturno' && hora < 7) {
      dataReferencia = agora.subtract(1, 'day').format('YYYY-MM-DD');
    }

    try {
      // Buscar unidade padrão do usuário (primeira unit_membership)
      const { data: units } = await supabase
        .from('unit_memberships')
        .select('unit_id')
        .eq('person_id', user.id)
        .eq('ativo', true)
        .limit(1);

      const unitId = units?.[0]?.unit_id;

      if (!unitId) {
        setMensagemGlobal('Usuário não possui unidade vinculada. Cadastre uma unidade primeiro.');
        setTipoMensagem('erro');
        return;
      }

      const { data: novoShift, error } = await supabase
        .from('collection_shifts')
        .insert({
          tenant_id: '', // será preenchido pelo RLS via JWT claims
          unit_id: unitId,
          person_id: user.id,
          turno,
          data_referencia: dataReferencia,
          inicio_em: agora.toISOString(),
          status: 'aberto',
        })
        .select()
        .single();

      if (error) throw error;

      const { data: novoBatch, error: batchError } = await supabase
        .from('collection_batches')
        .insert({
          collection_shift_id: novoShift.id,
          status: 'aberto',
          total_medicos: 0,
          total_atendimentos: 0,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      setBatchAtivo({
        id: novoBatch.id,
        shift_id: novoShift.id,
        turno: novoShift.turno,
        data_referencia: novoShift.data_referencia,
      });
      carregarProducaoDoBatch(novoBatch.id);

      setMensagemGlobal(`Novo plantão ${turno} aberto para ${dataReferencia}`);
      setTipoMensagem('sucesso');
    } catch (err: any) {
      setMensagemGlobal('Erro ao abrir plantão: ' + err.message);
      setTipoMensagem('erro');
    }
  };

  const carregarProducaoDoBatch = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('production_entries')
        .select('*')
        .eq('collection_batch_id', batchId)
        .order('criado_em', { ascending: true });

      if (!error && data) {
        const lista: PlantaoEntry[] = data.map((p: any) => ({
          id: p.id,
          collection_batch_id: p.collection_batch_id,
          medical_professional_id: p.medical_professional_id,
          medico_nome: p.medico_nome || '',
          crm: p.crm || '',
          especialidade: p.especialidade || '',
          quantidade: Number(p.quantidade) || 0,
          periodo_medico: p.periodo_medico,
          data_referencia: p.data_referencia,
          hora: p.hora || '',
          observacao: p.observacao || '',
          origem: p.origem || 'manual',
          criado_por: p.criado_por,
          criado_em: p.criado_em,
        }));
        setPlantaoList(lista);
      }
    } catch (err) {
      console.error('Erro ao carregar produção:', err);
    }
  };

  // Montar lista única de especialidades (médicos + catálogo fixo)
  const uniqueSpecialties = (() => {
    const map: Record<string, string> = {};
    medicosData.forEach((m) => {
      const nome = m.especialidade;
      if (!nome || nome === '—') return;
      const key = normalizeString(nome);
      if (!map[key]) map[key] = nome;
    });
    especialidadesList.forEach((e) => {
      if (!e || !e.nome) return;
      const key = normalizeString(e.nome);
      if (!map[key]) map[key] = e.nome;
    });
    return Object.values(map).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  })();

  const filtrarMedicosInput = (valor: string) => {
    setMedicoInput(valor);
    setMostrarListaMedicos(true);
  };

  const handleSelecionarMedico = (medico: MedicoOption, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMedicoInput(medico.nome);
    setMedicoId(medico.id);
    setCrm(medico.crm);
    const nomeEsp = medico.especialidade;
    if (nomeEsp && nomeEsp !== '—') {
      const match = uniqueSpecialties.find((esp) => normalizeString(esp) === normalizeString(nomeEsp));
      setEspecialidade(match || nomeEsp);
    }
    setMostrarListaMedicos(false);
  };

  const handleSelecionarMedicoDaLupa = (medico: MedicoOption) => {
    setMedicoInput(medico.nome);
    setMedicoId(medico.id);
    setCrm(medico.crm);
    const nomeEsp = medico.especialidade;
    if (nomeEsp && nomeEsp !== '—') {
      const match = uniqueSpecialties.find((esp) => normalizeString(esp) === normalizeString(nomeEsp));
      setEspecialidade(match || nomeEsp);
    }
    setLupaInput('');
    setListaFiltradaLupa([]);
    setMostrarListaLupa(false);
  };

  const abrirListaLupa = () => {
    if (!lupaInput.trim()) {
      setListaFiltradaLupa(medicosData);
    } else {
      const filtro = medicosData.filter((m) =>
        normalizeString(m.nome).includes(normalizeString(lupaInput))
      );
      setListaFiltradaLupa(filtro);
      if (filtro.length === 0) {
        setMensagemGlobal('Médico não encontrado ou erro de digitação!');
        setTipoMensagem('erro');
      }
    }
    setMostrarListaLupa(true);
  };

  // Valida se há conflito do mesmo médico + especialidade em um intervalo curto
  // (diferencia lançamento, complemento e duplicidade pelo período médico)
  const validarConflito = useCallback((novoPlantao: Partial<PlantaoEntry>) => {
    if (!medicoId || !novoPlantao.data_referencia || !novoPlantao.hora) return false;

    const registroN = dayjs(`${novoPlantao.data_referencia} ${novoPlantao.hora}`);

    return plantaoList.some((p) => {
      if (p.id === editandoId) return false;
      if (normalizeString(p.medico_nome) !== normalizeString(novoPlantao.medico_nome)) return false;
      if (normalizeString(p.especialidade) !== normalizeString(novoPlantao.especialidade)) return false;

      const registroP = dayjs(`${p.data_referencia} ${p.hora}`);
      const diffHoras = Math.abs(registroN.diff(registroP, 'hour'));

      // Conflito se mesmo médico+especialidade em menos de 12h no mesmo período médico
      return diffHoras < 12 && p.periodo_medico === novoPlantao.periodo_medico;
    });
  }, [plantaoList, editandoId, medicoId]);

  const handleAddPlantao = async () => {
    if (!medicoInput || !crm || !especialidade || !quantidade || !dataAtendimento || !horaAtendimento) {
      setMensagemGlobal('Preencha todos os campos obrigatórios.');
      setTipoMensagem('erro');
      return;
    }

    if (!batchAtivo) {
      setMensagemGlobal('Não há plantão ativo. Abra um plantão primeiro.');
      setTipoMensagem('erro');
      return;
    }

    const medicoExiste = medicosData.some((m) => {
      const idMatch = m.id === medicoId;
      const nomeMatch = normalizeString(m.nome) === normalizeString(medicoInput);
      const crmMatch = (m.crm || '') === crm;
      return idMatch || (nomeMatch && crmMatch);
    });

    if (!medicoExiste) {
      setMensagemGlobal('Médico não encontrado ou não está cadastrado!');
      setTipoMensagem('erro');
      return;
    }

    const novoPlantao: Partial<PlantaoEntry> = {
      medico_nome: medicoInput,
      crm,
      especialidade,
      quantidade: Number(quantidade),
      data_referencia: dataAtendimento,
      hora: horaAtendimento,
      periodo_medico: computePeriodoMedico(horaAtendimento) as 'diurno' | 'noturno',
      collection_batch_id: batchAtivo.id,
      medical_professional_id: medicoId!,
      origem: 'manual',
      criado_por: user!.id,
    };

    if (validarConflito(novoPlantao)) {
      setMensagemGlobal('Este médico já possui um lançamento nesta especialidade nas últimas 12h!');
      setTipoMensagem('erro');
      return;
    }

    try {
      setLoading(true);

      if (editandoId) {
        // Buscar quantidade anterior para auditoria
        const anterior = plantaoList.find((p) => p.id === editandoId);
        const quantidadeAnterior = anterior?.quantidade;

        await supabase
          .from('production_entries')
          .update({
            medico_nome: medicoInput,
            crm,
            especialidade,
            quantidade: Number(quantidade),
            data_referencia: dataAtendimento,
            hora: horaAtendimento,
            periodo_medico: novoPlantao.periodo_medico,
            observacao: '',
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', editandoId);

        // Registrar revisão de auditoria
        await supabase.from('production_revisions').insert({
          production_entry_id: editandoId,
          quantidade_anterior: quantidadeAnterior,
          quantidade_nova: Number(quantidade),
          motivo: 'Correção de lançamento',
          revisado_por: user!.id,
        });

        setMensagemGlobal('Plantão atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('production_entries')
          .insert({
            collection_batch_id: batchAtivo.id,
            medical_professional_id: medicoId,
            medico_nome: medicoInput,
            crm,
            especialidade,
            quantidade: Number(quantidade),
            data_referencia: dataAtendimento,
            hora: horaAtendimento,
            periodo_medico: novoPlantao.periodo_medico,
            origem: 'manual',
            criado_por: user!.id,
          })
          .select()
          .single();

        if (error) throw error;

        setMensagemGlobal('Plantão salvo com sucesso!');
      }

      setTipoMensagem('sucesso');
      limparFormularioPlantao();

      // Recarregar produção do batch
      await carregarProducaoDoBatch(batchAtivo.id);

      // Notificar TTS
      if (vozAtiva) {
        await falar(`Plantão de ${medicoInput} registrado com ${quantidade} atendimentos.`);
      }

      // Disparar evento para outras páginas (home, relatórios)
      window.dispatchEvent(new Event('dadosAtualizados'));
    } catch (err: any) {
      setMensagemGlobal('Erro ao salvar plantão: ' + err.message);
      setTipoMensagem('erro');
    } finally {
      setLoading(false);
    }
  };

  const limparFormularioPlantao = () => {
    setEditandoId(null);
    setMedicoInput('');
    setMedicoId(null);
    setCrm('');
    setEspecialidade('');
    setQuantidade('');
    setDataAtendimento(getHoje());
    setHoraAtendimento('');
  };

  const handleConfirmarExclusao = (id: string) => {
    setPlantaoParaExcluir(id);
    setMensagemGlobal('Deseja realmente excluir este lançamento?');
    setTipoMensagem('erro');
  };

  const handleExcluirConfirmado = async () => {
    if (!plantaoParaExcluir) return;
    try {
      setLoading(true);
      await supabase.from('production_entries').delete().eq('id', plantaoParaExcluir);

      setMensagemGlobal('Lançamento excluído com sucesso!');
      setTipoMensagem('sucesso');
      setPlantaoParaExcluir(null);

      await carregarProducaoDoBatch(batchAtivo!.id);
      window.dispatchEvent(new Event('dadosAtualizados'));
    } catch (err: any) {
      setMensagemGlobal('Erro ao excluir: ' + err.message);
      setTipoMensagem('erro');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarExclusao = () => {
    setPlantaoParaExcluir(null);
    setMensagemGlobal('');
  };

  const handleEditPlantao = (plantao: PlantaoEntry) => {
    setMedicoInput(plantao.medico_nome);
    setMedicoId(plantao.medical_professional_id);
    setCrm(plantao.crm);
    setEspecialidade(plantao.especialidade);
    setQuantidade(String(plantao.quantidade));
    setDataAtendimento(plantao.data_referencia);
    setHoraAtendimento(plantao.hora);
    setEditandoId(plantao.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderEspecialidade = (esp: string | null | undefined) => {
    const info = getEspecialidadeInfo(esp);
    const Icon = typeof info.icone === 'function' ? (info.icone as React.ComponentType) : null;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {Icon ? React.createElement(Icon as any, { style: { color: info.cor, marginRight: 8 } }) : <span style={{ color: info.cor, marginRight: 8 }} />}
        <span>{info.nome}</span>
      </span>
    );
  };

  const getCorDaEspecialidade = (esp: string | null | undefined) => {
    const info = getEspecialidadeInfo(esp);
    return info && info.cor ? info.cor : '#000000';
  };

  const handleToggleVoz = () => {
    const status = toggleVoz();
    setVozLigada(status);
    setMensagemGlobal(status ? '🔊 Leitor de voz ativado.' : '🔈 Leitor de voz desativado.');
    setTipoMensagem('info');
  };

  // Auto-filtro quando muda o dia (apenas atualiza a data de referência visual)
  useEffect(() => {
    const interval = setInterval(() => {
      const novaData = getHoje();
      if (novaData !== dataAtual) {
        setDataAtual(novaData);
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [dataAtual]);

  const turnoLabel = batchAtivo ? (batchAtivo.turno === 'diurno' ? 'Diurno (07h-19h)' : 'Noturno (19h-07h)') : '—';
  const dataRefLabel = batchAtivo ? batchAtivo.data_referencia : '—';

  return (
    <div className="plantao-container">
      <div className="plantao-header">
        <h2>{editandoId ? 'Editar Lançamento' : 'Registrar Produção Médica'}</h2>
        <div className="plantao-status">
          <span className={`status-badge ${batchAtivo ? 'ativo' : 'inativo'}`}>
            {batchAtivo ? '● Lote Ativo' : '○ Sem Lote Ativo'}
          </span>
          <span className="turno-info">
            Turno: {turnoLabel} | Ref: {dataRefLabel}
          </span>
          {batchAtivo && (
            <button
              className="btn-encerrar-batch"
              onClick={() => {
                if (window.confirm('Encerrar este lote de levantamento?')) {
                  // Encerrar batch via RPC
                  supabase.rpc('fn_encerrar_batch', { p_batch_id: batchAtivo.id, p_fechado_por: user!.id }).then(() => {
                    setMensagemGlobal('Lote encerrado com sucesso!');
                    setTipoMensagem('sucesso');
                    setBatchAtivo(null);
                    setPlantaoList([]);
                    window.dispatchEvent(new Event('dadosAtualizados'));
                  });
                }
              }}
            >
              Encerrar Lote
            </button>
          )}
        </div>
      </div>

      <button
        className="btn-toggle-voz"
        onClick={handleToggleVoz}
      >
        {vozLigada ? '🔊 Desativar Voz' : '🔈 Ativar Voz'}
      </button>

      <div className="form-plantao">
        <label>
          Médico:
          <div className="medico-wrapper">
            <input
              type="text"
              placeholder="Digite ou selecione o médico"
              value={medicoInput}
              onChange={(e) => filtrarMedicosInput(e.target.value)}
            />
            <i className="fas fa-chevron-down" onClick={() => setMostrarListaMedicos(!mostrarListaMedicos)} />
            {mostrarListaMedicos && (
              <div className="lista-medicos">
                {medicosData
                  .filter((m) => normalizeString(m.nome).includes(normalizeString(medicoInput)))
                  .map((m) => (
                    <div key={m.id} onClick={(e) => handleSelecionarMedico(m, e)}>
                      {m.nome}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </label>

        <label>
          CRM:
          <input type="text" value={crm} readOnly placeholder="CRM do médico" />
        </label>

        <label>
          Procurar Médico:
          <div className="lupa-wrapper">
            <input
              type="text"
              placeholder="Digite para buscar"
              value={lupaInput}
              onChange={(e) => setLupaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') abrirListaLupa();
              }}
            />
            <i className="fas fa-search" onClick={abrirListaLupa} />
            {mostrarListaLupa && listaFiltradaLupa.length > 0 && (
              <div className="lista-medicos">
                {listaFiltradaLupa.map((m) => (
                  <div key={m.id} onClick={() => handleSelecionarMedicoDaLupa(m)}>
                    {m.nome}
                  </div>
                ))}
              </div>
            )}
          </div>
        </label>

        <label>
          Especialidade:
          <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)}>
            <option value="">Todos</option>
            {uniqueSpecialties.map((espNome, index) => (
              <option key={index} value={espNome}>{espNome}</option>
            ))}
          </select>
        </label>

        <label>
          Quantidade de atendimentos:
          <input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder="0"
          />
        </label>

        <div className="data-hora-wrapper">
          <label>
            Data do Atendimento:
            <input
              type="date"
              value={dataAtendimento}
              onChange={(e) => setDataAtendimento(e.target.value)}
            />
          </label>
          <label>
            Hora do Atendimento:
            <input
              type="time"
              value={horaAtendimento}
              onChange={(e) => setHoraAtendimento(e.target.value)}
            />
            <span className="periodo-hint">
              {horaAtendimento ? computePeriodoMedico(horaAtendimento) === 'diurno' ? 'Diurno' : 'Noturno' : ''}
            </span>
          </label>
        </div>

        <button className="btn-salvar-plantao" onClick={handleAddPlantao} disabled={loading}>
          {loading ? 'Salvando...' : editandoId ? 'Atualizar Plantão' : 'Salvar Plantão'}
        </button>
      </div>

      {mensagemGlobal && (
        <div className={`mensagem-global ${tipoMensagem}`}>
          <p>{mensagemGlobal}</p>
          {plantaoParaExcluir && (
            <div className="confirmacao-botoes">
              <button className="btn-confirmar" onClick={handleExcluirConfirmado}>Sim</button>
              <button className="btn-cancelar" onClick={handleCancelarExclusao}>Cancelar</button>
            </div>
          )}
        </div>
      )}

      {plantaoList.length > 0 ? (
        <div className="plantao-cards">
          {plantaoList.map((p) => (
            <div
              className="plantao-card"
              key={p.id}
              style={{ borderLeft: `5px solid ${getCorDaEspecialidade(p.especialidade)}` }}
            >
              <div className="info-plantao">
                <p><span>Médico:</span> {p.medico_nome}</p>
                <p><span>CRM:</span> {p.crm}</p>
                <p><span>Especialidade:</span> {renderEspecialidade(p.especialidade)}</p>
                <p><span>Quantidade:</span> {p.quantidade}</p>
                <p><span>Período Médico:</span> {p.periodo_medico}</p>
                <p><span>Data Ref.:</span> {dayjs(p.data_referencia).format('DD/MM/YYYY')}</p>
                <p><span>Hora:</span> {p.hora}</p>
                <p><span>Origem:</span> {p.origem}</p>
              </div>
              <div className="acoes-plantao">
                <button className="btn-editar-plantao" onClick={() => handleEditPlantao(p)}>Editar</button>
                <button className="btn-excluir-plantao" onClick={() => handleConfirmarExclusao(p.id)}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="nenhum-plantao">Nenhum lançamento registrado neste lote ainda.</p>
      )}

      <button className="btn-cadastrar-medico" onClick={() => navigate('/medicos')}>
        Cadastrar Médico
      </button>
    </div>
  );
}
