// Evolução: peso, IMC, resumo semanal, medidas e fotos de progresso.
import { S, eu, outro, mudar, uid, hoje, pesoAtual, perdido, imc, faixaImc, metas, totaisDia, dia, ultimosDias, parseDia, fmtData,
  salvarFoto, urlFoto, apagarFoto, comprimirImagem } from '../store.js';
import { abrirSheet, fecharSheet, esc, num, toast, barra, graficoLinhas, graficoBarras, confirmar } from '../ui.js';
import { sheetPeso } from './comuns.js';

let verDois = true;
const MEDIDAS = [['cintura', 'Cintura'], ['quadril', 'Quadril'], ['abdomen', 'Abdômen'], ['braco', 'Braço'], ['coxa', 'Coxa'], ['peito', 'Peito']];

export function html() {
  const u = eu();
  const o = outro();
  const atual = pesoAtual(u.id);
  const falta = Math.round((atual - u.pesoMeta) * 10) / 10;
  const total = u.pesoInicial - u.pesoMeta;
  const prog = total > 0 ? (u.pesoInicial - atual) / total : 0;
  const vImc = imc(u.id);
  const [faixa, corFaixa] = faixaImc(vImc);

  const series = [{ nome: u.nome, cor: u.cor, meta: u.pesoMeta, pontos: S().pesos[u.id].map((p) => ({ x: p.data, y: p.kg })) }];
  if (verDois) series.push({ nome: o.nome, cor: o.cor, meta: o.pesoMeta, pontos: S().pesos[o.id].map((p) => ({ x: p.data, y: p.kg })) });

  return `
  <section class="card glow">
    <div class="row between">
      <div class="stat"><span class="label">Peso atual</span><span class="value">${num(atual, 1)}<small>kg</small></span></div>
      <div class="stat" style="text-align:center"><span class="label">Perdido</span><span class="value text-green">${perdido(u.id) > 0 ? '−' : ''}${num(Math.abs(perdido(u.id)), 1)}<small>kg</small></span></div>
      <div class="stat" style="text-align:right"><span class="label">Falta</span><span class="value text-orange">${num(Math.max(0, falta), 1)}<small>kg</small></span></div>
    </div>
    <div style="margin-top:14px">
      <div class="row between faint"><span>${num(u.pesoInicial, 1)} kg</span><span>${Math.round(Math.max(0, Math.min(1, prog)) * 100)}% da meta</span><span>${num(u.pesoMeta, 1)} kg</span></div>
      ${barra(prog, u.cor)}
    </div>
    <div class="row between" style="margin-top:14px">
      <div><span class="faint">IMC</span> <b>${num(vImc, 1)}</b> <span class="pill ${corFaixa === 'green' ? 'green' : corFaixa === 'orange' ? 'orange' : 'violet'}">${faixa}</span></div>
      <button class="btn sm green" data-a="pesar">⚖️ Pesar</button>
    </div>
  </section>

  <div class="section-title"><h2>Gráfico do peso</h2>
    <div class="seg" style="padding:3px"><button class="${!verDois ? 'on' : ''}" data-a="verDois" data-v="0">Eu</button><button class="${verDois ? 'on' : ''}" data-a="verDois" data-v="1">Os dois</button></div>
  </div>
  <section class="card">
    ${graficoLinhas(series)}
    <div class="legend">${series.map((s) => `<span><i style="background:var(--${s.cor})"></i>${esc(s.nome)}</span>`).join('')}<span><i style="background:transparent;border:1px dashed #fff"></i>meta</span></div>
  </section>

  ${resumoSemana(u)}

  <div class="section-title"><h2>Medidas</h2><button class="link" data-a="medir">＋ medir</button></div>
  ${medidas(u)}

  <div class="section-title"><h2>Fotos de progresso</h2><label class="link" style="cursor:pointer">＋ foto<input type="file" accept="image/*" data-muda="foto" hidden></label></div>
  ${fotos(u)}

  <div class="section-title"><h2>Pesagens</h2></div>
  <section class="card">
    <div class="list">${[...S().pesos[u.id]].reverse().slice(0, 15).map((p, i, arr) => {
      const ant = arr[i + 1];
      const dif = ant ? Math.round((p.kg - ant.kg) * 10) / 10 : 0;
      return `<div class="item"><div class="grow"><div class="name">${fmtData(p.data, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
        ${dif ? `<span class="pill ${dif < 0 ? 'green' : 'orange'}">${dif > 0 ? '+' : ''}${num(dif, 1)}</span>` : ''}
        <span class="kcal">${num(p.kg, 1)} kg</span>
        <button class="icon-btn sm" data-a="rmPeso" data-data="${p.data}" aria-label="Apagar">✕</button></div>`;
    }).join('')}</div>
  </section>`;
}

function resumoSemana(u) {
  const dias = ultimosDias(7);
  const m = metas(u.id);
  const pesos = S().pesos[u.id];
  const inicioSem = [...pesos].reverse().find((p) => p.data < dias[0]) || pesos[0];
  const varPeso = pesos.length ? Math.round((pesoAtual(u.id) - (inicioSem?.kg ?? pesoAtual(u.id))) * 10) / 10 : 0;
  const treinos = S().sessoes.filter((x) => x.user === u.id && dias.includes(x.data)).length;
  const kcals = dias.map((d) => totaisDia(u.id, d).kcal);
  const comReg = kcals.filter(Boolean);
  const media = comReg.length ? Math.round(comReg.reduce((a, b) => a + b, 0) / comReg.length) : 0;
  const aguaOk = dias.filter((d) => dia(u.id, d).agua * m.copo >= m.agua).length;

  const barras = dias.map((d, i) => ({
    rotulo: parseDia(d).toLocaleDateString('pt-BR', { weekday: 'narrow' }),
    valor: kcals[i], acima: kcals[i] > m.kcal * 1.05, destaque: d === hoje(),
    valorTxt: kcals[i] >= 1000 ? num(kcals[i] / 1000, 1) + 'k' : kcals[i]
  }));

  return `
  <div class="section-title"><h2>Resumo da semana</h2><span class="faint">últimos 7 dias</span></div>
  <section class="card">
    <div class="grid-2">
      <div class="stat"><span class="label">Peso</span><span class="value ${varPeso <= 0 ? 'text-green' : 'text-orange'}">${varPeso > 0 ? '+' : ''}${num(varPeso, 1)}<small>kg</small></span></div>
      <div class="stat"><span class="label">Treinos</span><span class="value text-orange">${treinos}</span></div>
      <div class="stat"><span class="label">Média kcal/dia</span><span class="value text-cyan">${num(media)}</span></div>
      <div class="stat"><span class="label">Dias meta de água</span><span class="value text-cyan">${aguaOk}/7</span></div>
    </div>
    <p class="faint" style="margin:14px 0 4px">Calorias por dia (linha = meta de ${num(m.kcal)})</p>
    ${graficoBarras(barras, { linha: m.kcal, cor: 'violet' })}
    <p class="muted" style="margin-top:10px">${mensagemResumo(varPeso, treinos, comReg.length, aguaOk)}</p>
  </section>`;
}

function mensagemResumo(varPeso, treinos, diasReg, aguaOk) {
  if (varPeso < 0 && treinos >= 3) return '🏆 Semana de campeão: perdeu peso e treinou firme!';
  if (varPeso < 0) return '🎉 O peso caiu esta semana. Continue!';
  if (treinos >= 3) return '💪 Ótima frequência de treinos. O resultado vem!';
  if (diasReg >= 5) return '📒 Parabéns pela constância nos registros!';
  if (aguaOk >= 5) return '💧 Hidratação em dia. Isso ajuda muito!';
  return '✨ Toda semana é uma nova chance. Um passo de cada vez.';
}

function medidas(u) {
  const lista = S().medidas[u.id] || [];
  if (!lista.length) return '<section class="card empty"><span class="big">📏</span>Meça a cintura, o quadril e mais a cada 15 dias.<br>Muitas vezes a medida cai antes do peso!</section>';
  const pri = lista[0];
  const ult = lista[lista.length - 1];
  return `<section class="card">
    <p class="faint" style="margin-bottom:8px">${fmtData(pri.data)} → ${fmtData(ult.data)}</p>
    <div class="list">${MEDIDAS.filter(([k]) => ult[k] || pri[k]).map(([k, nome]) => {
      const dif = pri[k] && ult[k] ? Math.round((ult[k] - pri[k]) * 10) / 10 : 0;
      return `<div class="item"><div class="grow name">${nome}</div>
        ${dif ? `<span class="pill ${dif < 0 ? 'green' : 'orange'}">${dif > 0 ? '+' : ''}${num(dif, 1)} cm</span>` : ''}
        <span class="kcal">${ult[k] ? num(ult[k], 1) + ' cm' : '—'}</span></div>`;
    }).join('')}</div>
  </section>`;
}

function fotos(u) {
  const lista = S().fotos.filter((f) => f.user === u.id).sort((a, b) => a.data.localeCompare(b.data));
  if (!lista.length) return '<section class="card empty"><span class="big">📸</span>Tire uma foto de frente e uma de lado, uma vez por mês, sempre no mesmo lugar e com a mesma luz.</section>';
  return `<section class="card">
    ${lista.length >= 2 ? `<button class="btn block ghost" data-a="comparar" style="margin-bottom:12px">⇆ Comparar antes e agora</button>` : ''}
    <div class="photo-grid">${[...lista].reverse().map((f) => `<button class="ph" data-a="verFoto" data-id="${f.id}"><img data-foto="${f.id}" alt="Foto de ${fmtData(f.data)}"><span>${fmtData(f.data)}</span></button>`).join('')}</div>
  </section>`;
}

export async function montar(app) {
  for (const img of app.querySelectorAll('img[data-foto]')) {
    img.src = await urlFoto(img.dataset.foto);
  }
}

function sheetMedidas() {
  const u = eu();
  const ult = (S().medidas[u.id] || []).slice(-1)[0] || {};
  const sh = abrirSheet(`
    <h2>📏 Medidas de ${esc(u.nome)}</h2>
    <p class="faint" style="margin-bottom:12px">Em centímetros, com fita métrica. Deixe em branco o que não quiser medir.</p>
    <div class="form-row">${MEDIDAS.map(([k, nome]) => `<div class="field"><label>${nome}</label><input class="input" data-k="${k}" type="number" step="0.5" inputmode="decimal" placeholder="${ult[k] ? 'antes: ' + ult[k] : 'cm'}"></div>`).join('')}</div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Salvar</button></div>`);
  sh.addEventListener('click', (e) => {
    if (!e.target.closest('[data-ok]')) return;
    const reg = { data: hoje() };
    sh.querySelectorAll('[data-k]').forEach((i) => { const v = Number(String(i.value).replace(',', '.')); if (v) reg[i.dataset.k] = v; });
    if (Object.keys(reg).length < 2) return toast('Preencha pelo menos uma medida');
    mudar((s) => {
      const l = (s.medidas[u.id] ??= []);
      const i = l.findIndex((x) => x.data === reg.data);
      if (i >= 0) l[i] = { ...l[i], ...reg }; else l.push(reg);
    });
    fecharSheet();
    toast('Medidas salvas 📏');
  });
}

async function sheetComparar() {
  const u = eu();
  const lista = S().fotos.filter((f) => f.user === u.id).sort((a, b) => a.data.localeCompare(b.data));
  const antes = lista[0];
  const depois = lista[lista.length - 1];
  const sh = abrirSheet(`
    <h2>⇆ Antes e agora</h2>
    <div class="compare" id="cmp">
      <img src="${await urlFoto(antes.id)}" alt="Antes">
      <img class="after" src="${await urlFoto(depois.id)}" alt="Agora">
      <div class="handle"></div>
      <span class="lbl" style="left:10px">${fmtData(antes.data)}</span>
      <span class="lbl" style="right:10px">${fmtData(depois.data)}</span>
    </div>
    <p class="faint" style="text-align:center;margin-top:8px">Arraste para comparar</p>
    <div class="actions"><button class="btn ghost" data-fechar>Fechar</button></div>`);
  const cmp = sh.querySelector('#cmp');
  const mover = (x) => {
    const r = cmp.getBoundingClientRect();
    const p = Math.max(0, Math.min(100, ((x - r.left) / r.width) * 100));
    cmp.querySelector('.after').style.clipPath = `inset(0 0 0 ${p}%)`;
    cmp.querySelector('.handle').style.left = p + '%';
  };
  cmp.addEventListener('pointerdown', (e) => { cmp.setPointerCapture(e.pointerId); mover(e.clientX); });
  cmp.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') mover(e.clientX); });
}

async function sheetFoto(id) {
  const f = S().fotos.find((x) => x.id === id);
  const sh = abrirSheet(`
    <h2>📸 ${fmtData(f.data, { day: '2-digit', month: 'long', year: 'numeric' })}</h2>
    <img src="${await urlFoto(id)}" alt="" style="width:100%;border-radius:18px;display:block">
    <div class="actions"><button class="btn danger" data-rm>Apagar</button><button class="btn ghost" data-fechar>Fechar</button></div>`);
  sh.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-rm]')) return;
    if (await confirmar('Apagar esta foto?', 'Apagar')) {
      await apagarFoto(id);
      mudar((s) => { s.fotos = s.fotos.filter((x) => x.id !== id); });
    }
  });
}

export const acoes = {
  pesar: () => sheetPeso(),
  medir: () => sheetMedidas(),
  verDois(el) { verDois = el.dataset.v === '1'; mudar(() => {}); },
  comparar: () => sheetComparar(),
  verFoto(el) { sheetFoto(el.dataset.id); },
  async rmPeso(el) {
    const u = eu();
    if (S().pesos[u.id].length <= 1) return toast('Mantenha pelo menos uma pesagem');
    if (await confirmar(`Apagar a pesagem de ${fmtData(el.dataset.data)}?`, 'Apagar')) {
      mudar((s) => { s.pesos[u.id] = s.pesos[u.id].filter((p) => p.data !== el.dataset.data); });
    }
  },
  async foto(el) {
    const arq = el.files?.[0];
    if (!arq) return;
    try {
      toast('Salvando foto...');
      const blob = await comprimirImagem(arq);
      const id = uid();
      await salvarFoto(id, blob);
      mudar((s) => s.fotos.push({ id, user: s.ativo, data: hoje() }));
      toast('Foto salva 📸');
    } catch (e) {
      toast('Não consegui salvar a foto');
    }
  }
};
