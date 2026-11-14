// src/pages/Medicos.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import {
  especialidades,
  ordenarEspecialidades,
  getEspecialidadeInfo,
} from '../api/especialidades';
import { supabase } from '../lib/supabase';
import './Medicos.css';
import './mobile.css';

interface MedicoForm {
  id: string | null;
  nome: string;
  especialidade: { nome: string; cor: string; icone: any };
  crm: string;
  observacao: string;
}

export default function Medicos() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const LIMIT = 50;

  const [medicos, setMedicos] = useState<any[]>([]);
  const [form, setForm] = useState<MedicoForm>({
    id: null,
    nome: '',
    especialidade: { nome: '', cor: '', icone: null },
    crm: '',
    observacao: '',
  });
  const [mensagem, setMensagem] = useState('');
  const [erroCampos, setErroCampos] = useState<Record<string, boolean>>({});
  const [pesquisa, setPesquisa] = useState({ nome: '', especialidade: '', crm: '' });
  const [pagina, setPagina] = useState(0);
  const [listaVisivel, setListaVisivel] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [listaSelecionadaIndex, setListaSelecionadaIndex] = useState(-1);

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setListaVisivel(false);
        setListaSelecionadaIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const normalizeString = (str: string | null | undefined) =>
    str ? String(str).toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';

  useEffect(() => {
    carregarMedicos();
  }, []);

  const carregarMedicos = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_professionals')
        .select('*, person(*), medical_professional_specialties(specialty_id), medical_professional_units(unit_id)')
        .eq('ativo', true);

      if (!error && data) {
        const lista = data.map((m: any) => {
          const espNome =
            m.medical_professional_specialties?.[0]?.specialty_id
              ? ''
              : m.person?.nome || '—';
          return {
            id: m.id,
            nome: m.person?.nome || '',
            email: m.person?.email || '',
            crm: m.crm || '',
            crm_uf: m.crm_uf || '',
            especialidade: espNome,
            observacao: '',
            ativo: m.ativo,
          };
        });
        setMedicos(lista);
      }
    } catch (err) {
      console.error('Erro ao carregar médicos:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.toUpperCase();
    setForm({ ...form, [e.target.name]: valor });
    if (erroCampos[e.target.name]) setErroCampos({ ...erroCampos, [e.target.name]: false });
  };

  const handleEspecialidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setFiltro(valor);
    setForm({ ...form, especialidade: { nome: valor, cor: '', icone: null } });
    setListaVisivel(true);
  };

  const selecionarEspecialidade = (item: typeof especialidades[number]) => {
    const espInfo = getEspecialidadeInfo(item.nome);
    setForm((prev) => ({
      ...prev,
      especialidade: {
        nome: espInfo.nome,
        cor: espInfo.cor,
        icone: espInfo.icone,
      },
    }));
    setFiltro('');
    setListaVisivel(false);
    setListaSelecionadaIndex(-1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const faltando: Record<string, boolean> = {};
    if (!form.nome) faltando.nome = true;
    if (!form.crm) faltando.crm = true;
    if (!form.especialidade?.nome) faltando.especialidade = true;

    if (Object.keys(faltando).length) {
      setErroCampos(faltando);
      setMensagem('⚠️ Preencha todos os campos obrigatórios!');
      setTimeout(() => setMensagem(''), 4000);
      return;
    }

    // Verificar CRM duplicado
    const crmExiste = medicos.some(
      (m) =>
        m.crm?.toString().toUpperCase() === form.crm.toString().toUpperCase() &&
        m.id !== form.id
    );
    if (crmExiste) {
      setErroCampos({ crm: true });
      setMensagem('⚠️ CRM já cadastrado!');
      setTimeout(() => setMensagem(''), 4000);
      return;
    }


    try {
      if (form.id) {
        if (!window.confirm('Deseja atualizar este médico?')) return;
        await supabase.from('medical_professionals').update({
          nome_social: form.nome,
          crm: form.crm.toUpperCase(),
          crm_uf: '',
        }).eq('id', form.id);
        setMensagem('✅ Médico atualizado com sucesso!');
      } else {
        // Criar pessoa primeiro, depois médico
        const { data: personData, error: personError } = await supabase
          .from('people')
          .insert({ nome: form.nome, email: null })
          .select()
          .single();
        if (personError) throw personError;

        const { error: medicoError } = await supabase.from('medical_professionals').insert({
          person_id: personData.id,
          crm: form.crm.toUpperCase(),
          crm_uf: '',
          ativo: true,
        });
        if (medicoError) throw medicoError;
        setMensagem('✅ Médico cadastrado com sucesso!');
      }
      setForm({
        id: null,
        nome: '',
        especialidade: { nome: '', cor: '', icone: null },
        crm: '',
        observacao: '',
      });
      setErroCampos({});
      await carregarMedicos();
    } catch (err: any) {
      setMensagem('❌ Erro ao salvar médico: ' + err.message);
    }
    setTimeout(() => setMensagem(''), 5000);
  };

  const handleEditar = (m: any) => {
    const esp = getEspecialidadeInfo(m.especialidade);
    setForm({
      ...m,
      especialidade: { nome: esp.nome, cor: esp.cor, icone: esp.icone },
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este médico?')) return;
    try {
      await supabase.from('medical_professionals').update({ ativo: false }).eq('id', id);
      setMensagem('🗑️ Médico excluído com sucesso!');
      setMedicos((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      setMensagem('🗑️ Erro ao excluir médico: ' + err.message);
    }
    setTimeout(() => setMensagem(''), 4000);
  };

  const handlePesquisar = useCallback(() => {
    const todos = medicos;
    const nomeQ = pesquisa.nome.trim();
    const espQ = pesquisa.especialidade.trim();
    const crmQ = pesquisa.crm.trim();

    let filtrados = todos.filter((m) => {
      const okNome = !nomeQ || normalizeString(m.nome).includes(normalizeString(nomeQ));
      const okEsp = !espQ || normalizeString(m.especialidade).includes(normalizeString(espQ));
      const okCrm = !crmQ || m.crm?.toUpperCase().includes(crmQ.toUpperCase());
      return okNome && okEsp && okCrm;
    });

    const lista = filtrados.slice(0, LIMIT).map((m) => ({
      ...m,
      especialidade: getEspecialidadeInfo(m.especialidade),
    }));

    setMedicos(lista);
    setPagina(0);
    if (lista.length === 0) setMensagem('Nenhum médico encontrado.');
  }, [pesquisa, medicos]);

  const handleLimparPesquisa = () => {
    setPesquisa({ nome: '', especialidade: '', crm: '' });
    setMedicos([]);
    setMensagem('');
  };

  const especialidadesFiltradas = useMemo(() => {
    try {
      const filtrado = especialidades.filter((item) =>
        normalizeString(item.nome).includes(normalizeString(filtro))
      );
      return ordenarEspecialidades(filtrado);
    } catch {
      return [];
    }
  }, [filtro]);

  return (
    <div id="medicos-container">
      <h2>Cadastro de Médicos</h2>

      {mensagem && (
        <div className="mensagem-container">
          <p className="mensagem-sucesso">{mensagem}</p>
          <button onClick={() => setMensagem('')} className="btn-voz">
            ✕
          </button>
        </div>
      )}

      <form id="medicos-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="nome"
          placeholder="Nome do médico"
          value={form.nome}
          onChange={handleChange}
          className={erroCampos.nome ? 'campo-erro' : ''}
        />

        <div ref={inputRef} className="linha-especialidade-crm">
          <div className="input-com-lupa">
            <input
              type="text"
              placeholder="Especialidade"
              value={
                form.especialidade?.nome && !filtro
                  ? form.especialidade.nome
                  : filtro || ''
              }
              onChange={handleEspecialidadeChange}
              onFocus={() => setListaVisivel(true)}
              className={erroCampos.especialidade ? 'campo-erro' : ''}
            />
            <button
              type="button"
              className="btn-lupa"
              onClick={() => {
                setFiltro('');
                setListaVisivel(true);
              }}
            >
              <FaSearch />
            </button>
            {listaVisivel && (
              <ul className="lista-suspensa">
                {especialidadesFiltradas.length > 0 ? (
                  especialidadesFiltradas.map((item, idx) => {
                    const Icone = item.icone as any;
                    return (
                      <li
                        key={item.id}
                        onClick={() => selecionarEspecialidade(item)}
                        style={{
                          color: item.cor,
                          background: idx === listaSelecionadaIndex ? '#f0f0f0' : 'white',
                        }}
                      >
                        {Icone && <Icone className="icone" />} {item.nome}
                      </li>
                    );
                  })
                ) : (
                  <li className="lista-vazia">Nenhuma especialidade encontrada</li>
                )}
              </ul>
            )}
          </div>

          <input
            type="text"
            name="crm"
            placeholder="CRM"
            maxLength={9}
            value={form.crm}
            onChange={(e) =>
              setForm({ ...form, crm: e.target.value.replace(/\D/g, '') })
            }
            className={erroCampos.crm ? 'campo-erro' : ''}
          />
        </div>

        <input
          type="text"
          name="observacao"
          placeholder="Observação"
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value.toUpperCase() })}
        />

        <button type="submit" className="btn">
          {form.id ? 'Atualizar Médico' : 'Cadastrar Médico'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => navigate('/cadastro-lote')}
        >
          Cadastrar em Lote
        </button>
      </form>

      <h3>Pesquisar Médicos</h3>
      <div id="buscar-container">
        <input
          type="text"
          placeholder="Nome"
          value={pesquisa.nome}
          onChange={(e) => setPesquisa({ ...pesquisa, nome: e.target.value.toUpperCase() })}
        />
        <input
          type="text"
          placeholder="Especialidade"
          value={pesquisa.especialidade}
          onChange={(e) =>
            setPesquisa({ ...pesquisa, especialidade: e.target.value.toUpperCase() })
          }
        />
        <input
          type="text"
          placeholder="CRM"
          value={pesquisa.crm}
          onChange={(e) => setPesquisa({ ...pesquisa, crm: e.target.value.toUpperCase() })}
        />
        <button onClick={handlePesquisar} className="btn-pesquisar">
          Pesquisar
        </button>
        <button onClick={handleLimparPesquisa} className="btn-limpar">
          Limpar
        </button>
      </div>

      <div id="tabela-container">
        <table id="tabela-medicos">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Especialidade</th>
              <th>CRM</th>
              <th>Observação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {medicos.map((m, i) => {
              const Icone = m.especialidade?.icone;
              return (
                <tr key={m.id}>
                  <td>{i + 1 + pagina * LIMIT}</td>
                  <td>{m.nome}</td>
                  <td style={{ color: m.especialidade?.cor || '#000' }}>
                    {Icone && <Icone className="icone" />} {m.especialidade?.nome}
                  </td>
                  <td>{m.crm}</td>
                  <td>{m.observacao}</td>
                  <td>
                    <button onClick={() => handleEditar(m)} className="btn-editar">
                      Editar
                    </button>
                    <button onClick={() => handleExcluir(m.id)} className="btn-excluir">
                      Excluir
                    </button>
                  </td>
                </tr>
              );
            })}
            {medicos.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>
                  Nenhum médico encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
