import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { listarMedicos, criarMedico, pesquisarMedicos } from "../api/api"; // importa funções da api
import "./Medicos.css";

function CadastroMedico() {
  const [medicos, setMedicos] = useState([]);
  const [form, setForm] = useState({
    nome: "",
    especialidade: "",
    crm: "",
    observacao: "",
  });

  // ==========================
  // Carrega médicos do backend ao iniciar
  // ==========================
  useEffect(() => {
    async function carregar() {
      const dados = await listarMedicos();
      setMedicos(dados);
    }
    carregar();
  }, []);

  // ==========================
  // Atualiza os campos do formulário
  // ==========================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ==========================
  // Buscar CRM automaticamente
  // ==========================
  const buscarCRM = async (nome) => {
    if (!nome) return;

    const dados = await pesquisarMedicos(nome);
    if (dados.length > 0 && dados[0].crm) {
      setForm((prev) => ({ ...prev, crm: dados[0].crm }));
    } else {
      setForm((prev) => ({ ...prev, crm: "" }));
    }
  };

  // ==========================
  // Enviar formulário
  // ==========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.especialidade) {
      alert("Nome e especialidade são obrigatórios!");
      return;
    }

    // Salva no backend
    const novoMedico = await criarMedico(form.nome, form.crm);

    // Atualiza lista local
    setMedicos([...medicos, { ...form, id: novoMedico.id }]);
    setForm({ nome: "", especialidade: "", crm: "", observacao: "" });
  };

  // ==========================
  // Gerar PDF
  // ==========================
  const gerarRelatorio = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório de Médicos", 10, 10);

    let y = 20;
    medicos.forEach((m, index) => {
      doc.text(
        `${index + 1} - ${m.nome} | ${m.especialidade} | CRM: ${m.crm} | Obs: ${m.observacao}`,
        10,
        y
      );
      y += 10;
    });

    doc.save("relatorio_medicos.pdf");
  };

  return (
    <div className="cadastro-container">
      <h2>Cadastro de Médicos</h2>

      <form onSubmit={handleSubmit} className="form-medico">
        <input
          type="text"
          name="nome"
          placeholder="Nome do médico"
          value={form.nome}
          onChange={handleChange}
          onBlur={() => buscarCRM(form.nome)}
        />
        <input
          type="text"
          name="especialidade"
          placeholder="Especialidade"
          value={form.especialidade}
          onChange={handleChange}
        />
        <input
          type="text"
          name="crm"
          placeholder="CRM"
          value={form.crm}
          onChange={handleChange}
        />
        <input
          type="text"
          name="observacao"
          placeholder="Observação"
          value={form.observacao}
          onChange={handleChange}
        />
        <button type="submit" className="btn">Cadastrar</button>
      </form>

      <h3>Médicos Cadastrados</h3>
      <div className="tabela-container">
        <table className="tabela-medicos">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Especialidade</th>
              <th>CRM</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            {medicos.map((m, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{m.nome}</td>
                <td>{m.especialidade}</td>
                <td>{m.crm}</td>
                <td>{m.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={gerarRelatorio} className="btn btn-pdf">
        Gerar Relatório PDF
      </button>
    </div>
  );
}

export default CadastroMedico;
