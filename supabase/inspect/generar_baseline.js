// Genera supabase/migrations/0001_baseline.sql a partir del export de
// supabase/inspect/01_estado_actual.sql (guardado como JSON o CSV).
//
// Uso:  node supabase/inspect/generar_baseline.js
//
// El baseline DOCUMENTA el estado real de producción; NO se ejecuta en
// producción (ya está aplicado). Sirve para levantar una BD de staging igual
// y como punto de partida versionado para las siguientes migraciones.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(here, 'resultado_estado_actual.json');
const csvPath = path.join(here, 'resultado_estado_actual.csv');
const outPath = path.join(here, '..', 'migrations', '0001_baseline.sql');

function leerFilas() {
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
  if (fs.existsSync(csvPath)) {
    return parseCsv(fs.readFileSync(csvPath, 'utf8'));
  }
  console.error('No se encontró resultado_estado_actual.json ni .csv en supabase/inspect/');
  process.exit(1);
}

// CSV mínimo con comillas dobles y saltos de línea dentro de campos
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows;
  return data.filter(r => r.length === header.length)
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const filas = leerFilas();
const por = (s) => filas.filter(f => f.seccion === s);
const partes = [];
const sec = (titulo) => partes.push(`\n-- ${'='.repeat(74)}\n-- ${titulo}\n-- ${'='.repeat(74)}\n`);

partes.push(`-- ============================================================================
-- 0001 - BASELINE: estado real de la base de datos en producción
-- Generado automáticamente por supabase/inspect/generar_baseline.js
-- Fecha de captura: ${new Date().toISOString().slice(0, 10)}
--
-- NO EJECUTAR EN PRODUCCIÓN (ya está aplicado). Úsese para crear un entorno
-- de staging idéntico o como referencia versionada del esquema.
--
-- Nota: los tipos de columna vienen de information_schema y pierden precisión
-- (numeric sin (10,2), varchar sin longitud). Las funciones, políticas,
-- constraints e índices son las definiciones exactas.
-- ============================================================================
`);

sec('EXTENSIONES Y META');
por('00_meta').forEach(f => partes.push(`-- ${f.objeto}: ${f.definicion}`));
partes.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\nCREATE EXTENSION IF NOT EXISTS pgcrypto;`);

sec('TIPOS ENUM');
por('08_enums').forEach(f => {
  const vals = f.definicion.split(',').map(v => `'${v.trim()}'`).join(', ');
  partes.push(`CREATE TYPE public.${f.objeto} AS ENUM (${vals});`);
});

sec('TABLAS');
por('01_tablas').forEach(f => {
  const cols = f.definicion.split('\n').map(l => {
    // "nombre tipo [NOT NULL] [DEFAULT x]" -> tipo USER-DEFINED se infiere del default
    let linea = l.trim();
    if (linea.includes(' USER-DEFINED ')) {
      const m = linea.match(/::(\w+)/);
      linea = linea.replace(' USER-DEFINED ', ` public.${m ? m[1] : 'text'} `);
    }
    return '    ' + linea;
  });
  partes.push(`CREATE TABLE public.${f.objeto} (\n${cols.join(',\n')}\n);`);
});

sec('CONSTRAINTS (PK, UNIQUE, FK, CHECK)');
// Primero PK/UNIQUE/CHECK, luego FK para respetar dependencias
const cons = por('09_constraints').map(f => {
  const [tabla, nombre] = f.objeto.split(' :: ');
  return { tabla, nombre, def: f.definicion };
});
const esFk = c => c.def.startsWith('FOREIGN KEY');
[...cons.filter(c => !esFk(c)), ...cons.filter(esFk)].forEach(c => {
  partes.push(`ALTER TABLE public.${c.tabla} ADD CONSTRAINT ${c.nombre} ${c.def};`);
});

sec('ÍNDICES (excluye los creados por constraints)');
const nombresCons = new Set(cons.map(c => c.nombre));
por('10_indices').forEach(f => {
  const [, nombre] = f.objeto.split(' :: ');
  if (!nombresCons.has(nombre)) partes.push(`${f.definicion};`);
});

sec('VISTAS');
por('11_vistas').forEach(f => partes.push(`CREATE OR REPLACE VIEW public.${f.objeto} AS\n${f.definicion}`));

sec('FUNCIONES');
por('04_funciones').forEach(f => partes.push(`${f.definicion.replace(/\r\n/g, '\n').trim()};`));

sec('TRIGGERS');
por('07_triggers').forEach(f => partes.push(`${f.definicion};`));

sec('ROW LEVEL SECURITY');
por('02_rls').forEach(f => {
  if (f.definicion.includes('rls_enabled=t')) partes.push(`ALTER TABLE public.${f.objeto} ENABLE ROW LEVEL SECURITY;`);
  else partes.push(`-- ${f.objeto}: RLS DESACTIVADO`);
});

sec('POLÍTICAS RLS');
por('03_politicas').forEach(f => {
  const [tabla, nombre] = f.objeto.split(' :: ');
  const get = (k) => (f.definicion.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim();
  const cmd = get('cmd'), permissive = get('permissive'), roles = get('roles');
  const using = (f.definicion.match(/USING: ([\s\S]*?)\nWITH CHECK:/) || [])[1]?.trim();
  const check = (f.definicion.match(/WITH CHECK: ([\s\S]*)$/) || [])[1]?.trim();
  let sql = `CREATE POLICY "${nombre}" ON public.${tabla}`;
  if (permissive === 'RESTRICTIVE') sql += ' AS RESTRICTIVE';
  sql += ` FOR ${cmd} TO ${roles}`;
  if (using && using !== '-') sql += `\n  USING (${using})`;
  if (check && check !== '-') sql += `\n  WITH CHECK (${check})`;
  partes.push(sql + ';');
});

sec('PERMISOS DE FUNCIONES (estado observado)');
por('05_grants_funciones').forEach(f => partes.push(`-- ${f.objeto}\n--   ${f.definicion}`));

sec('PERMISOS DE TABLAS (estado observado)');
por('06_grants_tablas').forEach(f => partes.push(`-- ${f.objeto}: ${f.definicion.replace(/\n/g, ' | ')}`));

sec('STORAGE (estado observado, se configura desde el dashboard)');
por('12_storage_buckets').forEach(f => partes.push(`-- bucket ${f.objeto}: ${f.definicion}`));
por('12_storage_politicas').forEach(f => partes.push(`-- política "${f.objeto}": ${f.definicion.replace(/\n/g, ' | ')}`));

sec('CONTEO DE FILAS EN EL MOMENTO DE LA CAPTURA');
por('13_conteo_filas').forEach(f => partes.push(`-- ${f.objeto}: ${f.definicion}`));

fs.writeFileSync(outPath, partes.join('\n') + '\n', 'utf8');
console.log(`Baseline generado: ${path.relative(process.cwd(), outPath)} (${filas.length} objetos procesados)`);
