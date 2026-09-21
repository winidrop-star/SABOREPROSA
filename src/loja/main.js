import { fmtBRL, pad2 } from '../lib/format.js';
import { loadState, saveState } from '../lib/config.js';
import { baixarComandaPdf } from '../lib/pdfComanda.js';

const ADMIN_SLUG = import.meta.env.VITE_ADMIN_SLUG || 'saboreprosa-cozinha-4127';

let STATE = null;
let draft = null;
let cart = {};
try {
  const saved = localStorage.getItem('sep_cart_v1');
  if (saved) cart = JSON.parse(saved);
} catch (e) {}

let activeCategory = null;

function saveCart() {
  try {
    localStorage.setItem('sep_cart_v1', JSON.stringify(cart));
  } catch (e) {}
}
function findItem(catId, itemId) {
  const cat = STATE.categorias.find((c) => c.id === catId);
  if (!cat) return null;
  return cat.itens.find((i) => i.id === itemId);
}
function cartKey(catId, itemId, variantLabel) {
  return catId + '::' + itemId + (variantLabel ? '::' + variantLabel : '');
}
function cartQty(key) {
  return (cart[key] && cart[key].qty) || 0;
}
function changeQty(catId, itemId, variantLabel, unitPrice, name, delta) {
  const key = cartKey(catId, itemId, variantLabel);
  const current = cart[key] || { qty: 0, name, variant: variantLabel || null, unitPrice, catId, itemId };
  current.qty += delta;
  if (current.qty <= 0) delete cart[key];
  else cart[key] = current;
  saveCart();
  renderMenu();
  renderCartBar();
}
function cartArray() {
  return Object.keys(cart).map((k) => cart[k]);
}
function cartTotal() {
  return cartArray().reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
}
function cartCount() {
  return cartArray().reduce((sum, i) => sum + i.qty, 0);
}

/* ---------------- configuração da marmita (proteína / feijão / adicionais) ---------------- */
const configState = {};
function configKeyFor(catId, itemId, variantLabel) {
  return catId + '::' + itemId + '::' + (variantLabel || '');
}
function getConfigState(ckey) {
  if (!configState[ckey]) configState[ckey] = { proteina: null, feijao: null, adicionais: {}, qty: 1 };
  return configState[ckey];
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
function buildVariantLabel(variant, escolheProteina, cd, st) {
  const parts = [];
  if (variant) parts.push(variant.label);
  if (variant && variant.proteinasIncluidas && cd.proteina1 && cd.proteina2) {
    parts.push(cd.proteina1 + ' e ' + cd.proteina2);
  } else if (escolheProteina && st.proteina) {
    parts.push(st.proteina);
  }
  if (st.feijao) parts.push(st.feijao);
  const extras = Object.keys(st.adicionais).filter((k) => st.adicionais[k]);
  if (extras.length) parts.push('+ ' + extras.join(', '));
  return parts.join(', ');
}
function renderConfigRow(cat, item, variant) {
  const basePrice = variant ? variant.preco : item.preco;
  const label = variant ? variant.label : null;
  const ckey = configKeyFor(cat.id, item.id, label);
  const escolheProteina = variant ? !!variant.escolheProteina : !!item.escolheProteina;
  const proteinasIncluidas = variant ? !!variant.proteinasIncluidas : !!item.proteinasIncluidas;
  const escolheFeijao = !!item.escolheFeijao;
  const temAdicionais = !!item.temAdicionais;
  const cd = STATE.cardapioDia || {};
  const st = getConfigState(ckey);

  const totalUnit = basePrice + somaAdicionaisSelecionados(st);

  let proteinaHtml = '';
  if (escolheProteina && cd.proteina1 && cd.proteina2) {
    proteinaHtml =
      '<div class="config-group"><div class="config-label">Escolha a proteína</div><div class="chip-group">' +
      [cd.proteina1, cd.proteina2]
        .map(
          (p) =>
            '<button type="button" class="chip small config-proteina' +
            (st.proteina === p ? ' selected' : '') +
            '" data-configkey="' + ckey + '" data-value="' + p + '">' + p + '</button>'
        )
        .join('') +
      '</div></div>';
  } else if (proteinasIncluidas && cd.proteina1 && cd.proteina2) {
    proteinaHtml = '<div class="config-note">Já vem com ' + cd.proteina1 + ' e ' + cd.proteina2 + '</div>';
  }

  let feijaoHtml = '';
  if (escolheFeijao && cd.feijaoOpcoes && cd.feijaoOpcoes.length >= 2) {
    feijaoHtml =
      '<div class="config-group"><div class="config-label">Escolha o feijão</div><div class="chip-group">' +
      cd.feijaoOpcoes
        .map(
          (f) =>
            '<button type="button" class="chip small config-feijao' +
            (st.feijao === f ? ' selected' : '') +
            '" data-configkey="' + ckey + '" data-value="' + f + '">' + f + '</button>'
        )
        .join('') +
      '</div></div>';
  }

  let adicionaisHtml = '';
  if (temAdicionais) {
    const catalogoAdicionais = getAdicionaisCatalogo();
    if (catalogoAdicionais.length) {
      adicionaisHtml =
        '<div class="config-group"><div class="config-label">Adicionais</div><div class="chip-group">' +
        catalogoAdicionais
          .map(
            (a) =>
              '<button type="button" class="chip small config-adicional' +
              (st.adicionais[a.nome] ? ' selected' : '') +
              '" data-configkey="' + ckey + '" data-value="' + a.nome + '">' + a.nome + ' (+' + fmtBRL(a.preco) + ')</button>'
          )
          .join('') +
        '</div></div>';
    }
  }

  const proteinaOk = !(escolheProteina && cd.proteina1 && cd.proteina2) || st.proteina;
  const feijaoOk = !(escolheFeijao && cd.feijaoOpcoes && cd.feijaoOpcoes.length >= 2) || st.feijao;
  const podeAdicionar = proteinaOk && feijaoOk && item.disponivel && lojaEstaAberta();

  return (
    '<div class="marmita-config" data-configkey="' + ckey + '">' +
    (label ? '<div class="variant-label-row">' + label + ' · <span class="price">' + fmtBRL(basePrice) + '</span></div>' : '') +
    proteinaHtml +
    feijaoHtml +
    adicionaisHtml +
    '<div class="config-footer">' +
    '<span class="config-total mono price">' + fmtBRL(totalUnit) + '</span>' +
    '<button type="button" class="btn-add-config" data-configkey="' + ckey + '"' + (podeAdicionar ? '' : ' disabled') + '>Adicionar</button>' +
    '</div>' +
    '</div>'
  );
}
function addConfiguredToCart(catId, itemId, variantLabel, name, basePrice, variant, escolheProteina) {
  const ckey = configKeyFor(catId, itemId, variantLabel);
  const st = getConfigState(ckey);
  const cd = STATE.cardapioDia || {};
  const unitPrice = basePrice + somaAdicionaisSelecionados(st);
  const compositeLabel = buildVariantLabel(variant, escolheProteina, cd, st);
  const key = cartKey(catId, itemId, compositeLabel);
  const current = cart[key] || { qty: 0, name, variant: compositeLabel || null, unitPrice, catId, itemId };
  current.qty += 1;
  cart[key] = current;
  saveCart();
  configState[ckey] = { proteina: null, feijao: null, adicionais: {}, qty: 1 };
  renderMenu();
  renderCartBar();
}

/* ---------------- horário de funcionamento (10:30 às 13:30) ---------------- */
const HORARIO_ABRE_MIN = 10 * 60 + 30;
const HORARIO_FECHA_MIN = 13 * 60 + 30;
function dentroDoHorario() {
  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  return minutos >= HORARIO_ABRE_MIN && minutos < HORARIO_FECHA_MIN;
}
function lojaEstaAberta() {
  if (STATE.loja.forcarAberta) return !!STATE.loja.aberta;
  return !!STATE.loja.aberta && dentroDoHorario();
}

/* ---------------- render: cardápio do cliente ---------------- */
function renderStatusBanner() {
  const el = document.getElementById('status-banner');
  if (lojaEstaAberta()) {
    el.className = 'status-banner status-open';
    el.innerHTML = '<span class="dot"></span> Aberto para pedidos';
  } else {
    el.className = 'status-banner status-closed';
    el.innerHTML = '<span class="dot"></span> Fechado no momento — atendemos das 10h30 às 13h30';
  }
}

const CATEGORY_ICONS = {
  marmitas:
    '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="9" width="18" height="11" rx="2.2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9c0-2.8 2-4.5 4.5-4.5h9C19 4.5 21 6.2 21 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="12" y1="9" x2="12" y2="20" stroke="currentColor" stroke-width="1.4"/></svg>',
  bebidas:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h10l-1.2 13.5a3.8 3.8 0 0 1-3.8 3.5A3.8 3.8 0 0 1 8.2 16.5L7 3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><line x1="6.3" y1="7.5" x2="17.7" y2="7.5" stroke="currentColor" stroke-width="1.4"/></svg>'
};
const CATEGORY_ICON_DEFAULT = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.6"/></svg>';

function renderCategoryTabs() {
  const wrap = document.getElementById('category-tabs');
  wrap.innerHTML = '';
  STATE.categorias.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (cat.id === activeCategory ? ' active' : '');
    btn.innerHTML = (CATEGORY_ICONS[cat.id] || CATEGORY_ICON_DEFAULT) + '<span>' + cat.nome + '</span>';
    btn.addEventListener('click', () => {
      activeCategory = cat.id;
      renderCategoryTabs();
      renderMenu();
    });
    wrap.appendChild(btn);
  });
}

function stepperHtml(key, disabled) {
  const qty = cartQty(key);
  if (qty > 0) {
    return (
      '<div class="stepper" data-key="' + key + '">' +
      '<button type="button" class="round dec">–</button>' +
      '<span class="qty">' + qty + '</span>' +
      '<button type="button" class="round add"' + (disabled ? ' disabled' : '') + '>+</button>' +
      '</div>'
    );
  }
  return (
    '<div class="stepper" data-key="' + key + '">' +
    '<button type="button" class="add-pill add"' + (disabled ? ' disabled' : '') + '>Adicionar</button>' +
    '</div>'
  );
}

function renderMenu() {
  const cat = STATE.categorias.find((c) => c.id === activeCategory);
  const wrap = document.getElementById('menu-list');
  wrap.innerHTML = '';
  if (!cat) return;
  const label = document.createElement('div');
  label.className = 'section-label';
  label.textContent = cat.nome;
  wrap.appendChild(label);

  cat.itens.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'item-card' + (item.disponivel ? '' : ' unavailable');
    const descHtml = item.descricao ? '<div class="item-desc">' + item.descricao + '</div>' : '';

    if (cat.id === 'marmitas') {
      const configRowsHtml =
        item.tipo === 'simples' ? renderConfigRow(cat, item, null) : item.variantes.map((v) => renderConfigRow(cat, item, v)).join('');
      card.innerHTML =
        '<div class="item-top"><div class="item-name">' + item.nome + '</div>' +
        (item.disponivel ? '' : '<span class="item-badge">Esgotado</span>') + '</div>' +
        descHtml + configRowsHtml;
    } else if (item.tipo === 'simples') {
      const key = cartKey(cat.id, item.id, null);
      card.innerHTML =
        '<div class="item-top"><div class="item-name">' + item.nome + '</div>' +
        (item.disponivel ? '' : '<span class="item-badge">Esgotado</span>') + '</div>' +
        descHtml +
        '<div class="simple-row"><span class="price">' + fmtBRL(item.preco) + '</span>' +
        stepperHtml(key, !item.disponivel || !lojaEstaAberta()) + '</div>';
    } else {
      const rows = item.variantes
        .filter((v) => v.disponivel !== false)
        .map((v) => {
          const vkey = cartKey(cat.id, item.id, v.label);
          return (
            '<div class="variant-row" data-vkey="' + vkey + '" data-price="' + v.preco + '" data-label="' + v.label + '">' +
            '<span class="variant-label">' + v.label + ' · <span class="price">' + fmtBRL(v.preco) + '</span></span>' +
            stepperHtml(vkey, !item.disponivel || !lojaEstaAberta()) +
            '</div>'
          );
        })
        .join('');
      card.innerHTML =
        '<div class="item-top"><div class="item-name">' + item.nome + '</div>' +
        (item.disponivel ? '' : '<span class="item-badge">Esgotado</span>') + '</div>' +
        descHtml + rows;
    }
    wrap.appendChild(card);
  });

  wrap.querySelectorAll('.config-proteina, .config-feijao, .config-adicional').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ckey = btn.getAttribute('data-configkey');
      const value = btn.getAttribute('data-value');
      const st = getConfigState(ckey);
      if (btn.classList.contains('config-proteina')) st.proteina = st.proteina === value ? null : value;
      else if (btn.classList.contains('config-feijao')) st.feijao = st.feijao === value ? null : value;
      else st.adicionais[value] = !st.adicionais[value];
      renderMenu();
    });
  });
  wrap.querySelectorAll('.btn-add-config').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const ckey = btn.getAttribute('data-configkey');
      const [catId, itemId, variantLabel] = ckey.split('::');
      const item = findItem(catId, itemId);
      const variant = variantLabel ? item.variantes.find((v) => v.label === variantLabel) : null;
      const basePrice = variant ? variant.preco : item.preco;
      const escolheProteina = variant ? !!variant.escolheProteina : !!item.escolheProteina;
      addConfiguredToCart(catId, itemId, variantLabel || null, item.nome, basePrice, variant, escolheProteina);
    });
  });

  wrap.querySelectorAll('.stepper').forEach((st) => {
    const key = st.getAttribute('data-key');
    const row = st.closest('.variant-row');
    const addBtn = st.querySelector('.add');
    const decBtn = st.querySelector('.dec');
    let unitPrice, name, variantLabel, itemId, catId;
    if (row) {
      unitPrice = parseFloat(row.getAttribute('data-price'));
      variantLabel = row.getAttribute('data-label');
      [catId, itemId] = key.split('::');
      name = findItem(catId, itemId).nome;
    } else {
      [catId, itemId] = key.split('::');
      const it = findItem(catId, itemId);
      unitPrice = it.preco;
      name = it.nome;
      variantLabel = null;
    }
    if (addBtn) addBtn.addEventListener('click', () => changeQty(catId, itemId, variantLabel, unitPrice, name, 1));
    if (decBtn) decBtn.addEventListener('click', () => changeQty(catId, itemId, variantLabel, unitPrice, name, -1));
  });
}

function renderCartBar() {
  const bar = document.getElementById('cart-bar');
  const count = cartCount();
  if (count === 0) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  document.getElementById('cart-bar-summary').textContent = count + (count === 1 ? ' item' : ' itens') + ' · ' + fmtBRL(cartTotal());
}

/* ---------------- gaveta da sacola ---------------- */
const checkoutInfo = { nome: '', telefone: '', modo: 'retirada', endereco: '', obs: '', formaPagamento: '' };
let appliedCupom = null;

function cuponsUsados() {
  try {
    return JSON.parse(localStorage.getItem('sep_cupons_usados') || '[]');
  } catch (e) {
    return [];
  }
}
function marcarCupomUsado(codigo) {
  try {
    const usados = cuponsUsados();
    if (usados.indexOf(codigo) === -1) {
      usados.push(codigo);
      localStorage.setItem('sep_cupons_usados', JSON.stringify(usados));
    }
  } catch (e) {}
}
function validarCupom(codigoDigitado, subtotal) {
  const codigo = codigoDigitado.trim().toUpperCase();
  if (!codigo) return { ok: false, motivo: 'Digite um código.' };
  const cupom = (STATE.cupons || []).find((c) => (c.codigo || '').toUpperCase() === codigo);
  if (!cupom || cupom.ativo === false) return { ok: false, motivo: 'Cupom inválido ou inativo.' };
  if (cupom.validoAte) {
    const hoje = new Date().toISOString().slice(0, 10);
    if (hoje > cupom.validoAte) return { ok: false, motivo: 'Esse cupom expirou.' };
  }
  if (cupom.pedidoMinimo && subtotal < cupom.pedidoMinimo) {
    return { ok: false, motivo: 'Pedido mínimo de ' + fmtBRL(cupom.pedidoMinimo) + ' pra usar esse cupom.' };
  }
  if (cupom.umPorCliente && cuponsUsados().indexOf(codigo) >= 0) {
    return { ok: false, motivo: 'Você já usou esse cupom neste navegador.' };
  }
  let desconto = cupom.tipo === 'percentual' ? subtotal * (cupom.valor / 100) : cupom.valor;
  desconto = Math.min(desconto, subtotal);
  return { ok: true, cupom, codigo, desconto };
}
let orderCounter = (() => {
  try {
    return parseInt(localStorage.getItem('sep_order_seq') || '0', 10);
  } catch (e) {
    return 0;
  }
})();
function nextOrderNumber() {
  orderCounter += 1;
  try {
    localStorage.setItem('sep_order_seq', String(orderCounter));
  } catch (e) {}
  const now = new Date();
  return now.getFullYear().toString().slice(2) + pad2(now.getMonth() + 1) + pad2(now.getDate()) + '-' + orderCounter;
}

function fallbackCopy(text, done) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    done();
  } catch (e) {
    alert('Não consegui copiar automaticamente. Selecione e copie manualmente:\n\n' + text);
  }
}

function buildOrderMessage(items, info, total, orderNumber, cupomAplicado) {
  const now = new Date();
  const dataHora = pad2(now.getDate()) + '/' + pad2(now.getMonth() + 1) + '/' + now.getFullYear() + ' ' + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
  const lines = [];
  lines.push('PEDIDO #' + orderNumber + ' - Sabor e Prosa');
  lines.push('Data/Hora: ' + dataHora);
  lines.push('Tipo: ' + (info.modo === 'entrega' ? 'DELIVERY' : 'RETIRADA NO LOCAL'));
  if (info.formaPagamento) lines.push('Pagamento: ' + info.formaPagamento);
  lines.push('');
  lines.push('Cliente: ' + info.nome);
  if (info.telefone) lines.push('Telefone: ' + info.telefone);
  if (info.modo === 'entrega') lines.push('Endereço: ' + info.endereco);
  lines.push('');
  lines.push('Itens:');
  let subtotal = 0;
  items.forEach((i) => {
    const nomeCompleto = i.name + (i.variant ? ' (' + i.variant + ')' : '');
    subtotal += i.qty * i.unitPrice;
    if (i.qty === 1) lines.push('1x ' + nomeCompleto + ' — ' + fmtBRL(i.unitPrice));
    else lines.push(i.qty + 'x ' + nomeCompleto + ' — ' + fmtBRL(i.unitPrice) + ' cada = ' + fmtBRL(i.qty * i.unitPrice));
  });
  lines.push('');
  if (cupomAplicado) {
    lines.push('Subtotal: ' + fmtBRL(subtotal));
    lines.push('Cupom: ' + cupomAplicado.codigo + ' (-' + fmtBRL(cupomAplicado.desconto) + ')');
  }
  lines.push('Total: ' + fmtBRL(total));
  if (info.obs) {
    lines.push('');
    lines.push('Obs: ' + info.obs);
  }
  return lines.join('\n');
}

function openCartDrawer() {
  if (cartCount() === 0) return;
  const orderNumber = nextOrderNumber();
  appliedCupom = null;
  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.id = 'cart-overlay';

  const linesHtml = cartArray()
    .map(
      (i) =>
        '<div class="cart-line"><div><div class="ci-name">' + i.qty + 'x ' + i.name + '</div>' +
        (i.variant ? '<div class="ci-variant">' + i.variant + '</div>' : '') + '</div>' +
        '<span class="price">' + fmtBRL(i.qty * i.unitPrice) + '</span></div>'
    )
    .join('');

  overlay.innerHTML =
    '<div class="drawer">' +
    '<h2>Sua sacola</h2>' +
    '<div id="cart-lines">' + linesHtml + '</div>' +
    '<div class="field"><label for="ck-cupom">Cupom de desconto (opcional)</label>' +
    '<div style="display:flex;gap:8px;">' +
    '<input id="ck-cupom" type="text" placeholder="CÓDIGO" style="flex:1;text-transform:uppercase;">' +
    '<button type="button" class="btn-ghost" id="btn-aplicar-cupom" style="flex:none;">Aplicar</button>' +
    '</div>' +
    '<div id="cupom-feedback" style="font-size:0.8rem;margin-top:6px;"></div>' +
    '</div>' +
    '<div id="totals-block"></div>' +
    '<div class="field"><label for="ck-nome">Seu nome</label><input id="ck-nome" type="text" value="' + checkoutInfo.nome + '" placeholder="Nome completo"></div>' +
    '<div class="field"><label for="ck-telefone">Telefone (opcional)</label><input id="ck-telefone" type="tel" value="' + checkoutInfo.telefone + '" placeholder="(65) 99999-9999"></div>' +
    '<div class="field"><label>Entrega</label><div class="chip-group" id="ck-modo-group">' +
    '<button type="button" class="chip' + (checkoutInfo.modo === 'retirada' ? ' selected' : '') + '" data-modo="retirada">Retirar no local</button>' +
    '<button type="button" class="chip' + (checkoutInfo.modo === 'entrega' ? ' selected' : '') + '" data-modo="entrega">Entrega</button>' +
    '</div></div>' +
    '<div class="field" id="ck-endereco-field" ' + (checkoutInfo.modo === 'entrega' ? '' : 'hidden') + '><label for="ck-endereco">Endereço para entrega</label><input id="ck-endereco" type="text" value="' + checkoutInfo.endereco + '" placeholder="Rua, número, bairro"></div>' +
    '<div class="field"><label>Forma de pagamento</label><div class="chip-group" id="ck-pagamento-group">' +
    '<button type="button" class="chip' + (checkoutInfo.formaPagamento === 'Dinheiro' ? ' selected' : '') + '" data-pagamento="Dinheiro">Dinheiro</button>' +
    '<button type="button" class="chip' + (checkoutInfo.formaPagamento === 'Cartão' ? ' selected' : '') + '" data-pagamento="Cartão">Cartão</button>' +
    '<button type="button" class="chip' + (checkoutInfo.formaPagamento === 'Pix' ? ' selected' : '') + '" data-pagamento="Pix">Pix</button>' +
    '</div></div>' +
    '<div class="field"><label for="ck-obs">Observações (opcional)</label><textarea id="ck-obs" placeholder="Ex: sem cebola, ponto da carne, troco para R$50...">' + checkoutInfo.obs + '</textarea></div>' +
    '<a class="btn-primary" id="btn-checkout" href="https://wa.me/" style="text-decoration:none;text-align:center;display:block;">Enviar pedido pelo WhatsApp</a>' +
    '<button type="button" class="btn-ghost" id="btn-copiar-msg" style="width:100%;margin-top:10px;">Não abriu? Copiar mensagem do pedido</button>' +
    '<button type="button" class="btn-ghost" id="btn-fechar-drawer" style="width:100%;margin-top:10px;">Continuar comprando</button>' +
    '</div>';

  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.getElementById('btn-fechar-drawer').addEventListener('click', () => overlay.remove());

  function readCheckoutFields() {
    checkoutInfo.nome = document.getElementById('ck-nome').value.trim();
    checkoutInfo.telefone = document.getElementById('ck-telefone').value.trim();
    checkoutInfo.obs = document.getElementById('ck-obs').value.trim();
    const enderecoInput = document.getElementById('ck-endereco');
    checkoutInfo.endereco = enderecoInput ? enderecoInput.value.trim() : '';
  }
  function validateCheckout() {
    if (!lojaEstaAberta()) {
      alert('A loja fechou (atendemos das 10h30 às 13h30). Volte no próximo horário!');
      return false;
    }
    if (!checkoutInfo.nome) {
      alert('Por favor, preencha seu nome.');
      return false;
    }
    if (checkoutInfo.modo === 'entrega' && !checkoutInfo.endereco) {
      alert('Por favor, preencha o endereço de entrega.');
      return false;
    }
    if (!checkoutInfo.formaPagamento) {
      alert('Por favor, escolha a forma de pagamento.');
      return false;
    }
    return true;
  }
  function clearCartAndClose() {
    if (appliedCupom && appliedCupom.cupom.umPorCliente) marcarCupomUsado(appliedCupom.codigo);
    cart = {};
    saveCart();
    renderMenu();
    renderCartBar();
    overlay.remove();
  }
  function finalTotal() {
    return cartTotal() - (appliedCupom ? appliedCupom.desconto : 0);
  }
  function renderTotalsBlock() {
    const block = document.getElementById('totals-block');
    if (!block) return;
    const subtotal = cartTotal();
    let html = '';
    if (appliedCupom) {
      html +=
        '<div class="cart-total-row" style="border-top:none;padding-top:6px;padding-bottom:0;font-size:0.95rem;font-weight:600;"><span>Subtotal</span><span class="mono">' +
        fmtBRL(subtotal) + '</span></div>';
      html +=
        '<div class="cart-total-row" style="border-top:none;padding-top:2px;padding-bottom:0;font-size:0.95rem;font-weight:600;color:var(--accent-2);"><span>Cupom ' +
        appliedCupom.codigo + '</span><span class="mono">-' + fmtBRL(appliedCupom.desconto) + '</span></div>';
    }
    html += '<div class="cart-total-row"><span>Total</span><span class="mono">' + fmtBRL(finalTotal()) + '</span></div>';
    block.innerHTML = html;
  }
  renderTotalsBlock();

  document.getElementById('btn-aplicar-cupom').addEventListener('click', () => {
    const input = document.getElementById('ck-cupom');
    const feedback = document.getElementById('cupom-feedback');
    const resultado = validarCupom(input.value, cartTotal());
    if (!resultado.ok) {
      appliedCupom = null;
      feedback.style.color = 'var(--danger)';
      feedback.textContent = resultado.motivo;
    } else {
      appliedCupom = resultado;
      feedback.style.color = 'var(--accent-2)';
      feedback.textContent = 'Cupom aplicado! Você economizou ' + fmtBRL(resultado.desconto) + '.';
    }
    renderTotalsBlock();
    syncCheckoutHref();
  });

  function syncCheckoutHref() {
    readCheckoutFields();
    const link = document.getElementById('btn-checkout');
    if (!link) return;
    const msg = buildOrderMessage(cartArray(), checkoutInfo, finalTotal(), orderNumber, appliedCupom);
    link.href = 'https://wa.me/' + STATE.loja.whatsapp + '?text=' + encodeURIComponent(msg);
  }
  syncCheckoutHref();
  document.getElementById('ck-nome').addEventListener('input', syncCheckoutHref);
  document.getElementById('ck-telefone').addEventListener('input', syncCheckoutHref);
  document.getElementById('ck-obs').addEventListener('input', syncCheckoutHref);
  document.getElementById('ck-endereco').addEventListener('input', syncCheckoutHref);

  overlay.querySelectorAll('#ck-modo-group .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      checkoutInfo.modo = chip.getAttribute('data-modo');
      overlay.querySelectorAll('#ck-modo-group .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      document.getElementById('ck-endereco-field').hidden = checkoutInfo.modo !== 'entrega';
      syncCheckoutHref();
    });
  });
  overlay.querySelectorAll('#ck-pagamento-group .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      checkoutInfo.formaPagamento = chip.getAttribute('data-pagamento');
      overlay.querySelectorAll('#ck-pagamento-group .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      syncCheckoutHref();
    });
  });

  document.getElementById('btn-checkout').addEventListener('click', (e) => {
    readCheckoutFields();
    if (!validateCheckout()) {
      e.preventDefault();
      return;
    }
    syncCheckoutHref();
    setTimeout(clearCartAndClose, 0);
  });

  document.getElementById('btn-copiar-msg').addEventListener('click', () => {
    readCheckoutFields();
    if (!validateCheckout()) return;
    const msg = buildOrderMessage(cartArray(), checkoutInfo, finalTotal(), orderNumber, appliedCupom);
    if (appliedCupom && appliedCupom.cupom.umPorCliente) marcarCupomUsado(appliedCupom.codigo);
    const done = () => alert('Mensagem copiada! Abra o WhatsApp e cole no chat da loja (' + STATE.loja.whatsapp + ').');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(done).catch(() => fallbackCopy(msg, done));
    } else {
      fallbackCopy(msg, done);
    }
  });
}

document.getElementById('cart-bar').addEventListener('click', openCartDrawer);

/* ---------------- rotas ---------------- */
function checkRoute() {
  const hash = location.hash.replace('#', '');
  const isAdmin = hash === ADMIN_SLUG;
  document.getElementById('view-loja').hidden = isAdmin;
  document.getElementById('cart-bar').hidden = isAdmin || cartCount() === 0;
  document.getElementById('view-admin').hidden = !isAdmin;
  if (isAdmin) {
    draft = JSON.parse(JSON.stringify(STATE));
    renderAdmin();
  }
}
window.addEventListener('hashchange', checkRoute);
document.getElementById('btn-ver-loja').addEventListener('click', () => {
  location.hash = '';
});

/* ---------------- admin: editor de cardápio ---------------- */
document.querySelectorAll('[data-admintab]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-admintab]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.getAttribute('data-admintab');
    document.getElementById('admintab-cardapio').hidden = tab !== 'cardapio';
    document.getElementById('admintab-cupons').hidden = tab !== 'cupons';
    document.getElementById('admintab-imprimir').hidden = tab !== 'imprimir';
    if (tab === 'cupons') renderAdminCupons();
  });
});

function renderAdmin() {
  document.getElementById('admin-loja-aberta').checked = !!draft.loja.aberta;
  renderCardapioDiaAdmin();
  const wrap = document.getElementById('admin-categories');
  wrap.innerHTML = '';
  draft.categorias.forEach((cat) => {
    const panel = document.createElement('div');
    panel.className = 'admin-panel';
    const title = document.createElement('div');
    title.className = 'section-label';
    title.style.marginTop = '0';
    title.textContent = cat.nome;
    panel.appendChild(title);

    cat.itens.forEach((item, idx) => panel.appendChild(renderAdminItemRow(cat, item, idx)));

    const addRow = document.createElement('div');
    addRow.style.display = 'flex';
    addRow.style.gap = '8px';
    addRow.style.flexWrap = 'wrap';

    const addSimpleBtn = document.createElement('button');
    addSimpleBtn.className = 'small-btn';
    addSimpleBtn.textContent = '+ Item com preço único';
    addSimpleBtn.addEventListener('click', () => {
      cat.itens.push({ id: 'item-' + Date.now(), nome: 'Novo item', tipo: 'simples', descricao: '', preco: 0, disponivel: true });
      renderAdmin();
    });

    const addVariantesBtn = document.createElement('button');
    addVariantesBtn.className = 'small-btn';
    addVariantesBtn.textContent = '+ Item com tamanhos';
    addVariantesBtn.addEventListener('click', () => {
      cat.itens.push({ id: 'item-' + Date.now(), nome: 'Novo item', tipo: 'variantes', descricao: '', disponivel: true, variantes: [{ label: 'Único', preco: 0 }] });
      renderAdmin();
    });

    addRow.appendChild(addSimpleBtn);
    addRow.appendChild(addVariantesBtn);
    panel.appendChild(addRow);
    wrap.appendChild(panel);
  });
}

function renderCardapioDiaAdmin() {
  const wrap = document.getElementById('admin-cardapio-dia');
  if (!draft.cardapioDia) draft.cardapioDia = { proteina1: '', proteina2: '', feijaoOpcoes: [], adicionaisOpcoes: [] };
  const cd = draft.cardapioDia;
  if (!cd.feijaoOpcoes) cd.feijaoOpcoes = [];
  if (!cd.adicionaisOpcoes) cd.adicionaisOpcoes = [];

  const panel = document.createElement('div');
  panel.className = 'admin-panel';
  panel.innerHTML =
    '<div class="section-label" style="margin-top:0;">Cardápio do dia</div>' +
    '<p style="font-size:0.8rem;color:var(--ink-soft);margin:0 0 12px;">É aqui que você mesma muda o que varia todo dia: as 2 proteínas principais, as opções de feijão e a carne extra do buffet. Se um feijão acabar, é só remover ele daqui e clicar em "Publicar alterações" lá embaixo — não precisa esperar ninguém alterar pra você.</p>' +
    '<div class="field" style="margin-top:0;"><label>Proteína principal 1</label><input type="text" class="admin-field-input" id="cd-proteina1" style="width:100%;"></div>' +
    '<div class="field"><label>Proteína principal 2</label><input type="text" class="admin-field-input" id="cd-proteina2" style="width:100%;"></div>' +
    '<div class="field"><label>Opções de feijão (o cliente escolhe entre elas só quando houver 2)</label><div id="cd-feijao-list"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;"><input type="text" class="admin-field-input" id="cd-feijao-novo" style="flex:1;" placeholder="Ex: Feijão preto"><button class="small-btn" id="cd-feijao-add" type="button">+ Adicionar</button></div></div>' +
    '<div class="field"><label>Carne extra do buffet (vira adicional pago de R$ 25,00)</label><div id="cd-extra-list"></div>' +
    '<div style="display:flex;gap:8px;margin-top:8px;"><input type="text" class="admin-field-input" id="cd-extra-novo" style="flex:1;" placeholder="Ex: Costelinha suína frita"><button class="small-btn" id="cd-extra-add" type="button">+ Adicionar</button></div></div>';
  wrap.innerHTML = '';
  wrap.appendChild(panel);

  const p1 = document.getElementById('cd-proteina1');
  p1.value = cd.proteina1 || '';
  p1.addEventListener('input', (e) => (cd.proteina1 = e.target.value));
  const p2 = document.getElementById('cd-proteina2');
  p2.value = cd.proteina2 || '';
  p2.addEventListener('input', (e) => (cd.proteina2 = e.target.value));

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
      del.className = 'icon-btn danger';
      del.type = 'button';
      del.textContent = '✕';
      del.title = 'Remover';
      del.addEventListener('click', () => {
        arr.splice(idx, 1);
        renderCardapioDiaAdmin();
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
  renderCdList('cd-extra-list', cd.adicionaisOpcoes);

  document.getElementById('cd-feijao-add').addEventListener('click', () => {
    const input = document.getElementById('cd-feijao-novo');
    const val = input.value.trim();
    if (!val) return;
    cd.feijaoOpcoes.push(val);
    renderCardapioDiaAdmin();
  });
  document.getElementById('cd-extra-add').addEventListener('click', () => {
    const input = document.getElementById('cd-extra-novo');
    const val = input.value.trim();
    if (!val) return;
    cd.adicionaisOpcoes.push(val);
    renderCardapioDiaAdmin();
  });
}

function renderAdminItemRow(cat, item, idx) {
  const row = document.createElement('div');
  row.className = 'admin-item-row';

  const top = document.createElement('div');
  top.className = 'admin-item-top';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'admin-field-input';
  nameInput.value = item.nome;
  nameInput.addEventListener('input', () => (item.nome = nameInput.value));
  top.appendChild(nameInput);

  if (item.tipo === 'simples') {
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.step = '0.01';
    priceInput.className = 'admin-field-input';
    priceInput.value = item.preco;
    priceInput.addEventListener('input', () => (item.preco = parseFloat(priceInput.value) || 0));
    top.appendChild(priceInput);
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn danger';
  delBtn.type = 'button';
  delBtn.title = 'Remover item';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => {
    cat.itens.splice(idx, 1);
    renderAdmin();
  });
  top.appendChild(delBtn);
  row.appendChild(top);

  const descField = document.createElement('div');
  descField.className = 'admin-desc-field';
  const descTextarea = document.createElement('textarea');
  descTextarea.placeholder = 'O que vem hoje (ex: arroz, feijão, frango grelhado, salada)';
  descTextarea.value = item.descricao || '';
  descTextarea.addEventListener('input', () => (item.descricao = descTextarea.value));
  descField.appendChild(descTextarea);
  row.appendChild(descField);

  if (item.tipo === 'variantes') {
    item.variantes.forEach((v, vidx) => {
      const vrow = document.createElement('div');
      vrow.className = 'admin-variant-row';

      const vLabel = document.createElement('input');
      vLabel.type = 'text';
      vLabel.className = 'admin-field-input';
      vLabel.value = v.label;
      vLabel.addEventListener('input', () => (v.label = vLabel.value));

      const vPrice = document.createElement('input');
      vPrice.type = 'number';
      vPrice.step = '0.01';
      vPrice.className = 'admin-field-input';
      vPrice.value = v.preco;
      vPrice.addEventListener('input', () => (v.preco = parseFloat(vPrice.value) || 0));

      const vDel = document.createElement('button');
      vDel.className = 'icon-btn danger';
      vDel.type = 'button';
      vDel.textContent = '–';
      vDel.title = 'Remover tamanho';
      vDel.addEventListener('click', () => {
        item.variantes.splice(vidx, 1);
        renderAdmin();
      });

      vrow.appendChild(vLabel);
      vrow.appendChild(vPrice);
      vrow.appendChild(vDel);
      row.appendChild(vrow);
    });

    const addVariantBtn = document.createElement('button');
    addVariantBtn.className = 'small-btn';
    addVariantBtn.style.marginTop = '8px';
    addVariantBtn.textContent = '+ Tamanho';
    addVariantBtn.addEventListener('click', () => {
      item.variantes.push({ label: 'Novo', preco: 0 });
      renderAdmin();
    });
    row.appendChild(addVariantBtn);
  }

  const toggle = document.createElement('div');
  toggle.className = 'toggle-row';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = !item.disponivel;
  const cbId = 'esg-' + cat.id + '-' + item.id;
  cb.id = cbId;
  cb.addEventListener('change', () => (item.disponivel = !cb.checked));
  const lbl = document.createElement('label');
  lbl.setAttribute('for', cbId);
  lbl.textContent = 'Marcar como esgotado';
  toggle.appendChild(cb);
  toggle.appendChild(lbl);
  row.appendChild(toggle);

  return row;
}

document.getElementById('admin-loja-aberta').addEventListener('change', (e) => {
  draft.loja.aberta = e.target.checked;
});
document.getElementById('btn-descartar').addEventListener('click', () => {
  draft = JSON.parse(JSON.stringify(STATE));
  renderAdmin();
  document.getElementById('publish-status').textContent = '';
});
document.getElementById('btn-publicar').addEventListener('click', () => {
  publishState(draft, 'publish-status', 'Alterações publicadas! Os clientes já veem o cardápio novo.');
});

async function publishState(newState, statusElId, successMsg) {
  const statusEl = document.getElementById(statusElId);
  statusEl.textContent = 'Publicando...';
  try {
    await saveState(newState);
    STATE = newState;
    statusEl.textContent = successMsg;
    renderStatusBanner();
    renderCategoryTabs();
    renderMenu();
  } catch (err) {
    statusEl.textContent = 'Não deu para publicar agora. Tente de novo em instantes.';
  }
}

/* ---------------- admin: cupons ---------------- */
function renderAdminCupons() {
  const wrap = document.getElementById('admin-cupons');
  wrap.innerHTML = '';
  if (!draft.cupons) draft.cupons = [];
  if (draft.cupons.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-cart';
    empty.textContent = 'Nenhum cupom cadastrado ainda.';
    wrap.appendChild(empty);
  }
  draft.cupons.forEach((cupom, idx) => wrap.appendChild(renderAdminCupomRow(cupom, idx)));
}

function renderAdminCupomRow(cupom, idx) {
  const row = document.createElement('div');
  row.className = 'admin-item-row';

  const top = document.createElement('div');
  top.className = 'admin-item-top';
  const codigoInput = document.createElement('input');
  codigoInput.type = 'text';
  codigoInput.className = 'admin-field-input';
  codigoInput.placeholder = 'CÓDIGO (ex: BEMVINDO10)';
  codigoInput.value = cupom.codigo || '';
  codigoInput.addEventListener('input', () => (cupom.codigo = codigoInput.value.toUpperCase()));
  const delBtn = document.createElement('button');
  delBtn.className = 'icon-btn danger';
  delBtn.type = 'button';
  delBtn.textContent = '✕';
  delBtn.title = 'Remover cupom';
  delBtn.addEventListener('click', () => {
    draft.cupons.splice(idx, 1);
    renderAdminCupons();
  });
  top.appendChild(codigoInput);
  top.appendChild(delBtn);
  row.appendChild(top);

  const tipoRow = document.createElement('div');
  tipoRow.className = 'chip-group';
  tipoRow.style.marginTop = '10px';
  ['fixo', 'percentual'].forEach((tipo) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (cupom.tipo === tipo ? ' selected' : '');
    chip.textContent = tipo === 'fixo' ? 'R$ fixo' : '% percentual';
    chip.addEventListener('click', () => {
      cupom.tipo = tipo;
      tipoRow.querySelectorAll('.chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
    tipoRow.appendChild(chip);
  });
  row.appendChild(tipoRow);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '8px';
  grid.style.marginTop = '10px';

  function labeledInput(labelText, type, value, step, onInput) {
    const box = document.createElement('div');
    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    lbl.style.cssText = 'display:block;font-size:0.72rem;color:var(--ink-soft);margin-bottom:4px;';
    const inp = document.createElement('input');
    inp.type = type;
    inp.className = 'admin-field-input';
    inp.style.width = '100%';
    if (step) inp.step = step;
    inp.value = value;
    inp.addEventListener('input', () => onInput(inp.value));
    box.appendChild(lbl);
    box.appendChild(inp);
    return box;
  }

  grid.appendChild(labeledInput('Valor do desconto', 'number', cupom.valor || 0, '0.01', (v) => (cupom.valor = parseFloat(v) || 0)));
  grid.appendChild(labeledInput('Pedido mínimo (R$)', 'number', cupom.pedidoMinimo || 0, '0.01', (v) => (cupom.pedidoMinimo = parseFloat(v) || 0)));
  grid.appendChild(labeledInput('Válido até (opcional)', 'date', cupom.validoAte || '', null, (v) => (cupom.validoAte = v)));
  row.appendChild(grid);

  const togglesRow = document.createElement('div');
  togglesRow.style.marginTop = '8px';

  const umPorClienteWrap = document.createElement('div');
  umPorClienteWrap.className = 'toggle-row';
  const umPorClienteCb = document.createElement('input');
  umPorClienteCb.type = 'checkbox';
  umPorClienteCb.id = 'cupom-1cliente-' + idx;
  umPorClienteCb.checked = !!cupom.umPorCliente;
  umPorClienteCb.addEventListener('change', () => (cupom.umPorCliente = umPorClienteCb.checked));
  const umPorClienteLbl = document.createElement('label');
  umPorClienteLbl.setAttribute('for', umPorClienteCb.id);
  umPorClienteLbl.textContent = '1 uso por cliente (por navegador)';
  umPorClienteLbl.style.cssText = 'text-transform:none;letter-spacing:0;font-weight:500;';
  umPorClienteWrap.appendChild(umPorClienteCb);
  umPorClienteWrap.appendChild(umPorClienteLbl);
  togglesRow.appendChild(umPorClienteWrap);

  const ativoWrap = document.createElement('div');
  ativoWrap.className = 'toggle-row';
  const ativoCb = document.createElement('input');
  ativoCb.type = 'checkbox';
  ativoCb.id = 'cupom-ativo-' + idx;
  ativoCb.checked = cupom.ativo !== false;
  ativoCb.addEventListener('change', () => (cupom.ativo = ativoCb.checked));
  const ativoLbl = document.createElement('label');
  ativoLbl.setAttribute('for', ativoCb.id);
  ativoLbl.textContent = 'Cupom ativo';
  ativoLbl.style.cssText = 'text-transform:none;letter-spacing:0;font-weight:500;';
  ativoWrap.appendChild(ativoCb);
  ativoWrap.appendChild(ativoLbl);
  togglesRow.appendChild(ativoWrap);

  row.appendChild(togglesRow);
  return row;
}

document.getElementById('btn-add-cupom').addEventListener('click', () => {
  if (!draft.cupons) draft.cupons = [];
  draft.cupons.push({ codigo: '', tipo: 'fixo', valor: 0, pedidoMinimo: 0, validoAte: '', umPorCliente: true, ativo: true });
  renderAdminCupons();
});
document.getElementById('btn-descartar-cupons').addEventListener('click', () => {
  draft = JSON.parse(JSON.stringify(STATE));
  renderAdminCupons();
  document.getElementById('publish-status-cupons').textContent = '';
});
document.getElementById('btn-publicar-cupons').addEventListener('click', () => {
  publishState(draft, 'publish-status-cupons', 'Cupons publicados! Já valem no site.');
});

/* ---------------- admin: imprimir comanda ---------------- */
function parseItemLine(line) {
  const m = line.match(/^(\d+)x\s+(.+?)\s+—\s+R\$\s*([\d.,]+)(?:\s+cada\s+=\s+R\$\s*([\d.,]+))?$/);
  if (!m) return { qty: '', nome: line, subtotal: '' };
  const qty = m[1];
  const nome = m[2];
  const subtotal = m[4] || m[3];
  return { qty, nome, subtotal: 'R$ ' + subtotal };
}

function parseOrderText(text) {
  try {
    const lines = text.split('\n').map((l) => l.trim());
    const get = (prefix) => {
      const line = lines.find((l) => l.toLowerCase().indexOf(prefix.toLowerCase()) === 0);
      return line ? line.slice(prefix.length).trim() : '';
    };
    const pedidoLine = lines.find((l) => l.toUpperCase().indexOf('PEDIDO #') === 0);
    const pedidoNum = pedidoLine ? (pedidoLine.match(/PEDIDO #(\S+)/i) || [])[1] : '';
    const tipo = get('Tipo:');
    const pagamento = get('Pagamento:');
    const cliente = get('Cliente:');
    const telefone = get('Telefone:');
    const endereco = get('Endereço:');
    const dataHora = get('Data/Hora:');
    const totalRaw = get('Total:');
    const subtotalRaw = get('Subtotal:');
    const cupomRaw = get('Cupom:');
    const obs = get('Obs:');
    const itensStart = lines.findIndex((l) => l.toLowerCase() === 'itens:');
    const itensEndIdx = lines.findIndex((l) => /^(subtotal|total):/i.test(l));
    const itens = [];
    if (itensStart >= 0 && itensEndIdx > itensStart) {
      for (let i = itensStart + 1; i < itensEndIdx; i++) {
        if (lines[i]) itens.push(parseItemLine(lines[i]));
      }
    }
    if (!cliente && itens.length === 0) return null;
    return { pedidoNum, tipo, pagamento, cliente, telefone, endereco, dataHora, itens, total: totalRaw, subtotal: subtotalRaw, cupom: cupomRaw, obs };
  } catch (e) {
    return null;
  }
}

function comandaLines(text) {
  const parsed = parseOrderText(text);
  const out = [];
  if (!parsed) {
    out.push('SABOR E PROSA');
    out.push('');
    text.trim().split('\n').forEach((l) => out.push(l));
    return out;
  }
  out.push('Sabor e Prosa' + (parsed.pedidoNum ? '  #' + parsed.pedidoNum : ''));
  out.push(parsed.dataHora || '');
  if (parsed.tipo) out.push('(' + parsed.tipo + ')');
  out.push('------------------------------');
  out.push('Cliente: ' + (parsed.cliente || '-'));
  if (parsed.endereco) out.push('Endereço: ' + parsed.endereco);
  if (parsed.telefone) out.push('Telefone: ' + parsed.telefone);
  out.push('------------------------------');
  parsed.itens.forEach((it) => {
    out.push((it.qty ? it.qty + 'x ' : '') + it.nome);
    if (it.subtotal) out.push('   Subtotal: ' + it.subtotal);
  });
  out.push('------------------------------');
  if (parsed.cupom) {
    out.push('Subtotal: ' + (parsed.subtotal || '-'));
    out.push('Cupom: ' + parsed.cupom);
  }
  if (parsed.pagamento) out.push('Pagamento: ' + parsed.pagamento);
  out.push('TOTAL: ' + (parsed.total || '-'));
  if (parsed.obs) {
    out.push('');
    out.push('Obs: ' + parsed.obs);
  }
  out.push('------------------------------');
  out.push('Pedido feito pelo site - Sabor e Prosa');
  return out;
}

function refreshComandaPreview() {
  const text = document.getElementById('paste-box').value;
  const wrap = document.getElementById('comanda-wrap');
  if (!text.trim()) {
    wrap.hidden = true;
    return;
  }
  document.getElementById('comanda-preview').textContent = comandaLines(text).join('\n');
  wrap.hidden = false;
}
document.getElementById('paste-box').addEventListener('input', refreshComandaPreview);

document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

document.getElementById('btn-baixar-pdf').addEventListener('click', () => {
  const text = document.getElementById('paste-box').value;
  if (!text.trim()) {
    alert('Cole o texto do pedido primeiro.');
    return;
  }
  baixarComandaPdf(comandaLines(text), 'comanda-sabor-e-prosa-' + Date.now() + '.pdf');
});

/* ---------------- inicialização ---------------- */
async function init() {
  STATE = await loadState();
  activeCategory = STATE.categorias[0] ? STATE.categorias[0].id : null;
  renderStatusBanner();
  renderCategoryTabs();
  renderMenu();
  renderCartBar();
  checkRoute();
  setInterval(() => {
    renderStatusBanner();
    renderMenu();
  }, 60000);
}
init();
