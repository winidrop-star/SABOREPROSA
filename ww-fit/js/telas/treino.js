// Treinos: fichas, sessão com cronômetro de descanso, cardio e calendário.
import { S, eu, mudar, uid, hoje, pesoAtual, fmtData, ultimosDias } from '../store.js';
import { ATIVIDADES } from '../dados.js';
import { abrirSheet, fecharSheet, esc, num, toast, festa, confirmar } from '../ui.js';

let mesOffset = 0;

export function html() {
  const u = eu();
  const planos = S().treinos[u.id] || [];
  const minhas = S().sessoes.filter((x) => x.user === u.id);
  const semana = ultimosDias(7);
  const naSemana = minhas.filter((x) => semana.includes(x.data));
  const kcalSemana = naSemana.reduce((a, x) => a + (x.kcal || 0), 0);
  const minSemana = naSemana.reduce((a, x) => a + (x.min || 0), 0);

  return `
  <section class="card glow">
    <div class="grid-3" style="text-align:center">
      <div class="stat"><span class="value grad-text">${naSemana.length}</span><span class="label">treinos 7d</span></div>
      <div class="stat"><span class="value text-orange">${num(kcalSemana)}</span><span class="label">kcal 7d</span></div>
      <div class="stat"><span class="value text-cyan">${num(minSemana)}</span><span class="label">min 7d</span></div>
    </div>
  </section>

  <div class="section-title"><h2>Minhas fichas</h2><button class="link" data-a="novoPlano">＋ nova</button></div>
  ${planos.map((p) => {
    const ult = minhas.find((x) => x.planoId === p.id);
    return `
    <section class="card" style="margin-top:10px">
      <div class="row">
        <span class="emoji-box" style="width:50px;height:50px;font-size:24px">${p.e || '🏋️'}</span>
        <div class="grow"><h3>${esc(p.nome)}</h3><p class="faint">${p.exercicios.length} exercícios${ult ? ' · último: ' + fmtData(ult.data) : ''}</p></div>
        <button class="icon-btn sm" data-a="editarPlano" data-id="${p.id}" aria-label="Editar">✎</button>
      </div>
      <button class="btn block ${u.cor}" style="margin-top:12px" data-a="iniciar" data-id="${p.id}">▶ Iniciar treino</button>
    </section>`;
  }).join('') || '<div class="card empty"><span class="big">🏋️</span>Crie sua primeira ficha</div>'}

  <button class="btn ghost block" style="margin-top:12px" data-a="cardio">🏃 Registrar caminhada, corrida ou outra atividade</button>

  <div class="section-title">
    <h2>Calendário</h2>
    <div class="row" style="gap:6px"><button class="icon-btn sm" data-a="mesAnt">‹</button><button class="icon-btn sm" data-a="mesProx" ${mesOffset >= 0 ? 'disabled style="opacity:.3"' : ''}>›</button></div>
  </div>
  <section class="card">${calendario(minhas)}</section>

  <div class="section-title"><h2>Histórico</h2></div>
  <section class="card">
    ${minhas.length ? `<div class="list">${minhas.slice(0, 12).map((x) => `
      <div class="item"><span class="emoji-box">${x.e || '🏋️'}</span>
      <div class="grow"><div class="name">${esc(x.nome)}</div><div class="sub">${fmtData(x.data, { weekday: 'short', day: '2-digit', month: 'short' })} · ${x.min} min${x.km ? ' · ' + num(x.km, 1) + ' km' : ''}</div></div>
      <span class="kcal text-orange">${num(x.kcal)} kcal</span>
      <button class="icon-btn sm" data-a="rmSessao" data-id="${x.id}" aria-label="Apagar">✕</button></div>`).join('')}</div>`
      : '<div class="empty"><span class="big">📅</span>Nenhum treino registrado ainda</div>'}
  </section>`;
}

function calendario(sessoes) {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + mesOffset);
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const diasMes = new Date(ano, mes + 1, 0).getDate();
  const inicio = base.getDay();
  const datas = new Set(sessoes.map((x) => x.data));
  const p = (n) => String(n).padStart(2, '0');
  let h = `<p style="text-align:center;font-weight:700;margin-bottom:10px;text-transform:capitalize">${base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p><div class="cal">`;
  h += ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < inicio; i++) h += '<div></div>';
  for (let d = 1; d <= diasMes; d++) {
    const ds = `${ano}-${p(mes + 1)}-${p(d)}`;
    h += `<div class="d ${datas.has(ds) ? 'wk' : ''} ${ds === hoje() ? 'today' : ''}">${d}</div>`;
  }
  return h + '</div>';
}

// ---------- sessão de treino ----------
function sessao(plano) {
  const u = eu();
  const inicio = Date.now();
  const feitos = plano.exercicios.map((ex) => Array(Number(ex.series) || 3).fill(false));
  const cargas = plano.exercicios.map((ex) => ex.carga || '');
  let descanso = 60;
  let fimDescanso = 0;
  let tick;

  const sh = abrirSheet(`
    <div class="row between"><h2 style="margin:0">${plano.e || '🏋️'} ${esc(plano.nome)}</h2></div>
    <div class="card" style="margin:12px 0;text-align:center">
      <div class="row between">
        <div class="stat" style="text-align:left"><span class="label">Tempo</span><span class="value" id="t-total">00:00</span></div>
        <div class="stat" style="text-align:right"><span class="label">Descanso</span><span class="value text-cyan" id="t-desc">—</span></div>
      </div>
      <div class="chips" style="margin-top:10px;justify-content:center">${[45, 60, 90, 120].map((s) => `<button class="chip ${s === 60 ? 'on' : ''}" data-desc="${s}">${s}s</button>`).join('')}</div>
    </div>
    <div id="exs">${plano.exercicios.map((ex, i) => `
      <div class="card" style="margin-top:10px">
        <div class="row between"><b>${esc(ex.nome)}</b><span class="pill">${ex.series}× ${esc(ex.reps)}</span></div>
        <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
          ${feitos[i].map((_, j) => `<button class="check set" data-set="${i}-${j}" aria-label="Série ${j + 1}">${j + 1}</button>`).join('')}
          <span class="spacer"></span>
          <input class="input" data-carga="${i}" value="${esc(cargas[i])}" placeholder="carga kg" style="width:96px;height:38px">
        </div>
      </div>`).join('')}</div>
    <div class="actions"><button class="btn ghost" data-sair>Cancelar</button><button class="btn ${u.cor}" data-fim>Concluir ✅</button></div>`, { fixo: true });

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  tick = setInterval(() => {
    if (!document.body.contains(sh)) return clearInterval(tick);
    sh.querySelector('#t-total').textContent = fmt(Math.floor((Date.now() - inicio) / 1000));
    const el = sh.querySelector('#t-desc');
    if (fimDescanso) {
      const r = Math.ceil((fimDescanso - Date.now()) / 1000);
      if (r <= 0) {
        fimDescanso = 0;
        el.textContent = 'Bora! 💥';
        navigator.vibrate?.([200, 100, 200]);
        bip();
      } else el.textContent = fmt(r);
    }
  }, 250);

  sh.addEventListener('input', (e) => {
    const c = e.target.closest('[data-carga]');
    if (c) cargas[Number(c.dataset.carga)] = c.value;
  });
  sh.addEventListener('click', async (e) => {
    const d = e.target.closest('[data-desc]');
    if (d) {
      descanso = Number(d.dataset.desc);
      sh.querySelectorAll('[data-desc]').forEach((b) => b.classList.toggle('on', b === d));
    }
    const s = e.target.closest('[data-set]');
    if (s) {
      const [i, j] = s.dataset.set.split('-').map(Number);
      feitos[i][j] = !feitos[i][j];
      s.classList.toggle('on', feitos[i][j]);
      s.textContent = feitos[i][j] ? '✓' : String(j + 1);
      if (feitos[i][j]) { fimDescanso = Date.now() + descanso * 1000; navigator.vibrate?.(20); }
    }
    const sair = e.target.closest('[data-sair]');
    if (sair) {
      if (sair.dataset.certeza) { clearInterval(tick); fecharSheet(); return; }
      sair.dataset.certeza = '1';
      sair.textContent = 'Sair sem salvar?';
      sair.classList.replace('ghost', 'danger');
    }
    if (e.target.closest('[data-fim]')) {
      clearInterval(tick);
      const min = Math.max(1, Math.round((Date.now() - inicio) / 60000));
      const total = feitos.flat().length;
      const feitas = feitos.flat().filter(Boolean).length;
      const kcal = Math.round(5 * pesoAtual(u.id) * (min / 60));
      mudar((st) => {
        st.sessoes.unshift({ id: uid(), user: u.id, data: hoje(), planoId: plano.id, nome: plano.nome, e: plano.e, min, kcal, series: `${feitas}/${total}` });
        const p = st.treinos[u.id].find((x) => x.id === plano.id);
        if (p) p.exercicios.forEach((ex, i) => { ex.carga = cargas[i]; });
      });
      fecharSheet();
      festa();
      toast(`💪 Treino concluído! ${min} min · ~${kcal} kcal`);
    }
  });
}

let audioCtx;
function bip() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.2, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.5);
  } catch (e) { /* sem som */ }
}

// ---------- editar ficha ----------
function editarPlano(planoOriginal) {
  const u = eu();
  const novo = !planoOriginal;
  const p = structuredClone(planoOriginal || { id: uid(), nome: '', e: '🏋️', exercicios: [{ nome: '', series: 3, reps: '12', carga: '' }] });
  const EMOJIS = ['🏋️', '🦵', '💪', '🔥', '🏠', '🧘', '🏃', '⚡'];
  const linhas = () => p.exercicios.map((ex, i) => `
    <div class="card" style="margin-top:8px;padding:12px">
      <div class="row" style="gap:8px"><input class="input" data-f="nome" data-i="${i}" value="${esc(ex.nome)}" placeholder="Exercício"><button class="icon-btn sm" data-rm="${i}">✕</button></div>
      <div class="grid-3" style="margin-top:8px">
        <input class="input" data-f="series" data-i="${i}" type="number" inputmode="numeric" value="${esc(ex.series)}" placeholder="séries">
        <input class="input" data-f="reps" data-i="${i}" value="${esc(ex.reps)}" placeholder="reps">
        <input class="input" data-f="carga" data-i="${i}" value="${esc(ex.carga)}" placeholder="carga">
      </div>
    </div>`).join('');
  const sh = abrirSheet(`
    <h2>${novo ? 'Nova ficha' : 'Editar ficha'}</h2>
    <div class="field"><label>Nome</label><input class="input" id="nome" value="${esc(p.nome)}" placeholder="ex.: Treino D — Costas"></div>
    <div class="chips" style="margin-top:10px">${EMOJIS.map((e) => `<button class="chip ${p.e === e ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div>
    <p class="faint" style="margin-top:12px">Séries · repetições · carga</p>
    <div id="linhas">${linhas()}</div>
    <button class="btn ghost block" style="margin-top:10px" data-add>＋ Exercício</button>
    <div class="actions">${novo ? '' : '<button class="btn danger" data-apagar>Apagar</button>'}<button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Salvar</button></div>`);
  sh.addEventListener('input', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) p.exercicios[Number(f.dataset.i)][f.dataset.f] = f.value;
    if (e.target.id === 'nome') p.nome = e.target.value;
  });
  sh.addEventListener('click', async (e) => {
    const em = e.target.closest('[data-emoji]');
    if (em) { p.e = em.dataset.emoji; sh.querySelectorAll('[data-emoji]').forEach((b) => b.classList.toggle('on', b === em)); }
    if (e.target.closest('[data-add]')) { p.exercicios.push({ nome: '', series: 3, reps: '12', carga: '' }); sh.querySelector('#linhas').innerHTML = linhas(); }
    const rm = e.target.closest('[data-rm]');
    if (rm) { p.exercicios.splice(Number(rm.dataset.rm), 1); sh.querySelector('#linhas').innerHTML = linhas(); }
    if (e.target.closest('[data-apagar]')) {
      if (await confirmar(`Apagar a ficha "${p.nome}"?`, 'Apagar')) mudar((s) => { s.treinos[u.id] = s.treinos[u.id].filter((x) => x.id !== p.id); });
      return;
    }
    if (e.target.closest('[data-ok]')) {
      p.exercicios = p.exercicios.filter((x) => x.nome.trim());
      if (!p.nome.trim() || !p.exercicios.length) return toast('Dê um nome e adicione exercícios');
      mudar((s) => {
        const lista = s.treinos[u.id];
        const i = lista.findIndex((x) => x.id === p.id);
        if (i >= 0) lista[i] = p; else lista.push(p);
      });
      fecharSheet();
      toast('Ficha salva ✅');
    }
  });
}

// ---------- cardio / outras atividades ----------
function sheetCardio() {
  const u = eu();
  let ativ = ATIVIDADES[1];
  const sh = abrirSheet(`
    <h2>🏃 Registrar atividade</h2>
    <div class="chips" style="flex-wrap:wrap">${ATIVIDADES.map((a) => `<button class="chip ${a.id === ativ.id ? 'on' : ''}" data-at="${a.id}">${a.e} ${a.nome}</button>`).join('')}</div>
    <div class="form-row" style="margin-top:14px">
      <div class="field"><label>Minutos</label><input class="input" id="min" type="number" inputmode="numeric" value="30"></div>
      <div class="field"><label>Distância (km) — opcional</label><input class="input" id="km" type="number" step="0.1" inputmode="decimal"></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Data</label><input class="input" id="data" type="date" value="${hoje()}" max="${hoje()}"></div>
    <p class="faint" id="est" style="margin-top:10px"></p>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn orange" data-ok>Salvar</button></div>`);
  const est = () => {
    const min = Number(sh.querySelector('#min').value) || 0;
    const k = Math.round(ativ.met * pesoAtual(u.id) * (min / 60));
    sh.querySelector('#est').textContent = `Gasto estimado: ~${k} kcal`;
    return k;
  };
  est();
  sh.addEventListener('input', est);
  sh.addEventListener('click', (e) => {
    const a = e.target.closest('[data-at]');
    if (a) { ativ = ATIVIDADES.find((x) => x.id === a.dataset.at); sh.querySelectorAll('[data-at]').forEach((b) => b.classList.toggle('on', b === a)); est(); }
    if (e.target.closest('[data-ok]')) {
      const min = Number(sh.querySelector('#min').value);
      if (!min) return toast('Informe os minutos');
      const kcal = est();
      mudar((s) => s.sessoes.unshift({ id: uid(), user: u.id, data: sh.querySelector('#data').value || hoje(), nome: ativ.nome, e: ativ.e, min, km: Number(sh.querySelector('#km').value) || 0, kcal }));
      s_sort();
      fecharSheet();
      festa();
      toast(`${ativ.e} ${ativ.nome} registrada! ~${kcal} kcal`);
    }
  });
}
function s_sort() { mudar((s) => s.sessoes.sort((a, b) => b.data.localeCompare(a.data))); }

export const acoes = {
  iniciar(el) { sessao(S().treinos[eu().id].find((p) => p.id === el.dataset.id)); },
  editarPlano(el) { editarPlano(S().treinos[eu().id].find((p) => p.id === el.dataset.id)); },
  novoPlano: () => editarPlano(null),
  cardio: () => sheetCardio(),
  mesAnt() { mesOffset--; mudar(() => {}); },
  mesProx() { if (mesOffset < 0) mesOffset++; mudar(() => {}); },
  async rmSessao(el) { if (await confirmar('Apagar este registro de treino?', 'Apagar')) mudar((s) => { s.sessoes = s.sessoes.filter((x) => x.id !== el.dataset.id); }); }
};
