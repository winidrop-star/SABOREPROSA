# Porto Hamburgueria — app próprio da loja

Site de pedidos + painel (Caixa e Cozinha) da Porto Hamburgueria, adaptado
do app da Sabor e Prosa. Não depende do Claude para rodar: é hospedado na
Vercel (ou onde você preferir) e usa o [Supabase](https://supabase.com) como
banco de dados/tempo real.

- `index.html` — site do cliente (cardápio + pedido pelo WhatsApp) e, em
  `/#SLUG_SECRETO`, a área de administração do cardápio/adicionais/cupons.
- `painel.html` — painel interno da loja (Caixa + Cozinha), com PIN pra
  entrar no modo Caixa.

Como funciona o pedido: o cliente escolhe o lanche, marca os **adicionais**
(bacon, cheddar, hambúrguer extra...) e escreve se quer **tirar algum
ingrediente** ("sem tomate"). O pedido abre o WhatsApp já com a mensagem
pronta; o caixa cola essa mensagem (ou monta manualmente) no painel, e é
isso que entra pra fila da cozinha em tempo real.

## O que configurar antes de abrir

- **WhatsApp da loja**: já vem configurado com (65) 99659-9587 em
  `supabase/schema.sql`. Se mudar, altere o `"whatsapp"` da chave `loja` na
  tabela `config` do Supabase (só dígitos, com 55 na frente).
- **Adicionais e preços**: vêm com uma lista de exemplo; ajuste no painel
  (modo Caixa → "Loja & cardápio") ou na área de admin do site.
- **Fotos**: as dos lanches e da batata foram tiradas do cardápio em PDF e
  ficam em `public/fotos/`. Pra trocar ou pôr foto num item novo, coloque a
  imagem nessa pasta (ou use um link) e preencha o campo "Foto" do item na
  área de admin do site.
- **Horário**: padrão 18:00 às 23:30; muda no painel. Fechamento depois da
  meia-noite (ex: 18:00 às 00:30) funciona.

## 1. Criar o banco (Supabase)

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e um projeto novo.
2. No painel do projeto, vá em **SQL Editor → New query**, cole todo o
   conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) e clique
   em **Run**. Isso cria as tabelas, liga o tempo real e já semeia o
   cardápio da Porto (lanches cuiabanos, premium, porção de batata e bebidas).
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
VITE_ADMIN_SLUG=porto-...  # troque por um trecho só seu
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
   (`portohamburgueria.com.br`, por exemplo) depois, em **Settings → Domains**.

O painel fica em `SEUENDERECO.vercel.app/painel.html` — esse link não deve
ser divulgado pros clientes, só pra equipe.

## Segurança — vale saber

O PIN do caixa e o "link secreto" da administração são travas simples de
tela, iguais ao protótipo original — não são um sistema de login de
verdade. Qualquer pessoa com a chave pública do Supabase (que fica visível
no código do navegador, isso é normal) consegue ler e escrever nas tabelas
`pedidos`, `caixa_movimentos` e `config`. Pra uma loja pequena isso costuma
ser aceitável, mas se um dia vocês quiserem mais segurança (login de
funcionário de verdade, por exemplo), me chamem que a gente evolui isso.
