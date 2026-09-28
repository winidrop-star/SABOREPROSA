// Comida: diário, pratos salvos, cardápio da semana, compras, receitas e jejum.
import { S, eu, mudar, mudarQuieto, editarDia, dia, hoje, metas, totaisDia, uid, somaDias, fmtData } from '../store.js';
import { ALIMENTOS, REFEICOES } from '../dados.js';
import { abrirSheet, fecharSheet, esc, num, toast, barra, anel, confirmar, festa } from '../ui.js';

const ABAS = [['diario', '📒 Diário'], ['pratos', '⭐ Pratos'], ['cardapio', '🗓️ Cardápio'], ['compras', '🛒 Compras'], ['receitas', '👩‍🍳 Receitas'], ['jejum', '⏱️ Jejum']];
let aba = 'diario';
let dataSel = hoje();
let timerJejum;

export function html() {
  const pedida = sessionStorage.getItem('ww:comidaAba');
  if (pedida) { aba = pedida; sessionStorage.removeItem('ww:comidaAba'); }
  clearInterval(timerJejum);
  const corpo = { diario, pratos, cardapio, compras, receitas, jejum }[aba]();
  return `<div class="seg" style="margin-bottom:14px">${ABAS.map(([id, t]) => `<button class="${aba === id ? 'on' : ''}" data-a="aba" data-id="${id}">${t}</button>`).join('')}</div>${corpo}`;
}

export function montar(app) {
  if (aba === 'jejum') {
    timerJejum = setInterval(() => {
      const el = app.querySelector('#jejum-tempo');
      if (!el) return clearInterval(timerJejum);
      const j = S().jejum[eu().id];
      if (j) el.textContent = duracao(Date.now() - j.inicio);
    }, 1000);
  }
}

// ---------- diário ----------
function diario() {
  const u = eu();
  const m = metas(u.id);
  const t = totaisDia(u.id, dataSel);
  const d = dia(u.id, dataSel);
  const macro = (nome, v, meta, cor) => `<div><div class="row between faint"><span>${nome}</span><span>${num(v)}${meta ? ' / ' + meta : ''} g</span></div>${barra(meta ? v / meta : 0.0001, cor)}</div>`;
  return `
  <div class="row between" style="margin-bottom:12px">
    <button class="icon-btn" data-a="diaAnt" aria-label="Dia anterior">‹</button>
    <div style="text-align:center"><b>${dataSel === hoje() ? 'Hoje' : fmtData(dataSel, { weekday: 'long', day: '2-digit', month: 'short' })}</b><div class="faint">${esc(u.nome)}</div></div>
    <button class="icon-btn" data-a="diaProx" ${dataSel === hoje() ? 'disabled style="opacity:.3"' : ''} aria-label="Próximo dia">›</button>
  </div>
  <section class="card">
    <div class="row" style="gap:16px">
      ${anel({ valor: t.kcal, max: m.kcal, tam: 110, cor: t.kcal > m.kcal ? 'pink' : 'green', centro: `<div class="stat"><span class="value" style="font-size:22px">${num(t.kcal)}</span><span class="label">de ${num(m.kcal)}</span></div>` })}
      <div class="grow stack">
        ${macro('Proteína', t.p, m.prot, 'green')}
        ${macro('Carboidrato', t.c, Math.round((m.kcal * 0.45) / 4), 'cyan')}
        ${macro('Gordura', t.g, Math.round((m.kcal * 0.28) / 9), 'orange')}
      </div>
    </div>
  </section>
  ${REFEICOES.map((r) => {
    const itens = d.refeicoes?.[r.id] || [];
    const kcal = itens.reduce((a, x) => a + x.kcal, 0);
    return `
    <section class="card" style="margin-top:12px">
      <div class="row between">
        <div class="row" style="gap:10px"><span class="emoji-box">${r.e}</span><div><h3 style="margin:0">${r.nome}</h3><p class="faint">${num(kcal)} kcal</p></div></div>
        <button class="btn sm" data-a="addItem" data-ref="${r.id}">＋</button>
      </div>
      ${itens.length ? `<div class="list" style="margin-top:6px">${itens.map((it, i) => `
        <div class="item"><div class="grow"><div class="name">${esc(it.nome)}</div><div class="sub">${esc(it.qtd)} · P ${num(it.p)}g</div></div>
        <span class="kcal">${num(it.kcal)}</span><button class="icon-btn sm" data-a="rmItem" data-ref="${r.id}" data-i="${i}" aria-label="Remover">✕</button></div>`).join('')}</div>` : ''}
    </section>`;
  }).join('')}`;
}

function sheetAdicionar(refId) {
  const u = eu();
  const pratos = S().pratos;
  const rec = [...new Map(
    Object.values(S().dias).flatMap((dd) => Object.values(dd[u.id]?.refeicoes || {}).flat()).reverse()
      .filter((x) => x.alimentoId).map((x) => [x.alimentoId, x])
  ).keys()].slice(0, 8).map((id) => ALIMENTOS.find((a) => a.id === id)).filter(Boolean);

  const sh = abrirSheet(`
    <h2>Adicionar em ${esc(REFEICOES.find((r) => r.id === refId).nome)}</h2>
    <input class="input" id="busca" placeholder="🔎 Buscar alimento (ex.: arroz, frango...)" autocomplete="off">
    ${pratos.length ? `<div class="section-title" style="margin-top:14px"><h2 style="font-size:14px">⭐ Pratos salvos</h2></div>
      <div class="chips">${pratos.map((p) => `<button class="chip" data-prato="${p.id}">${esc(p.nome)} · ${num(p.kcal)}</button>`).join('')}</div>` : ''}
    ${rec.length ? `<div class="section-title" style="margin-top:14px"><h2 style="font-size:14px">🕘 Recentes</h2></div>
      <div class="chips">${rec.map((a) => `<button class="chip" data-al="${a.id}">${a.e} ${esc(a.nome)}</button>`).join('')}</div>` : ''}
    <div class="list" id="res" style="margin-top:8px"></div>
    <button class="btn ghost block" style="margin-top:12px" data-livre>✍️ Adicionar manualmente (nome + kcal)</button>`);
  const busca = sh.querySelector('#busca');
  const res = sh.querySelector('#res');
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const listar = () => {
    const q = norm(busca.value.trim());
    const lista = ALIMENTOS.filter((a) => !q || norm(a.nome).includes(q)).slice(0, q ? 30 : 12);
    res.innerHTML = lista.map((a) => `
      <button class="item" data-al="${a.id}" style="width:100%;text-align:left">
        <span class="emoji-box">${a.e}</span>
        <div class="grow"><div class="name">${esc(a.nome)}</div><div class="sub">${a.porcao[0]} (${a.porcao[1]} g) · ${Math.round((a.kcal * a.porcao[1]) / 100)} kcal</div></div>
        <span class="text-cyan" style="font-size:22px">＋</span>
      </button>`).join('') || '<div class="empty">Nada encontrado. Use "Adicionar manualmente".</div>';
  };
  listar();
  busca.addEventListener('input', listar);
  sh.addEventListener('click', (e) => {
    const al = e.target.closest('[data-al]');
    if (al) return sheetQuantidade(refId, ALIMENTOS.find((a) => a.id === al.dataset.al));
    const pr = e.target.closest('[data-prato]');
    if (pr) {
      const p = S().pratos.find((x) => x.id === pr.dataset.prato);
      editarDia(u.id, dataSel, (d) => {
        d.refeicoes[refId] ??= [];
        d.refeicoes[refId].push({ nome: '⭐ ' + p.nome, qtd: '1 prato', kcal: p.kcal, p: p.p || 0, c: p.c || 0, g: p.g || 0 });
      });
      fecharSheet();
      toast(`${p.nome} adicionado ✅`);
    }
    if (e.target.closest('[data-livre]')) sheetLivre(refId);
  });
}

function sheetQuantidade(refId, a) {
  let modo = 'porcao';
  const sh = abrirSheet(`
    <h2>${a.e} ${esc(a.nome)}</h2>
    <div class="seg" style="margin-bottom:14px"><button class="on" data-modo="porcao">Porções</button><button data-modo="gramas">Gramas</button></div>
    <div class="stepper" style="justify-content:center">
      <button class="icon-btn" data-d="-1">−</button>
      <input class="input" id="qtd" type="number" step="0.5" inputmode="decimal" value="1" style="width:110px;text-align:center;font-size:22px;font-weight:700">
      <button class="icon-btn" data-d="1">+</button>
    </div>
    <p class="faint" id="unid" style="text-align:center;margin-top:8px"></p>
    <div class="grid-3" style="margin-top:14px;text-align:center" id="res"></div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Adicionar</button></div>`);
  const q = sh.querySelector('#qtd');
  const gramas = () => {
    const v = Number(String(q.value).replace(',', '.')) || 0;
    return modo === 'porcao' ? v * a.porcao[1] : v;
  };
  const atualizar = () => {
    const g = gramas();
    sh.querySelector('#unid').textContent = modo === 'porcao' ? `${a.porcao[0]} = ${a.porcao[1]} g · total ${Math.round(g)} g` : 'gramas (ou ml)';
    sh.querySelector('#res').innerHTML = `
      <div class="stat"><span class="value text-cyan" style="font-size:22px">${Math.round((a.kcal * g) / 100)}</span><span class="label">kcal</span></div>
      <div class="stat"><span class="value text-green" style="font-size:22px">${num((a.p * g) / 100, 1)}</span><span class="label">proteína</span></div>
      <div class="stat"><span class="value text-orange" style="font-size:22px">${num((a.c * g) / 100, 1)}</span><span class="label">carbo</span></div>`;
  };
  atualizar();
  q.addEventListener('input', atualizar);
  sh.addEventListener('click', (e) => {
    const md = e.target.closest('[data-modo]');
    if (md && md.dataset.modo !== modo) {
      const g = gramas();
      modo = md.dataset.modo;
      sh.querySelectorAll('[data-modo]').forEach((b) => b.classList.toggle('on', b === md));
      q.value = modo === 'porcao' ? Math.round((g / a.porcao[1]) * 2) / 2 : Math.round(g);
      q.step = modo === 'porcao' ? '0.5' : '10';
      atualizar();
    }
    const d = e.target.closest('[data-d]');
    if (d) {
      const passo = modo === 'porcao' ? 0.5 : 10;
      q.value = Math.max(0, (Number(q.value) || 0) + Number(d.dataset.d) * passo);
      atualizar();
    }
    if (e.target.closest('[data-ok]')) {
      const g = gramas();
      if (!g) return toast('Informe a quantidade');
      const qtd = modo === 'porcao' ? `${num(Number(q.value), 1).replace(/,0$/, '')}× ${a.porcao[0]}` : `${Math.round(g)} g`;
      editarDia(eu().id, dataSel, (dd) => {
        dd.refeicoes[refId] ??= [];
        dd.refeicoes[refId].push({
          alimentoId: a.id, nome: a.nome, qtd, gramas: Math.round(g),
          kcal: Math.round((a.kcal * g) / 100), p: (a.p * g) / 100, c: (a.c * g) / 100, g: (a.g * g) / 100
        });
      });
      fecharSheet();
      toast(`${a.e} ${a.nome} adicionado`);
    }
  });
}

function sheetLivre(refId) {
  const sh = abrirSheet(`
    <h2>✍️ Adicionar manualmente</h2>
    <div class="field"><label>O que comeu?</label><input class="input" id="nome" placeholder="ex.: Marmita de frango com arroz"></div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>Calorias (kcal)</label><input class="input" id="kcal" type="number" inputmode="numeric"></div>
      <div class="field"><label>Proteína (g) — opcional</label><input class="input" id="p" type="number" inputmode="decimal"></div>
    </div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Adicionar</button></div>`);
  sh.addEventListener('click', (e) => {
    if (!e.target.closest('[data-ok]')) return;
    const nome = sh.querySelector('#nome').value.trim();
    const kcal = Number(sh.querySelector('#kcal').value);
    if (!nome || !kcal) return toast('Preencha o nome e as calorias');
    editarDia(eu().id, dataSel, (d) => {
      d.refeicoes[refId] ??= [];
      d.refeicoes[refId].push({ nome, qtd: 'manual', kcal, p: Number(sh.querySelector('#p').value) || 0, c: 0, g: 0 });
    });
    fecharSheet();
    toast('Adicionado ✅');
  });
}

// ---------- pratos salvos ----------
function pratos() {
  const lista = S().pratos;
  return `
  <p class="muted" style="margin-bottom:12px">Salve os pratos que vocês comem sempre (a marmita, o café de sempre) e registre com um toque.</p>
  <button class="btn block" data-a="novoPrato">＋ Novo prato</button>
  <section class="card" style="margin-top:12px">
    ${lista.length ? `<div class="list">${lista.map((p) => `
      <div class="item"><span class="emoji-box">⭐</span><div class="grow"><div class="name">${esc(p.nome)}</div><div class="sub">${esc(p.desc || '')} · P ${num(p.p)}g</div></div>
      <span class="kcal">${num(p.kcal)}</span><button class="icon-btn sm" data-a="rmPrato" data-id="${p.id}" aria-label="Apagar">✕</button></div>`).join('')}</div>`
      : '<div class="empty"><span class="big">⭐</span>Nenhum prato salvo ainda</div>'}
  </section>`;
}

function sheetNovoPrato() {
  const itens = [];
  const sh = abrirSheet(`
    <h2>⭐ Novo prato</h2>
    <div class="field"><label>Nome do prato</label><input class="input" id="nome" placeholder="ex.: Marmita de frango"></div>
    <div class="field"><label>Adicionar ingrediente</label>
      <div class="row" style="gap:8px">
        <select class="input" id="al">${ALIMENTOS.map((a) => `<option value="${a.id}">${a.e} ${esc(a.nome)}</option>`).join('')}</select>
        <input class="input" id="g" type="number" inputmode="numeric" placeholder="g" style="width:84px">
        <button class="icon-btn" data-add>＋</button>
      </div>
    </div>
    <div class="list" id="lista"></div>
    <p id="total" class="faint" style="margin-top:8px"></p>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Salvar prato</button></div>`);
  const desenhar = () => {
    sh.querySelector('#lista').innerHTML = itens.map((it, i) => `<div class="item"><div class="grow">${esc(it.nome)} · ${it.gramas} g</div><span class="kcal">${it.kcal}</span><button class="icon-btn sm" data-rm="${i}">✕</button></div>`).join('');
    const k = itens.reduce((a, x) => a + x.kcal, 0);
    sh.querySelector('#total').textContent = itens.length ? `Total: ${k} kcal` : 'Adicione os ingredientes com as gramas';
  };
  desenhar();
  sh.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) {
      const a = ALIMENTOS.find((x) => x.id === sh.querySelector('#al').value);
      const g = Number(sh.querySelector('#g').value) || a.porcao[1];
      itens.push({ nome: a.nome, gramas: g, kcal: Math.round((a.kcal * g) / 100), p: (a.p * g) / 100, c: (a.c * g) / 100, g: (a.g * g) / 100 });
      sh.querySelector('#g').value = '';
      desenhar();
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) { itens.splice(Number(rm.dataset.rm), 1); desenhar(); }
    if (e.target.closest('[data-ok]')) {
      const nome = sh.querySelector('#nome').value.trim();
      if (!nome || !itens.length) return toast('Dê um nome e adicione ingredientes');
      const soma = (k) => itens.reduce((a, x) => a + x[k], 0);
      mudar((s) => s.pratos.push({ id: uid(), nome, desc: itens.map((x) => x.nome).join(', '), kcal: Math.round(soma('kcal')), p: soma('p'), c: soma('c'), g: soma('g') }));
      fecharSheet();
      toast('Prato salvo ⭐');
    }
  });
}

// ---------- cardápio da semana ----------
const DIAS_SEM = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']];
function cardapio() {
  const c = S().cardapio;
  const hojeSem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date().getDay()];
  return `
  <p class="muted" style="margin-bottom:12px">Planejem juntos no domingo — quem planeja não improvisa no fast-food 😉</p>
  ${DIAS_SEM.map(([id, nome]) => `
  <section class="card ${id === hojeSem ? 'glow' : ''}" style="margin-top:10px">
    <div class="row between"><h3>${nome}</h3>${id === hojeSem ? '<span class="pill violet">hoje</span>' : ''}</div>
    <div class="form-row" style="margin-top:8px">
      <div class="field"><label>☀️ Almoço</label><input class="input" data-muda="cardapio" data-dia="${id}" data-ref="almoco" value="${esc(c[id]?.almoco || '')}" placeholder="—"></div>
      <div class="field"><label>🌙 Jantar</label><input class="input" data-muda="cardapio" data-dia="${id}" data-ref="jantar" value="${esc(c[id]?.jantar || '')}" placeholder="—"></div>
    </div>
  </section>`).join('')}`;
}

// ---------- compras ----------
function compras() {
  const l = S().compras;
  const pend = l.filter((x) => !x.ok);
  const ok = l.filter((x) => x.ok);
  const linha = (x) => `<button class="item" data-a="marcar" data-id="${x.id}" style="width:100%;text-align:left"><span class="check ${x.ok ? 'on' : ''}">✓</span><span class="grow" style="${x.ok ? 'text-decoration:line-through;color:var(--text-3)' : ''}">${esc(x.texto)}</span></button>`;
  return `
  <form class="row" id="form-compra" style="gap:8px">
    <input class="input" id="nova-compra" placeholder="Adicionar item (ex.: frango, ovos...)" autocomplete="off">
    <button class="btn" type="submit" aria-label="Adicionar">＋</button>
  </form>
  <section class="card" style="margin-top:12px">
    ${pend.length ? `<div class="list">${pend.map(linha).join('')}</div>` : '<div class="empty"><span class="big">🛒</span>Lista vazia</div>'}
  </section>
  ${ok.length ? `<div class="section-title"><h2>No carrinho (${ok.length})</h2><button class="link" data-a="limparCompras">limpar</button></div>
  <section class="card"><div class="list">${ok.map(linha).join('')}</div></section>` : ''}`;
}

// ---------- receitas ----------
function receitas() {
  return `
  <button class="btn block" data-a="novaReceita">＋ Nova receita</button>
  ${S().receitas.map((r) => `
  <button class="card" data-a="verReceita" data-id="${r.id}" style="width:100%;text-align:left;margin-top:12px;display:block">
    <div class="row"><span class="emoji-box" style="width:52px;height:52px;font-size:26px">${r.e || '🍽️'}</span>
    <div class="grow"><h3>${esc(r.titulo)}</h3><p class="faint">${r.kcal ? `~${r.kcal} kcal/porção` : ''}${r.tempo ? ' · ⏱ ' + esc(r.tempo) : ''}</p></div><span class="muted">›</span></div>
  </button>`).join('')}`;
}

function sheetReceita(r) {
  const sh = abrirSheet(`
    <h2>${r.e || '🍽️'} ${esc(r.titulo)}</h2>
    <p class="faint">${r.kcal ? `~${r.kcal} kcal/porção` : ''}${r.tempo ? ' · ⏱ ' + esc(r.tempo) : ''}</p>
    <div class="section-title"><h2>Ingredientes</h2></div>
    <ul style="margin:0;padding-left:20px" class="muted">${String(r.ingredientes || '').split('\n').filter(Boolean).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    <div class="section-title"><h2>Modo de preparo</h2></div>
    <p class="muted" style="white-space:pre-line">${esc(r.preparo || '')}</p>
    <div class="actions"><button class="btn danger" data-rm>Apagar</button><button class="btn ghost" data-fechar>Fechar</button></div>`);
  sh.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-rm]')) return;
    if (await confirmar('Apagar esta receita?', 'Apagar')) mudar((s) => { s.receitas = s.receitas.filter((x) => x.id !== r.id); });
  });
}

function sheetNovaReceita() {
  const sh = abrirSheet(`
    <h2>👩‍🍳 Nova receita</h2>
    <div class="field"><label>Nome</label><input class="input" id="t" placeholder="ex.: Escondidinho fit"></div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>kcal por porção</label><input class="input" id="k" type="number" inputmode="numeric"></div>
      <div class="field"><label>Tempo</label><input class="input" id="tp" placeholder="ex.: 30 min"></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Ingredientes (um por linha)</label><textarea class="input" id="i"></textarea></div>
    <div class="field"><label>Modo de preparo</label><textarea class="input" id="p"></textarea></div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Salvar</button></div>`);
  sh.addEventListener('click', (e) => {
    if (!e.target.closest('[data-ok]')) return;
    const titulo = sh.querySelector('#t').value.trim();
    if (!titulo) return toast('Dê um nome para a receita');
    mudar((s) => s.receitas.unshift({ id: uid(), titulo, e: '🍽️', kcal: Number(sh.querySelector('#k').value) || 0, tempo: sh.querySelector('#tp').value.trim(), ingredientes: sh.querySelector('#i').value, preparo: sh.querySelector('#p').value }));
    fecharSheet();
    toast('Receita salva 👩‍🍳');
  });
}

// ---------- jejum ----------
function duracao(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
function jejum() {
  const u = eu();
  const j = S().jejum[u.id];
  const metaH = j?.metaH || 14;
  const decorrido = j ? Date.now() - j.inicio : 0;
  const frac = decorrido / (metaH * 3600000);
  return `
  <section class="card" style="text-align:center">
    <p class="faint">Jejum intermitente de ${esc(u.nome)} — opcional, combine com seu médico/nutricionista.</p>
    <div style="display:grid;place-items:center;margin:16px 0">
      ${anel({ valor: Math.min(frac, 1), max: 1, tam: 210, espessura: 14, cor: frac >= 1 ? 'green' : 'cyan',
        centro: `<div><div class="timer-big" id="jejum-tempo">${duracao(decorrido)}</div><div class="faint">${j ? `meta ${metaH}h · termina ${new Date(j.inicio + metaH * 3600000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'parado'}</div></div>` })}
    </div>
    ${j ? `<button class="btn block orange" data-a="pararJejum">Encerrar jejum</button>`
      : `<div class="chips" style="justify-content:center;margin-bottom:12px">${[12, 14, 16, 18].map((h) => `<button class="chip ${h === 14 ? 'on' : ''}" data-a="metaJejum" data-h="${h}">${h}h</button>`).join('')}</div>
         <button class="btn block" data-a="iniciarJejum">Iniciar jejum</button>`}
  </section>
  ${(S().jejumHist?.[u.id] || []).length ? `<div class="section-title"><h2>Últimos jejuns</h2></div>
  <section class="card"><div class="list">${S().jejumHist[u.id].slice(0, 7).map((x) => `<div class="item"><div class="grow">${fmtData(x.data)}</div><span class="kcal ${x.horas >= x.metaH ? 'text-green' : ''}">${num(x.horas, 1)}h / ${x.metaH}h</span></div>`).join('')}</div></section>` : ''}`;
}
let metaJejumSel = 14;

export const acoes = {
  aba(el) { aba = el.dataset.id; mudar(() => {}); },
  diaAnt() { dataSel = somaDias(dataSel, -1); mudar(() => {}); },
  diaProx() { if (dataSel < hoje()) dataSel = somaDias(dataSel, 1); mudar(() => {}); },
  addItem(el) { sheetAdicionar(el.dataset.ref); },
  rmItem(el) { editarDia(eu().id, dataSel, (d) => d.refeicoes[el.dataset.ref].splice(Number(el.dataset.i), 1)); },
  novoPrato: () => sheetNovoPrato(),
  async rmPrato(el) { if (await confirmar('Apagar este prato?', 'Apagar')) mudar((s) => { s.pratos = s.pratos.filter((p) => p.id !== el.dataset.id); }); },
  cardapio(el) { mudarQuieto((s) => { s.cardapio[el.dataset.dia] ??= {}; s.cardapio[el.dataset.dia][el.dataset.ref] = el.value.trim(); }); },
  addCompra(el, e) {
    e.preventDefault();
    const inp = document.getElementById('nova-compra');
    const texto = inp.value.trim();
    if (!texto) return;
    mudar((s) => s.compras.unshift({ id: uid(), texto, ok: false }));
    setTimeout(() => document.getElementById('nova-compra')?.focus(), 30);
  },
  marcar(el) { mudar((s) => { const x = s.compras.find((c) => c.id === el.dataset.id); if (x) x.ok = !x.ok; }); },
  limparCompras() { mudar((s) => { s.compras = s.compras.filter((x) => !x.ok); }); },
  novaReceita: () => sheetNovaReceita(),
  verReceita(el) { sheetReceita(S().receitas.find((r) => r.id === el.dataset.id)); },
  metaJejum(el) {
    metaJejumSel = Number(el.dataset.h);
    document.querySelectorAll('[data-a="metaJejum"]').forEach((b) => b.classList.toggle('on', b === el));
  },
  iniciarJejum() { const id = eu().id; mudar((s) => { s.jejum[id] = { inicio: Date.now(), metaH: metaJejumSel }; }); toast('⏱️ Jejum iniciado. Beba bastante água!'); },
  pararJejum() {
    const id = eu().id;
    const j = S().jejum[id];
    const horas = (Date.now() - j.inicio) / 3600000;
    mudar((s) => {
      s.jejumHist ??= {};
      s.jejumHist[id] ??= [];
      s.jejumHist[id].unshift({ data: hoje(), horas: Math.round(horas * 10) / 10, metaH: j.metaH });
      s.jejum[id] = null;
    });
    if (horas >= j.metaH) { festa(); toast(`🎉 Meta de ${j.metaH}h cumprida!`); } else toast(`Jejum de ${num(horas, 1)}h registrado`);
  }
};

// evita recarregar a página ao apertar Enter na lista de compras
document.addEventListener('submit', (e) => {
  if (e.target.id === 'form-compra') { e.preventDefault(); acoes.addCompra(null, e); }
});
