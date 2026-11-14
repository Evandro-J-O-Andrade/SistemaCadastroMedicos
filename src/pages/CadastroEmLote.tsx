// src/pages/CadastroEmLote.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import './CadastroLote.css';
import './mobile.css';

export default function CadastroEmLote() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [textoLote, setTextoLote] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState<'sucesso' | 'erro' | ''>('');

  const handleCadastrarLote = async () => {
    if (!textoLote.trim()) {
      setMensagem('Digite ao menos um médico para cadastrar!');
      setTipoMensagem('erro');
      setTimeout(() => setMensagem(''), 4000);
      return;
    }

    const linhas = textoLote.split('\n').filter((l) => l.trim() !== '');
    const novosMedicos: Array<{ nome: string; especialidade: string; crm: string; observacao: string }> = [];
    const erros: string[] = [];

    linhas.forEach((linha, index) => {
      const [nome, especialidade, crm, observacao] = linha.split(',').map((x) => x?.trim() || '');

      if (!nome || !especialidade) {
        erros.push(`Linha ${index + 1}: Nome e especialidade são obrigatórios`);
        return;
      }

      novosMedicos.push({
        nome: nome.toUpperCase(),
        especialidade: especialidade.toUpperCase(),
        crm: crm ? crm.toUpperCase() : '',
        observacao: observacao ? observacao.toUpperCase() : '',
      });
    });

    if (novosMedicos.length === 0) {
      setMensagem('Nenhum médico válido encontrado para cadastrar.');
      setTipoMensagem('erro');
      setTimeout(() => setMensagem(''), 4000);
      return;
    }

    try {
      const pessoasCriadas: Array<{ id: string; nome: string }> = [];

      for (const m of novosMedicos) {
        const { data: personData, error: personError } = await supabase
          .from('people')
          .insert({ nome: m.nome, email: null })
          .select('id, nome')
          .single();

        if (personError) {
          erros.push(`Erro ao criar pessoa ${m.nome}: ${personError.message}`);
          continue;
        }

        pessoasCriadas.push({ id: personData.id, nome: m.nome });
      }

      const medicosParaInserir = pessoasCriadas.map((p, idx) => {
        const m = novosMedicos[idx];
        return {
          person_id: p.id,
          crm: m.crm || null,
          crm_uf: '',
          ativo: true,
        };
      });

      const { error: medicoError } = await supabase.from('medical_professionals').insert(medicosParaInserir);

      if (medicoError) throw medicoError;

      window.dispatchEvent(new Event('dadosAtualizados'));

      setMensagem(`✅ Foram cadastrados ${pessoasCriadas.length} médicos com sucesso!`);
      setTipoMensagem('sucesso');
      setTextoLote('');
      setTimeout(() => setMensagem(''), 4000);
    } catch (err: any) {
      setMensagem('❌ Erro ao cadastrar lote: ' + err.message);
      setTipoMensagem('erro');
      setTimeout(() => setMensagem(''), 5000);
    }

    if (erros.length > 0) {
      setMensagem(erros.join('; '));
      setTipoMensagem('erro');
      setTimeout(() => setMensagem(''), 5000);
    }
  };

  const handleLimpar = () => {
    setTextoLote('');
    setMensagem('');
    setTipoMensagem('');
  };

  return (
    <div className="cadastro-lote-container">
      <h2>Cadastro de Médicos em Lote</h2>
      {mensagem && (
        <p className={`cadastro-lote-mensagem ${tipoMensagem === 'sucesso' ? 'cadastro-lote-mensagem-sucesso' : 'cadastro-lote-mensagem-erro'}`}>
          {mensagem}
        </p>
      )}

      <p>
        Digite os médicos no formato: <strong>Nome,Especialidade,CRM,Observação</strong>
      </p>
      <textarea
        className="cadastro-lote-textarea"
        rows="10"
        placeholder="Ex: Evandro,Clínico,12345,Observação"
        value={textoLote}
        onChange={(e) => setTextoLote(e.target.value)}
      />

      <div className="cadastro-lote-botoes-container">
        <button className="cadastro-lote-btn" onClick={handleCadastrarLote}>
          Cadastrar Lote
        </button>
        <button className="cadastro-lote-btn-limpar" onClick={handleLimpar}>
          Limpar
        </button>
        <button className="cadastro-lote-btn" onClick={() => navigate('/medicos')}>
          Voltar
        </button>
      </div>
    </div>
  );
}
