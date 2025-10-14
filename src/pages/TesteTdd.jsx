import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Filtros from "../Filtros";

// mocks de gráficos (se os componentes reais não existirem no ambiente de teste)
jest.mock("../GraficoBarra", () => () => <div data-testid="grafico-barra" />);
jest.mock("../GraficoLinha", () => () => <div data-testid="grafico-linha" />);
jest.mock("../GraficoPizza", () => () => <div data-testid="grafico-pizza" />);
jest.mock("../GraficoArea", () => () => <div data-testid="grafico-area" />);

// mock especialidades (caso import real seja diferente)
jest.mock("../../api/especialidades.js", () => ({
  __esModule: true,
  default: [],
  getEspecialidadeInfo: (n) => ({ cor: "#000000" }),
}));

beforeEach(() => {
  localStorage.clear();
});

test("exibe mensagem 'Sem dados' quando não há plantão", async () => {
  localStorage.removeItem("medicos");
  localStorage.removeItem("plantaoData");
  render(<Filtros />);
  await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument(), { timeout: 3000 });
  expect(screen.getByText(/Sem dados para exibir/i)).toBeInTheDocument();
});

test("exibe total quando há plantão e médicos no localStorage", async () => {
  const medicos = [{ id: 1, nome: "Dr Teste", crm: "CRM123", especialidade: "Cardiologia" }];
  const plantao = [{ data: "2025-10-14", hora: "09:00", quantidade: 2, nome: "Dr Teste", crm: "CRM123", especialidade: "Cardiologia" }];
  localStorage.setItem("medicos", JSON.stringify(medicos));
  localStorage.setItem("plantaoData", JSON.stringify(plantao));
  render(<Filtros />);
  await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument(), { timeout: 3000 });
  expect(screen.getByText(/Total/i)).toBeInTheDocument();
});