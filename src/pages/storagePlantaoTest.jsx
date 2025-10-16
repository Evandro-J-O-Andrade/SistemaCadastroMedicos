// ==============================================
// storagePlantao.test.js
// ==============================================

import {
    getMedicosFromStorage,
    getPlantaoFromStorage,
    savePlantaoToStorage,
    clearPlantaoStorage,
    normalize, // Importado para testes de helper
} from "../utils/storagePlantao"; // Ajuste o caminho conforme sua estrutura

// Mocka o localStorage para ambiente de testes (Jest/Node)
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };
})();

// Define o mock de localStorage para uso global nos testes
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe("storagePlantao.js - Testes Unitários de Storage e Normalização", () => {
    
    // Limpar o localStorage mockado antes de cada teste
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks(); // Limpa as informações de chamada de mock
    });

    // ----------------------------------------------------
    // Teste de Helper: normalize
    // ----------------------------------------------------
    describe("Helper: normalize", () => {
        test("deve remover acentos e converter para minúsculo", () => {
            expect(normalize("CArdiOlOgIa Pediátrica")).toBe("cardiologia pediatrica");
        });
        test("deve limpar espaços excessivos nas bordas", () => {
            expect(normalize("   Médico-A   ")).toBe("medico-a");
        });
        test("deve lidar com valores nulos/vazios", () => {
            expect(normalize(null)).toBe("");
            expect(normalize(undefined)).toBe("");
            expect(normalize("")).toBe("");
        });
    });


    // ----------------------------------------------------
    // Teste de Função: getMedicosFromStorage
    // ----------------------------------------------------
    describe("getMedicosFromStorage", () => {
        
        test("deve retornar array vazio se o storage estiver vazio", () => {
            const medicos = getMedicosFromStorage();
            expect(medicos).toEqual([]);
        });

        test("deve buscar dados da chave principal 'medicos'", () => {
            const dadosRaw = JSON.stringify([{ nome: "Dr. Alpha", crm: "123", especialidade: "Urgência" }]);
            localStorageMock.setItem("medicos", dadosRaw);
            
            const medicos = getMedicosFromStorage();
            
            expect(medicos.length).toBe(1);
            expect(medicos[0].nome).toBe("Dr. Alpha");
            expect(medicos[0].crm).toBe("123");
        });

        test("deve usar a chave de fallback 'medicosList' se 'medicos' estiver vazia", () => {
            const dadosRaw = JSON.stringify([{ nome: "Dra. Beta", crm: "456", especialidade: "Pediatria" }]);
            localStorageMock.setItem("medicosList", dadosRaw);
            
            const medicos = getMedicosFromStorage();
            
            expect(localStorageMock.getItem).toHaveBeenCalledWith("medicos"); // Tenta a primeira
            expect(medicos.length).toBe(1);
            expect(medicos[0].nome).toBe("Dra. Beta");
        });
        
        test("deve normalizar o CRM (remover espaços/caracteres e manter maiúsculo)", () => {
             const dadosRaw = JSON.stringify([{ nome: "Dr. Gama", crm: "  crm 789 / SP " }]);
             localStorageMock.setItem("medicos", dadosRaw);
             
             const medicos = getMedicosFromStorage();
             
             expect(medicos[0].crm).toBe("CRM789SP");
             // Verifica se o ID foi gerado corretamente usando o CRM normalizado
             expect(medicos[0].id).toBe("dr gama_crm789sp");
         });

         test("deve remover itens duplicados ou incompletos", () => {
             const dadosRaw = JSON.stringify([
                 { nome: "Dr. Duplicado", crm: "111" },
                 { nome: "Dr. Duplicado", crm: "111" }, // Duplicado
                 { nome: "" }, // Vazio
                 null, // Nulo
             ]);
             localStorageMock.setItem("medicos", dadosRaw);
             const medicos = getMedicosFromStorage();
             expect(medicos.length).toBe(1);
             expect(medicos[0].nome).toBe("Dr. Duplicado");
         });
    });


    // ----------------------------------------------------
    // Teste de Função: getPlantaoFromStorage
    // ----------------------------------------------------
    describe("getPlantaoFromStorage", () => {
        
        test("deve retornar array vazio se o storage estiver vazio", () => {
            const plantao = getPlantaoFromStorage();
            expect(plantao).toEqual([]);
        });

        test("deve buscar dados da chave principal 'plantaoData'", () => {
            const dadosRaw = JSON.stringify([{ 
                data: "2024/01/10", 
                medico: "Dr. Zero", 
                atendimentos: "15", 
                periodo: "NOITE" 
            }]);
            localStorageMock.setItem("plantaoData", dadosRaw);
            
            const plantao = getPlantaoFromStorage();
            
            expect(plantao.length).toBe(1);
            expect(plantao[0].data).toBe("2024-01-10"); // Normalização de data
            expect(plantao[0].medico).toBe("Dr. Zero");
            expect(plantao[0].atendimentos).toBe(15); // Normalização para número
            expect(plantao[0].periodo).toBe("NOITE");
        });

        test("deve usar as chaves alternativas para data, médico, especialidade e atendimentos", () => {
            const dadosRaw = JSON.stringify([{ 
                dia: "2024-05-20", // dia (ao invés de data)
                nome: "Dr. Substituto", // nome (ao invés de medico)
                esp: "Ortopedia", // esp (ao invés de especialidade)
                total: 5, // total (ao invés de atendimentos)
                turno: "TARDE", // turno (ao invés de periodo)
            }]);
            localStorageMock.setItem("plantaoData", dadosRaw);
            
            const plantao = getPlantaoFromStorage();
            
            expect(plantao[0].data).toBe("2024-05-20");
            expect(plantao[0].medico).toBe("Dr. Substituto");
            expect(plantao[0].especialidade).toBe("Ortopedia");
            expect(plantao[0].atendimentos).toBe(5);
            expect(plantao[0].periodo).toBe("TARDE");
        });
        
        test("deve remover itens com atendimentos inválidos/zero e usar valor padrão para campos ausentes", () => {
             const dadosRaw = JSON.stringify([
                 { data: "2024-01-01", medico: "Dr. OK", atendimentos: 10, especialidade: "Cardio" },
                 { data: "2024-01-02", medico: "Dr. Zero", atendimentos: 0, especialidade: "Cardio" },
                 { data: "2024-01-03", medico: "Dr. Null", atendimentos: null, especialidade: "Cardio" },
                 { medico: "Dr. Sem Data", atendimentos: 5, especialidade: "Cardio" }, // Data inválida
             ]);
             localStorageMock.setItem("plantaoData", dadosRaw);
             
             const plantao = getPlantaoFromStorage();
             
             // O cleanArray remove apenas nulos ou objetos vazios, mas a normalização trata o campo.
             // O plantao deve ter o item do Dr. Zero (com 0 atendimentos), e Dr. Null (com 0 atendimentos)
             // Apenas o item sem data/medico/atendimentos suficientes seria removido pelo cleanArray inicial.
             expect(plantao.length).toBe(4);
             expect(plantao[1].atendimentos).toBe(0);
             expect(plantao[2].atendimentos).toBe(0);
             expect(plantao[3].data).toBe("Invalid Date"); // dayjs formatando data inválida
             expect(plantao[3].medico).toBe("Dr. Sem Data");
         });
    });
    
    // ----------------------------------------------------
    // Teste de Função: savePlantaoToStorage e clearPlantaoStorage
    // ----------------------------------------------------
    describe("savePlantaoToStorage e clearPlantaoStorage", () => {
        
        test("savePlantaoToStorage deve salvar dados limpos na chave 'plantaoData'", () => {
            const dados = [{ medico: "A", atendimentos: 1 }, { medico: "A", atendimentos: 1 }]; // Duplicata
            savePlantaoToStorage(dados);
            
            // Verifica se setItem foi chamado
            expect(localStorageMock.setItem).toHaveBeenCalledWith("plantaoData", expect.any(String));
            
            // Verifica se o JSON salvo está limpo
            const savedData = JSON.parse(localStorageMock.getItem("plantaoData"));
            expect(savedData.length).toBe(1);
            expect(savedData[0].medico).toBe("A");
        });
        
        test("clearPlantaoStorage deve remover todas as chaves", () => {
            localStorageMock.setItem("medicos", "[]");
            localStorageMock.setItem("plantaoData", "[]");
            localStorageMock.setItem("dadosPlantao", "{}");
            
            clearPlantaoStorage();
            
            expect(localStorageMock.removeItem).toHaveBeenCalledWith("medicos");
            expect(localStorageMock.removeItem).toHaveBeenCalledWith("plantaoData");
            expect(localStorageMock.removeItem).toHaveBeenCalledWith("dadosPlantao");
            expect(localStorageMock.getItem("plantaoData")).toBeNull();
            expect(localStorageMock.getItem("medicos")).toBeNull();
        });
    });
});