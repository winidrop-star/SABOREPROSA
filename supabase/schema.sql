-- Porto Hamburgueria — schema do Supabase
-- Rode este arquivo inteiro em: seu projeto Supabase -> SQL Editor -> New query -> Run

-- ---------------------------------------------------------------
-- config: guarda loja, adicionais dos lanches, categorias/itens do menu
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
-- Dados iniciais — cardápio da Porto Hamburgueria
--
-- Os "adicionais" abaixo são um ponto de partida: confira nomes e preços
-- (e o número do WhatsApp em "loja") no painel, aba "Loja & cardápio",
-- ou na área de admin do site.
-- ---------------------------------------------------------------
insert into config (chave, valor) values
('loja', '{"modo": "auto", "horarioAbre": "18:00", "horarioFecha": "23:30", "whatsapp": ""}'),
('adicionais', '[
 {
  "nome": "Hambúrguer extra",
  "preco": 6,
  "disponivel": true
 },
 {
  "nome": "Bacon",
  "preco": 5,
  "disponivel": true
 },
 {
  "nome": "Cheddar",
  "preco": 4,
  "disponivel": true
 },
 {
  "nome": "Ovo",
  "preco": 3,
  "disponivel": true
 },
 {
  "nome": "Calabresa",
  "preco": 5,
  "disponivel": true
 },
 {
  "nome": "Batata palha",
  "preco": 2,
  "disponivel": true
 }
]'),
('cupons', '[]'),
('categorias', '[
 {
  "id": "lanches-cuiabanos",
  "nome": "Lanches Cuiabanos",
  "itens": [
   {
    "id": "x-salada",
    "nome": "X-Salada",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 20,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "baguncinha",
    "nome": "Baguncinha",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer, salsicha, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 22,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-bagunca",
    "nome": "X-Bagunça",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer, salsicha, calabresa, bacon, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 25,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-duplo",
    "nome": "X-Duplo",
    "tipo": "simples",
    "descricao": "Pão, 2 hambúrgueres, salsicha, calabresa, bacon em dobro, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 28,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-bacon",
    "nome": "X-Bacon",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer, salsicha, ovo, presunto, mussarela, bacon em dobro, alface, tomate, maionese caseira.",
    "preco": 30,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-calabresa",
    "nome": "X-Calabresa",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer, salsicha, ovo, bacon, presunto, calabresa em dobro, mussarela, alface, tomate, maionese caseira.",
    "preco": 30,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-tudo",
    "nome": "X-Tudo",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer, salsicha, calabresa, bacon, ovo, presunto, mussarela, milho, batata palha, alface, tomate, maionese caseira.",
    "preco": 32,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "quarteirao",
    "nome": "Quarteirão",
    "tipo": "simples",
    "descricao": "Pão, 4 hambúrgueres, salsicha, calabresa, bacon, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 35,
    "temAdicionais": true,
    "disponivel": true
   }
  ]
 },
 {
  "id": "lanches-premium",
  "nome": "Lanches Premium",
  "itens": [
   {
    "id": "x-salada-premium",
    "nome": "X-Salada Premium",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer caseiro de costela 120g, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 25,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "baguncinha-premium",
    "nome": "Baguncinha Premium",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer caseiro de costela 120g, salsicha, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 27,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-bagunca-premium",
    "nome": "X-Bagunça Premium",
    "tipo": "simples",
    "descricao": "Pão, hambúrguer caseiro de costela 120g, salsicha, calabresa, bacon, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 30,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-duplo-premium",
    "nome": "X-Duplo Premium",
    "tipo": "simples",
    "descricao": "Pão, 2 hambúrgueres caseiros de costela 120g, salsicha, calabresa, bacon, ovo, presunto, mussarela, alface, tomate, maionese caseira.",
    "preco": 34,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-costela-premium",
    "nome": "X-Costela Premium",
    "tipo": "simples",
    "descricao": "Pão brioche, hambúrguer caseiro de costela 150g, bacon, queijo cheddar, alface, tomate, maionese caseira, ketchup, mostarda e barbecue.",
    "preco": 35,
    "temAdicionais": true,
    "disponivel": true
   },
   {
    "id": "x-costela-duplo-premium",
    "nome": "X-Costela Duplo Premium",
    "tipo": "simples",
    "descricao": "Pão brioche, 2 hambúrgueres caseiros de costela 150g, bacon, queijo cheddar, alface, tomate, maionese caseira, ketchup, mostarda e barbecue.",
    "preco": 40,
    "temAdicionais": true,
    "disponivel": true
   }
  ]
 },
 {
  "id": "porcoes",
  "nome": "Porções",
  "itens": [
   {
    "id": "batata",
    "nome": "Porção de Batata",
    "tipo": "variantes",
    "disponivel": true,
    "variantes": [
     {
      "label": "Pequena 100g",
      "preco": 12
     },
     {
      "label": "Média 200g",
      "preco": 18
     },
     {
      "label": "Grande 300g",
      "preco": 30
     }
    ],
    "descricao": "Batata frita crocante."
   }
  ]
 },
 {
  "id": "bebidas",
  "nome": "Bebidas",
  "itens": [
   {
    "id": "coca",
    "nome": "Coca-Cola",
    "tipo": "variantes",
    "disponivel": true,
    "variantes": [
     {
      "label": "Lata",
      "preco": 6
     },
     {
      "label": "1,5L",
      "preco": 12
     }
    ]
   },
   {
    "id": "guarana",
    "nome": "Guaraná",
    "tipo": "variantes",
    "disponivel": true,
    "variantes": [
     {
      "label": "Lata",
      "preco": 6
     },
     {
      "label": "1L",
      "preco": 10
     },
     {
      "label": "1,5L",
      "preco": 12
     }
    ]
   },
   {
    "id": "fanta",
    "nome": "Fanta",
    "tipo": "variantes",
    "disponivel": true,
    "variantes": [
     {
      "label": "Lata",
      "preco": 6
     }
    ]
   }
  ]
 }
]')
on conflict (chave) do nothing;
