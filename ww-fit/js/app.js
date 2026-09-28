// Ponto de entrada: navegação por abas, cabeçalho e onboarding.
import { S, configurado, eu, mudar, aoMudar } from './store.js';
import { esc } from './ui.js';
import * as Hoje from './telas/hoje.js';
import * as Comida from './telas/comida.js';
import * as Treino from './telas/treino.js';
import * as Evolucao from './telas/evolucao.js';
import * as Casal from './telas/casal.js';
import * as Mais from './telas/mais.js';
import * as Onboarding from './telas/onboarding.js';
import { iniciarLembretes } from './lembretes.js';

const TELAS = {
  hoje: { mod: Hoje, nome: 'Hoje', ico: '⚡' },
  comida: { mod: Comida, nome: 'Comida', ico: '🥗' },
  treino: { mod: Treino, nome: 'Treino', ico: '🏋️' },
  evolucao: { mod: Evolucao, nome: 'Evolução', ico: '📈' },
  casal: { mod: Casal, nome: 'Casal', ico: '💞' },
  mais: { mod: Mais, nome: 'Mais', ico: '⚙️', escondida: true }
};

const app = document.getElementById('app');

function rotaAtual() {
  const r = location.hash.replace('#', '').split('/')[0];
  return TELAS[r] ? r : 'hoje';
}

export function ir(rota) {
  if (location.hash !== '#' + rota) location.hash = rota;
  else render();
}

function cabecalho(rota) {
  const u = eu();
  const t = TELAS[rota];
  const subt = rota === 'hoje'
    ? new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
    : 'W+W Fit';
  return `
  <header class="topbar">
    <img class="logo" src="icons/icon.svg" alt="W+W Fit">
    <div class="title"><small>${esc(subt)}</small><h1>${rota === 'hoje' ? 'Olá, ' + esc(u.nome.split(' ')[0]) + '!' : t.nome}</h1></div>
    <button class="user-switch" data-global="trocar" aria-label="Trocar de perfil">
      <span class="avatar ${u.cor}">${esc(u.nome[0] || 'W')}</span>
      <span>⇄</span>
    </button>
    <button class="icon-btn" data-global="mais" aria-label="Mais opções">☰</button>
  </header>`;
}

function barraAbas(rota) {
  return `<nav class="tabbar">${Object.entries(TELAS)
    .filter(([, t]) => !t.escondida)
    .map(([id, t]) => `<button class="tab ${id === rota ? 'on' : ''}" data-global="aba" data-rota="${id}"><span class="ti">${t.ico}</span>${t.nome}</button>`)
    .join('')}</nav>`;
}

let ultimaRota = null;
export function render() {
  if (!configurado()) {
    app.innerHTML = Onboarding.html();
    Onboarding.montar?.(app);
    return;
  }
  const rota = rotaAtual();
  const mod = TELAS[rota].mod;
  const scroll = rota === ultimaRota ? window.scrollY : 0;
  app.innerHTML = `<main class="screen" ${rota === ultimaRota ? 'style="animation:none"' : ''}>${cabecalho(rota)}${mod.html()}</main>${barraAbas(rota)}`;
  mod.montar?.(app);
  window.scrollTo(0, scroll);
  ultimaRota = rota;
}

// cliques: ações globais (cabeçalho/abas) e ações da tela atual (data-a)
app.addEventListener('click', (e) => {
  const g = e.target.closest('[data-global]');
  if (g) {
    const acao = g.dataset.global;
    if (acao === 'aba') ir(g.dataset.rota);
    if (acao === 'mais') ir('mais');
    if (acao === 'trocar') {
      mudar((s) => { s.ativo = s.ativo === 'u1' ? 'u2' : 'u1'; });
      navigator.vibrate?.(15);
    }
    return;
  }
  const el = e.target.closest('[data-a]');
  if (!el) return;
  const mod = configurado() ? TELAS[rotaAtual()].mod : Onboarding;
  mod.acoes?.[el.dataset.a]?.(el, e);
});
app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-muda]');
  if (!el) return;
  const mod = configurado() ? TELAS[rotaAtual()].mod : Onboarding;
  mod.acoes?.[el.dataset.muda]?.(el, e);
});

window.addEventListener('hashchange', render);

// re-renderiza quando os dados mudam (fora do onboarding e sem sheet aberta)
let pendente = false;
aoMudar(() => {
  if (pendente) return;
  pendente = true;
  requestAnimationFrame(() => {
    pendente = false;
    render();
  });
});

render();
iniciarLembretes();

// service worker (funciona offline e habilita notificações)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

export { S };
