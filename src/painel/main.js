import { fmtBRL, fmtHora, inPeriodo } from '../lib/format.js';
import { loadState, saveState } from '../lib/config.js';
import { baixarComandaPdf } from '../lib/pdfComanda.js';
import { unlockAudio, playReadyChime, playNovoPedidoAlerta } from '../lib/audio.js';
import {
  fetchPedidos,
  fetchMovimentos,
  inserirPedido,
  atualizarStatusPedido,
  inserirMovimento,
  subscribePedidos,
  subscribeMovimentos
} from '../lib/pedidosStore.js';

const CAIXA_PIN = import.meta.env.VITE_CAIXA_PIN || '2707';

const app = document.getElementById('app');

let STATE = null; // { loja, cardapioDia, categorias, cupons } — vem do Supabase (config)
let dbReady = false;

let role = null;
try {
  role = localStorage.getItem('painel_role');
} catch (e) {}

let caixaTab = 'pedido'; // pedido | pedidos | caixa | relatorios | cardapio
let pedidosFiltro = 'ativos';
let caixaPeriodo = 'hoje';
let relatoriosPeriodo = 'hoje';

let activeCategory = null;
let draftCart = {};
let draftModo = 'retirada';
let draftEndereco = '';
let draftCliente = '';
let draftTelefone = '';
let draftObs = '';
let draftFormaPagamento = '';
let pendingPedido = null;

let allPedidos = [];
let allMovimentos = [];

function findMenuItem(catId, itemId) {
  const cat = STATE.categorias.find((c) => c.id === catId);
  if (!cat) return null;
  return cat.itens.find((i) => i.id === itemId);
}
function findMenuItemByNome(nome) {
  for (const cat of STATE.categorias) {
    const found = cat.itens.find((i) => i.nome === nome);
    if (found) return found;
  }
  return null;
}
function cartKey(catId, itemId, variantLabel) {
  return catId + '::' + itemId + (variantLabel ? '::' + variantLabel : '');
}

function render() {
  if (!role) {
    renderRolePicker();
    return;
  }
  if (role === 'caixa') renderCaixa();
  else renderCozinha();
}

function renderRolePicker() {
  app.innerHTML =
    '<div class="topbar"><h1>Caixa e Cozinha</h1></div>' +
    '<div class="role-picker">' +
    '<div class="role-card" id="pick-caixa"><span class="emoji">🧾</span><h2>Sou o Caixa</h2><p>Monta pedidos, acompanha o caixa e os relatórios</p></div>' +
    '<div class="role-card" id="pick-cozinha"><span class="emoji">👩‍🍳</span><h2>Sou a Cozinha</h2><p>Vê os pedidos, marca como lido e como pronto</p></div>' +
    '</div>';
  document.getElementById('pick-caixa').addEventListener('click', renderPinCaixa);
  document.getElementById('pick-cozinha').addEventListener('click', () => setRole('cozinha'));
}

function renderPinCaixa() {
  app.innerHTML =
    '<div class="topbar"><h1>Caixa e Cozinha</h1></div>' +
    '<div class="role-picker">' +
    '<div class="role-card">' +
    '<span class="emoji">🔒</span><h2>Senha do Caixa</h2>' +
    '<p>Digite o PIN pra entrar no modo Caixa</p>' +
    '<input type="password" inputmode="numeric" maxlength="4" id="pin-input" placeholder="••••" ' +
    'style="text-align:center;font-size:1.4rem;letter-spacing:0.3em;width:100%;margin-top:14px;border:1.5px solid var(--line);border-radius:10px;padding:12px;font-family:inherit;background:var(--surface);color:var(--ink);">' +
    '<div id="pin-error" style="color:var(--danger);font-size:0.85rem;margin-top:8px;min-height:1.2em;"></div>' +
    '<button class="btn-primary" id="btn-pin-confirmar" style="margin-top:2px;">Entrar</button>' +
    '<button class="link-btn" id="btn-pin-voltar" style="margin-top:8px;">Voltar</button>' +
    '</div>' +
    '</div>';
  const input = document.getElementById('pin-input');
  input.focus();
  function tentar() {
    if (input.value === CAIXA_PIN) {
      setRole('caixa');
    } else {
      document.getElementById('pin-error').textContent = 'PIN incorreto. Tente de novo.';
      input.value = '';
      input.focus();
    }
  }
  document.getElementById('btn-pin-confirmar').addEventListener('click', tentar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tentar();
  });
  document.getElementById('btn-pin-voltar').addEventListener('click', renderRolePicker);
}

function setRole(r) {
  role = r;
  try {
    localStorage.setItem('painel_role', r);
  } catch (e) {}
  render();
}
function trocarPapel() {
  try {
    localStorage.removeItem('painel_role');
  } catch (e) {}
  role = null;
  render();
}

function topbarHtml(titulo) {
  return (
    '<div class="topbar"><div class="topbar-brand">' +
    '<div class="topbar-logo"><img src="/logo.png" alt="Logo Sabor e Prosa"></div>' +
    '<div><h1>Sabor e Prosa</h1><div class="role-pill">' + titulo + '</div></div>' +
    '</div>' +
    '<button class="link-btn" id="btn-trocar">trocar papel</button></div>' +
    '<div id="conn-banner"></div>' +
    (window.__audioUnlocked
      ? ''
      : '<button type="button" class="conn-banner" id="btn-ativar-som" style="cursor:pointer;width:100%;text-align:left;">🔔 Toque aqui pra ativar o som e o aviso por voz</button>')
  );
}
function wireTopbar() {
  document.getElementById('btn-trocar').addEventListener('click', trocarPapel);
  renderConnBanner();
  const btnSom = document.getElementById('btn-ativar-som');
  if (btnSom) {
    btnSom.addEventListener('click', () => {
      unlockAudio();
      window.__audioUnlocked = true;
      if (role === 'caixa') renderCaixa();
      else renderCozinha();
    });
  }
}
function renderConnBanner() {
  const el = document.getElementById('conn-banner');
  if (!el) return;
  el.innerHTML = dbReady ? '' : 'Conectando...';
}

/* ================= CAIXA (shell + abas) ================= */
const CAIXA_TABS = [
  { id: 'pedido', label: 'Pedido novo', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
  { id: 'pedidos', label: 'Pedidos', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><line x1="8.5" y1="8" x2="15.5" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8.5" y1="12" x2="15.5" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8.5" y1="16" x2="12.5" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { id: 'caixa', label: 'Caixa', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="13" r="2.6" stroke="currentColor" stroke-width="1.5"/></svg>' },
  { id: 'relatorios', label: 'Relatórios', icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20V10M11 20V4M18 20v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
  { id: 'cardapio', label: 'Loja & cardápio', icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="9" width="18" height="11" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9c0-2.8 2-4.5 4.5-4.5h9C19 4.5 21 6.2 21 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' }
];

function renderCaixa() {
  app.innerHTML =
    topbarHtml('Caixa') +
    '<div class="admin-shell">' +
    '<div class="admin-sidebar">' +
    '<div class="side-nav" id="caixa-tabs"></div>' +
    '</div>' +
    '<div class="admin-main"><div id="caixa-body"></div></div>' +
    '</div>';
  wireTopbar();

  const tabsWrap = document.getElementById('caixa-tabs');
  CAIXA_TABS.forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'side-link' + (t.id === caixaTab ? ' active' : '');
    btn.innerHTML = t.icon + '<span>' + t.label + '</span>';
    btn.addEventListener('click', () => {
      caixaTab = t.id;
      renderCaixa();
    });
    tabsWrap.appendChild(btn);
  });

  if (caixaTab === 'pedido') renderTabPedidoNovo();
  else if (caixaTab === 'pedidos') renderTabPedidos();
  else if (caixaTab === 'caixa') renderTabCaixaFinanceiro();
  else if (caixaTab === 'cardapio') renderTabCardapioDia();
  else renderTabRelatorios();
}

/* ---------------- ABA: Pedido novo (cardápio completo) ---------------- */
function draftQty(key) {
  return (draftCart[key] && draftCart[key].qty) || 0;
}
function changeDraftQty(catId, itemId, variantLabel, unitPrice, name, delta) {
  const key = cartKey(catId, itemId, variantLabel);
  const current = draftCart[key] || { qty: 0, name, variant: variantLabel || null, unitPrice };
  current.qty += delta;
  if (current.qty <= 0) delete draftCart[key];
  else draftCart[key] = current;
  renderTabPedidoNovo();
}
function draftCartArray() {
  return Object.keys(draftCart).map((k) => draftCart[k]);
}
function draftCartTotal() {
  return draftCartArray().reduce((s, i) => s + i.qty * i.unitPrice, 0);
}

/* ---------------- configuração da marmita (proteína / feijão / adicionais) ---------------- */
const draftConfigState = {};
function draftConfigKeyFor(catId, itemId, variantLabel) {
  return catId + '::' + itemId + '::' + (variantLabel || '');
}
function getDraftConfigState(ckey) {
  if (!draftConfigState[ckey]) draftConfigState[ckey] = { proteina: null, feijao: null, legume: null, adicionais: {} };
  return draftConfigState[ckey];
}
const ADICIONAIS_FIXOS = [
  { nome: 'Batata Frita', preco: 25 },
  { nome: 'Mix de Salada', preco: 3.5 },
  { nome: 'Ovo', preco: 3.5 }
];
function getAdicionaisCatalogo() {
  const cd = STATE.cardapioDia || {};
  const lista = [];
  if (cd.proteina1) lista.push({ nome: cd.proteina1, preco: 25 });
  if (cd.proteina2) lista.push({ nome: cd.proteina2, preco: 25 });
  (cd.adicionaisOpcoes || []).forEach((nome) => lista.push({ nome, preco: 25 }));
  return lista.concat(ADICIONAIS_FIXOS);
}
function precoAdicional(nome) {
  const found = getAdicionaisCatalogo().find((a) => a.nome === nome);
  return found ? found.preco : 0;
}
function somaAdicionaisSelecionados(st) {
  return Object.keys(st.adicionais)
    .filter((k) => st.adicionais[k])
    .reduce((sum, nome) => sum + precoAdicional(nome), 0);
}
function buildConfigVariantLabel(variant, escolheProteina, cd, st) {
  const parts = [];
  if (variant) parts.push(variant.label);
  if (variant && variant.proteinasIncluidas && cd.proteina1 && cd.proteina2) {
    parts.push(cd.proteina1 + ' e ' + cd.proteina2);
  } else if (escolheProteina && st.proteina) {
    parts.push(st.proteina);
  }
  if (st.feijao) parts.push(st.feijao);
  if (st.legume) parts.push(st.legume);
  const extras = Object.keys(st.adicionais).filter((k) => st.adicionais[k]);
  if (extras.length) parts.push('+ ' + extras.join(', '));
  return parts.join(', ');
}
function renderDraftConfigRow(cat, item, variant) {
  const basePrice = variant ? variant.preco : item.preco;
  const label = variant ? variant.label : null;
  const ckey = draftConfigKeyFor(cat.id, item.id, label);
  const escolheProteina = variant ? !!variant.escolheProteina : !!item.escolheProteina;
  const proteinasIncluidas = variant ? !!variant.proteinasIncluidas : !!item.proteinasIncluidas;
  const escolheFeijao = !!item.escolheFeijao;
  const temAdicionais = !!item.temAdicionais;
  const cd = STATE.cardapioDia || {};
  const st = getDraftConfigState(ckey);

  const totalUnit = basePrice + somaAdicionaisSelecionados(st);

  let proteinaHtml = '';
  if (escolheProteina && cd.proteina1 && cd.proteina2) {
    proteinaHtml =
      '<div class="config-group"><div class="config-label">Escolha a proteína</div><div class="chip-group">' +
      [cd.proteina1, cd.proteina2]
        .map((p) => '<button type="button" class="chip small config-proteina' + (st.proteina === p ? ' selected' : '') + '" data-configkey="' + ckey + '" data-value="' + p + '">' + p + '</button>')
        .join('') +
      '</div></div>';
  } else if (proteinasIncluidas && cd.proteina1 && cd.proteina2) {
    proteinaHtml =
      '<div class="config-note"><strong>Já vem com ' + cd.proteina1 + ' e ' + cd.proteina2 + '.</strong> ' +
      'Se o cliente quiser só uma das duas, anota na observação.</div>';
  }

  let feijaoHtml = '';
  if (escolheFeijao && cd.feijaoOpcoes && cd.feijaoOpcoes.length >= 2) {
    feijaoHtml =
      '<div class="config-group"><div class="config-label">Escolha o feijão</div><div class="chip-group">' +
      cd.feijaoOpcoes
        .map((f) => '<button type="button" class="chip small config-feijao' + (st.feijao === f ? ' selected' : '') + '" data-configkey="' + ckey + '" data-value="' + f + '">' + f + '</button>')
        .join('') +
      '</div></div>';
  }

  let legumeHtml = '';
  if (escolheFeijao && cd.legumesOpcoes && cd.legumesOpcoes.length >= 2) {
    legumeHtml =
      '<div class="config-group"><div class="config-label">Escolha o legume</div><div class="chip-group">' +
      cd.legumesOpcoes
        .map((l) => '<button type="button" class="chip small config-legume' + (st.legume === l ? ' selected' : '') + '" data-configkey="' + ckey + '" data-value="' + l + '">' + l + '</button>')
        .join('') +
      '</div></div>';
  } else if (escolheFeijao && cd.legumesOpcoes && cd.legumesOpcoes.length === 1) {
    legumeHtml = '<div class="config-note">Acompanha <strong>' + cd.legumesOpcoes[0] + '</strong>.</div>';
  }

  let adicionaisHtml = '';
  if (temAdicionais) {
    const catalogoAdicionais = getAdicionaisCatalogo();
    if (catalogoAdicionais.length) {
      adicionaisHtml =
        '<div class="config-group"><div class="config-label">Adicionais</div><div class="chip-group">' +
        catalogoAdicionais
          .map((a) => '<button type="button" class="chip small config-adicional' + (st.adicionais[a.nome] ? ' selected' : '') + '" data-configkey="' + ckey + '" data-value="' + a.nome + '">' + a.nome + ' (+' + fmtBRL(a.preco) + ')</button>')
          .join('') +
        '</div></div>';
    }
  }

  const proteinaOk = !(escolheProteina && cd.proteina1 && cd.proteina2) || st.proteina;
  const feijaoOk = !(escolheFeijao && cd.feijaoOpcoes && cd.feijaoOpcoes.length >= 2) || st.feijao;
  const legumeOk = !(escolheFeijao && cd.legumesOpcoes && cd.legumesOpcoes.length >= 2) || st.legume;
  const podeAdicionar = proteinaOk && feijaoOk && legumeOk && item.disponivel;

  return (
    '<div class="marmita-config" data-configkey="' + ckey + '">' +
    (label ? '<div class="variant-label-row">' + label + ' · <span class="price">' + fmtBRL(basePrice) + '</span></div>' : '') +
    proteinaHtml +
    feijaoHtml +
    legumeHtml +
    adicionaisHtml +
    '<div class="config-footer">' +
    '<span class="config-total mono price">' + fmtBRL(totalUnit) + '</span>' +
    '<button type="button" class="btn-add-config" data-configkey="' + ckey + '"' + (podeAdicionar ? '' : ' disabled') + '>Adicionar</button>' +
    '</div>' +
    '</div>'
  );
}
function addDraftConfiguredToCart(catId, itemId, variantLabel, name, basePrice, variant, escolheProteina) {
  const ckey = draftConfigKeyFor(catId, itemId, variantLabel);
  const st = getDraftConfigState(ckey);
  const cd = STATE.cardapioDia || {};
  const unitPrice = basePrice + somaAdicionaisSelecionados(st);
  const compositeLabel = buildConfigVariantLabel(variant, escolheProteina, cd, st);
  const key = cartKey(catId, itemId, compositeLabel);
  const current = draftCart[key] || { qty: 0, name, variant: compositeLabel || null, unitPrice };
  current.qty += 1;
  draftCart[key] = current;
  draftConfigState[ckey] = { proteina: null, feijao: null, legume: null, adicionais: {} };
  renderTabPedidoNovo();
}

function stepperHtmlKds(key, disabled) {
  const qty = draftQty(key);
  if (qty > 0) {
    return (
      '<div class="stepper" data-key="' + key + '">' +
      '<button type="button" class="round dec">–</button><span class="qty">' + qty + '</span>' +
      '<button type="button" class="round add"' + (disabled ? ' disabled' : '') + '>+</button></div>'
    );
  }
  return '<div class="stepper" data-key="' + key + '"><button type="button" class="add-pill add"' + (disabled ? ' disabled' : '') + '>Adicionar</button></div>';
}

function renderTabPedidoNovo() {
  const wrap = document.getElementById('caixa-body');
  wrap.innerHTML =
    '<div class="form-panel">' +
    '<label for="paste-pedido-site" style="display:block;font-weight:700;margin-bottom:8px;">Recebeu pelo WhatsApp? Cole o pedido aqui</label>' +
    '<textarea id="paste-pedido-site" placeholder="Cole aqui o texto do pedido que chegou no WhatsApp da loja..." style="width:100%;min-height:110px;font-family:inherit;font-size:0.88rem;border:1.5px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--surface);color:var(--ink);"></textarea>' +
    '<div id="paste-pedido-feedback" style="font-size:0.82rem;margin-top:8px;"></div>' +
    '<button class="btn-primary" id="btn-colar-pedido" style="margin-top:10px;">Adicionar à fila da cozinha</button>' +
    '</div>' +
    '<div class="section-label">Ou monte manualmente</div>' +
    '<div class="tabs" id="menu-cat-tabs"></div>' +
    '<div id="menu-list"></div>' +
    '<div class="cart-total-row"><span>Total</span><span class="mono">' + fmtBRL(draftCartTotal()) + '</span></div>' +
    '<div class="field"><label for="cx-cliente">Cliente</label><input id="cx-cliente" type="text" placeholder="Nome do cliente"></div>' +
    '<div class="field"><label for="cx-telefone">Telefone (opcional)</label><input id="cx-telefone" type="tel" placeholder="(65) 99999-9999"></div>' +
    '<div class="field"><label>Entrega</label><div class="chip-group" id="cx-modo-group">' +
    '<button type="button" class="chip' + (draftModo === 'retirada' ? ' selected' : '') + '" data-modo="retirada">Retirar no local</button>' +
    '<button type="button" class="chip' + (draftModo === 'entrega' ? ' selected' : '') + '" data-modo="entrega">Entrega</button>' +
    '</div></div>' +
    '<div class="field" id="cx-endereco-field" ' + (draftModo === 'entrega' ? '' : 'hidden') + '><label for="cx-endereco">Endereço</label><input id="cx-endereco" type="text" placeholder="Rua, número, bairro"></div>' +
    '<div class="field"><label>Forma de pagamento</label><div class="chip-group" id="cx-pagamento-group">' +
    '<button type="button" class="chip' + (draftFormaPagamento === 'Dinheiro' ? ' selected' : '') + '" data-pagamento="Dinheiro">Dinheiro</button>' +
    '<button type="button" class="chip' + (draftFormaPagamento === 'Cartão' ? ' selected' : '') + '" data-pagamento="Cartão">Cartão</button>' +
    '<button type="button" class="chip' + (draftFormaPagamento === 'Pix' ? ' selected' : '') + '" data-pagamento="Pix">Pix</button>' +
    '</div></div>' +
    '<div class="field"><label for="cx-obs">Observação</label><textarea id="cx-obs" placeholder="Ex: sem cebola..."></textarea></div>' +
    '<button class="btn-primary" id="btn-enviar" disabled>Enviar pra cozinha</button>';

  const catTabs = document.getElementById('menu-cat-tabs');
  STATE.categorias.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (cat.id === activeCategory ? ' active' : '');
    btn.textContent = cat.nome;
    btn.addEventListener('click', () => {
      activeCategory = cat.id;
      renderTabPedidoNovo();
    });
    catTabs.appendChild(btn);
  });

  const cat = STATE.categorias.find((c) => c.id === activeCategory) || STATE.categorias[0];
  const listWrap = document.getElementById('menu-list');
  if (cat) {
    cat.itens.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'item-card' + (item.disponivel ? '' : ' unavailable');
      const descHtml = item.descricao ? '<div class="item-desc">' + item.descricao + '</div>' : '';
      if (cat.id === 'marmitas') {
        const configRowsHtml = item.tipo === 'simples' ? renderDraftConfigRow(cat, item, null) : item.variantes.map((v) => renderDraftConfigRow(cat, item, v)).join('');
        card.innerHTML = '<div class="item-top"><div class="item-name">' + item.nome + '</div></div>' + descHtml + configRowsHtml;
      } else if (item.tipo === 'simples') {
        const key = cartKey(cat.id, item.id, null);
        card.innerHTML =
          '<div class="item-top"><div class="item-name">' + item.nome + '</div></div>' + descHtml +
          '<div class="simple-row"><span class="price">' + fmtBRL(item.preco) + '</span>' + stepperHtmlKds(key, !item.disponivel) + '</div>';
      } else {
        const rows = item.variantes
          .filter((v) => v.disponivel !== false)
          .map((v) => {
            const vkey = cartKey(cat.id, item.id, v.label);
            return (
              '<div class="variant-row" data-vkey="' + vkey + '" data-price="' + v.preco + '" data-label="' + v.label + '">' +
              '<span class="variant-label">' + v.label + ' · <span class="price">' + fmtBRL(v.preco) + '</span></span>' + stepperHtmlKds(vkey, !item.disponivel) + '</div>'
            );
          })
          .join('');
        card.innerHTML = '<div class="item-top"><div class="item-name">' + item.nome + '</div></div>' + descHtml + rows;
      }
      listWrap.appendChild(card);
    });
  }

  listWrap.querySelectorAll('.config-proteina, .config-feijao, .config-legume, .config-adicional').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ckey = btn.getAttribute('data-configkey');
      const value = btn.getAttribute('data-value');
      const st = getDraftConfigState(ckey);
      if (btn.classList.contains('config-proteina')) st.proteina = st.proteina === value ? null : value;
      else if (btn.classList.contains('config-feijao')) st.feijao = st.feijao === value ? null : value;
      else if (btn.classList.contains('config-legume')) st.legume = st.legume === value ? null : value;
      else st.adicionais[value] = !st.adicionais[value];
      renderTabPedidoNovo();
    });
  });
  listWrap.querySelectorAll('.btn-add-config').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const ckey = btn.getAttribute('data-configkey');
      const [catId, itemId, variantLabel] = ckey.split('::');
      const it = findMenuItem(catId, itemId);
      const variant = variantLabel ? it.variantes.find((v) => v.label === variantLabel) : null;
      const basePrice = variant ? variant.preco : it.preco;
      const escolheProteina = variant ? !!variant.escolheProteina : !!it.escolheProteina;
      addDraftConfiguredToCart(catId, itemId, variantLabel || null, it.nome, basePrice, variant, escolheProteina);
    });
  });

  listWrap.querySelectorAll('.stepper').forEach((st) => {
    const key = st.getAttribute('data-key');
    const row = st.closest('.variant-row');
    const addBtn = st.querySelector('.add');
    const decBtn = st.querySelector('.dec');
    let unitPrice, name, variantLabel, itemId, catId;
    if (row) {
      unitPrice = parseFloat(row.getAttribute('data-price'));
      variantLabel = row.getAttribute('data-label');
      [catId, itemId] = key.split('::');
      name = findMenuItem(catId, itemId).nome;
    } else {
      [catId, itemId] = key.split('::');
      const it = findMenuItem(catId, itemId);
      unitPrice = it.preco;
      name = it.nome;
      variantLabel = null;
    }
    if (addBtn) addBtn.addEventListener('click', () => changeDraftQty(catId, itemId, variantLabel, unitPrice, name, 1));
    if (decBtn) decBtn.addEventListener('click', () => changeDraftQty(catId, itemId, variantLabel, unitPrice, name, -1));
  });

  document.getElementById('cx-cliente').value = draftCliente;
  document.getElementById('cx-cliente').addEventListener('input', (e) => {
    draftCliente = e.target.value;
    updateEnviarState();
  });
  document.getElementById('cx-telefone').value = draftTelefone;
  document.getElementById('cx-telefone').addEventListener('input', (e) => (draftTelefone = e.target.value));
  document.getElementById('cx-obs').value = draftObs;
  document.getElementById('cx-obs').addEventListener('input', (e) => (draftObs = e.target.value));
  const enderecoInput = document.getElementById('cx-endereco');
  if (enderecoInput) {
    enderecoInput.value = draftEndereco;
    enderecoInput.addEventListener('input', (e) => {
      draftEndereco = e.target.value;
      updateEnviarState();
    });
  }
  wrap.querySelectorAll('#cx-modo-group .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      draftModo = chip.getAttribute('data-modo');
      renderTabPedidoNovo();
    });
  });
  wrap.querySelectorAll('#cx-pagamento-group .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      draftFormaPagamento = chip.getAttribute('data-pagamento');
      renderTabPedidoNovo();
    });
  });
  updateEnviarState();
  document.getElementById('btn-enviar').addEventListener('click', enviarPedido);
  document.getElementById('btn-colar-pedido').addEventListener('click', enviarPedidoColado);
}

function parsePastedPedido(text) {
  try {
    const lines = text.split('\n').map((l) => l.trim());
    const get = (prefix) => {
      const line = lines.find((l) => l.toLowerCase().indexOf(prefix.toLowerCase()) === 0);
      return line ? line.slice(prefix.length).trim() : '';
    };
    const tipo = get('Tipo:');
    const pagamento = get('Pagamento:');
    const cliente = get('Cliente:');
    const telefone = get('Telefone:');
    const endereco = get('Endereço:');
    const totalRaw = get('Total:');
    const obs = get('Obs:');
    const itensStart = lines.findIndex((l) => l.toLowerCase() === 'itens:');
    const itensEndIdx = lines.findIndex((l) => /^(subtotal|total):/i.test(l));
    const itens = [];
    if (itensStart >= 0 && itensEndIdx > itensStart) {
      for (let i = itensStart + 1; i < itensEndIdx; i++) {
        if (!lines[i]) continue;
        const m = lines[i].match(/^(\d+)x\s+(.+?)\s+—\s+R\$\s*([\d.,]+)(?:\s+cada\s*=\s*R\$\s*([\d.,]+))?$/);
        if (m) {
          const fullName = m[2];
          const unit = parseFloat(m[3].replace('.', '').replace(',', '.'));
          const vm = fullName.match(/^(.*)\s\(([^)]+)\)$/);
          itens.push({ nome: vm ? vm[1] : fullName, variante: vm ? vm[2] : null, qtde: parseInt(m[1], 10), precoUnit: unit });
        }
      }
    }
    if (!cliente && itens.length === 0) return null;
    const totalMatch = totalRaw.match(/([\d.,]+)/);
    const total = totalMatch ? parseFloat(totalMatch[1].replace('.', '').replace(',', '.')) : itens.reduce((s, i) => s + i.qtde * i.precoUnit, 0);
    return {
      cliente: cliente || 'Cliente do site',
      telefone,
      pagamento,
      modo: /entrega|delivery/i.test(tipo) ? 'entrega' : 'retirada',
      endereco,
      itens,
      total,
      obs
    };
  } catch (e) {
    return null;
  }
}

function enviarPedidoColado() {
  unlockAudio();
  window.__audioUnlocked = true;
  const feedback = document.getElementById('paste-pedido-feedback');
  const text = document.getElementById('paste-pedido-site').value;
  if (!text.trim()) {
    feedback.style.color = 'var(--cancelado)';
    feedback.textContent = 'Cole o texto do pedido primeiro.';
    return;
  }
  const parsed = parsePastedPedido(text);
  if (!parsed || parsed.itens.length === 0) {
    feedback.style.color = 'var(--cancelado)';
    feedback.textContent = 'Não consegui entender esse texto. Confira se colou a mensagem completa do pedido.';
    return;
  }
  pendingPedido = {
    itens: parsed.itens,
    obs: parsed.obs,
    cliente: parsed.cliente,
    telefone: parsed.telefone || '',
    formaPagamento: parsed.pagamento || '',
    modo: parsed.modo,
    endereco: parsed.endereco,
    total: parsed.total
  };
  renderConfirmacaoPedido();
}

function updateEnviarState() {
  const btn = document.getElementById('btn-enviar');
  if (!btn) return;
  const temItem = draftCartArray().length > 0;
  const enderecoOk = draftModo !== 'entrega' || draftEndereco.trim();
  btn.disabled = !temItem || !enderecoOk || !draftFormaPagamento || !dbReady;
}

function enviarPedido() {
  unlockAudio();
  window.__audioUnlocked = true;
  if (!dbReady) return;
  const itens = draftCartArray().map((i) => ({ nome: i.name, variante: i.variant, qtde: i.qty, precoUnit: i.unitPrice }));
  pendingPedido = {
    itens,
    obs: draftObs.trim(),
    cliente: draftCliente.trim() || 'Balcão',
    telefone: draftTelefone.trim(),
    modo: draftModo,
    endereco: draftModo === 'entrega' ? draftEndereco.trim() : '',
    formaPagamento: draftFormaPagamento,
    total: draftCartTotal()
  };
  renderConfirmacaoPedido();
}

function buildWaHref(waNum, msg) {
  return 'https://wa.me/' + waNum + '?text=' + encodeURIComponent(msg);
}

function renderConfirmacaoPedido() {
  const wrap = document.getElementById('caixa-body');
  if (!wrap || !pendingPedido) return;
  const o = pendingPedido;
  const waNum = waNumberFromTelefone(o.telefone);
  const itensHtml = o.itens.map((i) => '<li><span class="qtd">' + i.qtde + 'x</span>' + (i.nome + (i.variante ? ' (' + i.variante + ')' : '')) + '</li>').join('');
  wrap.innerHTML =
    '<div class="form-panel">' +
    '<div class="section-label" style="margin-top:0;">Pedido pronto pra seguir</div>' +
    '<div class="order-cliente" style="margin-bottom:8px;">' + o.cliente + ' · <span class="mono price">' + fmtBRL(o.total || 0) + '</span></div>' +
    (o.formaPagamento ? '<div class="order-obs">Pagamento: ' + o.formaPagamento + '</div>' : '') +
    '<ul class="order-itens">' + itensHtml + '</ul>' +
    (o.obs ? '<div class="order-obs">' + o.obs + '</div>' : '') +
    '<div class="action-row" style="margin-top:14px;">' +
    (waNum
      ? '<a class="btn-small" target="_blank" rel="noopener" href="' + buildWaHref(waNum, buildConfirmacaoMsg(o)) + '">Confirmar pedido com cliente</a>'
      : '<span style="font-size:0.82rem;color:var(--ink-soft);">Sem telefone salvo — não dá pra confirmar por WhatsApp</span>') +
    '</div>' +
    '<button class="btn-primary" id="btn-mandar-cozinha" style="margin-top:12px;">Mandar para cozinha</button>' +
    '<button class="btn-ghost" id="btn-voltar-pedido" style="margin-top:8px;width:100%;">Voltar e editar</button>' +
    '</div>';
  document.getElementById('btn-mandar-cozinha').addEventListener('click', mandarParaCozinha);
  document.getElementById('btn-voltar-pedido').addEventListener('click', () => {
    pendingPedido = null;
    renderTabPedidoNovo();
  });
}

async function mandarParaCozinha() {
  if (!dbReady || !pendingPedido) return;
  const btn = document.getElementById('btn-mandar-cozinha');
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  try {
    const cliente = pendingPedido.cliente;
    await inserirPedido(pendingPedido);
    pendingPedido = null;
    draftCart = {};
    draftCliente = '';
    draftTelefone = '';
    draftObs = '';
    draftEndereco = '';
    draftModo = 'retirada';
    draftFormaPagamento = '';
    alert('Pedido de ' + cliente + ' enviado pra cozinha!');
    renderCaixa();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Mandar para cozinha';
    alert('Não consegui enviar agora. Tente de novo.');
  }
}

/* ---------------- ABA: Pedidos (fluxo de status) ---------------- */
const STATUS_LABEL = { novo: 'Novo', preparo: 'Em preparo', pronto: 'Pronto', saiu: 'Saiu p/ entrega', concluido: 'Concluído', cancelado: 'Cancelado' };
const PEDIDOS_FILTROS = [
  { id: 'ativos', label: 'Ativos' },
  { id: 'novo', label: 'Novos' },
  { id: 'preparo', label: 'Em preparo' },
  { id: 'pronto', label: 'Prontos' },
  { id: 'saiu', label: 'Saiu' },
  { id: 'concluido', label: 'Concluídos' },
  { id: 'cancelado', label: 'Cancelados' },
  { id: 'todos', label: 'Todos' }
];
function pedidoMatchesFiltro(o, filtro) {
  if (filtro === 'todos') return true;
  if (filtro === 'ativos') return ['novo', 'preparo', 'pronto', 'saiu'].indexOf(o.status) >= 0;
  return o.status === filtro;
}
function waNumberFromTelefone(tel) {
  const digits = (tel || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}
function buildConfirmacaoMsg(o) {
  const itensTxt = o.itens.map((i) => i.qtde + 'x ' + (i.nome + (i.variante ? ' (' + i.variante + ')' : ''))).join('\n');
  const linhas = ['Oi ' + o.cliente + '! Seu pedido na Sabor e Prosa foi aceito e já está sendo preparado 🍱', '', itensTxt, '', 'Total: ' + fmtBRL(o.total || 0), ''];
  linhas.push(o.modo === 'entrega' ? 'Assim que sair pra entrega a gente avisa!' : 'Te avisamos por aqui quando estiver pronto pra retirar.');
  return linhas.join('\n');
}
function buildProntoRetiradaMsg(o) {
  return ['Oi ' + o.cliente + '! Seu pedido na Sabor e Prosa está pronto e te esperando no balcão 🍱', '', 'Total: ' + fmtBRL(o.total || 0), '', 'Muito obrigado pela preferência! Foi um prazer preparar seu pedido. 💛'].join('\n');
}
function buildMotoboySaiuMsg(o) {
  return ['Oi ' + o.cliente + '! Seu pedido da Sabor e Prosa acabou de sair para entrega com o motoboy 🛵🍱', '', 'Total: ' + fmtBRL(o.total || 0), '', 'Chega até você em instantes. Obrigado pela preferência! 💛'].join('\n');
}
function buildComandaLines(o) {
  const linhas = [];
  linhas.push('SABOR E PROSA');
  linhas.push(fmtHora(o.criadoEm) + ' · ' + (o.modo === 'entrega' ? 'ENTREGA' : 'RETIRADA'));
  linhas.push('------------------------------');
  linhas.push('Cliente: ' + o.cliente);
  if (o.telefone) linhas.push('Telefone: ' + o.telefone);
  if (o.modo === 'entrega' && o.endereco) linhas.push('Endereço: ' + o.endereco);
  linhas.push('------------------------------');
  o.itens.forEach((i) => {
    linhas.push(i.qtde + 'x ' + (i.nome + (i.variante ? ' (' + i.variante + ')' : '')));
    const menuItem = findMenuItemByNome(i.nome);
    if (menuItem && menuItem.descricao) linhas.push('   ' + menuItem.descricao);
  });
  linhas.push('------------------------------');
  if (o.formaPagamento) linhas.push('Pagamento: ' + o.formaPagamento);
  linhas.push('TOTAL: ' + fmtBRL(o.total || 0));
  if (o.obs) {
    linhas.push('');
    linhas.push('Obs: ' + o.obs);
  }
  return linhas;
}

function imprimirComanda(o) {
  baixarComandaPdf(buildComandaLines(o), 'comanda-' + (o.cliente || 'pedido').replace(/[^a-zA-Z0-9]+/g, '-') + '-' + Date.now() + '.pdf');
}

function renderTabPedidos() {
  const wrap = document.getElementById('caixa-body');
  wrap.innerHTML = '<div class="subtabs" id="pedidos-subtabs"></div><div id="pedidos-list"></div>';
  const subtabs = document.getElementById('pedidos-subtabs');
  PEDIDOS_FILTROS.forEach((f) => {
    const btn = document.createElement('button');
    btn.className = 'subtab-btn' + (f.id === pedidosFiltro ? ' active' : '');
    btn.textContent = f.label;
    btn.addEventListener('click', () => {
      pedidosFiltro = f.id;
      renderTabPedidos();
    });
    subtabs.appendChild(btn);
  });

  const list = document.getElementById('pedidos-list');
  const filtrados = allPedidos
    .filter((o) => pedidoMatchesFiltro(o, pedidosFiltro))
    .slice()
    .sort((a, b) => b.criadoEm - a.criadoEm);

  if (filtrados.length === 0) {
    list.innerHTML = '<div class="empty-state"><span class="emoji">🧾</span>Nenhum pedido aqui.</div>';
    return;
  }

  filtrados.forEach((o) => {
    const card = document.createElement('div');
    card.className = 'order-card' + (o.status === 'pronto' ? ' ready' : '');
    const itensHtml = o.itens.map((i) => '<li><span><span class="qtd">' + i.qtde + 'x</span>' + (i.nome + (i.variante ? ' (' + i.variante + ')' : '')) + '</span></li>').join('');
    let actions = '';
    const waNum = waNumberFromTelefone(o.telefone);
    if (o.status === 'novo' || o.status === 'preparo') {
      if (waNum) actions += '<a class="btn-small" target="_blank" rel="noopener" href="' + buildWaHref(waNum, buildConfirmacaoMsg(o)) + '">Confirmar com cliente</a>';
    } else if (o.status === 'pronto') {
      if (o.modo === 'entrega') {
        actions += '<button type="button" class="btn-small primary" data-action="saiu" data-id="' + o.id + '">Saiu para entrega</button>';
        if (waNum) actions += ' <a class="btn-small" target="_blank" rel="noopener" href="' + buildWaHref(waNum, buildMotoboySaiuMsg(o)) + '">Avisar que motoboy saiu</a>';
      } else {
        actions += '<button type="button" class="btn-small primary" data-action="concluido" data-id="' + o.id + '">Concluir (retirado)</button>';
        if (waNum) actions += ' <a class="btn-small" target="_blank" rel="noopener" href="' + buildWaHref(waNum, buildProntoRetiradaMsg(o)) + '">Avisar que está pronto</a>';
      }
    } else if (o.status === 'saiu') {
      actions += '<button type="button" class="btn-small primary" data-action="concluido" data-id="' + o.id + '">Concluir entrega</button>';
      if (waNum) actions += ' <a class="btn-small" target="_blank" rel="noopener" href="' + buildWaHref(waNum, buildMotoboySaiuMsg(o)) + '">Reenviar aviso motoboy</a>';
    }
    actions += ' <button type="button" class="btn-small" data-print-id="' + o.id + '">🖨️ Imprimir comanda</button>';
    if (['novo', 'preparo', 'pronto', 'saiu'].indexOf(o.status) >= 0) {
      actions += ' <button type="button" class="btn-small danger" data-action="cancelado" data-id="' + o.id + '">Cancelar</button>';
    }
    card.innerHTML =
      '<div class="order-top"><div><div class="order-cliente">' + o.cliente + ' · <span class="mono price">' + fmtBRL(o.total || 0) + '</span></div>' +
      '<div class="order-time mono">' + fmtHora(o.criadoEm) + ' · ' + (o.modo === 'entrega' ? 'Entrega' : 'Retirada') + '</div></div>' +
      '<span class="status-chip ' + o.status + '">' + STATUS_LABEL[o.status] + '</span></div>' +
      '<ul class="order-itens">' + itensHtml + '</ul>' +
      (o.formaPagamento ? '<div class="order-obs">Pagamento: ' + o.formaPagamento + '</div>' : '') +
      (o.obs ? '<div class="order-obs">' + o.obs + '</div>' : '') +
      (actions ? '<div class="action-row">' + actions + '</div>' : '');
    list.appendChild(card);
  });

  list.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      atualizarStatusPedido(id, action).catch(() => alert('Não consegui atualizar. Tente de novo.'));
    });
  });
  list.querySelectorAll('[data-print-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-print-id');
      const o = allPedidos.find((p) => p.id === id);
      if (o) imprimirComanda(o);
    });
  });
}

/* ---------------- ABA: Caixa (financeiro) ---------------- */
const MOV_LABEL = { sangria: 'Sangria', reforco: 'Reforço', despesa: 'Despesa' };
function renderTabCaixaFinanceiro() {
  const wrap = document.getElementById('caixa-body');
  const pedidosPeriodo = allPedidos.filter((o) => o.status === 'concluido' && inPeriodo(o.concluidoEm || o.criadoEm, caixaPeriodo));
  const faturamento = pedidosPeriodo.reduce((s, o) => s + (o.total || 0), 0);
  const qtdPedidos = pedidosPeriodo.length;
  const ticketMedio = qtdPedidos ? faturamento / qtdPedidos : 0;

  const movsPeriodo = allMovimentos.filter((m) => inPeriodo(m.criadoEm, caixaPeriodo));
  const saldo = movsPeriodo.reduce((s, m) => (m.tipo === 'reforco' ? s + m.valor : s - m.valor), 0);

  wrap.innerHTML =
    '<div class="subtabs" id="periodo-tabs"></div>' +
    '<div class="stat-grid">' +
    '<div class="stat-tile"><div class="label">Faturamento</div><div class="value">' + fmtBRL(faturamento) + '</div></div>' +
    '<div class="stat-tile"><div class="label">Pedidos concluídos</div><div class="value">' + qtdPedidos + '</div></div>' +
    '<div class="stat-tile"><div class="label">Ticket médio</div><div class="value">' + fmtBRL(ticketMedio) + '</div></div>' +
    '<div class="stat-tile"><div class="label">Saldo lançamentos manuais</div><div class="value">' + fmtBRL(saldo) + '</div></div>' +
    '</div>' +
    '<button class="btn-small primary" id="btn-mostrar-form-mov">+ Registrar movimento</button>' +
    '<div id="mov-form-wrap"></div>' +
    '<div class="section-label">Lançamentos manuais</div>' +
    '<div id="mov-list"></div>';

  wirePeriodoTabs('periodo-tabs', caixaPeriodo, (p) => {
    caixaPeriodo = p;
    renderTabCaixaFinanceiro();
  });

  document.getElementById('btn-mostrar-form-mov').addEventListener('click', renderMovForm);

  const movList = document.getElementById('mov-list');
  if (movsPeriodo.length === 0) {
    movList.innerHTML = '<div class="empty-state">Nenhum lançamento manual nesse período.</div>';
  } else {
    movList.innerHTML = '';
    movsPeriodo
      .slice()
      .sort((a, b) => b.criadoEm - a.criadoEm)
      .forEach((m) => {
        const row = document.createElement('div');
        row.className = 'mov-row';
        const isNeg = m.tipo !== 'reforco';
        row.innerHTML =
          '<div><div class="mov-tipo">' + MOV_LABEL[m.tipo] + '</div>' +
          '<div class="mov-motivo">' + (m.motivo || '—') + ' · ' + fmtHora(m.criadoEm) + '</div></div>' +
          '<div class="mov-valor ' + (isNeg ? 'neg' : 'pos') + '">' + (isNeg ? '-' : '+') + fmtBRL(m.valor) + '</div>';
        movList.appendChild(row);
      });
  }
}

function renderMovForm() {
  const host = document.getElementById('mov-form-wrap');
  host.innerHTML =
    '<div class="form-panel">' +
    '<div class="field"><label>Tipo</label><div class="chip-group" id="mov-tipo-chips">' +
    '<button type="button" class="chip selected" data-tipo="sangria">Sangria</button>' +
    '<button type="button" class="chip" data-tipo="reforco">Reforço</button>' +
    '<button type="button" class="chip" data-tipo="despesa">Despesa</button>' +
    '</div></div>' +
    '<div class="field"><label for="mov-valor">Valor (R$)</label><input id="mov-valor" type="number" step="0.01" placeholder="0,00"></div>' +
    '<div class="field"><label for="mov-motivo">Motivo (opcional)</label><input id="mov-motivo" type="text" placeholder="Ex: troco, compra de gás..."></div>' +
    '<button class="btn-primary" id="btn-salvar-mov">Salvar lançamento</button>' +
    '</div>';
  let tipoSelecionado = 'sangria';
  host.querySelectorAll('#mov-tipo-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      tipoSelecionado = chip.getAttribute('data-tipo');
      host.querySelectorAll('#mov-tipo-chips .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });
  document.getElementById('btn-salvar-mov').addEventListener('click', async () => {
    const valor = parseFloat(document.getElementById('mov-valor').value);
    if (!valor || valor <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    const motivo = document.getElementById('mov-motivo').value.trim();
    if (!dbReady) return;
    try {
      await inserirMovimento({ tipo: tipoSelecionado, valor, motivo });
      host.innerHTML = '';
    } catch (e) {
      alert('Não consegui salvar. Tente de novo.');
    }
  });
}

/* ---------------- ABA: Cardápio do dia ---------------- */
let draftCardapio = null;
let draftLoja = null;

function renderTabCardapioDia() {
  if (!draftCardapio) draftCardapio = JSON.parse(JSON.stringify(STATE.cardapioDia));
  if (!draftLoja) draftLoja = JSON.parse(JSON.stringify(STATE.loja));
  const cd = draftCardapio;
  const lj = draftLoja;
  if (!cd.feijaoOpcoes) cd.feijaoOpcoes = [];
  if (!cd.legumesOpcoes) cd.legumesOpcoes = [];
  if (!cd.adicionaisOpcoes) cd.adicionaisOpcoes = [];
  if (!lj.horarioAbre) lj.horarioAbre = '10:30';
  if (!lj.horarioFecha) lj.horarioFecha = '13:30';
  if (!lj.modo) lj.modo = lj.forcarAberta ? 'forcar_aberta' : lj.aberta === false ? 'forcar_fechada' : 'auto';

  const wrap = document.getElementById('caixa-body');
  wrap.innerHTML =
    '<div class="form-panel">' +
    '<div class="section-label" style="margin-top:0;">Funcionamento da loja</div>' +
    '<div class="chip-group" id="lj-modo-chips">' +
    '<button type="button" class="chip" data-modo="auto">Automático (segue o horário)</button>' +
    '<button type="button" class="chip" data-modo="forcar_aberta">Forçar aberta agora</button>' +
    '<button type="button" class="chip" data-modo="forcar_fechada">Forçar fechada agora</button>' +
    '</div>' +
    '<div class="form-row" style="margin-top:12px;">' +
    '<div class="field" style="margin-top:0;"><label for="lj-horario-abre">Abre às</label><input id="lj-horario-abre" type="time"></div>' +
    '<div class="field" style="margin-top:0;"><label for="lj-horario-fecha">Fecha às</label><input id="lj-horario-fecha" type="time"></div>' +
    '</div>' +
    '<p style="font-size:0.8rem;color:var(--ink-soft);margin:8px 0 0;">No modo "Automático" a loja abre e fecha sozinha nesse horário, todo dia. Use "Forçar" pra abrir fora do horário ou fechar antes (ex: acabou a comida).</p>' +
    '</div>' +
    '<div class="form-panel">' +
    '<div class="section-label" style="margin-top:0;">Cardápio do dia</div>' +
    '<p style="font-size:0.85rem;color:var(--ink-soft);margin:0 0 4px;">É aqui que você mesma muda o que varia todo dia: as 2 proteínas principais, as opções de feijão e a carne extra do buffet. Se um feijão acabar, remove ele daqui e clica em "Publicar alterações" — não precisa esperar ninguém mudar pra você.</p>' +
    '<div class="field" style="margin-top:10px;"><label for="cd-proteina1">Proteína principal 1</label><input id="cd-proteina1" type="text"></div>' +
    '<div class="field"><label for="cd-proteina2">Proteína principal 2</label><input id="cd-proteina2" type="text"></div>' +
    '<div class="field"><label>Opções de feijão (o cliente só escolhe quando houver 2)</label><div id="cd-feijao-list"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;"><input id="cd-feijao-novo" type="text" placeholder="Ex: Feijão preto" style="flex:1;"><button class="btn-ghost" id="cd-feijao-add" type="button">+ Adicionar</button></div></div>' +
    '<div class="field"><label>Opções de legume/refogado (o cliente só escolhe quando houver 2)</label><div id="cd-legume-list"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;"><input id="cd-legume-novo" type="text" placeholder="Ex: Abobrinha e cenoura refogada" style="flex:1;"><button class="btn-ghost" id="cd-legume-add" type="button">+ Adicionar</button></div></div>' +
    '<div class="field"><label>Carne extra do buffet (vira adicional pago de R$ 25,00)</label><div id="cd-extra-list"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;"><input id="cd-extra-novo" type="text" placeholder="Ex: Costelinha suína frita" style="flex:1;"><button class="btn-ghost" id="cd-extra-add" type="button">+ Adicionar</button></div></div>' +
    '<div style="display:flex;gap:10px;margin-top:16px;">' +
    '<button class="btn-ghost" id="cd-descartar" type="button" style="flex:1;">Descartar</button>' +
    '<button class="btn-primary" id="cd-publicar" type="button" style="flex:1;margin-top:0;">Publicar alterações</button>' +
    '</div>' +
    '<div id="cd-status" style="font-size:0.85rem;font-weight:700;text-align:center;margin-top:10px;color:var(--ready);"></div>' +
    '</div>';

  document.querySelectorAll('#lj-modo-chips .chip').forEach((chip) => {
    chip.classList.toggle('selected', chip.getAttribute('data-modo') === lj.modo);
    chip.addEventListener('click', () => {
      lj.modo = chip.getAttribute('data-modo');
      renderTabCardapioDia();
    });
  });
  document.getElementById('lj-horario-abre').value = lj.horarioAbre;
  document.getElementById('lj-horario-abre').addEventListener('input', (e) => (lj.horarioAbre = e.target.value));
  document.getElementById('lj-horario-fecha').value = lj.horarioFecha;
  document.getElementById('lj-horario-fecha').addEventListener('input', (e) => (lj.horarioFecha = e.target.value));

  document.getElementById('cd-proteina1').value = cd.proteina1 || '';
  document.getElementById('cd-proteina1').addEventListener('input', (e) => (cd.proteina1 = e.target.value));
  document.getElementById('cd-proteina2').value = cd.proteina2 || '';
  document.getElementById('cd-proteina2').addEventListener('input', (e) => (cd.proteina2 = e.target.value));

  function renderCdList(containerId, arr) {
    const listEl = document.getElementById(containerId);
    listEl.innerHTML = '';
    arr.forEach((val, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px;';
      const span = document.createElement('span');
      span.style.cssText = 'flex:1;font-size:0.9rem;color:var(--ink);';
      span.textContent = val;
      const del = document.createElement('button');
      del.type = 'button';
      del.title = 'Remover';
      del.textContent = '✕';
      del.style.cssText = 'border:1.5px solid var(--cancelado);color:var(--cancelado);background:var(--surface);border-radius:8px;width:32px;height:32px;cursor:pointer;flex:none;';
      del.addEventListener('click', () => {
        arr.splice(idx, 1);
        renderTabCardapioDia();
      });
      row.appendChild(span);
      row.appendChild(del);
      listEl.appendChild(row);
    });
    if (!arr.length) {
      const empty = document.createElement('p');
      empty.style.cssText = 'font-size:0.8rem;color:var(--ink-soft);margin:8px 0 0;';
      empty.textContent = 'Nenhuma opção cadastrada.';
      listEl.appendChild(empty);
    }
  }
  renderCdList('cd-feijao-list', cd.feijaoOpcoes);
  renderCdList('cd-legume-list', cd.legumesOpcoes);
  renderCdList('cd-extra-list', cd.adicionaisOpcoes);

  document.getElementById('cd-feijao-add').addEventListener('click', () => {
    const input = document.getElementById('cd-feijao-novo');
    const val = input.value.trim();
    if (!val) return;
    cd.feijaoOpcoes.push(val);
    renderTabCardapioDia();
  });
  document.getElementById('cd-legume-add').addEventListener('click', () => {
    const input = document.getElementById('cd-legume-novo');
    const val = input.value.trim();
    if (!val) return;
    cd.legumesOpcoes.push(val);
    renderTabCardapioDia();
  });
  document.getElementById('cd-extra-add').addEventListener('click', () => {
    const input = document.getElementById('cd-extra-novo');
    const val = input.value.trim();
    if (!val) return;
    cd.adicionaisOpcoes.push(val);
    renderTabCardapioDia();
  });
  document.getElementById('cd-descartar').addEventListener('click', () => {
    draftCardapio = JSON.parse(JSON.stringify(STATE.cardapioDia));
    draftLoja = JSON.parse(JSON.stringify(STATE.loja));
    renderTabCardapioDia();
  });
  document.getElementById('cd-publicar').addEventListener('click', publicarCardapioDia);
}

async function publicarCardapioDia() {
  const statusEl = document.getElementById('cd-status');
  statusEl.textContent = 'Publicando...';
  try {
    await saveState({ cardapioDia: draftCardapio, loja: draftLoja });
    STATE.cardapioDia = draftCardapio;
    STATE.loja = draftLoja;
    statusEl.textContent = 'Atualizado! (já vale no site também)';
  } catch (err) {
    statusEl.textContent = 'Não deu para publicar agora. Tente de novo em instantes.';
  }
}

/* ---------------- ABA: Relatórios ---------------- */
function renderTabRelatorios() {
  const wrap = document.getElementById('caixa-body');
  const pedidosPeriodo = allPedidos.filter((o) => o.status === 'concluido' && inPeriodo(o.concluidoEm || o.criadoEm, relatoriosPeriodo));
  const faturamento = pedidosPeriodo.reduce((s, o) => s + (o.total || 0), 0);
  const qtdPedidos = pedidosPeriodo.length;
  const ticketMedio = qtdPedidos ? faturamento / qtdPedidos : 0;

  const ranking = {};
  pedidosPeriodo.forEach((o) => {
    o.itens.forEach((i) => {
      const nome = i.nome + (i.variante ? ' (' + i.variante + ')' : '');
      ranking[nome] = (ranking[nome] || 0) + i.qtde;
    });
  });
  const rankingArr = Object.keys(ranking)
    .map((k) => ({ nome: k, qtd: ranking[k] }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 8);

  wrap.innerHTML =
    '<div class="subtabs" id="periodo-tabs-rel"></div>' +
    '<div class="stat-grid">' +
    '<div class="stat-tile"><div class="label">Faturamento</div><div class="value">' + fmtBRL(faturamento) + '</div></div>' +
    '<div class="stat-tile"><div class="label">Pedidos</div><div class="value">' + qtdPedidos + '</div></div>' +
    '<div class="stat-tile"><div class="label">Ticket médio</div><div class="value">' + fmtBRL(ticketMedio) + '</div></div>' +
    '</div>' +
    '<div class="section-label">Mais vendidos</div>' +
    '<div id="ranking-list"></div>';

  wirePeriodoTabs('periodo-tabs-rel', relatoriosPeriodo, (p) => {
    relatoriosPeriodo = p;
    renderTabRelatorios();
  });

  const rankWrap = document.getElementById('ranking-list');
  if (rankingArr.length === 0) {
    rankWrap.innerHTML = '<div class="empty-state">Sem pedidos concluídos nesse período ainda.</div>';
  } else {
    rankWrap.innerHTML = '';
    rankingArr.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'rank-row';
      row.innerHTML = '<span class="rank-name">' + r.nome + '</span><span class="rank-qtd">' + r.qtd + 'x</span>';
      rankWrap.appendChild(row);
    });
  }
}

function wirePeriodoTabs(elId, current, onChange) {
  const el = document.getElementById(elId);
  [
    { id: 'hoje', label: 'Hoje' },
    { id: '7dias', label: '7 dias' },
    { id: '30dias', label: '30 dias' }
  ].forEach((p) => {
    const btn = document.createElement('button');
    btn.className = 'subtab-btn' + (p.id === current ? ' active' : '');
    btn.textContent = p.label;
    btn.addEventListener('click', () => onChange(p.id));
    el.appendChild(btn);
  });
}

/* ================= COZINHA ================= */
function renderCozinha() {
  app.innerHTML = topbarHtml('Cozinha') + '<div id="lista-cozinha"></div>';
  wireTopbar();
  renderListaCozinha();
}

function renderListaCozinha() {
  const wrap = document.getElementById('lista-cozinha');
  if (!wrap) return;
  const pendentes = allPedidos.filter((o) => o.status === 'novo' || o.status === 'preparo').sort((a, b) => a.criadoEm - b.criadoEm);
  if (pendentes.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><span class="emoji">👩‍🍳</span>Nenhum pedido pendente. Tudo em dia!</div>';
    return;
  }
  wrap.innerHTML = '';
  const chipLabel = { novo: 'Novo pedido', preparo: 'Em preparo' };
  pendentes.forEach((o) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    const itensHtml = o.itens
      .map((i) => {
        const nome = i.nome + (i.variante ? ' (' + i.variante + ')' : '');
        const menuItem = findMenuItemByNome(i.nome);
        const conteudoHtml = menuItem && menuItem.descricao ? '<div class="item-conteudo">' + menuItem.descricao + '</div>' : '';
        return '<li><span class="qtd">' + i.qtde + 'x</span>' + nome + conteudoHtml + '</li>';
      })
      .join('');
    const actionBtn =
      o.status === 'novo'
        ? '<button type="button" class="btn-lido" data-id="' + o.id + '">Lido</button>'
        : '<button type="button" class="btn-pronto" data-id="' + o.id + '">Marcar como pronto</button>';
    card.innerHTML =
      '<div class="order-top"><div><div class="order-cliente">' + o.cliente + '</div><div class="order-time mono">' + fmtHora(o.criadoEm) + '</div></div>' +
      '<span class="status-chip ' + o.status + '">' + chipLabel[o.status] + '</span></div>' +
      '<ul class="order-itens">' + itensHtml + '</ul>' +
      (o.obs ? '<div class="order-obs">' + o.obs + '</div>' : '') +
      actionBtn;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll('.btn-lido').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      btn.disabled = true;
      btn.textContent = 'Marcando...';
      atualizarStatusPedido(id, 'preparo').catch(() => {
        btn.disabled = false;
        btn.textContent = 'Lido';
      });
    });
  });
  wrap.querySelectorAll('.btn-pronto').forEach((btn) => {
    btn.addEventListener('click', () => {
      unlockAudio();
      window.__audioUnlocked = true;
      const id = btn.getAttribute('data-id');
      btn.disabled = true;
      btn.textContent = 'Marcando...';
      atualizarStatusPedido(id, 'pronto').catch(() => {
        btn.disabled = false;
        btn.textContent = 'Marcar como pronto';
      });
    });
  });
}

/* ---------------- inicialização e assinatura em tempo real ---------------- */
async function init() {
  STATE = await loadState();
  activeCategory = STATE.categorias[0] ? STATE.categorias[0].id : null;
  render();

  try {
    [allPedidos, allMovimentos] = await Promise.all([fetchPedidos(), fetchMovimentos()]);
    dbReady = true;
  } catch (e) {
    dbReady = false;
  }
  render();

  subscribePedidos({
    onChange: async () => {
      try {
        allPedidos = await fetchPedidos();
      } catch (e) {}
      render();
    },
    onPedidoInsert: (pedido) => {
      if (pedido.status === 'novo' && role === 'cozinha') playNovoPedidoAlerta();
    },
    onPedidoStatusChange: (statusAnterior, pedido) => {
      if ((statusAnterior === 'novo' || statusAnterior === 'preparo') && pedido.status === 'pronto' && role === 'caixa') {
        playReadyChime(pedido.cliente);
      }
    }
  });

  subscribeMovimentos(async () => {
    try {
      allMovimentos = await fetchMovimentos();
    } catch (e) {}
    render();
  });
}

init();
