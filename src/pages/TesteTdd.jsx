import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Filtros from "../Filtros";

// =========================================================================
// 🛑 PASSO ESSENCIAL: Mockar o MÓDULO DE STORAGE para isolar o teste
// =========================================================================
import * as StorageModule from "../../utils/storagePlantao";

// Mocks de Gráficos (mantidos)
jest.mock("../GraficoBarra", () => () => <div data-testid="grafico-barra" />);
jest.mock("../GraficoLinha", () => () => <div data-testid="grafico-linha" />);
jest.mock("../GraficoPizza", () => () => <div data-testid="grafico-pizza" />);
jest.mock("../GraficoArea", () => () => <div data-testid="grafico-area" />);

// Mock especialidades (mantidos)
jest.mock("../../api/especialidades.js", () => ({
  __esModule: true,
  default: [],
  getEspecialidadeInfo: (n) => ({ cor: "#000000" }),
}));

// Mockamos as funções do módulo
const mockGetMedicos = jest.spyOn(StorageModule, 'getMedicosFromStorage');
const mockGetPlantao = jest.spyOn(StorageModule, 'getPlantaoFromStorage');


// Limpar mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
});

// Nota: A lógica de teste de "Sem dados" agora foca no retorno das funções
test("exibe mensagem 'Sem dados' quando não há plantão (Mocked Storage)", async () => {
    
    // Configura o mock para retornar arrays vazios (simulando falta de dados)
    mockGetMedicos.mockReturnValue([]);
    mockGetPlantao.mockReturnValue([]);

    render(<Filtros />);
    
    // Espera o carregamento sumir
    await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument(), { timeout: 3000 });
    
    // Verifica a mensagem final de 'sem dados'
    expect(screen.getByText(/Sem dados para exibir/i)).toBeInTheDocument();
    
    // Confirma que as funções de storage foram chamadas
    expect(mockGetMedicos).toHaveBeenCalled();
    expect(mockGetPlantao).toHaveBeenCalled();
});


// Nota: A lógica de teste de "Com dados" agora foca no retorno das funções
test("exibe total quando há plantão e médicos (Mocked Storage)", async () => {
    
    // Os dados de plantão DEVEM estar no formato LIMPO/CONSOLIDADO 
    // que a função getPlantaoFromStorage deveria retornar.
    const medicosMock = [{ id: 1, nome: "Dr Teste", crm: "CRM123", especialidade: "Cardiologia" }];
    
    // Para simplificar o teste de "Filtros", vamos mockar a saída já agrupada,
    // garantindo que agruparPorMedicoDiaEsp retorne algo que alimente o componente.
    // Na prática TDD, você deveria testar a função de agrupamento separadamente.
    const linhasAgrupadasMock = [{ 
        data: "2025-10-14", 
        periodo: "MANHÃ", // Campo 'periodo' é importante
        medico: "Dr Teste", // Campo 'medico' é importante
        crm: "CRM123", 
        especialidade: "Cardiologia", 
        atendimentos: 2 // Campo 'atendimentos' é importante
    }];

    // Configura o mock para retornar os dados de teste
    mockGetMedicos.mockReturnValue(medicosMock);
    // Aqui estamos mockando que plantaoArr (vindo do storage) JÁ ESTÁ LIMPO e vai para a função de AGRUPAMENTO
    mockGetPlantao.mockReturnValue(linhasAgrupadasMock); 

    render(<Filtros />);
    
    // Espera o carregamento sumir
    await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument(), { timeout: 3000 });
    
    // Verifica se os gráficos foram renderizados (indicando sucesso no carregamento/agrupamento)
    expect(screen.getByTestId("grafico-barra")).toBeInTheDocument(); 
    
    // Verifica se a tabela tem a linha de dados
    expect(screen.getByText(/Dr Teste/i)).toBeInTheDocument();
    
    // Verifica se o total foi calculado corretamente (Total de Atendimentos: 2)
    expect(screen.getByText(/Total de Atendimentos:/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    
    // Confirma que as funções de storage foram chamadas
    expect(mockGetMedicos).toHaveBeenCalled();
    expect(mockGetPlantao).toHaveBeenCalled();
});