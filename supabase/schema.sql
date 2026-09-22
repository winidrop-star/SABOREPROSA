-- Sabor e Prosa — schema do Supabase
-- Rode este arquivo inteiro em: seu projeto Supabase -> SQL Editor -> New query -> Run

-- ---------------------------------------------------------------
-- config: guarda loja, cardápio do dia, categorias/itens do menu
-- e cupons como blobs JSON (um registro por chave), do mesmo jeito
-- que o app original guardava tudo em um único objeto STATE.
-- ---------------------------------------------------------------
create table if not exists config (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- pedidos: fila da cozinha/caixa (equivalente à coleção "pedidos")
-- ---------------------------------------------------------------
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  itens jsonb not null,
  obs text default '',
  cliente text not null,
  telefone text default '',
  modo text not null default 'retirada',
  endereco text default '',
  forma_pagamento text default '',
  total numeric not null default 0,
  status text not null default 'novo',
  criado_em timestamptz not null default now(),
  preparo_em timestamptz,
  pronto_em timestamptz,
  saiu_em timestamptz,
  concluido_em timestamptz,
  cancelado_em timestamptz
);

-- necessário para o Realtime mandar os valores antigos nos eventos
-- de UPDATE (usado para disparar o alerta sonoro só na transição certa)
alter table pedidos replica identity full;

-- ---------------------------------------------------------------
-- caixa_movimentos: sangria / reforço / despesa
-- ---------------------------------------------------------------
create table if not exists caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  valor numeric not null,
  motivo text default '',
  criado_em timestamptz not null default now()
);

alter table caixa_movimentos replica identity full;

-- ---------------------------------------------------------------
-- Realtime: liga as duas tabelas de operação do dia a dia
-- ---------------------------------------------------------------
alter publication supabase_realtime add table pedidos;
alter publication supabase_realtime add table caixa_movimentos;

-- ---------------------------------------------------------------
-- Row Level Security
--
-- Este app não tem login de funcionário (o PIN do caixa é só uma
-- trava de tela, igual no app original) — por isso liberamos leitura
-- e escrita para a chave "anon" do projeto, que é a mesma usada pelo
-- site do cliente e pelo painel. NÃO exponha a chave "service_role"
-- em nenhum desses apps.
-- ---------------------------------------------------------------
alter table config enable row level security;
alter table pedidos enable row level security;
alter table caixa_movimentos enable row level security;

create policy "config leitura publica" on config for select using (true);
create policy "config escrita publica" on config for insert with check (true);
create policy "config atualizacao publica" on config for update using (true);

create policy "pedidos leitura publica" on pedidos for select using (true);
create policy "pedidos escrita publica" on pedidos for insert with check (true);
create policy "pedidos atualizacao publica" on pedidos for update using (true);

create policy "movimentos leitura publica" on caixa_movimentos for select using (true);
create policy "movimentos escrita publica" on caixa_movimentos for insert with check (true);

-- ---------------------------------------------------------------
-- Dados iniciais — o mesmo cardápio que já estava nos dois apps
-- ---------------------------------------------------------------
insert into config (chave, valor) values
('loja', '{"modo":"auto","horarioAbre":"10:30","horarioFecha":"13:30","whatsapp":"5565992286248"}'),
('cardapioDia', '{"proteina1":"Bife Bovino","proteina2":"Coxa e Sobrecoxa ao Molho","feijaoOpcoes":["Feijão preto","Sem feijão"],"legumesOpcoes":[],"adicionaisOpcoes":["Frango Empanado"]}'),
('cupons', '[]'),
('categorias', '[
 {"id":"marmitas","nome":"Marmitas","itens":[
   {"id":"padrao-p","nome":"Marmita Padrão P","tipo":"simples","descricao":"Arroz, feijão, macarrão, farofa e abobrinha e cenoura refogada","preco":26,"escolheProteina":true,"escolheFeijao":true,"temAdicionais":true,"disponivel":true},
   {"id":"padrao-m","nome":"Marmita Padrão M","tipo":"simples","descricao":"Arroz, feijão, macarrão, farofa e abobrinha e cenoura refogada","preco":30,"proteinasIncluidas":true,"escolheFeijao":true,"temAdicionais":true,"disponivel":true},
   {"id":"padrao-g","nome":"Marmita Padrão G","tipo":"simples","descricao":"Arroz, feijão, macarrão, farofa e abobrinha e cenoura refogada","preco":35,"proteinasIncluidas":true,"escolheFeijao":true,"temAdicionais":true,"disponivel":true},
   {"id":"simples","nome":"Marmita Simples","tipo":"simples","descricao":"Arroz, feijão, macarrão e uma proteína à sua escolha","preco":28,"escolheProteina":true,"escolheFeijao":true,"temAdicionais":true,"disponivel":true},
   {"id":"exec3","nome":"Marmita Executiva 3 Divisórias","tipo":"simples","descricao":"Arroz, feijão, macarrão e uma proteína à sua escolha","preco":30,"escolheProteina":true,"escolheFeijao":true,"temAdicionais":true,"disponivel":true},
   {"id":"exec4","nome":"Marmita Executiva 4 Divisórias","tipo":"simples","descricao":"Arroz, feijão, 1 ovo frito, batatinha frita, bife bovino","preco":38,"escolheFeijao":true,"temAdicionais":true,"disponivel":true}
 ]},
 {"id":"bebidas","nome":"Bebidas","itens":[
   {"id":"coca","nome":"Coca-Cola","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6},{"label":"600ml","preco":8},{"label":"1,5L","preco":15},{"label":"2L","preco":16}]},
   {"id":"cocazero","nome":"Coca-Cola Zero","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6},{"label":"500ml","preco":8}]},
   {"id":"guarana","nome":"Guaraná Antártica","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6},{"label":"600ml","preco":8},{"label":"1L","preco":13},{"label":"1,5L","preco":15},{"label":"2L","preco":16}]},
   {"id":"guaranazero","nome":"Guaraná Antártica Zero","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6,"disponivel":false},{"label":"600ml","preco":8},{"label":"1L","preco":13},{"label":"2L","preco":16}]},
   {"id":"kitu","nome":"Kitubaína","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6},{"label":"600ml","preco":8},{"label":"1L","preco":13},{"label":"1,5L","preco":15},{"label":"2L","preco":16}]},
   {"id":"fantalaranja","nome":"Fanta Laranja","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6},{"label":"600ml","preco":8}]},
   {"id":"fantauva","nome":"Fanta Uva","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6}]},
   {"id":"h2olimonetto","nome":"H2O Limonetto","tipo":"variantes","disponivel":true,"variantes":[{"label":"600ml","preco":8}]},
   {"id":"h2o","nome":"H2O","tipo":"variantes","disponivel":true,"variantes":[{"label":"600ml","preco":8}]},
   {"id":"aguacomgas","nome":"Água com gás","tipo":"variantes","disponivel":true,"variantes":[{"label":"Única","preco":5}]},
   {"id":"aguasemgas","nome":"Água sem gás","tipo":"variantes","disponivel":true,"variantes":[{"label":"Única","preco":5}]},
   {"id":"sprite","nome":"Sprite","tipo":"variantes","disponivel":true,"variantes":[{"label":"Lata","preco":6}]},
   {"id":"sucolaranja","nome":"Suco de Laranja","tipo":"variantes","disponivel":true,"variantes":[{"label":"300ml","preco":14},{"label":"500ml","preco":24}]}
 ]}
]')
on conflict (chave) do nothing;
