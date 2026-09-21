# Sabor e Prosa — app próprio do restaurante

Este projeto reúne tudo que estava nos dois protótipos (o site do cliente
"Sabor e Prosa" e o "Painel do Restaurante") num aplicativo web único e
independente, que **não depende do Claude para rodar**. Ele é hospedado na
Vercel (ou onde você preferir) e usa o [Supabase](https://supabase.com) como
banco de dados/tempo real — a mesma peça que antes fazia a cozinha e o caixa
verem os pedidos na hora.

- `index.html` — site do cliente (cardápio + pedido pelo WhatsApp) e, em
  `/#SLUG_SECRETO`, a área de administração do cardápio/cupons.
- `painel.html` — painel interno da loja (Caixa + Cozinha), com PIN pra
  entrar no modo Caixa.

O fluxo de pedido continua o mesmo de antes: o cliente monta o pedido no
site e ele abre o WhatsApp já com a mensagem pronta; o caixa cola essa
mensagem (ou monta manualmente) no painel, e é isso que entra pra fila da
cozinha em tempo real.

## 1. Criar o banco (Supabase)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um projeto novo.
2. No painel do projeto, vá em **SQL Editor → New query**, cole todo o
   conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique
   em **Run**. Isso cria as tabelas, liga o tempo real e já semeia o
   cardápio que vocês já tinham.
3. Vá em **Project Settings → API** e copie:
   - **Project URL** → vai virar `VITE_SUPABASE_URL`
   - **anon public key** → vai virar `VITE_SUPABASE_ANON_KEY`

   Nunca use a chave **service_role** em nenhum desses dois arquivos — ela
   dá acesso total ao banco e não pode aparecer em código que roda no
   navegador.

## 2. Configurar as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_CAIXA_PIN=2707              # troque pelo PIN que a loja vai usar
VITE_ADMIN_SLUG=saboreprosa-...  # troque por um trecho só seu
```

## 3. Rodar localmente

```
npm install
npm run dev
```

Abre em `http://localhost:5173` (site do cliente) e
`http://localhost:5173/painel.html` (painel da loja).

## 4. Publicar (Vercel)

1. Suba este projeto pra um repositório no GitHub (peça ajuda se precisar).
2. Em [vercel.com](https://vercel.com), **Add New → Project**, importe esse
   repositório. A Vercel detecta o Vite automaticamente.
3. Em **Environment Variables**, adicione as mesmas 4 variáveis do passo 2
   (URL e chave do Supabase, PIN do caixa, slug do admin).
4. Clique em **Deploy**. Em ~1 minuto o site fica no ar em um endereço
   `algumacoisa.vercel.app` — e dá pra ligar um domínio próprio
   (`saboreprosa.com.br`, por exemplo) depois, em **Settings → Domains**.

O painel fica em `SEUENDERECO.vercel.app/painel.html` — esse link não deve
ser divulgado pros clientes, só pra equipe.

## O que mudou em relação aos protótipos

- **Sincronização em tempo real**: antes usava um banco interno do Claude;
  agora usa o Postgres + Realtime do Supabase (tabelas `pedidos` e
  `caixa_movimentos`, ver `supabase/schema.sql`).
- **"Publicar alterações"** do cardápio e do cardápio do dia: antes
  reescrevia o HTML da página inteira; agora grava direto numa tabela
  `config` no Supabase.
- **Cardápio do dia unificado**: no protótipo original, o site do cliente e
  o painel guardavam cada um a sua própria cópia das proteínas/feijões do
  dia (podiam ficar dessincronizados). Agora os dois leem e escrevem no
  mesmo lugar.
- **Download de PDF da comanda**: antes usava uma API de download do
  Claude; agora baixa o PDF direto no navegador (funciona em qualquer
  computador/celular).
- **Logo**: extraída para um arquivo `public/logo.png` de verdade, em vez
  de ficar embutida como texto gigante dentro do HTML.

## Segurança — vale saber

O PIN do caixa e o "link secreto" da administração são travas simples de
tela, iguais ao protótipo original — não são um sistema de login de
verdade. Qualquer pessoa com a chave pública do Supabase (que fica visível
no código do navegador, isso é normal) consegue ler e escrever nas tabelas
`pedidos`, `caixa_movimentos` e `config`. Pra uma loja pequena isso costuma
ser aceitável, mas se um dia vocês quiserem mais segurança (login de
funcionário de verdade, por exemplo), me chamem que a gente evolui isso.
