# W+W Fit — juntos na evolução 💚🧡

Aplicativo do casal para o projeto de emagrecimento: peso, comida, água,
treino, desafios e uma palavra de motivação todo dia. É um **PWA**: um site
que se instala no celular como app, funciona offline e não precisa de loja de
aplicativos.

## O que tem

| Aba | Funções |
| --- | --- |
| ⚡ **Hoje** | Palavra do dia (versículo + motivação, muda todo dia), calorias restantes, proteína, água em copos, sequência 🔥 da semana, atalhos, check-in (humor, sono, passos, gratidão) e como está o outro hoje |
| 🥗 **Comida** | Diário por refeição com ~80 alimentos brasileiros (base TACO), porções caseiras, alimentos recentes, adicionar manualmente · Pratos salvos · Cardápio da semana · Lista de compras · Receitas fit · Cronômetro de jejum |
| 🏋️ **Treino** | 4 fichas modelo editáveis, treino guiado com séries, carga e cronômetro de descanso (vibra e apita), caminhada/corrida/bike etc. com gasto estimado, calendário e histórico |
| 📈 **Evolução** | Peso atual, perdido e quanto falta, IMC, gráfico do peso dos dois com a meta, resumo da semana, medidas corporais, fotos de progresso com comparação "antes e agora" e lista de pesagens |
| 💞 **Casal** | Placar da semana com pontos, "toca aqui" 👏, desafios a dois, recompensas por quilos perdidos juntos e diário de gratidão/oração |
| ☰ **Mais** | Perfis e metas (calorias, água, proteína), lembretes, relatório em PDF, instalação, backup |

As metas saem da fórmula de Mifflin-St Jeor com déficit de ~500 kcal/dia.
São estimativas; dá para colocar a meta passada por um nutricionista no perfil.

## Como rodar

Não tem etapa de build: são arquivos estáticos. Para testar no computador:

```
cd ww-fit
npx serve .        # ou: python3 -m http.server 8080
```

Para usar no celular, publique a pasta `ww-fit` em qualquer hospedagem
estática com HTTPS (Vercel, Netlify, GitHub Pages). Na Vercel: **Add New →
Project**, escolha o repositório e em **Root Directory** coloque `ww-fit`.

Depois, no celular:
- **Android (Chrome):** menu ⋮ → *Instalar app*.
- **iPhone (Safari):** Compartilhar ⬆️ → *Adicionar à Tela de Início*.
  Abra sempre pelo ícone; só assim o iPhone libera notificações (iOS 16.4+).

## Onde ficam os dados (importante)

Nesta primeira versão **tudo fica salvo no próprio celular** (localStorage e,
para as fotos, IndexedDB). Os dois perfis existem em cada aparelho e o botão
⇄ no topo troca quem está usando. Isso quer dizer que:

- se cada um usar o próprio celular, os dados **não se sincronizam** entre os
  dois aparelhos ainda (o "toca aqui" e o placar só veem o que foi registrado
  naquele celular);
- use **Mais → Backup** para guardar uma cópia ou passar os dados para outro
  aparelho.

## Lembretes

- Com o app aberto (ou usado há pouco), os lembretes de água, refeições,
  treino, pesagem e a palavra da manhã disparam no horário configurado.
- No **Android** com o app instalado, a palavra da manhã também chega com o
  app fechado (sincronização periódica, cerca de 1x por dia; o horário exato
  é o Chrome que decide).
- Lembretes pontuais com o app **totalmente fechado**, inclusive no iPhone,
  precisam de envio pelo servidor (Web Push). O `sw.js` já trata o evento
  `push`; falta o servidor.

## Próxima etapa sugerida

1. **Supabase**: login do casal, sincronização entre os dois celulares
   (dados + fotos) e o "toca aqui" chegando de verdade no outro aparelho.
2. **Web Push** com uma Edge Function agendada no Supabase para os lembretes
   com o app fechado.

## Estrutura

```
ww-fit/
├── index.html, manifest.webmanifest, sw.js
├── css/app.css            visual (tema escuro neon)
├── icons/                 logo W+W
└── js/
    ├── app.js             navegação e cabeçalho
    ├── store.js           dados, cálculos (metas, IMC, pontos, sequência), fotos, backup
    ├── ui.js              anéis, gráficos, janelas, toasts, confete
    ├── dados.js           alimentos, treinos modelo, receitas, desafios
    ├── mensagens.js       versículos e frases motivacionais
    ├── lembretes.js       notificações
    └── telas/             hoje, comida, treino, evolucao, casal, mais, onboarding
```

Os versículos seguem a redação tradicional em português (estilo Almeida).
Para acrescentar ou trocar mensagens, edite as listas em `js/mensagens.js`.
