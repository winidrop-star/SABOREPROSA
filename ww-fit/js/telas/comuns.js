// Janelas usadas por mais de uma tela.
import { S, mudar, editarDia, dia, hoje, eu, pesoAtual, uid, sequencia } from '../store.js';
import { abrirSheet, fecharSheet, esc, toast, festa, num } from '../ui.js';
import { HUMORES } from '../dados.js';

export function sheetPeso() {
  const u = eu();
  const atual = pesoAtual(u.id);
  const sh = abrirSheet(`
    <h2>⚖️ Pesagem de ${esc(u.nome)}</h2>
    <p class="muted" style="margin-bottom:14px">Dica: pese sempre no mesmo horário, de manhã, em jejum e depois de ir ao banheiro.</p>
    <div class="stepper" style="justify-content:center;margin:10px 0 16px">
      <button class="icon-btn" data-d="-0.1">−</button>
      <input class="input" id="kg" type="number" step="0.1" inputmode="decimal" value="${atual}" style="width:130px;text-align:center;font-size:24px;font-weight:700;font-family:var(--font-display)">
      <button class="icon-btn" data-d="0.1">+</button>
    </div>
    <div class="field"><label>Data</label><input class="input" id="data" type="date" value="${hoje()}" max="${hoje()}"></div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Salvar</button></div>`);
  const input = sh.querySelector('#kg');
  sh.addEventListener('click', (e) => {
    const d = e.target.closest('[data-d]');
    if (d) input.value = (Math.round((Number(input.value) + Number(d.dataset.d)) * 10) / 10).toFixed(1);
    if (e.target.closest('[data-ok]')) {
      const kg = Math.round(Number(String(input.value).replace(',', '.')) * 10) / 10;
      const data = sh.querySelector('#data').value || hoje();
      if (!(kg > 20 && kg < 400)) return toast('Peso inválido');
      const antes = pesoAtual(u.id);
      mudar((s) => {
        const lista = s.pesos[u.id];
        const i = lista.findIndex((x) => x.data === data);
        if (i >= 0) lista[i].kg = kg; else lista.push({ data, kg });
        lista.sort((a, b) => a.data.localeCompare(b.data));
      });
      fecharSheet();
      const dif = Math.round((kg - antes) * 10) / 10;
      if (dif < 0) { festa(); toast(`🎉 −${num(-dif, 1)} kg! Continue assim!`); }
      else if (dif > 0) toast('Tudo bem! Oscilações são normais. Foco na semana 💪');
      else toast('Peso registrado ✅');
    }
  });
}

export function sheetCheckin() {
  const u = eu();
  const d = dia(u.id);
  let humor = d.humor;
  const sh = abrirSheet(`
    <h2>🌙 Como vai ${esc(u.nome)}?</h2>
    <div class="field"><label>Humor de hoje</label>
      <div class="mood-row">${HUMORES.map((h, i) => `<button type="button" data-h="${i}" class="${humor === i ? 'on' : ''}">${h}</button>`).join('')}</div>
    </div>
    <div class="form-row" style="margin-top:14px">
      <div class="field"><label>Horas de sono</label><input class="input" id="sono" type="number" step="0.5" inputmode="decimal" value="${d.sono?.horas ?? ''}" placeholder="ex.: 7,5"></div>
      <div class="field"><label>Qualidade do sono</label>
        <select class="input" id="qual">${['Ruim', 'Regular', 'Boa', 'Ótima'].map((q, i) => `<option value="${i}" ${d.sono?.qualidade == i ? 'selected' : ''}>${q}</option>`).join('')}</select></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Passos hoje 👟</label><input class="input" id="passos" type="number" inputmode="numeric" value="${d.passos || ''}" placeholder="veja no app de saúde do celular"></div>
    <div class="field" style="margin-top:12px"><label>🙏 Gratidão / oração do dia</label><textarea class="input" id="grat" placeholder="Hoje sou grato(a) por...">${esc(d.gratidao || '')}</textarea></div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn" data-ok>Salvar</button></div>`);
  sh.addEventListener('click', (e) => {
    const h = e.target.closest('[data-h]');
    if (h) {
      humor = Number(h.dataset.h);
      sh.querySelectorAll('[data-h]').forEach((b) => b.classList.toggle('on', b === h));
    }
    if (e.target.closest('[data-ok]')) {
      const horas = Number(String(sh.querySelector('#sono').value).replace(',', '.'));
      editarDia(u.id, hoje(), (x) => {
        x.humor = humor;
        x.sono = horas ? { horas, qualidade: Number(sh.querySelector('#qual').value) } : null;
        x.passos = Number(sh.querySelector('#passos').value) || 0;
        x.gratidao = sh.querySelector('#grat').value.trim();
      });
      fecharSheet();
      toast('Check-in salvo ✨');
    }
  });
}

export function addAgua(delta) {
  const u = eu();
  const antes = sequencia(u.id);
  editarDia(u.id, hoje(), (d) => { d.agua = Math.max(0, (d.agua || 0) + delta); });
  if (delta > 0) navigator.vibrate?.(12);
  if (sequencia(u.id) > antes) toast(`🔥 Sequência de ${sequencia(u.id)} dia(s)!`);
}

export function mandarTocaAqui(texto) {
  const s = S();
  const para = s.ativo === 'u1' ? 'u2' : 'u1';
  mudar((st) => { st.tocaAqui.unshift({ id: uid(), de: st.ativo, para, texto, ts: Date.now(), visto: false }); st.tocaAqui = st.tocaAqui.slice(0, 60); });
  festa();
  toast(`👏 Enviado para ${s.usuarios[para].nome}!`);
}
