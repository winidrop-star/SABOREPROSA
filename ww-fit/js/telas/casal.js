// Casal: placar da semana, "toca aqui", desafios, recompensas e diário.
import { S, eu, outro, mudar, uid, hoje, somaDias, perdido, pontosSemana, sequencia, dia, fmtData, parseDia } from '../store.js';
import { DESAFIOS_MODELO, TOCA_AQUI, HUMORES } from '../dados.js';
import { abrirSheet, fecharSheet, esc, num, toast, barra, anel, festa, confirmar, tempoRelativo } from '../ui.js';
import { mandarTocaAqui } from './comuns.js';

export function html() {
  const s = S();
  const u = eu();
  const o = outro();
  const [a, b] = [s.usuarios.u1, s.usuarios.u2];
  const pa = pontosSemana('u1');
  const pb = pontosSemana('u2');
  const totalPerdido = Math.round((Math.max(0, perdido('u1')) + Math.max(0, perdido('u2'))) * 10) / 10;
  const recs = [...s.recompensas].sort((x, y) => x.kg - y.kg);
  const prox = recs.find((r) => totalPerdido < r.kg);

  // marca os "toca aqui" recebidos como vistos
  if (s.tocaAqui.some((x) => x.para === u.id && !x.visto)) {
    setTimeout(() => mudar((st) => st.tocaAqui.forEach((x) => { if (x.para === u.id) x.visto = true; })), 800);
  }

  const perfil = (p, pts) => `
    <div>
      ${anel({ valor: pts, max: Math.max(pa, pb, 100), tam: 96, espessura: 9, cor: p.cor, centro: `<span class="avatar lg ${p.cor}" style="width:62px;height:62px;font-size:26px">${esc(p.nome[0])}</span>` })}
      <b style="display:block;margin-top:6px">${esc(p.nome)}</b>
      <span class="stat"><span class="value" style="font-size:22px">${pts}</span><span class="label">pontos</span></span>
      <span class="faint">🔥 ${sequencia(p.id)} ${sequencia(p.id) === 1 ? 'dia' : 'dias'}</span>
    </div>`;

  return `
  <section class="card glow">
    <p class="faint" style="text-align:center;margin-bottom:10px">🏆 Placar da semana (últimos 7 dias)</p>
    <div class="duo">${perfil(a, pa)}<div class="vs">VS</div>${perfil(b, pb)}</div>
    <p class="muted" style="text-align:center;margin-top:12px">${pa === pb ? 'Empate! Que casal equilibrado 😄' : `${esc((pa > pb ? a : b).nome)} está na frente — ${esc((pa > pb ? b : a).nome)}, bora virar! 🔥`}</p>
    <button class="link" style="display:block;margin:8px auto 0" data-a="regras">Como ganhar pontos?</button>
  </section>

  <div class="section-title"><h2>👏 Toca aqui</h2></div>
  <section class="card">
    <p class="faint" style="margin-bottom:10px">Mande um incentivo para ${esc(o.nome)}:</p>
    <div class="chips" style="flex-wrap:wrap">${TOCA_AQUI.map((t, i) => `<button class="chip" data-a="toca" data-i="${i}">${esc(t)}</button>`).join('')}</div>
    <button class="btn ghost block" style="margin-top:10px" data-a="tocaLivre">✍️ Escrever mensagem</button>
    ${s.tocaAqui.length ? `<div style="margin-top:12px">${s.tocaAqui.slice(0, 6).map((x) => `
      <div class="feed-item"><span class="avatar ${s.usuarios[x.de].cor}">${esc(s.usuarios[x.de].nome[0])}</span>
      <div><div class="bubble">${esc(x.texto)}</div><span class="faint">${esc(s.usuarios[x.de].nome)} → ${esc(s.usuarios[x.para].nome)} · ${tempoRelativo(x.ts)}</span></div></div>`).join('')}</div>` : ''}
  </section>

  <div class="section-title"><h2>🎯 Desafios</h2><button class="link" data-a="novoDesafio">＋ novo</button></div>
  ${desafios()}

  <div class="section-title"><h2>🎁 Recompensas</h2><button class="link" data-a="editarRecompensas">editar</button></div>
  <section class="card">
    <div class="row between"><div class="stat"><span class="label">Juntos já perderam</span><span class="value grad-text">${num(totalPerdido, 1)} kg</span></div>
    ${prox ? `<div style="text-align:right"><span class="faint">próxima em</span><br><b>${num(prox.kg - totalPerdido, 1)} kg</b></div>` : '<span style="font-size:30px">👑</span>'}</div>
    <div class="list" style="margin-top:8px">${recs.map((r) => {
      const ok = totalPerdido >= r.kg;
      return `<div class="item"><span class="emoji-box" style="${ok ? 'background:var(--grad-green)' : ''}">${ok ? '✓' : '🎁'}</span>
        <div class="grow"><div class="name">${esc(r.titulo)}</div>${barra(totalPerdido / r.kg, ok ? 'green' : '')}</div>
        <span class="kcal ${ok ? 'text-green' : ''}">−${r.kg} kg</span></div>`;
    }).join('')}</div>
  </section>

  <div class="section-title"><h2>🙏 Diário do casal</h2></div>
  ${diario()}`;
}

function desafios() {
  const s = S();
  const ativos = s.desafios.filter((d) => somaDias(d.inicio, d.dias - 1) >= hoje());
  const antigos = s.desafios.filter((d) => somaDias(d.inicio, d.dias - 1) < hoje()).slice(0, 5);
  const card = (d) => {
    const fim = somaDias(d.inicio, d.dias - 1);
    const acabou = fim < hoje();
    const diaN = Math.min(d.dias, Math.round((parseDia(hoje()) - parseDia(d.inicio)) / 86400000) + 1);
    const linha = (id) => {
      const u = s.usuarios[id];
      const feitos = d.checks[id]?.length || 0;
      const fezHoje = d.checks[id]?.includes(hoje());
      return `<div class="row" style="margin-top:10px">
        <span class="avatar ${u.cor}">${esc(u.nome[0])}</span>
        <div class="grow"><div class="row between faint"><span>${esc(u.nome)}</span><span>${feitos}/${d.dias}</span></div>${barra(feitos / d.dias, u.cor)}</div>
        ${!acabou && id === s.ativo ? `<button class="check ${fezHoje ? 'on' : ''}" data-a="checkDesafio" data-id="${d.id}" aria-label="Cumpri hoje">✓</button>` : ''}
      </div>`;
    };
    const venceu = acabou && ['u1', 'u2'].every((id) => (d.checks[id]?.length || 0) >= d.dias);
    return `<section class="card" style="margin-top:10px">
      <div class="row between"><div class="row" style="gap:10px"><span class="emoji-box">${d.e}</span><div><h3 style="margin:0">${esc(d.titulo)}</h3>
      <p class="faint">${acabou ? (venceu ? '🏆 Concluído pelos dois!' : 'Encerrado em ' + fmtData(fim)) : `Dia ${diaN} de ${d.dias}`}</p></div></div>
      <button class="icon-btn sm" data-a="rmDesafio" data-id="${d.id}" aria-label="Apagar">✕</button></div>
      ${linha('u1')}${linha('u2')}
    </section>`;
  };
  return (ativos.length ? ativos.map(card).join('') : '<section class="card empty"><span class="big">🎯</span>Nenhum desafio ativo. Que tal "7 dias sem refrigerante"?</section>')
    + (antigos.length ? `<details style="margin-top:10px"><summary class="faint" style="cursor:pointer">Desafios anteriores (${antigos.length})</summary>${antigos.map(card).join('')}</details>` : '');
}

function diario() {
  const s = S();
  const dias = [];
  for (let i = 0; i < 14; i++) {
    const d = somaDias(hoje(), -i);
    const ents = ['u1', 'u2'].map((id) => ({ id, ...dia(id, d) })).filter((x) => x.gratidao);
    if (ents.length) dias.push({ d, ents });
  }
  if (!dias.length) return '<section class="card empty"><span class="big">🙏</span>Escrevam no check-in do dia uma gratidão ou um pedido de oração — aparece aqui para os dois.</section>';
  return `<section class="card">${dias.map(({ d, ents }) => `
    <p class="faint" style="margin-top:6px">${d === hoje() ? 'Hoje' : fmtData(d, { weekday: 'long', day: '2-digit', month: 'short' })}</p>
    ${ents.map((x) => `<div class="feed-item"><span class="avatar ${s.usuarios[x.id].cor}">${esc(s.usuarios[x.id].nome[0])}</span>
      <div class="bubble">${x.humor != null ? HUMORES[x.humor] + ' ' : ''}${esc(x.gratidao)}</div></div>`).join('')}`).join('')}
  </section>`;
}

function sheetNovoDesafio() {
  let sel = null;
  const sh = abrirSheet(`
    <h2>🎯 Novo desafio a dois</h2>
    <div class="list">${DESAFIOS_MODELO.map((d, i) => `<button class="item" data-m="${i}" style="width:100%;text-align:left"><span class="emoji-box">${d.e}</span><div class="grow"><div class="name">${esc(d.titulo)}</div><div class="sub">${d.dias} dias</div></div><span class="check">✓</span></button>`).join('')}</div>
    <div class="section-title"><h2 style="font-size:14px">Ou crie o seu</h2></div>
    <div class="form-row"><div class="field"><label>Desafio</label><input class="input" id="t" placeholder="ex.: Sem pão à noite"></div>
    <div class="field"><label>Dias</label><input class="input" id="d" type="number" inputmode="numeric" value="7"></div></div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn" data-ok>Começar hoje</button></div>`);
  sh.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]');
    if (m) {
      sel = DESAFIOS_MODELO[Number(m.dataset.m)];
      sh.querySelectorAll('[data-m] .check').forEach((c) => c.classList.remove('on'));
      m.querySelector('.check').classList.add('on');
      sh.querySelector('#t').value = '';
    }
    if (e.target.closest('[data-ok]')) {
      const t = sh.querySelector('#t').value.trim();
      const d = t ? { titulo: t, e: '⭐', dias: Math.max(1, Number(sh.querySelector('#d').value) || 7) } : sel;
      if (!d) return toast('Escolha ou escreva um desafio');
      mudar((s) => s.desafios.unshift({ id: uid(), ...d, inicio: hoje(), checks: { u1: [], u2: [] } }));
      fecharSheet();
      festa();
      toast('Desafio lançado! Bora! 🚀');
    }
  });
}

function sheetRecompensas() {
  const lista = structuredClone(S().recompensas).sort((a, b) => a.kg - b.kg);
  const linhas = () => lista.map((r, i) => `<div class="row" style="gap:8px;margin-top:8px">
    <input class="input" data-kg="${i}" type="number" inputmode="decimal" value="${r.kg}" style="width:74px">
    <input class="input" data-t="${i}" value="${esc(r.titulo)}">
    <button class="icon-btn sm" data-rm="${i}">✕</button></div>`).join('');
  const sh = abrirSheet(`
    <h2>🎁 Recompensas do casal</h2>
    <p class="faint">Quilos perdidos somando os dois → prêmio combinado</p>
    <div id="l">${linhas()}</div>
    <button class="btn ghost block" style="margin-top:10px" data-add>＋ Recompensa</button>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Salvar</button></div>`);
  sh.addEventListener('input', (e) => {
    if (e.target.dataset.kg) lista[Number(e.target.dataset.kg)].kg = Number(e.target.value);
    if (e.target.dataset.t) lista[Number(e.target.dataset.t)].titulo = e.target.value;
  });
  sh.addEventListener('click', (e) => {
    if (e.target.closest('[data-add]')) { lista.push({ id: uid(), kg: (lista.at(-1)?.kg || 0) + 5, titulo: '' }); sh.querySelector('#l').innerHTML = linhas(); }
    const rm = e.target.closest('[data-rm]');
    if (rm) { lista.splice(Number(rm.dataset.rm), 1); sh.querySelector('#l').innerHTML = linhas(); }
    if (e.target.closest('[data-ok]')) {
      mudar((s) => { s.recompensas = lista.filter((r) => r.kg > 0 && r.titulo.trim()); });
      fecharSheet();
      toast('Recompensas salvas 🎁');
    }
  });
}

function sheetTocaLivre() {
  const sh = abrirSheet(`
    <h2>✍️ Mensagem para ${esc(outro().nome)}</h2>
    <textarea class="input" id="m" placeholder="Escreva algo carinhoso 💚🧡"></textarea>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn" data-ok>Enviar 👏</button></div>`);
  sh.addEventListener('click', (e) => {
    if (!e.target.closest('[data-ok]')) return;
    const t = sh.querySelector('#m').value.trim();
    if (!t) return;
    fecharSheet();
    mandarTocaAqui(t);
  });
}

function sheetRegras() {
  abrirSheet(`
    <h2>🏆 Como ganhar pontos</h2>
    <div class="list">
      ${[['📒', 'Registrar alguma refeição', 10], ['🎯', 'Ficar dentro da meta de calorias', 10], ['💧', 'Bater a meta de água', 10], ['🏋️', 'Treinar ou fazer atividade', 20],
        ['⚖️', 'Pesar', 5], ['😴', 'Registrar o sono', 5], ['🙏', 'Escrever a gratidão do dia', 5], ['✅', 'Cumprir um desafio no dia', 5]]
        .map(([e, t, p]) => `<div class="item"><span class="emoji-box">${e}</span><div class="grow">${t}</div><span class="kcal text-green">+${p}</span></div>`).join('')}
    </div>
    <p class="faint" style="margin-top:10px">O placar soma os últimos 7 dias. Competição saudável — o prêmio é a saúde dos dois! 💚🧡</p>
    <div class="actions"><button class="btn" data-fechar>Entendi</button></div>`);
}

export const acoes = {
  toca(el) { mandarTocaAqui(TOCA_AQUI[Number(el.dataset.i)]); },
  tocaLivre: () => sheetTocaLivre(),
  novoDesafio: () => sheetNovoDesafio(),
  editarRecompensas: () => sheetRecompensas(),
  regras: () => sheetRegras(),
  checkDesafio(el) {
    const id = S().ativo;
    let completou = false;
    mudar((s) => {
      const d = s.desafios.find((x) => x.id === el.dataset.id);
      const l = (d.checks[id] ??= []);
      const i = l.indexOf(hoje());
      if (i >= 0) l.splice(i, 1); else { l.push(hoje()); completou = l.length >= d.dias; }
    });
    if (completou) { festa(); toast('🏆 Desafio completo! Que orgulho!'); } else navigator.vibrate?.(15);
  },
  async rmDesafio(el) {
    if (await confirmar('Apagar este desafio?', 'Apagar')) mudar((s) => { s.desafios = s.desafios.filter((d) => d.id !== el.dataset.id); });
  }
};
