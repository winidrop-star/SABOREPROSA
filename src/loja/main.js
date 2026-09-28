import { fmtBRL, pad2 } from '../lib/format.js';
import { loadState, saveState } from '../lib/config.js';
import { baixarComandaPdf } from '../lib/pdfComanda.js';
import { novoConfig, somaAdicionais, montarDetalhe, configRowHtml, renderAdicionaisEditor } from '../lib/lanche.js';

const ADMIN_SLUG = import.meta.env.VITE_ADMIN_SLUG || 'porto-cozinha-4127';

let STATE = null;
let draft = null;
let cart = {};
try {
  const saved = localStorage.getItem('porto_cart_v1');
  if (saved) cart = JSON.parse(saved);
} catch (e) {}

let activeCategory = null;

function saveCart() {
  try {
    localStorage.setItem('porto_cart_v1', JSON.stringify(cart));
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

/* ---------------- montagem do lanche (adicionais / tirar ingrediente) ---------------- */
const configState = {};
function configKeyFor(catId, itemId, variantLabel) {
  return catId + '::' + itemId + '::' + (variantLabel || '');
}
function getConfigState(ckey) {
  if (!configState[ckey]) configState[ckey] = novoConfig();
  return configState[ckey];
}
function renderConfigRow(cat, item, variant) {
  const ckey = configKeyFor(cat.id, item.id, variant ? variant.label : null);
  return configRowHtml(STATE, item, variant, ckey, getConfigState(ckey), item.disponivel && lojaEstaAberta());
}
function addConfiguredToCart(catId, itemId, variantLabel, name, basePrice, variant) {
  const ckey = configKeyFor(catId, itemId, variantLabel);
  const st = getConfigState(ckey);
  const unitPrice = basePrice + somaAdicionais(STATE, st);
  const detalhe = montarDetalhe(variant, st);
  const key = cartKey(catId, itemId, detalhe);
  const current = cart[key] || { qty: 0, name, variant: detalhe || null, unitPrice, catId, itemId };
  current.qty += 1;
  cart[key] = current;
  saveCart();
  configState[ckey] = novoConfig();
  renderMenu();
  renderCartBar();
}

/* ---------------- horário de funcionamento (configurável pelo admin) ---------------- */
function horarioToMin(hhmm, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return fallback;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function dentroDoHorario() {
  const agora = new Date();
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const abre = horarioToMin(STATE.loja.horarioAbre, 18 * 60);
  const fecha = horarioToMin(STATE.loja.horarioFecha, 23 * 60 + 30);
  // fechamento depois da meia-noite (ex: 18:00 às 00:30)
  if (fecha <= abre) return minutos >= abre || minutos < fecha;
  return minutos >= abre && minutos < fecha;
}
function lojaEstaAberta() {
  const modo = STATE.loja.modo || 'auto';
  if (modo === 'forcar_aberta') return true;
  if (modo === 'forcar_fechada') return false;
  return dentroDoHorario();
}
function horarioTexto() {
  return (STATE.loja.horarioAbre || '18:00') + 'h às ' + (STATE.loja.horarioFecha || '23:30') + 'h';
}

/* ---------------- render: cardápio do cliente ---------------- */
function renderStatusBanner() {
  const el = document.getElementById('status-banner');
  const modo = STATE.loja.modo || 'auto';
  if (lojaEstaAberta()) {
    el.className = 'status-banner status-open';
    el.innerHTML = '<span class="dot"></span> Aberto para pedidos';
  } else {
    el.className = 'status-banner status-closed';
    const motivo = modo === 'forcar_fechada' ? 'Loja fechada no momento' : 'Fechado no momento — atendemos das ' + horarioTexto();
    el.innerHTML = '<span class="dot"></span> ' + motivo;
  }
}

const ICON_LANCHE =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 10.5C4 6.9 7.6 4.5 12 4.5s8 2.4 8 6H4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M3.5 13.5h17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.5 16.5h15a0 0 0 0 1 0 0c0 1.7-1.3 3-3 3h-9c-1.7 0-3-1.3-3-3z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const CATEGORY_ICONS = {
  'lanches-cuiabanos': ICON_LANCHE,
  'lanches-premium': ICON_LANCHE,
  porcoes:
    '<svg viewBox="0 0 24 24" fill="none"><path d="M5 10h14l-1.6 9.2a1.5 1.5 0 0 1-1.5 1.3H8.1a1.5 1.5 0 0 1-1.5-1.3L5 10z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 10V4.5M11 10V3.5M14 10V4M17 10V5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
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

    if (item.temAdicionais) {
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

  wrap.querySelectorAll('.config-adicional').forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = getConfigState(btn.getAttribute('data-configkey'));
      const value = btn.getAttribute('data-value');
      st.adicionais[value] = !st.adicionais[value];
      renderMenu();
    });
  });
  wrap.querySelectorAll('.config-retirar').forEach((input) => {
    input.addEventListener('input', () => (getConfigState(input.getAttribute('data-configkey')).retirar = input.value));
  });
  wrap.querySelectorAll('.btn-add-config').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const ckey = btn.getAttribute('data-configkey');
      const [catId, itemId, variantLabel] = ckey.split('::');
      const item = findItem(catId, itemId);
      const variant = variantLabel ? item.variantes.find((v) => v.label === variantLabel) : null;
      const basePrice = variant ? variant.preco : item.preco;
      addConfiguredToCart(catId, itemId, variantLabel || null, item.nome, basePrice, variant);
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
    return JSON.parse(localStorage.getItem('porto_cupons_usados') || '[]');
  } catch (e) {
    return [];
  }
}
function marcarCupomUsado(codigo) {
  try {
    const usados = cuponsUsados();
    if (usados.indexOf(codigo) === -1) {
      usados.push(codigo);
      localStorage.setItem('porto_cupons_usados', JSON.stringify(usados));
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
    return parseInt(localStorage.getItem('porto_order_seq') || '0', 10);
  } catch (e) {
    return 0;
  }
})();
function nextOrderNumber() {
  orderCounter += 1;
  try {
    localStorage.setItem('porto_order_seq', String(orderCounter));
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
  lines.push('PEDIDO #' + orderNumber + ' - Porto Hamburgueria');
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
    '<div class="field"><label for="ck-obs">Observações (opcional)</label><textarea id="ck-obs" placeholder="Ex: troco para R$ 50, ponto de referência...">' + checkoutInfo.obs + '</textarea></div>' +
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
      alert('A loja fechou (atendemos das ' + horarioTexto() + '). Volte no próximo horário!');
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
  renderAdicionaisAdmin();
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

function renderAdicionaisAdmin() {
  const wrap = document.getElementById('admin-cardapio-dia');
  if (!Array.isArray(draft.adicionais)) draft.adicionais = [];
  const panel = document.createElement('div');
  panel.className = 'admin-panel';
  panel.innerHTML =
    '<div class="section-label" style="margin-top:0;">Adicionais dos lanches</div>' +
    '<p style="font-size:0.8rem;color:var(--ink-soft);margin:0 0 12px;">Aparecem pra escolher em todo lanche. Se um acabar, marque "Acabou" e clique em "Publicar alterações" lá embaixo.</p>' +
    '<div id="adicionais-editor"></div>';
  wrap.innerHTML = '';
  wrap.appendChild(panel);
  renderAdicionaisEditor(document.getElementById('adicionais-editor'), draft.adicionais);
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
  descTextarea.placeholder = 'Ingredientes (ex: pão, hambúrguer, ovo, presunto, mussarela)';
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

  const lancheToggle = document.createElement('label');
  lancheToggle.className = 'toggle-row';
  const lancheCb = document.createElement('input');
  lancheCb.type = 'checkbox';
  lancheCb.checked = !!item.temAdicionais;
  lancheCb.addEventListener('change', () => (item.temAdicionais = lancheCb.checked));
  lancheToggle.appendChild(lancheCb);
  lancheToggle.appendChild(document.createTextNode('É lanche (mostra adicionais e "tirar ingrediente")'));
  row.appendChild(lancheToggle);

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
    out.push('PORTO HAMBURGUERIA');
    out.push('');
    text.trim().split('\n').forEach((l) => out.push(l));
    return out;
  }
  out.push('Porto Hamburgueria' + (parsed.pedidoNum ? '  #' + parsed.pedidoNum : ''));
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
  out.push('Pedido feito pelo site - Porto Hamburgueria');
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
  baixarComandaPdf(comandaLines(text), 'comanda-porto-' + Date.now() + '.pdf');
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
