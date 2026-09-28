// Mais: perfis e metas, lembretes, relatório em PDF, backup e instalação.
import { S, mudar, metas, imc, faixaImc, pesoAtual, perdido, exportarBackup, importarBackup, apagarTudo, ultimosDias, totaisDia, dia, hoje, fmtData } from '../store.js';
import { abrirSheet, fecharSheet, esc, num, toast, confirmar, graficoLinhas } from '../ui.js';
import { permissao, pedirPermissao, notificar, suportado } from '../lembretes.js';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function html() {
  const s = S();
  const L = s.config.lembretes;
  const perm = permissao();
  const tog = (caminho, on) => `<label class="toggle"><input type="checkbox" data-muda="lembrete" data-c="${caminho}" ${on ? 'checked' : ''}><span></span></label>`;
  const hora = (caminho, v) => `<input class="input" type="time" data-muda="lembrete" data-c="${caminho}" value="${v}" style="width:112px;height:40px">`;

  return `
  <div class="section-title" style="margin-top:0"><h2>Perfis e metas</h2></div>
  ${['u1', 'u2'].map((id) => {
    const u = s.usuarios[id];
    const m = metas(id);
    const [faixa] = faixaImc(imc(id));
    return `<section class="card" style="margin-top:10px">
      <div class="row"><span class="avatar lg ${u.cor}">${esc(u.nome[0])}</span>
        <div class="grow"><h3>${esc(u.nome)} ${s.ativo === id ? '<span class="pill violet">em uso</span>' : ''}</h3>
        <p class="faint">${u.idade} anos · ${u.altura} cm · ${num(pesoAtual(id), 1)} kg · IMC ${num(imc(id), 1)} (${faixa})</p></div>
        <button class="icon-btn sm" data-a="editarPerfil" data-id="${id}" aria-label="Editar">✎</button></div>
      <div class="grid-2" style="margin-top:12px">
        <div class="stat"><span class="label">Meta diária</span><span class="value text-cyan" style="font-size:20px">${num(m.kcal)}<small>kcal</small></span></div>
        <div class="stat"><span class="label">Gasto estimado</span><span class="value" style="font-size:20px">${num(m.gasto)}<small>kcal</small></span></div>
        <div class="stat"><span class="label">Água</span><span class="value text-cyan" style="font-size:20px">${num(m.agua)}<small>ml</small></span></div>
        <div class="stat"><span class="label">Proteína</span><span class="value text-green" style="font-size:20px">${m.prot}<small>g</small></span></div>
      </div>
    </section>`;
  }).join('')}
  <p class="faint" style="margin-top:8px">Metas calculadas pela fórmula de Mifflin-St Jeor com déficit de ~500 kcal/dia (≈ 0,5 kg por semana). São estimativas — o ideal é ter acompanhamento de um nutricionista.</p>

  <div class="section-title"><h2>🔔 Lembretes</h2></div>
  <section class="card">
    ${!suportado() ? '<p class="muted">Este navegador não suporta notificações. No iPhone, adicione o app à Tela de Início primeiro (veja abaixo).</p>'
      : perm !== 'granted' ? `<div class="row"><p class="grow muted">${perm === 'denied' ? 'As notificações foram bloqueadas. Libere nas configurações do navegador para este site.' : 'Permita as notificações para receber os lembretes.'}</p>${perm === 'default' ? '<button class="btn sm" data-a="permitir">Permitir</button>' : ''}</div>`
      : '<div class="row between"><span class="pill green">✓ Notificações ativas</span><button class="btn sm ghost" data-a="testar">Testar</button></div>'}
    <div class="list" style="margin-top:8px">
      <div class="item"><span class="emoji-box">🌅</span><div class="grow"><div class="name">Palavra do dia</div><div class="sub">versículo + motivação</div></div>${hora('manha.hora', L.manha.hora)}${tog('manha.on', L.manha.on)}</div>
      <div class="item"><span class="emoji-box">💧</span><div class="grow"><div class="name">Beber água</div>
        <div class="sub">a cada <select data-muda="lembrete" data-c="agua.cada" style="background:none;border:0;color:var(--cyan);font-weight:700">${[60, 90, 120, 180].map((m) => `<option value="${m}" ${Number(L.agua.cada) === m ? 'selected' : ''}>${m / 60}h</option>`).join('')}</select> das ${esc(L.agua.de)} às ${esc(L.agua.ate)}</div></div>${tog('agua.on', L.agua.on)}</div>
      <div class="item"><span class="emoji-box">🍽️</span><div class="grow"><div class="name">Registrar refeições</div><div class="sub">30 min depois de ${L.refeicoes.horas.join(', ')}</div></div>${tog('refeicoes.on', L.refeicoes.on)}</div>
      <div class="item"><span class="emoji-box">🏋️</span><div class="grow"><div class="name">Treino</div><div class="sub">se ainda não treinou</div></div>${hora('treino.hora', L.treino.hora)}${tog('treino.on', L.treino.on)}</div>
      <div class="item"><span class="emoji-box">⚖️</span><div class="grow"><div class="name">Pesagem semanal</div>
        <div class="sub"><select data-muda="lembrete" data-c="pesagem.dia" style="background:none;border:0;color:var(--cyan);font-weight:700">${DIAS.map((d, i) => `<option value="${i}" ${Number(L.pesagem.dia) === i ? 'selected' : ''}>${d}</option>`).join('')}</select> às ${esc(L.pesagem.hora)}</div></div>${tog('pesagem.on', L.pesagem.on)}</div>
    </div>
    <p class="faint" style="margin-top:10px">Nesta versão os lembretes chegam com o app aberto ou usado recentemente. No Android com o app instalado, a palavra do dia também chega com ele fechado. Lembretes com o app totalmente fechado (inclusive no iPhone) chegam na próxima etapa, com o servidor.</p>
  </section>

  <div class="section-title"><h2>📄 Relatório</h2></div>
  <section class="card">
    <p class="muted">Gere um PDF com a evolução de vocês para levar ao nutricionista ou médico.</p>
    <button class="btn block" style="margin-top:12px" data-a="relatorio">Gerar relatório em PDF</button>
  </section>

  <div class="section-title"><h2>📲 Instalar no celular</h2></div>
  <section class="card stack">
    <p><b>Android (Chrome):</b> menu ⋮ → <i>Instalar app</i> ou <i>Adicionar à tela inicial</i>.</p>
    <p><b>iPhone (Safari):</b> botão Compartilhar ⬆️ → <i>Adicionar à Tela de Início</i>. Depois abra pelo ícone — só assim o iPhone permite notificações (iOS 16.4 ou mais novo).</p>
  </section>

  <div class="section-title"><h2>💾 Backup</h2></div>
  <section class="card">
    <p class="muted">Os dados ficam salvos neste celular. Faça backup de vez em quando — e use-o para passar os dados para outro aparelho.</p>
    <div class="row" style="margin-top:12px;gap:10px">
      <button class="btn ghost" style="flex:1" data-a="exportar">⬇️ Exportar</button>
      <label class="btn ghost" style="flex:1">⬆️ Importar<input type="file" accept="application/json,.json" data-muda="importar" hidden></label>
    </div>
    <button class="btn danger block" style="margin-top:10px" data-a="apagar">Apagar todos os dados</button>
  </section>

  <p class="faint" style="text-align:center;margin:24px 0 8px">W+W Fit · juntos na evolução 💚🧡</p>`;
}

function sheetPerfil(id) {
  const u = S().usuarios[id];
  const sh = abrirSheet(`
    <h2>Editar perfil</h2>
    <div class="field"><label>Nome</label><input class="input" name="nome" value="${esc(u.nome)}"></div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>Idade</label><input class="input" name="idade" type="number" value="${u.idade}"></div>
      <div class="field"><label>Altura (cm)</label><input class="input" name="altura" type="number" value="${u.altura}"></div>
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>Peso inicial (kg)</label><input class="input" name="pesoInicial" type="number" step="0.1" value="${u.pesoInicial}"></div>
      <div class="field"><label>Meta de peso (kg)</label><input class="input" name="pesoMeta" type="number" step="0.1" value="${u.pesoMeta}"></div>
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>Sexo</label><select class="input" name="sexo"><option value="M" ${u.sexo === 'M' ? 'selected' : ''}>Masculino</option><option value="F" ${u.sexo === 'F' ? 'selected' : ''}>Feminino</option></select></div>
      <div class="field"><label>Atividade</label><select class="input" name="atividade">
        ${[['sedentario', 'Quase nenhuma'], ['leve', '1–2x/semana'], ['moderado', '3–5x/semana'], ['intenso', '6–7x/semana']].map(([v, t]) => `<option value="${v}" ${u.atividade === v ? 'selected' : ''}>${t}</option>`).join('')}
      </select></div>
    </div>
    <div class="field" style="margin-top:12px"><label>Meta de calorias personalizada (opcional — ex.: passada pelo nutricionista)</label><input class="input" name="metaKcal" type="number" value="${u.metaKcal || ''}" placeholder="automática"></div>
    <div class="actions"><button class="btn ghost" data-fechar>Cancelar</button><button class="btn green" data-ok>Salvar</button></div>`);
  sh.addEventListener('click', (e) => {
    if (!e.target.closest('[data-ok]')) return;
    const v = {};
    sh.querySelectorAll('[name]').forEach((i) => { v[i.name] = i.value.trim(); });
    if (!v.nome) return toast('Informe o nome');
    mudar((s) => {
      const x = s.usuarios[id];
      x.nome = v.nome; x.sexo = v.sexo; x.atividade = v.atividade;
      for (const k of ['idade', 'altura', 'pesoInicial', 'pesoMeta']) x[k] = Number(v[k]) || x[k];
      x.metaKcal = Number(v.metaKcal) || null;
    });
    fecharSheet();
    toast('Perfil atualizado ✅');
  });
}

// relatório: monta uma página própria para impressão e chama "Salvar como PDF"
function relatorio() {
  const s = S();
  const dias = ultimosDias(30);
  const bloco = (id) => {
    const u = s.usuarios[id];
    const m = metas(id);
    const kc = dias.map((d) => totaisDia(id, d).kcal).filter(Boolean);
    const media = kc.length ? Math.round(kc.reduce((a, b) => a + b, 0) / kc.length) : 0;
    const treinos = s.sessoes.filter((x) => x.user === id && dias.includes(x.data));
    const med = s.medidas[id] || [];
    const sono = dias.map((d) => dia(id, d).sono?.horas).filter(Boolean);
    return `
      <div class="card" style="margin-top:14px">
        <h3>${esc(u.nome)} — ${u.idade} anos, ${u.altura} cm</h3>
        <p>Peso inicial: <b>${num(u.pesoInicial, 1)} kg</b> · Atual: <b>${num(pesoAtual(id), 1)} kg</b> · Perdido: <b>${num(perdido(id), 1)} kg</b> · Meta: ${num(u.pesoMeta, 1)} kg</p>
        <p>IMC atual: ${num(imc(id), 1)} (${faixaImc(imc(id))[0]}) · Meta calórica: ${num(m.kcal)} kcal/dia</p>
        <p>Últimos 30 dias: média de <b>${num(media)} kcal</b> nos ${kc.length} dias registrados · <b>${treinos.length}</b> treinos/atividades (${num(treinos.reduce((a, x) => a + x.min, 0))} min)${sono.length ? ` · sono médio ${num(sono.reduce((a, b) => a + b, 0) / sono.length, 1)} h` : ''}</p>
        ${med.length ? `<p>Medidas (${fmtData(med[0].data)} → ${fmtData(med[med.length - 1].data)}): ${['cintura', 'quadril', 'abdomen', 'braco', 'coxa', 'peito'].filter((k) => med[med.length - 1][k]).map((k) => `${k} ${med[0][k] ?? '—'} → ${med[med.length - 1][k]} cm`).join(' · ')}</p>` : ''}
        <div style="margin-top:8px">${graficoLinhas([{ nome: u.nome, cor: u.cor, meta: u.pesoMeta, pontos: s.pesos[id].map((p) => ({ x: p.data, y: p.kg })) }])}</div>
        <p style="margin-top:6px"><b>Pesagens:</b> ${s.pesos[id].map((p) => `${fmtData(p.data)}: ${num(p.kg, 1)}`).join(' · ')}</p>
      </div>`;
  };
  const div = document.createElement('div');
  div.className = 'print-report';
  div.innerHTML = `
    <h1>W+W Fit — Relatório de evolução</h1>
    <p>Gerado em ${fmtData(hoje(), { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    ${bloco('u1')}${bloco('u2')}
    <p style="margin-top:14px;font-size:12px">Valores de calorias são estimativas com base nos registros feitos no app.</p>`;
  document.body.appendChild(div);
  document.body.classList.add('imprimindo');
  const fim = () => { div.remove(); document.body.classList.remove('imprimindo'); window.removeEventListener('afterprint', fim); };
  window.addEventListener('afterprint', fim);
  setTimeout(() => window.print(), 50);
}

export const acoes = {
  editarPerfil(el) { sheetPerfil(el.dataset.id); },
  async permitir() {
    const r = await pedirPermissao();
    toast(r === 'granted' ? '🔔 Notificações ativadas!' : 'Permissão negada');
    mudar(() => {});
  },
  testar() {
    const m = window.WW_MENSAGENS.mensagemDoDia();
    notificar('🌅 Palavra do dia', `"${m.versiculo}" — ${m.referencia}`, 'teste');
  },
  lembrete(el) {
    const [grupo, campo] = el.dataset.c.split('.');
    const v = el.type === 'checkbox' ? el.checked : el.value;
    mudar((s) => { s.config.lembretes[grupo][campo] = v; });
  },
  relatorio: () => relatorio(),
  async exportar() {
    try {
      const txt = await exportarBackup();
      const blob = new Blob([txt], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `wwfit-backup-${hoje()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Backup exportado 💾');
    } catch (e) { toast('Não consegui exportar'); }
  },
  async importar(el) {
    const arq = el.files?.[0];
    if (!arq) return;
    if (!(await confirmar('Importar este backup? Os dados atuais deste celular serão substituídos.', 'Importar'))) return;
    try { await importarBackup(await arq.text()); toast('Backup importado ✅'); } catch (e) { toast(e.message || 'Arquivo inválido'); }
  },
  async apagar() {
    if (await confirmar('Apagar TODOS os dados deste celular? Isso não pode ser desfeito.', 'Apagar tudo')) apagarTudo();
  }
};
