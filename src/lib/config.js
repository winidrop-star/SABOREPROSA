import { supabase } from './supabaseClient.js';

const CHAVES = ['loja', 'cardapioDia', 'categorias', 'cupons'];

// Estado padrão usado só se o Supabase ainda não tiver sido semeado
// (rode supabase/schema.sql no seu projeto para não cair nesse caso).
const FALLBACK = {
  loja: { modo: 'auto', horarioAbre: '10:30', horarioFecha: '13:30', whatsapp: '' },
  cardapioDia: { proteina1: '', proteina2: '', feijaoOpcoes: [], legumesOpcoes: [], adicionaisOpcoes: [] },
  cupons: [],
  categorias: []
};

export async function loadState() {
  const { data, error } = await supabase.from('config').select('chave, valor');
  const state = JSON.parse(JSON.stringify(FALLBACK));
  if (error) {
    console.error('Não consegui carregar a configuração do Supabase:', error.message);
    return state;
  }
  (data || []).forEach((row) => {
    if (CHAVES.includes(row.chave)) state[row.chave] = row.valor;
  });
  return state;
}

// Publica só as chaves informadas (equivalente ao antigo "publicar alterações",
// que reescrevia a página inteira — aqui é uma escrita direta no banco).
export async function saveState(partialState) {
  const rows = Object.keys(partialState)
    .filter((k) => CHAVES.includes(k))
    .map((k) => ({ chave: k, valor: partialState[k], atualizado_em: new Date().toISOString() }));
  const { error } = await supabase.from('config').upsert(rows, { onConflict: 'chave' });
  if (error) throw error;
}
