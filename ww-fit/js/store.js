// Estado do app, salvo no próprio aparelho (localStorage) e fotos no
// IndexedDB. Tudo passa por aqui, para depois ser fácil trocar/sincronizar
// com o Supabase.
import { RECEITAS_INICIAIS, RECOMPENSAS_MODELO, TREINOS_MODELO } from './dados.js';

const CHAVE = 'wwfit:v1';
const ouvintes = new Set();

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

// ---------- datas ----------
export function hoje(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function parseDia(s) {
  const [a, m, d] = s.split('-').map(Number);
  return new Date(a, m - 1, d);
}
export function somaDias(s, n) {
  const d = parseDia(s);
  d.setDate(d.getDate() + n);
  return hoje(d);
}
export function ultimosDias(n, ate = hoje()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(somaDias(ate, -i));
  return out;
}
export function fmtData(s, opts = { day: '2-digit', month: 'short' }) {
  return parseDia(s).toLocaleDateString('pt-BR', opts).replace('.', '');
}

// ---------- estado inicial ----------
function estadoVazio() {
  return {
    versao: 1,
    criadoEm: hoje(),
    ativo: 'u1',
    usuarios: {},
    config: {
      lembretes: {
        manha: { on: true, hora: '06:30' },
        agua: { on: true, cada: 120, de: '08:00', ate: '21:00' },
        refeicoes: { on: true, horas: ['08:30', '12:30', '16:00', '20:00'] },
        treino: { on: true, hora: '18:00' },
        pesagem: { on: true, dia: 1, hora: '07:00' }
      },
      disparados: {}
    },
    dias: {},
    pesos: { u1: [], u2: [] },
    medidas: { u1: [], u2: [] },
    fotos: [],
    pratos: [],
    treinos: { u1: [], u2: [] },
    sessoes: [],
    desafios: [],
    recompensas: RECOMPENSAS_MODELO.map((r) => ({ id: uid(), ...r })),
    tocaAqui: [],
    cardapio: {},
    compras: [],
    receitas: RECEITAS_INICIAIS.map((r) => ({ id: uid(), ...r })),
    jejum: { u1: null, u2: null },
    jejumHist: { u1: [], u2: [] }
  };
}

let estado = carregar();

function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return { ...estadoVazio(), ...JSON.parse(bruto) };
  } catch (e) { /* aparelho sem storage: segue só na memória */ }
  return estadoVazio();
}

export function salvar(avisar = true) {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* cheio ou bloqueado */ }
  if (avisar) ouvintes.forEach((fn) => fn(estado));
}

export const S = () => estado;
export function mudar(fn) { fn(estado); salvar(); }
// salva sem redesenhar a tela (ex.: campos de texto que o usuário ainda está preenchendo)
export function mudarQuieto(fn) { fn(estado); salvar(false); }
export function aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); }

export function substituirTudo(novo) {
  estado = { ...estadoVazio(), ...novo };
  salvar();
}
export function apagarTudo() {
  estado = estadoVazio();
  salvar();
}

// ---------- usuários ----------
export const configurado = () => Object.keys(estado.usuarios).length === 2;
export const eu = () => estado.usuarios[estado.ativo];
export const outroId = (id = estado.ativo) => (id === 'u1' ? 'u2' : 'u1');
export const outro = () => estado.usuarios[outroId()];

export function criarUsuarios(u1, u2) {
  mudar((s) => {
    s.usuarios = { u1: { id: 'u1', cor: 'green', ...u1 }, u2: { id: 'u2', cor: 'orange', ...u2 } };
    for (const id of ['u1', 'u2']) {
      s.pesos[id] = [{ data: hoje(), kg: Number(s.usuarios[id].pesoInicial) }];
      s.treinos[id] = TREINOS_MODELO.map((t) => ({ id: uid(), ...structuredClone(t) }));
    }
  });
}

// ---------- cálculos ----------
export function pesoAtual(id) {
  const lista = estado.pesos[id] || [];
  if (lista.length) return lista[lista.length - 1].kg;
  return Number(estado.usuarios[id]?.pesoInicial) || 0;
}
export function perdido(id) {
  const u = estado.usuarios[id];
  if (!u) return 0;
  return Math.round((Number(u.pesoInicial) - pesoAtual(id)) * 10) / 10;
}
export function metas(id) {
  const u = estado.usuarios[id];
  if (!u) return { kcal: 2000, agua: 2000, prot: 100, copo: 250 };
  const kg = pesoAtual(id);
  const alt = Number(u.altura);
  const idade = Number(u.idade);
  // Mifflin-St Jeor
  const tmb = 10 * kg + 6.25 * alt - 5 * idade + (u.sexo === 'F' ? -161 : 5);
  const fator = { sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725 }[u.atividade] || 1.375;
  const gasto = tmb * fator;
  const minimo = u.sexo === 'F' ? 1200 : 1500;
  const kcal = Math.max(minimo, Math.round((gasto - 500) / 10) * 10);
  return {
    tmb: Math.round(tmb),
    gasto: Math.round(gasto),
    kcal: u.metaKcal ? Number(u.metaKcal) : kcal,
    agua: Math.round((kg * 35) / 50) * 50,
    prot: Math.round(Math.min(kg, Number(u.pesoMeta) + 10) * 1.6),
    copo: 250
  };
}
export function imc(id) {
  const u = estado.usuarios[id];
  if (!u) return 0;
  const m = Number(u.altura) / 100;
  return Math.round((pesoAtual(id) / (m * m)) * 10) / 10;
}
export function faixaImc(v) {
  if (v < 18.5) return ['Abaixo do peso', 'cyan'];
  if (v < 25) return ['Peso saudável', 'green'];
  if (v < 30) return ['Sobrepeso', 'orange'];
  if (v < 35) return ['Obesidade grau I', 'pink'];
  if (v < 40) return ['Obesidade grau II', 'red'];
  return ['Obesidade grau III', 'red'];
}

// ---------- dia ----------
function diaVazio() {
  return { agua: 0, refeicoes: {}, sono: null, humor: null, passos: 0, gratidao: '' };
}
export function dia(id = estado.ativo, data = hoje()) {
  return estado.dias[data]?.[id] || diaVazio();
}
export function editarDia(id, data, fn) {
  mudar((s) => {
    s.dias[data] ??= {};
    s.dias[data][id] ??= diaVazio();
    fn(s.dias[data][id]);
  });
}
export function totaisDia(id = estado.ativo, data = hoje()) {
  const d = dia(id, data);
  const t = { kcal: 0, p: 0, c: 0, g: 0, itens: 0 };
  for (const lista of Object.values(d.refeicoes || {})) {
    for (const it of lista) {
      t.kcal += it.kcal; t.p += it.p || 0; t.c += it.c || 0; t.g += it.g || 0; t.itens++;
    }
  }
  t.kcal = Math.round(t.kcal);
  return t;
}
export function gastoTreinosDia(id, data = hoje()) {
  return estado.sessoes.filter((x) => x.user === id && x.data === data).reduce((a, x) => a + (x.kcal || 0), 0);
}

// dia "cumprido": registrou alguma refeição e bebeu pelo menos 75% da meta de água
export function diaCumprido(id, data) {
  const d = dia(id, data);
  const temComida = totaisDia(id, data).itens > 0;
  const agua = d.agua * metas(id).copo >= metas(id).agua * 0.75;
  const treinou = estado.sessoes.some((x) => x.user === id && x.data === data);
  return temComida && (agua || treinou);
}
export function sequencia(id) {
  let n = 0;
  let d = hoje();
  // se hoje ainda não foi cumprido, conta a partir de ontem
  if (!diaCumprido(id, d)) d = somaDias(d, -1);
  while (diaCumprido(id, d)) { n++; d = somaDias(d, -1); }
  return n;
}

// pontos da semana (placar do casal)
export function pontosDia(id, data) {
  const d = dia(id, data);
  const m = metas(id);
  let p = 0;
  if (totaisDia(id, data).itens > 0) p += 10;
  const kcal = totaisDia(id, data).kcal;
  if (kcal > 0 && kcal <= m.kcal * 1.05) p += 10;
  if (d.agua * m.copo >= m.agua) p += 10;
  if (estado.sessoes.some((x) => x.user === id && x.data === data)) p += 20;
  if ((estado.pesos[id] || []).some((x) => x.data === data)) p += 5;
  if (d.sono) p += 5;
  if (d.gratidao) p += 5;
  for (const ds of estado.desafios) if (ds.checks?.[id]?.includes(data)) p += 5;
  return p;
}
export function pontosSemana(id) {
  return ultimosDias(7).reduce((a, d) => a + pontosDia(id, d), 0);
}

// ---------- fotos (IndexedDB) ----------
let dbPromise;
function db() {
  dbPromise ??= new Promise((ok, erro) => {
    const req = indexedDB.open('wwfit-fotos', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('fotos');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
  return dbPromise;
}
export async function salvarFoto(id, blob) {
  const d = await db();
  await new Promise((ok, erro) => {
    const tx = d.transaction('fotos', 'readwrite');
    tx.objectStore('fotos').put(blob, id);
    tx.oncomplete = ok; tx.onerror = () => erro(tx.error);
  });
}
export async function lerFoto(id) {
  const d = await db();
  return new Promise((ok, erro) => {
    const req = d.transaction('fotos').objectStore('fotos').get(id);
    req.onsuccess = () => ok(req.result || null);
    req.onerror = () => erro(req.error);
  });
}
export async function apagarFoto(id) {
  const d = await db();
  await new Promise((ok) => {
    const tx = d.transaction('fotos', 'readwrite');
    tx.objectStore('fotos').delete(id);
    tx.oncomplete = ok; tx.onerror = ok;
  });
}
const cacheUrls = new Map();
export async function urlFoto(id) {
  if (cacheUrls.has(id)) return cacheUrls.get(id);
  const b = await lerFoto(id);
  if (!b) return '';
  const u = URL.createObjectURL(b);
  cacheUrls.set(id, u);
  return u;
}

// reduz a foto para no máximo 1080 px (economiza espaço no celular)
export function comprimirImagem(arquivo, max = 1080) {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const esc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * esc);
      c.height = Math.round(img.height * esc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? ok(b) : erro(new Error('falha ao comprimir'))), 'image/jpeg', 0.82);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = erro;
    img.src = URL.createObjectURL(arquivo);
  });
}

// ---------- backup ----------
export async function exportarBackup() {
  const fotos = {};
  for (const f of estado.fotos) {
    const b = await lerFoto(f.id);
    if (b) fotos[f.id] = await blobParaDataUrl(b);
  }
  return JSON.stringify({ app: 'ww-fit', exportadoEm: new Date().toISOString(), estado, fotos });
}
export async function importarBackup(texto) {
  const dados = JSON.parse(texto);
  if (dados.app !== 'ww-fit' || !dados.estado) throw new Error('Arquivo não é um backup do W+W Fit');
  for (const [id, url] of Object.entries(dados.fotos || {})) {
    const b = await (await fetch(url)).blob();
    await salvarFoto(id, b);
  }
  substituirTudo(dados.estado);
}
function blobParaDataUrl(b) {
  return new Promise((ok) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.readAsDataURL(b);
  });
}
