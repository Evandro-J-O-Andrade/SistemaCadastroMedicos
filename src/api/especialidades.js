// src/data/especialidades.js
import * as FaIcons from "react-icons/fa";

// Lista completa de especialidades
export const especialidades = [
  { id: 1, nome: "Clinica Médica", cadastros: 0, icone: "FaUserMd", cor: "#1E90FF" },
  { id: 2, nome: "Pediatria", cadastros: 0, icone: "FaBaby", cor: "#FF69B4" },
  { id: 3, nome: "Ginecologia e Obstetrícia", cadastros: 0, icone: "FaFemale", cor: "#FF6347" },
  { id: 4, nome: "Cardiologia", cadastros: 0, icone: "FaHeart", cor: "#FF0000" },
  { id: 5, nome: "Ortopedia e Traumatologia", cadastros: 0, icone: "FaBone", cor: "#8A2BE2" },
  { id: 6, nome: "Dermatologia", cadastros: 0, icone: "FaSun", cor: "#FFA500" },
  { id: 7, nome: "Psiquiatria", cadastros: 0, icone: "FaBrain", cor: "#9400D3" },
  { id: 8, nome: "Oftalmologia", cadastros: 0, icone: "FaEye", cor: "#00CED1" },
  { id: 9, nome: "Otorrinolaringologia", cadastros: 0, icone: "FaEar", cor: "#20B2AA" },
  { id: 10, nome: "Urologia", cadastros: 0, icone: "FaUser", cor: "#4682B4" },
  { id: 11, nome: "Anestesiologia", cadastros: 0, icone: "FaSyringe", cor: "#A52A2A" },
  { id: 12, nome: "Radiologia e Diagnóstico por Imagem", cadastros: 0, icone: "FaFileMedical", cor: "#708090" },
  { id: 13, nome: "Endocrinologia e Metabologia", cadastros: 0, icone: "FaChartLine", cor: "#DAA520" },
  { id: 14, nome: "Gastroenterologia", cadastros: 0, icone: "FaUtensils", cor: "#FF8C00" },
  { id: 15, nome: "Genética Médica", cadastros: 0, icone: "FaDna", cor: "#8B0000" },
  { id: 16, nome: "Geriatria", cadastros: 0, icone: "FaUserClock", cor: "#2E8B57" },
  { id: 17, nome: "Hematologia e Hemoterapia", cadastros: 0, icone: "FaTint", cor: "#B22222" },
  { id: 18, nome: "Homeopatia", cadastros: 0, icone: "FaLeaf", cor: "#006400" },
  { id: 19, nome: "Infectologia", cadastros: 0, icone: "FaVirus", cor: "#8B008B" },
  { id: 20, nome: "Mastologia", cadastros: 0, icone: "FaRibbon", cor: "#FF1493" },
  { id: 21, nome: "Medicina de Emergência", cadastros: 0, icone: "FaAmbulance", cor: "#DC143C" },
  { id: 22, nome: "Medicina de Família e Comunidade", cadastros: 0, icone: "FaUsers", cor: "#32CD32" },
  { id: 23, nome: "Medicina do Trabalho", cadastros: 0, icone: "FaHardHat", cor: "#FFD700" },
  { id: 24, nome: "Medicina Esportiva", cadastros: 0, icone: "FaRunning", cor: "#00FA9A" },
  { id: 25, nome: "Medicina Física e Reabilitação", cadastros: 0, icone: "FaDumbbell", cor: "#FF4500" },
  { id: 26, nome: "Medicina Intensiva", cadastros: 0, icone: "FaProcedures", cor: "#8B4513" },
  { id: 27, nome: "Medicina Legal e Perícia Médica", cadastros: 0, icone: "FaGavel", cor: "#708090" },
  { id: 28, nome: "Medicina Nuclear", cadastros: 0, icone: "FaRadiation", cor: "#DA70D6" },
  { id: 29, nome: "Medicina Preventiva e Social", cadastros: 0, icone: "FaShieldAlt", cor: "#00BFFF" },
  { id: 30, nome: "Nefrologia", cadastros: 0, icone: "FaTint", cor: "#20B2AA" },
  { id: 31, nome: "Neurologia", cadastros: 0, icone: "FaBrain", cor: "#4B0082" },
  { id: 32, nome: "Neurocirurgia", cadastros: 0, icone: "FaScalpel", cor: "#8B0000" },
  { id: 33, nome: "Nutrologia", cadastros: 0, icone: "FaAppleAlt", cor: "#228B22" },
  { id: 34, nome: "Oncologia Clínica", cadastros: 0, icone: "FaRibbon", cor: "#FF4500" },
  { id: 35, nome: "Patologia", cadastros: 0, icone: "FaMicroscope", cor: "#2F4F4F" },
  { id: 36, nome: "Patologia Clínica/Medicina Laboratorial", cadastros: 0, icone: "FaVials", cor: "#556B2F" },
  { id: 37, nome: "Pneumologia", cadastros: 0, icone: "FaLungs", cor: "#1E90FF" },
  { id: 38, nome: "Radioterapia", cadastros: 0, icone: "FaBolt", cor: "#FF8C00" },
  { id: 39, nome: "Reumatologia", cadastros: 0, icone: "FaHandHoldingMedical", cor: "#8B0000" },
  { id: 40, nome: "Acupuntura", cadastros: 0, icone: "FaStickyNote", cor: "#32CD32" },
  { id: 41, nome: "Dor", cadastros: 0, icone: "FaProcedures", cor: "#FF4500" },
  { id: 42, nome: "Cirurgia Geral", cadastros: 0, icone: "FaScalpel", cor: "#8B4513" },
  { id: 43, nome: "Cirurgia Plástica", cadastros: 0, icone: "FaMask", cor: "#FF1493" },
  { id: 44, nome: "Cirurgia Vascular", cadastros: 0, icone: "FaHeartbeat", cor: "#DC143C" },
  { id: 45, nome: "Cirurgia Pediátrica", cadastros: 0, icone: "FaBaby", cor: "#FF69B4" },
  { id: 46, nome: "Cirurgia Cardiovascular", cadastros: 0, icone: "FaHeart", cor: "#FF0000" },
  { id: 47, nome: "Cirurgia Bucomaxilofacial", cadastros: 0, icone: "FaTooth", cor: "#8B4513" },
  { id: 48, nome: "Cirurgia Torácica", cadastros: 0, icone: "FaProcedures", cor: "#A52A2A" },
  { id: 49, nome: "Coloproctologia", cadastros: 0, icone: "FaToilet", cor: "#556B2F" },
  { id: 50, nome: "Cirurgia de Cabeça e Pescoço", cadastros: 0, icone: "FaUser", cor: "#6A5ACD" },
  { id: 51, nome: "Cirurgia do Aparelho Digestivo", cadastros: 0, icone: "FaStomach", cor: "#FF8C00" },
  { id: 52, nome: "Cardiologia Intervencionista", cadastros: 0, icone: "FaHeart", cor: "#FF0000" },
  { id: 53, nome: "Cardiologia Pediátrica", cadastros: 0, icone: "FaHeart", cor: "#FF6347" },
  { id: 54, nome: "Dermatopatologia", cadastros: 0, icone: "FaSun", cor: "#FFA500" },
  { id: 55, nome: "Endocrinologia Pediátrica", cadastros: 0, icone: "FaBolt", cor: "#DAA520" },
  { id: 56, nome: "Gastroenterologia Pediátrica", cadastros: 0, icone: "FaUtensils", cor: "#FF8C00" },
  { id: 57, nome: "Hematologia Pediátrica", cadastros: 0, icone: "FaTint", cor: "#B22222" },
  { id: 58, nome: "Infectologia Pediátrica", cadastros: 0, icone: "FaVirus", cor: "#8B008B" },
  { id: 59, nome: "Nefrologia Pediátrica", cadastros: 0, icone: "FaTint", cor: "#20B2AA" },
  { id: 60, nome: "Neurologia Pediátrica", cadastros: 0, icone: "FaBrain", cor: "#4B0082" },
  { id: 61, nome: "Oncologia Pediátrica", cadastros: 0, icone: "FaRibbon", cor: "#FF4500" },
  { id: 62, nome: "Pneumologia Pediátrica", cadastros: 0, icone: "FaLungs", cor: "#1E90FF" },
  { id: 63, nome: "Reumatologia Pediátrica", cadastros: 0, icone: "FaHandHoldingMedical", cor: "#8B0000" },
  { id: 64, nome: "Cirurgia Cardiovascular Pediátrica", cadastros: 0, icone: "FaHeart", cor: "#FF0000" },
  { id: 65, nome: "Cirurgia Pediátrica", cadastros: 0, icone: "FaBaby", cor: "#FF69B4" },
  { id: 66, nome: "Cirurgia Torácica Pediátrica", cadastros: 0, icone: "FaProcedures", cor: "#A52A2A" },
  { id: 67, nome: "Cirurgia Vascular Pediátrica", cadastros: 0, icone: "FaHeartbeat", cor: "#DC143C" },
  { id: 68, nome: "Cirurgia Oncológica Pediátrica", cadastros: 0, icone: "FaRibbon", cor: "#FF4500" },
  { id: 69, nome: "Medicina de Cuidados Paliativos", cadastros: 0, icone: "FaHandsHelping", cor: "#2E8B57" },
  { id: 70, nome: "Medicina do Sono", cadastros: 0, icone: "FaBed", cor: "#1E90FF" },
  { id: 71, nome: "Medicina Integrativa", cadastros: 0, icone: "FaLeaf", cor: "#32CD32" },
  { id: 72, nome: "Medicina Aeroespacial", cadastros: 0, icone: "FaRocket", cor: "#8A2BE2" },
  { id: 73, nome: "Medicina de Viagem", cadastros: 0, icone: "FaPlane", cor: "#00CED1" },
  { id: 74, nome: "Medicina de Desastres", cadastros: 0, icone: "FaFireExtinguisher", cor: "#FF4500" },
  { id: 75, nome: "Medicina de Saúde Pública", cadastros: 0, icone: "FaHospital", cor: "#20B2AA" },
  { id: 76, nome: "Clinico", cadastros: 0, icone: "FaStethoscope", cor: "#1E90FF" },
];

// Sinônimos normalizados
const sinonimos = {
  "clinica medica": "Clinica Médica",
  "clinico": "Clinica Médica",
  "pediatria": "Pediatria",
  "ginecologia e obstetricia": "Ginecologia e Obstetrícia",
  "ginecologia": "Ginecologia e Obstetrícia",
  "obstetricia": "Ginecologia e Obstetrícia",
  "cardiologia": "Cardiologia",
  "cardiologia pediatrica": "Cardiologia Pediátrica",
  "cardiologia intervencionista": "Cardiologia Intervencionista",
  "ortopedia e traumatologia": "Ortopedia e Traumatologia",
  "dermatologia": "Dermatologia",
  "dermatopatologia": "Dermatopatologia",
  "psiquiatria": "Psiquiatria",
  "oftalmologia": "Oftalmologia",
  "otorrinolaringologia": "Otorrinolaringologia",
  "urologia": "Urologia",
  "anestesiologia": "Anestesiologia",
  "radiologia e diagnostico por imagem": "Radiologia e Diagnóstico por Imagem",
  "radiologia": "Radiologia e Diagnóstico por Imagem",
  "endocrinologia e metabologia": "Endocrinologia e Metabologia",
  "endocrinologia pediatrica": "Endocrinologia Pediátrica",
  "gastroenterologia": "Gastroenterologia",
  "gastroenterologia pediatrica": "Gastroenterologia Pediátrica",
  "genetica medica": "Genética Médica",
  "geriatria": "Geriatria",
  "hematologia e hemoterapia": "Hematologia e Hemoterapia",
  "hematologia pediatrica": "Hematologia Pediátrica",
  "homeopatia": "Homeopatia",
  "infectologia": "Infectologia",
  "infectologia pediatrica": "Infectologia Pediátrica",
  "mastologia": "Mastologia",
  "medicina de emergencia": "Medicina de Emergência",
  "medicina de emergencias": "Medicina de Emergência",
  "medicina de familia e comunidade": "Medicina de Família e Comunidade",
  "medicina do trabalho": "Medicina do Trabalho",
  "medicina esportiva": "Medicina Esportiva",
  "medicina fisica e reabilitacao": "Medicina Física e Reabilitação",
  "medicina intensiva": "Medicina Intensiva",
  "medicina legal e pericia medica": "Medicina Legal e Perícia Médica",
  "medicina nuclear": "Medicina Nuclear",
  "medicina preventiva e social": "Medicina Preventiva e Social",
  "nefrologia": "Nefrologia",
  "nefrologia pediatrica": "Nefrologia Pediátrica",
  "neurologia": "Neurologia",
  "neurologia pediatrica": "Neurologia Pediátrica",
  "neurocirurgia": "Neurocirurgia",
  "nutrologia": "Nutrologia",
  "oncologia clinica": "Oncologia Clínica",
  "oncologia pediatrica": "Oncologia Pediátrica",
  "patologia": "Patologia",
  "patologia clinica/medicina laboratorial": "Patologia Clínica/Medicina Laboratorial",
  "pneumologia": "Pneumologia",
  "pneumologia pediatrica": "Pneumologia Pediátrica",
  "radioterapia": "Radioterapia",
  "reumatologia": "Reumatologia",
  "reumatologia pediatrica": "Reumatologia Pediátrica",
  "acupuntura": "Acupuntura",
  "dor": "Dor",
  "cirurgia geral": "Cirurgia Geral",
  "cirurgia plastica": "Cirurgia Plástica",
  "cirurgia vascular": "Cirurgia Vascular",
  "cirurgia toracica": "Cirurgia Torácica",
  "cirurgia pediatrica": "Cirurgia Pediátrica",
  "cirurgia cardiovascular": "Cirurgia Cardiovascular",
  "cirurgia cardiovascular pediatrica": "Cirurgia Cardiovascular Pediátrica",
  "cirurgia bucomaxilofacial": "Cirurgia Bucomaxilofacial",
  "cirurgia toracica pediatrica": "Cirurgia Torácica Pediátrica",
  "cirurgia vascular pediatrica": "Cirurgia Vascular Pediátrica",
  "cirurgia oncologica pediatrica": "Cirurgia Oncológica Pediátrica",
  "coloproctologia": "Coloproctologia",
  "cirurgia de cabeca e pescoco": "Cirurgia de Cabeça e Pescoço",
  "cirurgia do aparelho digestivo": "Cirurgia do Aparelho Digestivo",
  "medicina de cuidados paliativos": "Medicina de Cuidados Paliativos",
  "medicina do sono": "Medicina do Sono",
  "medicina integrativa": "Medicina Integrativa",
  "medicina aeroespacial": "Medicina Aeroespacial",
  "medicina de viagem": "Medicina de Viagem",
  "medicina de desastres": "Medicina de Desastres",
  "medicina de saude publica": "Medicina de Saúde Pública",
};

// Normaliza texto (remove acentos e espaços, converte para lowercase)
export function normalizar(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Retorna { nome, icone, cor } de uma especialidade
export function getEspecialidadeInfo(nome) {
  if (!nome) return { nome: "Desconhecido", icone: FaIcons.FaQuestion, cor: "#999999" };

  const nomeNormalizado = normalizar(nome);
  const nomeOficial = sinonimos[nomeNormalizado] || nome;

  const esp = especialidades.find((e) => normalizar(e.nome) === normalizar(nomeOficial));
  if (esp) {
    const IconComponent = FaIcons[esp.icone] || FaIcons.FaQuestion;
    return { nome: esp.nome, icone: IconComponent, cor: esp.cor };
  }

  const aproximado = especialidades.find((e) => normalizar(e.nome).startsWith(nomeNormalizado));
  if (aproximado) {
    const IconComponent = FaIcons[aproximado.icone] || FaIcons.FaQuestion;
    return { nome: aproximado.nome, icone: IconComponent, cor: aproximado.cor };
  }

  return { nome: nomeOficial, icone: FaIcons.FaQuestion, cor: "#999999" };
}

// Ordena especialidades pela quantidade de cadastros
export function ordenarEspecialidades(lista) {
  return [...lista].sort(
    (a, b) => b.cadastros - a.cadastros || a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
  );
}
