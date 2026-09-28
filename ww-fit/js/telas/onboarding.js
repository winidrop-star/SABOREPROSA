// Primeira abertura: cadastro dos dois perfis.
import { criarUsuarios } from '../store.js';
import { esc, toast, festa } from '../ui.js';

let passo = 0;
const pessoas = [
  { nome: '', sexo: 'M', idade: '', altura: '', pesoInicial: '', pesoMeta: '', atividade: 'leve' },
  { nome: '', sexo: 'F', idade: '', altura: '', pesoInicial: '', pesoMeta: '', atividade: 'leve' }
];

function form(i) {
  const p = pessoas[i];
  const cor = i === 0 ? 'green' : 'orange';
  return `
  <div class="card">
    <div class="row" style="margin-bottom:14px">
      <span class="avatar lg ${cor}">${esc(p.nome[0] || 'W')}</span>
      <div><h3>${i === 0 ? 'Primeiro perfil' : 'Segundo perfil'}</h3>
      <p class="faint">Cor ${i === 0 ? 'verde 💚' : 'laranja 🧡'} no app</p></div>
    </div>
    <div class="field"><label>Nome</label><input class="input" name="nome" value="${esc(p.nome)}" placeholder="Como quer ser chamado(a)" autocomplete="off"></div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>Sexo</label>
        <select class="input" name="sexo"><option value="M" ${p.sexo === 'M' ? 'selected' : ''}>Masculino</option><option value="F" ${p.sexo === 'F' ? 'selected' : ''}>Feminino</option></select></div>
      <div class="field"><label>Idade</label><input class="input" name="idade" type="number" inputmode="numeric" value="${esc(p.idade)}" placeholder="anos"></div>
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>Altura (cm)</label><input class="input" name="altura" type="number" inputmode="numeric" value="${esc(p.altura)}" placeholder="ex.: 175"></div>
      <div class="field"><label>Peso hoje (kg)</label><input class="input" name="pesoInicial" type="number" step="0.1" inputmode="decimal" value="${esc(p.pesoInicial)}" placeholder="ex.: 92,5"></div>
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="field"><label>Meta de peso (kg)</label><input class="input" name="pesoMeta" type="number" step="0.1" inputmode="decimal" value="${esc(p.pesoMeta)}" placeholder="ex.: 80"></div>
      <div class="field"><label>Atividade física</label>
        <select class="input" name="atividade">
          ${[['sedentario', 'Quase nenhuma'], ['leve', '1–2x por semana'], ['moderado', '3–5x por semana'], ['intenso', '6–7x por semana']]
            .map(([v, t]) => `<option value="${v}" ${p.atividade === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
    </div>
  </div>`;
}

export function html() {
  const passos = `<div class="steps">${[0, 1, 2].map((i) => `<i class="${i <= passo ? 'on' : ''}"></i>`).join('')}</div>`;
  if (passo === 0) {
    return `<div class="onb">
      <div class="hero">
        <img src="icons/icon.svg" alt="">
        <h1><span class="grad-text">W+W Fit</span></h1>
        <p class="muted" style="margin-top:8px">Juntos na evolução.<br>Peso, comida, treino, água e motivação — tudo num lugar só, para vocês dois.</p>
      </div>
      <div class="card stack">
        <div class="row"><span class="emoji-box">📈</span><p>Acompanhem o peso, as medidas e as fotos de progresso</p></div>
        <div class="row"><span class="emoji-box">🥗</span><p>Registrem as refeições e a água do dia</p></div>
        <div class="row"><span class="emoji-box">🏋️</span><p>Treinos com cronômetro de descanso</p></div>
        <div class="row"><span class="emoji-box">💞</span><p>Desafios, placar e "toca aqui" entre o casal</p></div>
        <div class="row"><span class="emoji-box">📖</span><p>Um versículo e uma motivação para começar bem o dia</p></div>
      </div>
      <div class="spacer"></div>
      <button class="btn block" style="margin-top:22px" data-a="avancar">Começar 🚀</button>
    </div>`;
  }
  return `<div class="onb">
    ${passos}
    <h2 style="font-size:24px;margin-bottom:6px">Vamos conhecer vocês</h2>
    <p class="muted" style="margin-bottom:16px">Com esses dados o app calcula as metas de calorias, água e proteína de cada um.</p>
    <form id="onb-form">${form(passo - 1)}</form>
    <div class="row" style="margin-top:18px">
      <button class="btn ghost" data-a="voltar">Voltar</button>
      <button class="btn block ${passo === 1 ? 'green' : 'orange'}" data-a="avancar">${passo === 1 ? 'Próximo perfil →' : 'Tudo pronto! 🎉'}</button>
    </div>
  </div>`;
}

function lerForm(app) {
  const f = app.querySelector('#onb-form');
  if (!f) return true;
  const p = pessoas[passo - 1];
  for (const el of f.elements) if (el.name) p[el.name] = el.value.trim();
  const falta = !p.nome || !p.idade || !p.altura || !p.pesoInicial || !p.pesoMeta;
  if (falta) { toast('Preencha todos os campos 🙂'); return false; }
  if (Number(p.altura) < 100 || Number(p.altura) > 230) { toast('Altura em centímetros, ex.: 170'); return false; }
  return true;
}

function redesenhar() {
  const app = document.getElementById('app');
  app.innerHTML = html();
  window.scrollTo(0, 0);
}

export const acoes = {
  avancar() {
    const app = document.getElementById('app');
    if (passo > 0 && !lerForm(app)) return;
    if (passo === 2) {
      const num = (p) => ({ ...p, idade: Number(p.idade), altura: Number(p.altura), pesoInicial: Number(p.pesoInicial), pesoMeta: Number(p.pesoMeta) });
      passo = 0;
      criarUsuarios(num(pessoas[0]), num(pessoas[1]));
      festa();
      return;
    }
    passo++;
    redesenhar();
  },
  voltar() {
    const app = document.getElementById('app');
    const f = app.querySelector('#onb-form');
    if (f) for (const el of f.elements) if (el.name) pessoas[passo - 1][el.name] = el.value.trim();
    passo = Math.max(0, passo - 1);
    redesenhar();
  }
};
