// scripts/import/dry-run.mjs
// Dry-run local do seed médico — NÃO grava no banco.
// Lê os arquivos reais da raiz, normaliza, deduplica, reconcilia 334x335,
// e classifica produção vinculável x pendente. Resultado: relatório no console.
//
// Uso: node scripts/import/dry-run.mjs
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const AUX = resolve(ROOT, 'gestao_medica_candidatos_aux.csv');
const PROD = resolve(ROOT, 'gestao_medica_staging_producao.csv');

function parseCsv(text) {
  const rows = [];
  let field = '', row = [], i = 0;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { if (row.length) rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      i++;
      while (i < text.length) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          i++; break;
        }
        field += text[i++];
      }
      continue;
    }
    if (c === ',') { pushField(); i++; continue; }
    if (c === '\n') { pushField(); pushRow(); i++; continue; }
    if (c === '\r') { i++; continue; }
    field += c; i++;
  }
  pushField(); pushRow();
  return rows;
}

function toObjects(text) {
  const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  });
}

// Normalização de nome: remove títulos, acentos, espaços extras; NÃO altera o original.
function normalizeName(raw) {
  return (raw || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(DR|DRA|DR\.|DRA\.)\b/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  if (!existsSync(AUX) || !existsSync(PROD)) {
    console.error('Arquivos não encontrados:', { AUX: existsSync(AUX), PROD: existsSync(PROD) });
    process.exit(1);
  }

  const aux = toObjects(readFileSync(AUX, 'utf8'));
  const prod = toObjects(readFileSync(PROD, 'utf8'));

  // --- Médicos (aux) ---
  const seen = new Map(); // nome_chave -> { nomeOriginal, duplicado, qty }
  let duplicadosAux = 0;
  for (const r of aux) {
    const key = normalizeName(r.nome_original) || r.nome_chave_normalizada;
    if (!key) continue;
    if (r.duplicado_aux === '1') duplicadosAux++;
    if (!seen.has(key)) seen.set(key, { nomeOriginal: r.nome_original, duplicado: r.duplicado_aux === '1', qty: 0 });
    seen.get(key).qty++;
  }
  const unicos = seen.size;

  // Chaves únicas de médicos (para vincular produção)
  const medKeys = new Set(seen.keys());

  // --- Produção ---
  let total = 0, vinculavel = 0, placeholder = 0, aConferir = 0, semMedico = 0;
  const qtdTotal = { n: 0 };
  const porAno = {};
  const porSetor = {};
  for (const r of prod) {
    total++;
    const key = normalizeName(r.doctor_name_raw) || r.doctor_key;
    const status = r.review_status || '';
    const q = Number(r.attendances);
    if (!Number.isNaN(q)) qtdTotal.n += q;
    const ano = (r.date || '').slice(0, 4);
    if (ano) porAno[ano] = (porAno[ano] || 0) + 1;
    const setor = r.sector || '(vazio)';
    porSetor[setor] = (porSetor[setor] || 0) + 1;

    if (status.includes('placeholder') || !key) { placeholder++; semMedico++; continue; }
    if (status.includes('conciliacao') || medKeys.has(key)) { vinculavel++; continue; }
    aConferir++;
  }

  // Reconciliação 334 x 335
  const divergencia = unicos;

  console.log('\n=== DRY-RUN SEED MÉDICO (local, sem gravação) ===\n');
  console.log('ARQUIVOS');
  console.log('  candidatos_aux linhas :', aux.length);
  console.log('  staging_producao linhas:', prod.length);
  console.log('\nMÉDICOS (aux)');
  console.log('  nomes únicos normalizados :', unicos, '(JSON anterior: 334)');
  console.log('  divergência 334 x 335     :', divergencia === 335 ? '335 (confirmado)' : divergencia);
  console.log('  marcados duplicado_aux=1 :', duplicadosAux);
  console.log('  candidatos p/ cadastro    :', unicos, '(CRM/UF pendente — não inferido)');
  console.log('\nPRODUÇÃO');
  console.log('  total de lançamentos     :', total);
  console.log('  vinculável a médico      :', vinculavel);
  console.log('  identidade a conferir    :', aConferir);
  console.log('  placeholder/sem médico   :', placeholder, '(permanece em staging)');
  console.log('  quantidade total somada  :', qtdTotal.n);
  console.log('  por ano                  :', JSON.stringify(porAno));
  console.log('  por setor                :', JSON.stringify(porSetor));
  console.log('\nRESULTADO PREVISTO (após autorização remota)');
  console.log('  INSERT people/medicos    :', unicos, '(pendentes de CRM/UF)');
  console.log('  INSERT production_entries :', vinculavel);
  console.log('  staging (não vinculados)  :', aConferir + placeholder);
  console.log('  UPDATE (reconciliáveis)   : 0 (1ª importação)');
  console.log('\nRISCOS');
  console.log('  - Nomes não provam identidade/CRM; duplicidades exigem conferência.');
  console.log('  - Setores NÃO são CBO/especialidade oficial.');
  console.log('  - 12x36 e virada de turno precisam de validação antes de consolidar.');
  console.log('\nNenhuma gravação remota realizada.\n');
}

main();