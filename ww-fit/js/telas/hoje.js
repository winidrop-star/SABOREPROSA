// Tela inicial: mensagem do dia, calorias, água, sequência e casal.
import { S, eu, outro, dia, metas, totaisDia, gastoTreinosDia, sequencia, ultimosDias, diaCumprido, hoje, parseDia, mudar } from '../store.js';
import { anel, barra, esc, num, toast } from '../ui.js';
import { HUMORES } from '../dados.js';
import { sheetPeso, sheetCheckin, addAgua } from './comuns.js';
import { ir } from '../app.js';
import { pedirPermissao, permissao } from '../lembretes.js';

export function html() {
  const u = eu();
  const o = outro();
  const m = metas(u.id);
  const t = totaisDia(u.id);
  const d = dia(u.id);
  const queimado = gastoTreinosDia(u.id);
  const restante = m.kcal - t.kcal + queimado;
  const msg = window.WW_MENSAGENS.mensagemDoDia();
  const copos = Math.round(m.agua / m.copo);
  const seq = sequencia(u.id);
  const tocaNovos = S().tocaAqui.filter((x) => x.para === u.id && !x.visto);

  const semana = ultimosDias(7).map((dt) => {
    const ok = diaCumprido(u.id, dt);
    const wd = parseDia(dt).toLocaleDateString('pt-BR', { weekday: 'narrow' });
    return `<div class="week-col"><div class="faint">${wd}</div>
      <div class="week-d ${ok ? 'ok' : ''} ${dt === hoje() ? 'today' : ''}">${ok ? '✓' : parseDia(dt).getDate()}</div></div>`;
  }).join('');

  const to = totaisDia(o.id);
  const mo = metas(o.id);
  const dO = dia(o.id);
  const treinouO = S().sessoes.some((x) => x.user === o.id && x.data === hoje());

  return `
  ${tocaNovos.length ? `
  <button class="card glow" data-a="verToca" style="width:100%;text-align:left;margin-bottom:12px">
    <div class="row"><span style="font-size:28px">👏</span><div class="grow"><b>${esc(o.nome)} mandou ${tocaNovos.length > 1 ? tocaNovos.length + ' toca aqui' : 'um toca aqui'}!</b>
    <p class="muted">"${esc(tocaNovos[0].texto)}"</p></div></div>
  </button>` : ''}

  <section class="card daily">
    <div class="row between"><span class="tag">📖 Palavra do dia</span><button class="icon-btn sm" data-a="compartilhar" aria-label="Compartilhar">↗</button></div>
    <blockquote>“${esc(msg.versiculo)}”</blockquote>
    <cite>— ${esc(msg.referencia)}</cite>
    <div class="motiv"><span style="font-size:20px">✨</span><p>${esc(msg.motivacao)}</p></div>
  </section>

  ${permissao() === 'default' ? `
  <div class="card" style="margin-top:12px">
    <div class="row"><span class="emoji-box">🔔</span><div class="grow"><b>Ativar lembretes</b><p class="faint">Água, refeições, treino e a mensagem da manhã</p></div>
    <button class="btn sm" data-a="notif">Ativar</button></div>
  </div>` : ''}

  <section class="card" style="margin-top:12px">
    <div class="row" style="gap:16px">
      ${anel({ valor: t.kcal, max: m.kcal + queimado, tam: 132, espessura: 12, cor: t.kcal > m.kcal + queimado ? 'pink' : 'violet',
        centro: `<div><div class="stat"><span class="value">${num(Math.abs(restante))}</span><span class="label">${restante >= 0 ? 'kcal restam' : 'kcal acima'}</span></div></div>` })}
      <div class="grow stack">
        <div class="stat"><span class="label">Consumido</span><span class="value text-cyan">${num(t.kcal)}<small>/ ${num(m.kcal)}</small></span></div>
        <div class="stat"><span class="label">Treino</span><span class="value text-orange">+${num(queimado)}<small>kcal</small></span></div>
      </div>
    </div>
    <div style="margin-top:14px">
      <div class="row between faint"><span>Proteína</span><span>${num(t.p)} / ${m.prot} g</span></div>
      ${barra(t.p / m.prot, 'green')}
    </div>
    <button class="btn block ghost" style="margin-top:14px" data-a="refeicao">＋ Registrar refeição</button>
  </section>

  <section class="card" style="margin-top:12px">
    <div class="row between">
      <div><h3>💧 Água</h3><p class="faint">${num(d.agua * m.copo)} de ${num(m.agua)} ml · copo de ${m.copo} ml</p></div>
      <div class="row" style="gap:8px">
        <button class="icon-btn" data-a="aguaMenos" aria-label="Tirar um copo">−</button>
        <button class="btn sm" style="background:linear-gradient(135deg,#0ea5e9,#22d3ee)" data-a="aguaMais">＋ Copo</button>
      </div>
    </div>
    <div class="water-cups">${Array.from({ length: Math.max(copos, d.agua) }, (_, i) => `<div class="cup ${i < d.agua ? 'full' : ''}"></div>`).join('')}</div>
  </section>

  <section class="card" style="margin-top:12px">
    <div class="row between">
      <div class="streak"><span class="fire">🔥</span><div class="stat"><span class="value">${seq} <small>dia${seq === 1 ? '' : 's'}</small></span><span class="label">Sequência</span></div></div>
      <span class="pill violet">meta: comida + água</span>
    </div>
    <div class="row between" style="margin-top:14px;gap:4px">${semana}</div>
  </section>

  <div class="section-title"><h2>Atalhos</h2></div>
  <div class="quick-grid">
    <button class="quick" data-a="pesar"><span class="ico" style="background:rgba(34,229,132,0.15)">⚖️</span>Pesar</button>
    <button class="quick" data-a="treino"><span class="ico" style="background:rgba(255,138,61,0.15)">🏋️</span>Treinar</button>
    <button class="quick" data-a="checkin"><span class="ico" style="background:rgba(139,92,246,0.18)">🌙</span>Check-in</button>
    <button class="quick" data-a="jejum"><span class="ico" style="background:rgba(34,211,238,0.15)">⏱️</span>Jejum</button>
  </div>

  <section class="card" style="margin-top:12px">
    <div class="row between"><h3>Hoje de ${esc(u.nome)}</h3><button class="link" style="color:var(--cyan);font-weight:600;font-size:13px" data-a="checkin">editar</button></div>
    <div class="grid-3" style="margin-top:10px;text-align:center">
      <div><div style="font-size:26px">${d.humor != null ? HUMORES[d.humor] : '—'}</div><div class="faint">Humor</div></div>
      <div><div class="stat"><span class="value" style="font-size:22px">${d.sono ? num(d.sono.horas, 1) + 'h' : '—'}</span></div><div class="faint">Sono</div></div>
      <div><div class="stat"><span class="value" style="font-size:22px">${d.passos ? num(d.passos) : '—'}</span></div><div class="faint">Passos</div></div>
    </div>
    ${d.gratidao ? `<p class="muted" style="margin-top:12px">🙏 ${esc(d.gratidao)}</p>` : ''}
  </section>

  <div class="section-title"><h2>${esc(o.nome)} hoje</h2><button class="link" data-a="casal">ver casal →</button></div>
  <section class="card">
    <div class="row">
      <span class="avatar lg ${o.cor}">${esc(o.nome[0])}</span>
      <div class="grow stack">
        <div><div class="row between faint"><span>Calorias</span><span>${num(to.kcal)} / ${num(mo.kcal)}</span></div>${barra(to.kcal / mo.kcal, o.cor)}</div>
        <div><div class="row between faint"><span>Água</span><span>${num(dO.agua * mo.copo)} / ${num(mo.agua)} ml</span></div>${barra((dO.agua * mo.copo) / mo.agua, 'cyan')}</div>
      </div>
    </div>
    <p class="faint" style="margin-top:10px">${treinouO ? '✅ Já treinou hoje' : '⏳ Ainda não treinou hoje'}</p>
  </section>`;
}

export const acoes = {
  refeicao: () => ir('comida'),
  treino: () => ir('treino'),
  casal: () => ir('casal'),
  jejum: () => { sessionStorage.setItem('ww:comidaAba', 'jejum'); ir('comida'); },
  pesar: () => sheetPeso(),
  checkin: () => sheetCheckin(),
  aguaMais: () => addAgua(1),
  aguaMenos: () => addAgua(-1),
  verToca: () => {
    const id = eu().id;
    mudar((s) => s.tocaAqui.forEach((x) => { if (x.para === id) x.visto = true; }));
    ir('casal');
  },
  async notif() {
    const r = await pedirPermissao();
    toast(r === 'granted' ? '🔔 Lembretes ativados!' : 'Sem permissão para notificações');
    mudar(() => {});
  },
  async compartilhar() {
    const m = window.WW_MENSAGENS.mensagemDoDia();
    const texto = `📖 "${m.versiculo}" — ${m.referencia}\n\n✨ ${m.motivacao}`;
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else { await navigator.clipboard.writeText(texto); toast('Mensagem copiada 📋'); }
    } catch (e) { /* cancelado */ }
  }
};
