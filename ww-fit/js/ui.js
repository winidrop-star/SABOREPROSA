// Peças visuais reaproveitadas pelas telas.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const num = (n, casas = 0) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const CORES = {
  green: ['#10b981', '#bef264'],
  orange: ['#ea580c', '#fde047'],
  cyan: ['#0ea5e9', '#22d3ee'],
  violet: ['#8b5cf6', '#f472b6'],
  pink: ['#db2777', '#f9a8d4']
};

let gradSeq = 0;
// anel de progresso em SVG
export function anel({ valor = 0, max = 1, tam = 120, espessura = 11, cor = 'violet', centro = '' }) {
  const r = (tam - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, max ? valor / max : 0));
  const id = `g${++gradSeq}`;
  const [a, b] = CORES[cor] || CORES.violet;
  return `
  <div class="ring-wrap" style="width:${tam}px;height:${tam}px">
    <svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
      <circle class="ring-track" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke-width="${espessura}"/>
      <circle class="ring-bar" cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="url(#${id})" color="${b}"
        stroke-width="${espessura}" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - frac)}"/>
    </svg>
    <div class="ring-center">${centro}</div>
  </div>`;
}

export function barra(frac, cor = '') {
  const w = Math.max(0, Math.min(100, frac * 100));
  return `<div class="bar ${cor}"><i style="width:${w}%"></i></div>`;
}

// ---------- toast ----------
let toastTimer;
export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

// ---------- confete ----------
export function festa() {
  const cores = ['#22e584', '#bef264', '#ff8a3d', '#fde047', '#22d3ee', '#8b5cf6', '#f472b6'];
  const box = document.createElement('div');
  box.className = 'burst';
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = cores[i % cores.length];
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = 1.2 + Math.random() * 1 + 's';
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2600);
  navigator.vibrate?.([30, 40, 30]);
}

// ---------- sheet (janela que sobe de baixo) ----------
// fixo: não fecha ao tocar fora (ex.: treino em andamento)
export function abrirSheet(html, { aoMontar, fixo = false } = {}) {
  fecharSheet();
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  ov.addEventListener('click', (e) => {
    if ((e.target === ov && !fixo) || e.target.closest('[data-fechar]')) fecharSheet();
  });
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  const sheet = ov.querySelector('.sheet');
  aoMontar?.(sheet);
  return sheet;
}
export function fecharSheet() {
  document.querySelector('.overlay')?.remove();
  document.body.style.overflow = '';
}

export function confirmar(msg, textoOk = 'Confirmar') {
  return new Promise((ok) => {
    const sh = abrirSheet(`
      <h2>${esc(msg)}</h2>
      <div class="actions">
        <button class="btn ghost" data-r="0">Cancelar</button>
        <button class="btn danger" data-r="1">${esc(textoOk)}</button>
      </div>`);
    sh.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      fecharSheet();
      ok(b.dataset.r === '1');
    });
  });
}

// ---------- gráfico de linhas (peso) ----------
// series: [{ nome, cor: 'green'|'orange', pontos: [{x: 'YYYY-MM-DD', y}] , meta }]
export function graficoLinhas(series, { altura = 190, sufixo = ' kg' } = {}) {
  const todos = series.flatMap((s) => s.pontos);
  if (todos.length < 1) return '<div class="empty"><span class="big">📈</span>Registre o peso para ver o gráfico</div>';
  const L = 340, H = altura, padL = 34, padR = 12, padT = 14, padB = 24;
  const xs = [...new Set(todos.map((p) => p.x))].sort();
  const t0 = new Date(xs[0]).getTime();
  const t1 = new Date(xs[xs.length - 1]).getTime();
  const metas = series.map((s) => s.meta).filter(Boolean);
  let min = Math.min(...todos.map((p) => p.y), ...metas);
  let max = Math.max(...todos.map((p) => p.y), ...metas);
  if (max - min < 4) { min -= 2; max += 2; }
  min = Math.floor(min - 1); max = Math.ceil(max + 1);
  const X = (x) => (t1 === t0 ? (padL + L - padR) / 2 : padL + ((new Date(x).getTime() - t0) / (t1 - t0)) * (L - padL - padR));
  const Y = (y) => padT + (1 - (y - min) / (max - min)) * (H - padT - padB);

  let svg = `<svg class="chart" viewBox="0 0 ${L} ${H}" role="img" aria-label="Gráfico de evolução do peso"><defs>`;
  series.forEach((s, i) => {
    const [a, b] = CORES[s.cor];
    svg += `<linearGradient id="ln${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
            <linearGradient id="ar${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b}" stop-opacity="0.25"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></linearGradient>`;
  });
  svg += '</defs>';
  // grade
  const passos = 4;
  for (let i = 0; i <= passos; i++) {
    const v = min + ((max - min) * i) / passos;
    const y = Y(v);
    svg += `<line x1="${padL}" x2="${L - padR}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,0.06)"/>`;
    svg += `<text x="${padL - 6}" y="${y + 3}" text-anchor="end">${Math.round(v)}</text>`;
  }
  // datas (primeira e última)
  svg += `<text x="${padL}" y="${H - 6}">${fmtCurta(xs[0])}</text>`;
  if (xs.length > 1) svg += `<text x="${L - padR}" y="${H - 6}" text-anchor="end">${fmtCurta(xs[xs.length - 1])}</text>`;

  series.forEach((s, i) => {
    const [, b] = CORES[s.cor];
    if (s.meta) {
      svg += `<line x1="${padL}" x2="${L - padR}" y1="${Y(s.meta)}" y2="${Y(s.meta)}" stroke="${b}" stroke-opacity="0.55" stroke-dasharray="4 5"/>`;
      svg += `<text x="${L - padR}" y="${Y(s.meta) - 4}" text-anchor="end" style="fill:${b}">meta ${s.meta}</text>`;
    }
    const pts = [...s.pontos].sort((a, b2) => a.x.localeCompare(b2.x));
    if (!pts.length) return;
    const d = pts.map((p, j) => `${j ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
    if (pts.length > 1) {
      svg += `<path d="${d} L${X(pts[pts.length - 1].x).toFixed(1)},${H - padB} L${X(pts[0].x).toFixed(1)},${H - padB} Z" fill="url(#ar${i})"/>`;
    }
    svg += `<path d="${d}" fill="none" stroke="url(#ln${i})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 0 5px ${b})"/>`;
    const ult = pts[pts.length - 1];
    svg += `<circle cx="${X(ult.x)}" cy="${Y(ult.y)}" r="5" fill="${b}" stroke="#05070f" stroke-width="2"/>`;
    svg += `<text x="${X(ult.x)}" y="${Y(ult.y) - 10}" text-anchor="middle" style="fill:#fff;font-weight:700">${num(ult.y, 1)}${sufixo}</text>`;
  });
  svg += '</svg>';
  return svg;
}
function fmtCurta(s) {
  const [, m, d] = s.split('-');
  return `${d}/${m}`;
}

// ---------- gráfico de barras (últimos dias) ----------
// dados: [{ rotulo, valor, destaque }], linha = valor de referência
export function graficoBarras(dados, { altura = 140, linha = 0, cor = 'violet' } = {}) {
  const L = 340, H = altura, padB = 20, padT = 16;
  const max = Math.max(linha * 1.15, ...dados.map((d) => d.valor), 1);
  const w = (L - 10) / dados.length;
  const [a, b] = CORES[cor];
  const id = `gb${++gradSeq}`;
  let svg = `<svg class="chart" viewBox="0 0 ${L} ${H}" role="img" aria-label="Gráfico de barras"><defs><linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
  dados.forEach((d, i) => {
    const h = (d.valor / max) * (H - padB - padT);
    const x = 5 + i * w + w * 0.18;
    const bw = w * 0.64;
    svg += `<rect x="${x}" y="${H - padB - h}" width="${bw}" height="${Math.max(h, 2)}" rx="5" fill="${d.valor ? `url(#${id})` : 'rgba(255,255,255,0.08)'}" ${d.acima ? 'opacity="0.55"' : ''}/>`;
    if (d.valor) svg += `<text x="${x + bw / 2}" y="${H - padB - h - 4}" text-anchor="middle" style="fill:#cbd5f5">${d.valorTxt ?? Math.round(d.valor)}</text>`;
    svg += `<text x="${x + bw / 2}" y="${H - 5}" text-anchor="middle" ${d.destaque ? 'style="fill:#fff;font-weight:700"' : ''}>${d.rotulo}</text>`;
  });
  if (linha) {
    const y = H - padB - (linha / max) * (H - padB - padT);
    svg += `<line x1="0" x2="${L}" y1="${y}" y2="${y}" stroke="#fde047" stroke-opacity="0.7" stroke-dasharray="4 5"/>`;
  }
  return svg + '</svg>';
}

export function tempoRelativo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? 's' : ''}`;
}

export function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
