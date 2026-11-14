// src/api/especialidades.ts
// Catálogo de especialidades médicas com sinônimos, CBO, cores e ícones
// Este é o catálogo oficial do Gestão Médica Alpha (76 entradas)

import * as FaIcons from 'react-icons/fa';

export interface Especialidade {
  id: number;
  nome: string;
  cadastros?: number;
  icone: keyof typeof FaIcons | React.ComponentType<any>;
  cor: string;
  codigo_cbo?: string;
  codigo_sigtap?: string;
  ativo?: boolean;
  tenant_id?: string | null;
}

export interface EspecialidadeInfo {
  nome: string;
  icone: React.ComponentType<any> | string;
  cor: string;
  codigo_cbo?: string;
}

export function normalizar(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Lista completa de especialidades (76 entradas do sistema legado)
export const especialidades: Especialidade[] = [
  { id: 1, nome: 'Clinica Médica', cadastros: 0, icone: 'FaUserMd', cor: '#1E90FF', codigo_cbo: '2251' },
  { id: 2, nome: 'Pediatria', cadastros: 0, icone: 'FaBaby', cor: '#FF69B4', codigo_cbo: '2252' },
  { id: 3, nome: 'Ginecologia e Obstetrícia', cadastros: 0, icone: 'FaFemale', cor: '#FF6347', codigo_cbo: '2253' },
  { id: 4, nome: 'Cardiologia', cadastros: 0, icone: 'FaHeart', cor: '#FF0000', codigo_cbo: '2254' },
  { id: 5, nome: 'Ortopedia e Traumatologia', cadastros: 0, icone: 'FaBone', cor: '#8A2BE2', codigo_cbo: '2256' },
  { id: 6, nome: 'Dermatologia', cadastros: 0, icone: 'FaSun', cor: '#FFA500', codigo_cbo: '2257' },
  { id: 7, nome: 'Psiquiatria', cadastros: 0, icone: 'FaBrain', cor: '#9400D3', codigo_cbo: '2258' },
  { id: 8, nome: 'Oftalmologia', cadastros: 0, icone: 'FaEye', cor: '#00CED1', codigo_cbo: '2261' },
  { id: 9, nome: 'Otorrinolaringologia', cadastros: 0, icone: 'FaUserMd', cor: '#20B2AA', codigo_cbo: '2262' },
  { id: 10, nome: 'Urologia', cadastros: 0, icone: 'FaUser', cor: '#4682B4', codigo_cbo: '2263' },
  { id: 11, nome: 'Anestesiologia', cadastros: 0, icone: 'FaSyringe', cor: '#A52A2A', codigo_cbo: '2264' },
  { id: 12, nome: 'Radiologia e Diagnóstico por Imagem', cadastros: 0, icone: 'FaFileMedical', cor: '#708090', codigo_cbo: '2265' },
  { id: 13, nome: 'Endocrinologia e Metabologia', cadastros: 0, icone: 'FaChartLine', cor: '#DAA520', codigo_cbo: '2266' },
  { id: 14, nome: 'Gastroenterologia', cadastros: 0, icone: 'FaUtensils', cor: '#FF8C00', codigo_cbo: '2267' },
  { id: 15, nome: 'Genética Médica', cadastros: 0, icone: 'FaDna', cor: '#8B0000', codigo_cbo: '2268' },
  { id: 16, nome: 'Geriatria', cadastros: 0, icone: 'FaUserClock', cor: '#2E8B57', codigo_cbo: '2269' },
  { id: 17, nome: 'Hematologia e Hemoterapia', cadastros: 0, icone: 'FaTint', cor: '#B22222', codigo_cbo: '2270' },
  { id: 18, nome: 'Homeopatia', cadastros: 0, icone: 'FaLeaf', cor: '#006400', codigo_cbo: '2271' },
  { id: 19, nome: 'Infectologia', cadastros: 0, icone: 'FaVirus', cor: '#8B008B', codigo_cbo: '2272' },
  { id: 20, nome: 'Mastologia', cadastros: 0, icone: 'FaRibbon', cor: '#FF1493', codigo_cbo: '2273' },
  { id: 21, nome: 'Medicina de Emergência', cadastros: 0, icone: 'FaAmbulance', cor: '#DC143C', codigo_cbo: '2274' },
  { id: 22, nome: 'Medicina de Família e Comunidade', cadastros: 0, icone: 'FaUsers', cor: '#32CD32', codigo_cbo: '2275' },
  { id: 23, nome: 'Medicina do Trabalho', cadastros: 0, icone: 'FaHardHat', cor: '#FFD700', codigo_cbo: '2276' },
  { id: 24, nome: 'Medicina Esportiva', cadastros: 0, icone: 'FaRunning', cor: '#00FA9A', codigo_cbo: '2277' },
  { id: 25, nome: 'Medicina Física e Reabilitação', cadastros: 0, icone: 'FaDumbbell', cor: '#FF4500', codigo_cbo: '2278' },
  { id: 26, nome: 'Medicina Intensiva', cadastros: 0, icone: 'FaProcedures', cor: '#8B4513', codigo_cbo: '2279' },
  { id: 27, nome: 'Medicina Legal e Perícia Médica', cadastros: 0, icone: 'FaGavel', cor: '#708090', codigo_cbo: '2280' },
  { id: 28, nome: 'Medicina Nuclear', cadastros: 0, icone: 'FaRadiation', cor: '#DA70D6', codigo_cbo: '2281' },
  { id: 29, nome: 'Medicina Preventiva e Social', cadastros: 0, icone: 'FaShieldAlt', cor: '#00BFFF', codigo_cbo: '2282' },
  { id: 30, nome: 'Nefrologia', cadastros: 0, icone: 'FaTint', cor: '#20B2AA', codigo_cbo: '2283' },
  { id: 31, nome: 'Neurologia', cadastros: 0, icone: 'FaBrain', cor: '#4B0082', codigo_cbo: '2284' },
  { id: 32, nome: 'Neurocirurgia', cadastros: 0, icone: 'FaScalpel', cor: '#8B0000', codigo_cbo: '2285' },
  { id: 33, nome: 'Nutrologia', cadastros: 0, icone: 'FaAppleAlt', cor: '#228B22', codigo_cbo: '2286' },
  { id: 34, nome: 'Oncologia Clínica', cadastros: 0, icone: 'FaRibbon', cor: '#FF4500', codigo_cbo: '2287' },
  { id: 35, nome: 'Patologia', cadastros: 0, icone: 'FaMicroscope', cor: '#2F4F4F', codigo_cbo: '2288' },
  { id: 36, nome: 'Patologia Clínica/Medicina Laboratorial', cadastros: 0, icone: 'FaVials', cor: '#556B2F', codigo_cbo: '2289' },
  { id: 37, nome: 'Pneumologia', cadastros: 0, icone: 'FaLungs', cor: '#1E90FF', codigo_cbo: '2290' },
  { id: 38, nome: 'Radioterapia', cadastros: 0, icone: 'FaBolt', cor: '#FF8C00', codigo_cbo: '2291' },
  { id: 39, nome: 'Reumatologia', cadastros: 0, icone: 'FaHandHoldingMedical', cor: '#8B0000', codigo_cbo: '2292' },
  { id: 40, nome: 'Acupuntura', cadastros: 0, icone: 'FaStickyNote', cor: '#32CD32', codigo_cbo: '2293' },
  { id: 41, nome: 'Dor', cadastros: 0, icone: 'FaProcedures', cor: '#FF4500', codigo_cbo: '2294' },
  { id: 42, nome: 'Cirurgia Geral', cadastros: 0, icone: 'FaScalpel', cor: '#8B4513', codigo_cbo: '2301' },
  { id: 43, nome: 'Cirurgia Plástica', cadastros: 0, icone: 'FaMask', cor: '#FF1493', codigo_cbo: '2302' },
  { id: 44, nome: 'Cirurgia Vascular', cadastros: 0, icone: 'FaHeartbeat', cor: '#DC143C', codigo_cbo: '2303' },
  { id: 45, nome: 'Cirurgia Pediátrica', cadastros: 0, icone: 'FaBaby', cor: '#FF69B4', codigo_cbo: '2304' },
  { id: 46, nome: 'Cirurgia Cardiovascular', cadastros: 0, icone: 'FaHeart', cor: '#FF0000', codigo_cbo: '2305' },
  { id: 47, nome: 'Cirurgia Bucomaxilofacial', cadastros: 0, icone: 'FaTooth', cor: '#8B4513', codigo_cbo: '2306' },
  { id: 48, nome: 'Cirurgia Torácica', cadastros: 0, icone: 'FaProcedures', cor: '#A52A2A', codigo_cbo: '2307' },
  { id: 49, nome: 'Coloproctologia', cadastros: 0, icone: 'FaToilet', cor: '#556B2F', codigo_cbo: '2308' },
  { id: 50, nome: 'Cirurgia de Cabeça e Pescoço', cadastros: 0, icone: 'FaUser', cor: '#6A5ACD', codigo_cbo: '2309' },
  { id: 51, nome: 'Cirurgia do Aparelho Digestivo', cadastros: 0, icone: 'FaStomach', cor: '#FF8C00', codigo_cbo: '2310' },
  { id: 52, nome: 'Cardiologia Intervencionista', cadastros: 0, icone: 'FaHeart', cor: '#FF0000', codigo_cbo: '2311' },
  { id: 53, nome: 'Cardiologia Pediátrica', cadastros: 0, icone: 'FaHeart', cor: '#FF6347', codigo_cbo: '2312' },
  { id: 54, nome: 'Dermatopatologia', cadastros: 0, icone: 'FaSun', cor: '#FFA500', codigo_cbo: '2313' },
  { id: 55, nome: 'Endocrinologia Pediátrica', cadastros: 0, icone: 'FaBolt', cor: '#DAA520', codigo_cbo: '2314' },
  { id: 56, nome: 'Gastroenterologia Pediátrica', cadastros: 0, icone: 'FaUtensils', cor: '#FF8C00', codigo_cbo: '2315' },
  { id: 57, nome: 'Hematologia Pediátrica', cadastros: 0, icone: 'FaTint', cor: '#B22222', codigo_cbo: '2316' },
  { id: 58, nome: 'Infectologia Pediátrica', cadastros: 0, icone: 'FaVirus', cor: '#8B008B', codigo_cbo: '2317' },
  { id: 59, nome: 'Nefrologia Pediátrica', cadastros: 0, icone: 'FaTint', cor: '#20B2AA', codigo_cbo: '2318' },
  { id: 60, nome: 'Neurologia Pediátrica', cadastros: 0, icone: 'FaBrain', cor: '#4B0082', codigo_cbo: '2319' },
  { id: 61, nome: 'Oncologia Pediátrica', cadastros: 0, icone: 'FaRibbon', cor: '#FF4500', codigo_cbo: '2320' },
  { id: 62, nome: 'Pneumologia Pediátrica', cadastros: 0, icone: 'FaLungs', cor: '#1E90FF', codigo_cbo: '2321' },
  { id: 63, nome: 'Reumatologia Pediátrica', cadastros: 0, icone: 'FaHandHoldingMedical', cor: '#8B0000', codigo_cbo: '2322' },
  { id: 64, nome: 'Cirurgia Cardiovascular Pediátrica', cadastros: 0, icone: 'FaHeart', cor: '#FF0000', codigo_cbo: '2323' },
  { id: 65, nome: 'Cirurgia Torácica Pediátrica', cadastros: 0, icone: 'FaProcedures', cor: '#A52A2A', codigo_cbo: '2324' },
  { id: 66, nome: 'Cirurgia Vascular Pediátrica', cadastros: 0, icone: 'FaHeartbeat', cor: '#DC143C', codigo_cbo: '2325' },
  { id: 67, nome: 'Cirurgia Oncológica Pediátrica', cadastros: 0, icone: 'FaRibbon', cor: '#FF4500', codigo_cbo: '2326' },
  { id: 68, nome: 'Medicina de Cuidados Paliativos', cadastros: 0, icone: 'FaHandsHelping', cor: '#2E8B57', codigo_cbo: '2327' },
  { id: 69, nome: 'Medicina do Sono', cadastros: 0, icone: 'FaBed', cor: '#1E90FF', codigo_cbo: '2328' },
  { id: 70, nome: 'Medicina Integrativa', cadastros: 0, icone: 'FaLeaf', cor: '#32CD32', codigo_cbo: '2329' },
  { id: 71, nome: 'Medicina Aeroespacial', cadastros: 0, icone: 'FaRocket', cor: '#8A2BE2', codigo_cbo: '2330' },
  { id: 72, nome: 'Medicina de Viagem', cadastros: 0, icone: 'FaPlane', cor: '#00CED1', codigo_cbo: '2331' },
  { id: 73, nome: 'Medicina de Desastres', cadastros: 0, icone: 'FaFireExtinguisher', cor: '#FF4500', codigo_cbo: '2332' },
  { id: 74, nome: 'Medicina de Saúde Pública', cadastros: 0, icone: 'FaHospital', cor: '#20B2AA', codigo_cbo: '2333' },
  { id: 75, nome: 'Clinico', cadastros: 0, icone: 'FaStethoscope', cor: '#1E90FF', codigo_cbo: '2250' },
  { id: 76, nome: 'Nutricionista', cadastros: 0, icone: 'FaLeaf', cor: '#32CD32', codigo_cbo: '2340' },
];

// Sinônimos para busca flexível
export const sinonimos: Record<string, string> = {};

especialidades.forEach((esp) => {
  const nomeNorm = normalizar(esp.nome);
  sinonimos[nomeNorm] = esp.nome;
  if (nomeNorm.endsWith('a')) sinonimos[nomeNorm.slice(0, -1) + 'o'] = esp.nome;
  if (nomeNorm.endsWith('o')) sinonimos[nomeNorm.slice(0, -1) + 'a'] = esp.nome;
});

export const sinManuais: Record<string, string> = {
  'clinica medica': 'Clinica Médica',
  'clinico': 'Clinica Médica',
  'clinica': 'Clinica Médica',
  'clinico medico': 'Clinica Médica',
  'clinica medico': 'Clinica Médica',
  'pediatria': 'Pediatria',
  'pediatrico': 'Pediatria',
  'pediatrica': 'Pediatria',
  'pediatra': 'Pediatria',
  'ginecologia': 'Ginecologia e Obstetrícia',
  'obstetricia': 'Ginecologia e Obstetrícia',
  'obstetrica': 'Ginecologia e Obstetrícia',
  'ginecologista': 'Ginecologia e Obstetrícia',
  'obstetra': 'Ginecologia e Obstetrícia',
  'ginecologia e obstetricia': 'Ginecologia e Obstetrícia',
  'ginecologia e obstetrícia': 'Ginecologia e Obstetrícia',
  'cardiologia': 'Cardiologia',
  'cardiologista': 'Cardiologia',
  'cardiologia pediatrica': 'Cardiologia Pediátrica',
  'cardiologia pediatrico': 'Cardiologia Pediátrica',
  'cardiologia intervencionista': 'Cardiologia Intervencionista',
  'ortopedia': 'Ortopedia e Traumatologia',
  'traumatologia': 'Ortopedia e Traumatologia',
  'ortopedista': 'Ortopedia e Traumatologia',
  'traumatologista': 'Ortopedia e Traumatologia',
  'dermatologia': 'Dermatologia',
  'dermatologista': 'Dermatologia',
  'dermatopatologia': 'Dermatopatologia',
  'psiquiatria': 'Psiquiatria',
  'psiquiatra': 'Psiquiatria',
  'oftalmologia': 'Oftalmologia',
  'oftalmologista': 'Oftalmologia',
  'otorrinolaringologia': 'Otorrinolaringologia',
  'otorrino': 'Otorrinolaringologia',
  'urologia': 'Urologia',
  'urologista': 'Urologia',
  'anestesiologia': 'Anestesiologia',
  'anestesista': 'Anestesiologia',
  'radiologia': 'Radiologia e Diagnóstico por Imagem',
  'radiologia e diagnostico por imagem': 'Radiologia e Diagnóstico por Imagem',
  'diagnostico por imagem': 'Radiologia e Diagnóstico por Imagem',
  'endocrinologia': 'Endocrinologia e Metabologia',
  'endocrinologista': 'Endocrinologia e Metabologia',
  'endocrinologia pediatrica': 'Endocrinologia Pediátrica',
  'endocrinologia pediatrico': 'Endocrinologia Pediátrica',
  'gastroenterologia': 'Gastroenterologia',
  'gastroenterologista': 'Gastroenterologia',
  'gastroenterologia pediatrica': 'Gastroenterologia Pediátrica',
  'gastroenterologia pediatrico': 'Gastroenterologia Pediátrica',
  'genetica medica': 'Genética Médica',
  'genetica': 'Genética Médica',
  'geriatria': 'Geriatria',
  'geriatra': 'Geriatria',
  'hematologia': 'Hematologia e Hemoterapia',
  'hematologista': 'Hematologia e Hemoterapia',
  'hematologia pediatrica': 'Hematologia Pediátrica',
  'hematologia pediatrico': 'Hematologia Pediátrica',
  'homeopatia': 'Homeopatia',
  'homeopata': 'Homeopatia',
  'infectologia': 'Infectologia',
  'infectologista': 'Infectologia',
  'infectologia pediatrica': 'Infectologia Pediátrica',
  'infectologia pediatrico': 'Infectologia Pediátrica',
  'mastologia': 'Mastologia',
  'mastologista': 'Mastologia',
  'medicina de emergencia': 'Medicina de Emergência',
  'medicina de emergencias': 'Medicina de Emergência',
  'med emerg': 'Medicina de Emergência',
  'emergencista': 'Medicina de Emergência',
  'medicina de familia e comunidade': 'Medicina de Família e Comunidade',
  'med fam': 'Medicina de Família e Comunidade',
  'medico de familia': 'Medicina de Família e Comunidade',
  'medicina do trabalho': 'Medicina do Trabalho',
  'med trab': 'Medicina do Trabalho',
  'medico do trabalho': 'Medicina do Trabalho',
  'medicina esportiva': 'Medicina Esportiva',
  'medico esportivo': 'Medicina Esportiva',
  'medicina fisica e reabilitacao': 'Medicina Física e Reabilitação',
  'medicina fisioterapia': 'Medicina Física e Reabilitação',
  'medicina intensiva': 'Medicina Intensiva',
  'intensivista': 'Medicina Intensiva',
  'medicina legal e pericia medica': 'Medicina Legal e Perícia Médica',
  'medicina nuclear': 'Medicina Nuclear',
  'medicina preventiva e social': 'Medicina Preventiva e Social',
  'med prev': 'Medicina Preventiva e Social',
  'nefrologia': 'Nefrologia',
  'nefrologista': 'Nefrologia',
  'nefrologia pediatrica': 'Nefrologia Pediátrica',
  'nefrologia pediatrico': 'Nefrologia Pediátrica',
  'neurologia': 'Neurologia',
  'neurologista': 'Neurologia',
  'neurologia pediatrica': 'Neurologia Pediátrica',
  'neurologia pediatrico': 'Neurologia Pediátrica',
  'neurocirurgia': 'Neurocirurgia',
  'neurocirurgiao': 'Neurocirurgia',
  'nutrologia': 'Nutrologia',
  'nutricionista': 'Nutrologia',
  'oncologia clinica': 'Oncologia Clínica',
  'oncologia': 'Oncologia Clínica',
  'oncologia pediatrica': 'Oncologia Pediátrica',
  'oncologia pediatrico': 'Oncologia Pediátrica',
  'patologia': 'Patologia',
  'patologista': 'Patologia',
  'patologia clinica/medicina laboratorial': 'Patologia Clínica/Medicina Laboratorial',
  'pneumologia': 'Pneumologia',
  'pneumologista': 'Pneumologia',
  'pneumologia pediatrica': 'Pneumologia Pediátrica',
  'pneumologia pediatrico': 'Pneumologia Pediátrica',
  'radioterapia': 'Radioterapia',
  'reumatologia': 'Reumatologia',
  'reumatologista': 'Reumatologia',
  'reumatologia pediatrica': 'Reumatologia Pediátrica',
  'reumatologia pediatrico': 'Reumatologia Pediátrica',
  'acupuntura': 'Acupuntura',
  'dor': 'Dor',
  'cirurgia geral': 'Cirurgia Geral',
  'cirurgia plastica': 'Cirurgia Plástica',
  'cirurgião plastico': 'Cirurgia Plástica',
  'cirurgia toracica': 'Cirurgia Torácica',
  'cirurgia cardiovascular': 'Cirurgia Cardiovascular',
  'cirurgia cardiovascular pediatrica': 'Cirurgia Cardiovascular Pediátrica',
  'cirurgia cardiovascular pediatrico': 'Cirurgia Cardiovascular Pediátrica',
  'cirurgia pediatrica': 'Cirurgia Pediátrica',
  'cirurgia pediatrico': 'Cirurgia Pediátrica',
  'cirurgia oncologica pediatrica': 'Cirurgia Oncológica Pediátrica',
  'cirurgia oncologica pediatrico': 'Cirurgia Oncológica Pediátrica',
  'cirurgia bucomaxilofacial': 'Cirurgia Bucomaxilofacial',
  'cirurgia de cabeca e pescoco': 'Cirurgia de Cabeça e Pescoço',
  'cirurgia do aparelho digestivo': 'Cirurgia do Aparelho Digestivo',
  'coloproctologia': 'Coloproctologia',
  'medicina de cuidados paliativos': 'Medicina de Cuidados Paliativos',
  'medicina do sono': 'Medicina do Sono',
  'medicina integrativa': 'Medicina Integrativa',
  'medicina aeroespacial': 'Medicina Aeroespacial',
  'medicina de viagem': 'Medicina de Viagem',
  'medicina de desastres': 'Medicina de Desastres',
  'medicina de saude publica': 'Medicina de Saúde Pública',
};

Object.keys(sinManuais).forEach((key) => {
  sinonimos[normalizar(key)] = sinManuais[key];
});

export function getEspecialidadeInfo(nome: string | null | undefined): EspecialidadeInfo {
  if (!nome) return { nome: 'Desconhecido', icone: FaIcons.FaUserMd, cor: '#999999' };

  const nomeNormalizado = normalizar(nome);
  const nomeOficial = sinonimos[nomeNormalizado] || nome;

  let esp = especialidades.find((e) => normalizar(e.nome) === normalizar(nomeOficial));

  if (!esp) {
    esp = especialidades.find((e) => normalizar(e.nome).startsWith(nomeNormalizado));
  }

  const IconComponent = esp && typeof esp.icone === 'string' && FaIcons[esp.icone as keyof typeof FaIcons]
    ? (FaIcons[esp.icone as keyof typeof FaIcons] as React.ComponentType<any>)
    : FaIcons.FaUserMd;

  return {
    nome: esp ? esp.nome : nomeOficial,
    icone: IconComponent,
    cor: esp ? esp.cor : '#999999',
  };
}

export function ordenarEspecialidades(lista: Especialidade[]): Especialidade[] {
  return [...lista].sort(
    (a, b) => (b.cadastros || 0) - (a.cadastros || 0) || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );
}
