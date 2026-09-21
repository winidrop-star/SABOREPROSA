import { supabase } from './supabaseClient.js';

// Camada que troca a antiga coleção "pedidos" em tempo real do Claude
// (Firestore-like, window.claude.use('db')) pelas tabelas do Supabase.
// Mantém os mesmos nomes de campo em camelCase que o app original usava,
// pra o resto do código (telas, PDF, relatórios) não precisar mudar.

function toTs(iso) {
  return iso ? new Date(iso).getTime() : null;
}

function mapPedidoRow(row) {
  return {
    id: row.id,
    itens: row.itens,
    obs: row.obs || '',
    cliente: row.cliente,
    telefone: row.telefone || '',
    modo: row.modo,
    endereco: row.endereco || '',
    formaPagamento: row.forma_pagamento || '',
    total: Number(row.total) || 0,
    status: row.status,
    criadoEm: toTs(row.criado_em),
    preparoEm: toTs(row.preparo_em),
    prontoEm: toTs(row.pronto_em),
    saiuEm: toTs(row.saiu_em),
    concluidoEm: toTs(row.concluido_em),
    canceladoEm: toTs(row.cancelado_em)
  };
}

function mapMovimentoRow(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    valor: Number(row.valor) || 0,
    motivo: row.motivo || '',
    criadoEm: toTs(row.criado_em)
  };
}

export async function fetchPedidos() {
  const { data, error } = await supabase.from('pedidos').select('*').order('criado_em', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapPedidoRow);
}

export async function fetchMovimentos() {
  const { data, error } = await supabase.from('caixa_movimentos').select('*').order('criado_em', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMovimentoRow);
}

export async function inserirPedido(pendingPedido) {
  const { error } = await supabase.from('pedidos').insert({
    itens: pendingPedido.itens,
    obs: pendingPedido.obs || '',
    cliente: pendingPedido.cliente,
    telefone: pendingPedido.telefone || '',
    modo: pendingPedido.modo,
    endereco: pendingPedido.endereco || '',
    forma_pagamento: pendingPedido.formaPagamento || '',
    total: pendingPedido.total || 0,
    status: 'novo'
  });
  if (error) throw error;
}

const CAMPO_EM = {
  preparo: 'preparo_em',
  pronto: 'pronto_em',
  saiu: 'saiu_em',
  concluido: 'concluido_em',
  cancelado: 'cancelado_em'
};

export async function atualizarStatusPedido(id, status) {
  const patch = { status };
  const campoEm = CAMPO_EM[status];
  if (campoEm) patch[campoEm] = new Date().toISOString();
  const { error } = await supabase.from('pedidos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function inserirMovimento(mov) {
  const { error } = await supabase.from('caixa_movimentos').insert({
    tipo: mov.tipo,
    valor: mov.valor,
    motivo: mov.motivo || ''
  });
  if (error) throw error;
}

// onPedidoInsert(pedido) / onPedidoStatusChange(anterior, pedido) disparam os
// alertas sonoros na hora certa, sem precisar comparar o snapshot inteiro.
export function subscribePedidos({ onChange, onPedidoInsert, onPedidoStatusChange }) {
  const channel = supabase
    .channel('pedidos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, (payload) => {
      if (payload.eventType === 'INSERT') {
        const pedido = mapPedidoRow(payload.new);
        onChange();
        if (onPedidoInsert) onPedidoInsert(pedido);
      } else if (payload.eventType === 'UPDATE') {
        const anterior = payload.old ? mapPedidoRow({ ...payload.new, status: payload.old.status }) : null;
        const pedido = mapPedidoRow(payload.new);
        onChange();
        if (onPedidoStatusChange && anterior) onPedidoStatusChange(anterior.status, pedido);
      } else {
        onChange();
      }
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

export function subscribeMovimentos(onChange) {
  const channel = supabase
    .channel('movimentos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'caixa_movimentos' }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}
