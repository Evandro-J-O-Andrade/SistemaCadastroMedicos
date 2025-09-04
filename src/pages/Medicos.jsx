import React, { useState } from "react";
import { jsPDF } from "jspdf";
import "./Medicos.css";

function CadastroMedico() {
  const [medicos, setMedicos] = useState([
    { nome: "Dr. João Silva", especialidade: "Cardiologia", crm: "12345", observacao: "" },
    { nome: "Dra. Maria Souza", especialidade: "Pediatria", crm: "67890", observacao: "Plantão noturno" },
    { nome: "Dr. Carlos Pereira", especialidade: "Ortopedia", crm: "11223", observacao: "" },  
    { nome: "Dra. Ana Lima", especialidade: "Dermatologia", crm: "44556", observacao: "Atende convênios" },
    { nome: "Dr. Pedro Costa", especialidade: "Neurologia", crm: "77889", observacao: "" },
    { nome: "Dra. Luiza Fernandes", especialidade: "Ginecologia", crm: "99001", observacao: "Atende particular" },
    { nome: "Dr. Rafael Gomes", especialidade: "Psiquiatria", crm: "22334", observacao: "" },
  ]);

  const [form, setForm] = useState({
    nome: "",
    especialidade: "",
    crm: "",
    observacao: "",
  });

  // Atualiza os campos do formulário
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Função para buscar CRM automaticamente no backend
  const buscarCRM = async (nome) => {
    if (!nome) return;

    try {
      const response = await fetch(`http://localhost:5000/buscar-crm?nome=${encodeURIComponent(nome)}`);
      const data = await response.json();

      // Se encontrou algum CRM, preenche o campo
      if (Array.isArray(data) && data.length > 0 && data[0].crm) {
        setForm((prev) => ({ ...prev, crm: data[0].crm }));
      } else {
        setForm((prev) => ({ ...prev, crm: "" }));
        console.log("CRM não encontrado para:", nome);
      }
    } catch (err) {
      console.error("Erro ao buscar CRM:", err);
    }
  };

  // Enviar formulário
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nome || !form.especialidade) {
      alert("Nome e especialidade são obrigatórios!");
      return;
    }

    setMedicos([...medicos, form]);
    setForm({ nome: "", especialidade: "", crm: "", observacao: "" });
  };

  // Gerar PDF
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
          onBlur={() => buscarCRM(form.nome)} // 🔥 busca CRM ao sair do campo
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
