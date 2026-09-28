import { fmtBRL } from './format.js';

// Montagem do lanche (adicionais pagos + "tirar ingrediente"), usada tanto
// no site do cliente quanto no "Pedido novo" do painel. Vale para qualquer
// item com `temAdicionais: true` no cardápio.

export function novoConfig() {
  return { adicionais: {}, retirar: '' };
}

// Lista de adicionais que o cliente pode escolher (os esgotados somem).
export function catalogoAdicionais(state) {
  return (state.adicionais || []).filter((a) => a && a.nome && a.disponivel !== false);
}

function precoAdicional(state, nome) {
  const found = catalogoAdicionais(state).find((a) => a.nome === nome);
  return found ? Number(found.preco) || 0 : 0;
}

export function somaAdicionais(state, st) {
  return Object.keys(st.adicionais)
    .filter((k) => st.adicionais[k])
    .reduce((sum, nome) => sum + precoAdicional(state, nome), 0);
}

// Parênteses e travessão fazem parte do formato da mensagem do WhatsApp
// que o painel lê de volta ("1x Nome (detalhes) — R$ 0,00"), então não
// podem aparecer no texto livre digitado pelo cliente.
function limparTextoLivre(txt) {
  return (txt || '').replace(/[()—]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function montarDetalhe(variant, st) {
  const parts = [];
  if (variant) parts.push(variant.label);
  const extras = Object.keys(st.adicionais).filter((k) => st.adicionais[k]);
  if (extras.length) parts.push('+ ' + extras.join(', '));
  const retirar = limparTextoLivre(st.retirar);
  if (retirar) parts.push(retirar);
  return parts.join('; ');
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function configRowHtml(state, item, variant, ckey, st, habilitado) {
  const basePrice = variant ? variant.preco : item.preco;
  const label = variant ? variant.label : null;
  const totalUnit = basePrice + somaAdicionais(state, st);
  const catalogo = catalogoAdicionais(state);

  const adicionaisHtml = catalogo.length
    ? '<div class="config-group"><div class="config-label">Adicionais</div><div class="chip-group">' +
      catalogo
        .map(
          (a) =>
            '<button type="button" class="chip small config-adicional' +
            (st.adicionais[a.nome] ? ' selected' : '') +
            '" data-configkey="' + esc(ckey) + '" data-value="' + esc(a.nome) + '">' +
            esc(a.nome) + ' (+' + fmtBRL(Number(a.preco) || 0) + ')</button>'
        )
        .join('') +
      '</div></div>'
    : '';

  const retirarHtml =
    '<div class="config-group"><div class="config-label">Quer tirar algum ingrediente?</div>' +
    '<input type="text" class="config-retirar" maxlength="80" data-configkey="' + esc(ckey) + '" value="' + esc(st.retirar) +
    '" placeholder="Ex: sem tomate, sem maionese"></div>';

  return (
    '<div class="lanche-config" data-configkey="' + esc(ckey) + '">' +
    (label ? '<div class="variant-label-row">' + esc(label) + ' · <span class="price">' + fmtBRL(basePrice) + '</span></div>' : '') +
    adicionaisHtml +
    retirarHtml +
    '<div class="config-footer">' +
    '<span class="config-total mono price">' + fmtBRL(totalUnit) + '</span>' +
    '<button type="button" class="btn-add-config" data-configkey="' + esc(ckey) + '"' + (habilitado ? '' : ' disabled') + '>Adicionar</button>' +
    '</div>' +
    '</div>'
  );
}

// Editor da lista de adicionais (nome + preço + esgotado), usado na área
// de admin do site e na aba "Loja & cardápio" do painel. Mexe direto no
// array recebido; quem chama publica depois com saveState({ adicionais }).
export function renderAdicionaisEditor(container, lista) {
  container.innerHTML = '';
  lista.forEach((a, idx) => {
    const row = document.createElement('div');
    row.className = 'admin-item-row';

    const top = document.createElement('div');
    top.className = 'admin-item-top';
    const nome = document.createElement('input');
    nome.type = 'text';
    nome.className = 'admin-field-input';
    nome.value = a.nome || '';
    nome.placeholder = 'Ex: Bacon';
    nome.addEventListener('input', () => (a.nome = nome.value));
    const preco = document.createElement('input');
    preco.type = 'number';
    preco.step = '0.01';
    preco.min = '0';
    preco.className = 'admin-field-input';
    preco.value = a.preco;
    preco.addEventListener('input', () => (a.preco = parseFloat(preco.value) || 0));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'icon-btn danger';
    del.title = 'Remover adicional';
    del.textContent = '✕';
    del.addEventListener('click', () => {
      lista.splice(idx, 1);
      renderAdicionaisEditor(container, lista);
    });
    top.appendChild(nome);
    top.appendChild(preco);
    top.appendChild(del);
    row.appendChild(top);

    const toggle = document.createElement('label');
    toggle.className = 'toggle-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = a.disponivel === false;
    cb.addEventListener('change', () => (a.disponivel = !cb.checked));
    toggle.appendChild(cb);
    toggle.appendChild(document.createTextNode('Acabou (esconder do cardápio)'));
    row.appendChild(toggle);

    container.appendChild(row);
  });

  if (!lista.length) {
    const empty = document.createElement('p');
    empty.style.cssText = 'font-size:0.8rem;color:var(--ink-soft);margin:0 0 10px;';
    empty.textContent = 'Nenhum adicional cadastrado.';
    container.appendChild(empty);
  }

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'small-btn';
  add.textContent = '+ Novo adicional';
  add.addEventListener('click', () => {
    lista.push({ nome: '', preco: 0, disponivel: true });
    renderAdicionaisEditor(container, lista);
    const inputs = container.querySelectorAll('.admin-item-top input[type="text"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });
  container.appendChild(add);
}
