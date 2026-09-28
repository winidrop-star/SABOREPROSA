// Dados fixos do app: alimentos, treinos modelo, receitas, desafios.
// Valores nutricionais aproximados por 100 g (ou 100 ml), com base na
// Tabela Brasileira de Composição de Alimentos (TACO) e rótulos comuns.
// kcal, p = proteína (g), c = carboidrato (g), g = gordura (g)
// porcao = [descrição, gramas de uma porção]

export const ALIMENTOS = [
  // grãos e massas
  { id: 'arroz', nome: 'Arroz branco cozido', e: '🍚', kcal: 128, p: 2.5, c: 28.1, g: 0.2, porcao: ['1 colher de servir', 45] },
  { id: 'arroz-int', nome: 'Arroz integral cozido', e: '🍚', kcal: 124, p: 2.6, c: 25.8, g: 1.0, porcao: ['1 colher de servir', 45] },
  { id: 'feijao', nome: 'Feijão carioca cozido', e: '🫘', kcal: 76, p: 4.8, c: 13.6, g: 0.5, porcao: ['1 concha', 86] },
  { id: 'feijao-preto', nome: 'Feijão preto cozido', e: '🫘', kcal: 77, p: 4.5, c: 14.0, g: 0.5, porcao: ['1 concha', 86] },
  { id: 'macarrao', nome: 'Macarrão cozido', e: '🍝', kcal: 102, p: 3.4, c: 19.9, g: 1.2, porcao: ['1 pegador', 110] },
  { id: 'cuscuz', nome: 'Cuscuz de milho', e: '🌽', kcal: 113, p: 2.2, c: 25.3, g: 0.7, porcao: ['1 fatia', 100] },
  { id: 'aveia', nome: 'Aveia em flocos', e: '🥣', kcal: 394, p: 13.9, c: 66.6, g: 8.5, porcao: ['2 colheres de sopa', 30] },
  { id: 'granola', nome: 'Granola', e: '🥣', kcal: 420, p: 10, c: 65, g: 14, porcao: ['1/2 xícara', 40] },
  { id: 'tapioca', nome: 'Tapioca (goma)', e: '🫓', kcal: 240, p: 0.2, c: 60, g: 0.1, porcao: ['1 tapioca média', 60] },
  { id: 'pao', nome: 'Pão francês', e: '🥖', kcal: 300, p: 8.0, c: 58.6, g: 3.1, porcao: ['1 unidade', 50] },
  { id: 'pao-int', nome: 'Pão integral (forma)', e: '🍞', kcal: 253, p: 9.4, c: 49.9, g: 3.7, porcao: ['1 fatia', 25] },
  { id: 'pao-queijo', nome: 'Pão de queijo', e: '🧀', kcal: 363, p: 5.1, c: 34.2, g: 24.6, porcao: ['1 unidade média', 40] },
  { id: 'farofa', nome: 'Farofa pronta', e: '🥄', kcal: 406, p: 2.1, c: 80.3, g: 9.1, porcao: ['1 colher de sopa', 15] },

  // tubérculos
  { id: 'batata-doce', nome: 'Batata-doce cozida', e: '🍠', kcal: 77, p: 0.6, c: 18.4, g: 0.1, porcao: ['1 unidade média', 150] },
  { id: 'batata', nome: 'Batata inglesa cozida', e: '🥔', kcal: 52, p: 1.2, c: 11.9, g: 0.1, porcao: ['1 unidade média', 130] },
  { id: 'mandioca', nome: 'Mandioca cozida', e: '🥔', kcal: 125, p: 0.6, c: 30.1, g: 0.3, porcao: ['1 pedaço', 100] },
  { id: 'batata-frita', nome: 'Batata frita', e: '🍟', kcal: 267, p: 5.0, c: 35.6, g: 13.1, porcao: ['1 porção pequena', 100] },

  // proteínas
  { id: 'frango', nome: 'Peito de frango grelhado', e: '🍗', kcal: 159, p: 32.0, c: 0, g: 2.5, porcao: ['1 filé', 120] },
  { id: 'frango-coxa', nome: 'Coxa de frango assada', e: '🍗', kcal: 215, p: 28.5, c: 0, g: 11.0, porcao: ['1 coxa', 90] },
  { id: 'patinho', nome: 'Patinho grelhado', e: '🥩', kcal: 219, p: 35.9, c: 0, g: 7.3, porcao: ['1 bife', 100] },
  { id: 'alcatra', nome: 'Alcatra grelhada', e: '🥩', kcal: 241, p: 31.9, c: 0, g: 11.6, porcao: ['1 bife', 100] },
  { id: 'carne-moida', nome: 'Carne moída refogada', e: '🥩', kcal: 212, p: 26.7, c: 0, g: 10.9, porcao: ['3 colheres de sopa', 75] },
  { id: 'tilapia', nome: 'Tilápia grelhada', e: '🐟', kcal: 128, p: 26.0, c: 0, g: 2.7, porcao: ['1 filé', 120] },
  { id: 'salmao', nome: 'Salmão grelhado', e: '🐟', kcal: 229, p: 23.9, c: 0, g: 14.0, porcao: ['1 posta', 120] },
  { id: 'atum', nome: 'Atum em água (lata)', e: '🐟', kcal: 118, p: 26.0, c: 0, g: 1.0, porcao: ['1 lata drenada', 120] },
  { id: 'sardinha', nome: 'Sardinha em lata', e: '🐟', kcal: 208, p: 24.6, c: 0, g: 11.5, porcao: ['1 lata drenada', 84] },
  { id: 'ovo', nome: 'Ovo cozido', e: '🥚', kcal: 146, p: 13.3, c: 0.6, g: 9.5, porcao: ['1 unidade', 50] },
  { id: 'ovo-frito', nome: 'Ovo frito', e: '🍳', kcal: 240, p: 15.6, c: 1.2, g: 18.6, porcao: ['1 unidade', 50] },
  { id: 'omelete', nome: 'Omelete simples', e: '🍳', kcal: 154, p: 10.5, c: 0.8, g: 11.8, porcao: ['2 ovos', 110] },
  { id: 'peito-peru', nome: 'Peito de peru', e: '🥓', kcal: 110, p: 19.0, c: 3.0, g: 2.0, porcao: ['3 fatias', 45] },
  { id: 'presunto', nome: 'Presunto', e: '🥓', kcal: 94, p: 14.3, c: 2.1, g: 2.7, porcao: ['2 fatias', 30] },
  { id: 'whey', nome: 'Whey protein', e: '🥤', kcal: 400, p: 78, c: 8, g: 6, porcao: ['1 scoop', 30] },

  // laticínios
  { id: 'leite', nome: 'Leite integral', e: '🥛', kcal: 61, p: 3.2, c: 4.7, g: 3.3, porcao: ['1 copo (200 ml)', 200] },
  { id: 'leite-desn', nome: 'Leite desnatado', e: '🥛', kcal: 35, p: 3.4, c: 4.9, g: 0.2, porcao: ['1 copo (200 ml)', 200] },
  { id: 'iogurte', nome: 'Iogurte natural', e: '🥣', kcal: 51, p: 4.1, c: 1.9, g: 3.0, porcao: ['1 pote', 170] },
  { id: 'iogurte-grego', nome: 'Iogurte grego zero', e: '🥣', kcal: 60, p: 9.0, c: 4.0, g: 0.5, porcao: ['1 pote', 100] },
  { id: 'queijo-minas', nome: 'Queijo minas frescal', e: '🧀', kcal: 264, p: 17.4, c: 3.2, g: 20.2, porcao: ['1 fatia', 30] },
  { id: 'mussarela', nome: 'Queijo mussarela', e: '🧀', kcal: 330, p: 22.6, c: 3.0, g: 25.2, porcao: ['2 fatias', 30] },
  { id: 'requeijao', nome: 'Requeijão cremoso', e: '🧀', kcal: 257, p: 9.6, c: 2.4, g: 23.4, porcao: ['1 colher de sopa', 30] },
  { id: 'manteiga', nome: 'Manteiga', e: '🧈', kcal: 726, p: 0.4, c: 0, g: 82.4, porcao: ['1 ponta de faca', 5] },

  // frutas
  { id: 'banana', nome: 'Banana prata', e: '🍌', kcal: 98, p: 1.3, c: 26.0, g: 0.1, porcao: ['1 unidade', 70] },
  { id: 'maca', nome: 'Maçã', e: '🍎', kcal: 56, p: 0.3, c: 15.2, g: 0, porcao: ['1 unidade', 130] },
  { id: 'mamao', nome: 'Mamão papaia', e: '🥭', kcal: 40, p: 0.5, c: 10.4, g: 0.1, porcao: ['1/2 unidade', 150] },
  { id: 'melancia', nome: 'Melancia', e: '🍉', kcal: 33, p: 0.9, c: 8.1, g: 0, porcao: ['1 fatia', 200] },
  { id: 'laranja', nome: 'Laranja', e: '🍊', kcal: 37, p: 1.0, c: 8.9, g: 0.1, porcao: ['1 unidade', 180] },
  { id: 'morango', nome: 'Morango', e: '🍓', kcal: 30, p: 0.9, c: 6.8, g: 0.3, porcao: ['10 unidades', 120] },
  { id: 'abacate', nome: 'Abacate', e: '🥑', kcal: 96, p: 1.2, c: 6.0, g: 8.4, porcao: ['2 colheres de sopa', 60] },
  { id: 'uva', nome: 'Uva', e: '🍇', kcal: 53, p: 0.7, c: 13.6, g: 0.2, porcao: ['1 cacho pequeno', 100] },
  { id: 'manga', nome: 'Manga', e: '🥭', kcal: 64, p: 0.4, c: 16.7, g: 0.3, porcao: ['1/2 unidade', 150] },
  { id: 'abacaxi', nome: 'Abacaxi', e: '🍍', kcal: 48, p: 0.9, c: 12.3, g: 0.1, porcao: ['1 fatia', 100] },

  // verduras e legumes
  { id: 'salada', nome: 'Salada verde (alface, rúcula)', e: '🥗', kcal: 12, p: 1.3, c: 1.7, g: 0.2, porcao: ['1 prato raso', 60] },
  { id: 'tomate', nome: 'Tomate', e: '🍅', kcal: 15, p: 1.1, c: 3.1, g: 0.2, porcao: ['1 unidade', 100] },
  { id: 'cenoura', nome: 'Cenoura crua', e: '🥕', kcal: 34, p: 1.3, c: 7.7, g: 0.2, porcao: ['1/2 unidade', 60] },
  { id: 'brocolis', nome: 'Brócolis cozido', e: '🥦', kcal: 25, p: 2.1, c: 4.4, g: 0.5, porcao: ['1 xícara', 90] },
  { id: 'abobrinha', nome: 'Abobrinha refogada', e: '🥒', kcal: 20, p: 1.1, c: 3.0, g: 0.5, porcao: ['3 colheres de sopa', 80] },
  { id: 'pepino', nome: 'Pepino', e: '🥒', kcal: 10, p: 0.9, c: 2.0, g: 0, porcao: ['1/2 unidade', 100] },
  { id: 'legumes', nome: 'Legumes no vapor (mix)', e: '🥦', kcal: 35, p: 1.8, c: 6.5, g: 0.3, porcao: ['1 xícara', 100] },

  // oleaginosas e gorduras
  { id: 'castanha', nome: 'Castanha-do-pará', e: '🌰', kcal: 643, p: 14.5, c: 15.1, g: 63.5, porcao: ['2 unidades', 8] },
  { id: 'amendoim', nome: 'Amendoim torrado', e: '🥜', kcal: 606, p: 22.5, c: 18.7, g: 54.0, porcao: ['1 punhado', 20] },
  { id: 'pasta-amendoim', nome: 'Pasta de amendoim', e: '🥜', kcal: 590, p: 25, c: 20, g: 48, porcao: ['1 colher de sopa', 15] },
  { id: 'azeite', nome: 'Azeite de oliva', e: '🫒', kcal: 884, p: 0, c: 0, g: 100, porcao: ['1 colher de sopa', 13] },

  // bebidas
  { id: 'cafe', nome: 'Café sem açúcar', e: '☕', kcal: 3, p: 0.2, c: 0.5, g: 0, porcao: ['1 xícara', 100] },
  { id: 'cafe-leite', nome: 'Café com leite', e: '☕', kcal: 40, p: 2.0, c: 3.5, g: 1.9, porcao: ['1 xícara', 200] },
  { id: 'suco-laranja', nome: 'Suco de laranja natural', e: '🧃', kcal: 45, p: 0.7, c: 10.4, g: 0.1, porcao: ['1 copo', 250] },
  { id: 'refri', nome: 'Refrigerante comum', e: '🥤', kcal: 42, p: 0, c: 10.6, g: 0, porcao: ['1 lata', 350] },
  { id: 'refri-zero', nome: 'Refrigerante zero', e: '🥤', kcal: 1, p: 0, c: 0, g: 0, porcao: ['1 lata', 350] },
  { id: 'cerveja', nome: 'Cerveja', e: '🍺', kcal: 41, p: 0.3, c: 3.3, g: 0, porcao: ['1 lata', 350] },
  { id: 'agua-coco', nome: 'Água de coco', e: '🥥', kcal: 22, p: 0, c: 5.3, g: 0, porcao: ['1 copo', 250] },

  // pratos prontos e doces
  { id: 'feijoada', nome: 'Feijoada', e: '🍲', kcal: 117, p: 8.7, c: 11.6, g: 6.5, porcao: ['1 concha grande', 225] },
  { id: 'strogonoff', nome: 'Strogonoff de frango', e: '🍛', kcal: 157, p: 17.0, c: 3.0, g: 8.5, porcao: ['1 concha', 150] },
  { id: 'lasanha', nome: 'Lasanha à bolonhesa', e: '🍝', kcal: 160, p: 8.5, c: 14.0, g: 7.5, porcao: ['1 pedaço', 250] },
  { id: 'pizza', nome: 'Pizza de mussarela', e: '🍕', kcal: 280, p: 12, c: 30, g: 12, porcao: ['1 fatia', 110] },
  { id: 'hamburguer', nome: 'Hambúrguer (sanduíche)', e: '🍔', kcal: 250, p: 12.5, c: 24, g: 11.5, porcao: ['1 sanduíche', 200] },
  { id: 'coxinha', nome: 'Coxinha', e: '🍗', kcal: 283, p: 9.6, c: 34.5, g: 11.8, porcao: ['1 unidade', 110] },
  { id: 'pastel', nome: 'Pastel de carne', e: '🥟', kcal: 289, p: 10, c: 32, g: 14, porcao: ['1 unidade', 90] },
  { id: 'chocolate', nome: 'Chocolate ao leite', e: '🍫', kcal: 540, p: 7.2, c: 59.6, g: 30.3, porcao: ['1 quadradinho', 10] },
  { id: 'sorvete', nome: 'Sorvete de massa', e: '🍨', kcal: 200, p: 3.5, c: 24, g: 10, porcao: ['1 bola', 60] },
  { id: 'bolo', nome: 'Bolo simples', e: '🍰', kcal: 360, p: 6, c: 55, g: 13, porcao: ['1 fatia', 60] },
  { id: 'brigadeiro', nome: 'Brigadeiro', e: '🍬', kcal: 400, p: 4, c: 60, g: 15, porcao: ['1 unidade', 20] },
  { id: 'acucar', nome: 'Açúcar', e: '🧂', kcal: 387, p: 0, c: 99.5, g: 0, porcao: ['1 colher de chá', 5] },
  { id: 'mel', nome: 'Mel', e: '🍯', kcal: 309, p: 0, c: 84, g: 0, porcao: ['1 colher de sopa', 20] }
];

export const REFEICOES = [
  { id: 'cafe', nome: 'Café da manhã', e: '☀️' },
  { id: 'almoco', nome: 'Almoço', e: '🍽️' },
  { id: 'lanche', nome: 'Lanche', e: '🍎' },
  { id: 'jantar', nome: 'Jantar', e: '🌙' },
  { id: 'extra', nome: 'Beliscos / extras', e: '🍿' }
];

// Treinos modelo (cada um pode editar os seus)
export const TREINOS_MODELO = [
  {
    nome: 'Treino A — Pernas e glúteos', e: '🦵',
    exercicios: [
      { nome: 'Agachamento livre', series: 4, reps: '12', carga: '' },
      { nome: 'Leg press', series: 3, reps: '12', carga: '' },
      { nome: 'Cadeira extensora', series: 3, reps: '15', carga: '' },
      { nome: 'Mesa flexora', series: 3, reps: '12', carga: '' },
      { nome: 'Elevação pélvica', series: 3, reps: '15', carga: '' },
      { nome: 'Panturrilha em pé', series: 4, reps: '20', carga: '' }
    ]
  },
  {
    nome: 'Treino B — Superiores', e: '💪',
    exercicios: [
      { nome: 'Supino reto', series: 4, reps: '10', carga: '' },
      { nome: 'Puxada frontal', series: 4, reps: '12', carga: '' },
      { nome: 'Remada baixa', series: 3, reps: '12', carga: '' },
      { nome: 'Desenvolvimento com halteres', series: 3, reps: '12', carga: '' },
      { nome: 'Rosca direta', series: 3, reps: '12', carga: '' },
      { nome: 'Tríceps na polia', series: 3, reps: '12', carga: '' }
    ]
  },
  {
    nome: 'Treino C — Corpo todo + abdômen', e: '🔥',
    exercicios: [
      { nome: 'Polichinelo', series: 3, reps: '40s', carga: '' },
      { nome: 'Agachamento com salto', series: 3, reps: '12', carga: '' },
      { nome: 'Flexão de braço', series: 3, reps: '10', carga: '' },
      { nome: 'Afundo alternado', series: 3, reps: '12', carga: '' },
      { nome: 'Prancha', series: 3, reps: '40s', carga: '' },
      { nome: 'Abdominal bicicleta', series: 3, reps: '20', carga: '' }
    ]
  },
  {
    nome: 'Treino em casa (sem equipamento)', e: '🏠',
    exercicios: [
      { nome: 'Agachamento', series: 4, reps: '15', carga: '' },
      { nome: 'Flexão (joelho no chão se precisar)', series: 3, reps: '10', carga: '' },
      { nome: 'Ponte de glúteo', series: 3, reps: '15', carga: '' },
      { nome: 'Mountain climber', series: 3, reps: '30s', carga: '' },
      { nome: 'Prancha lateral', series: 2, reps: '30s cada lado', carga: '' },
      { nome: 'Burpee', series: 3, reps: '8', carga: '' }
    ]
  }
];

// MET aproximado de cada atividade (gasto ≈ MET × peso (kg) × horas)
export const ATIVIDADES = [
  { id: 'musculacao', nome: 'Musculação', e: '🏋️', met: 5 },
  { id: 'caminhada', nome: 'Caminhada', e: '🚶', met: 3.8 },
  { id: 'corrida', nome: 'Corrida', e: '🏃', met: 8.5 },
  { id: 'bike', nome: 'Bicicleta', e: '🚴', met: 7 },
  { id: 'hiit', nome: 'HIIT / funcional', e: '⚡', met: 8 },
  { id: 'danca', nome: 'Dança', e: '💃', met: 5.5 },
  { id: 'natacao', nome: 'Natação', e: '🏊', met: 7 },
  { id: 'futebol', nome: 'Futebol', e: '⚽', met: 7 },
  { id: 'alongamento', nome: 'Alongamento / yoga', e: '🧘', met: 2.5 }
];

export const RECEITAS_INICIAIS = [
  {
    titulo: 'Panqueca de banana e aveia', e: '🥞', kcal: 260, tempo: '10 min',
    ingredientes: '1 banana madura\n1 ovo\n2 colheres de sopa de aveia\nCanela a gosto',
    preparo: 'Amasse a banana, misture o ovo e a aveia. Doure em frigideira antiaderente dos dois lados. Finalize com canela.'
  },
  {
    titulo: 'Frango desfiado com legumes', e: '🍗', kcal: 320, tempo: '30 min',
    ingredientes: '300 g de peito de frango cozido e desfiado\n1 cenoura ralada\n1 abobrinha em cubos\n1 tomate\nAlho, cebola e cheiro-verde',
    preparo: 'Refogue alho e cebola com um fio de azeite, junte os legumes e o tomate, depois o frango. Tempere e finalize com cheiro-verde. Rende 3 porções.'
  },
  {
    titulo: 'Omelete de forno colorido', e: '🍳', kcal: 220, tempo: '25 min',
    ingredientes: '4 ovos\n1/2 pimentão picado\n1 tomate picado\nEspinafre\n2 colheres de queijo minas',
    preparo: 'Bata os ovos, misture tudo, coloque em forma untada e asse a 200 °C por 20 minutos. Rende 2 porções.'
  },
  {
    titulo: 'Crepioca', e: '🫓', kcal: 190, tempo: '5 min',
    ingredientes: '1 ovo\n2 colheres de sopa de goma de tapioca\nRecheio: frango, queijo branco ou peito de peru',
    preparo: 'Misture o ovo com a goma, despeje na frigideira quente, vire e recheie.'
  },
  {
    titulo: 'Salada de pote', e: '🥗', kcal: 350, tempo: '15 min',
    ingredientes: 'Fundo: molho (limão + azeite + mostarda)\nGrão-de-bico ou frango\nCenoura, tomate, pepino\nFolhas por cima',
    preparo: 'Monte em camadas no pote, com o molho embaixo e as folhas por último. Na hora de comer, é só virar no prato.'
  },
  {
    titulo: 'Mousse de iogurte com morango', e: '🍓', kcal: 150, tempo: '10 min + geladeira',
    ingredientes: '1 pote de iogurte grego zero\n1 xícara de morangos\n1 colher de chá de mel\n1 folha de gelatina incolor (opcional)',
    preparo: 'Bata tudo no liquidificador, leve à geladeira por 2 horas.'
  }
];

export const DESAFIOS_MODELO = [
  { titulo: '7 dias sem refrigerante', e: '🥤', dias: 7 },
  { titulo: '10 mil passos por dia', e: '👟', dias: 7 },
  { titulo: 'Bater a meta de água', e: '💧', dias: 7 },
  { titulo: '3 treinos na semana', e: '🏋️', dias: 7 },
  { titulo: '14 dias sem doce', e: '🍫', dias: 14 },
  { titulo: 'Dormir antes das 23h', e: '😴', dias: 7 },
  { titulo: 'Salada no almoço todo dia', e: '🥗', dias: 10 },
  { titulo: '21 dias sem fritura', e: '🍟', dias: 21 }
];

export const RECOMPENSAS_MODELO = [
  { kg: 3, titulo: 'Cinema com pipoca 🎬' },
  { kg: 5, titulo: 'Jantar especial a dois 🍷' },
  { kg: 10, titulo: 'Roupa nova para cada um 👕👗' },
  { kg: 15, titulo: 'Passeio de fim de semana 🏖️' },
  { kg: 20, titulo: 'Viagem dos sonhos ✈️' }
];

export const TOCA_AQUI = [
  'Arrasou no treino hoje! 💪',
  'Tô orgulhoso(a) de você! 🥹',
  'Bora beber água! 💧',
  'Juntos até a meta! 💚🧡',
  'Você é minha inspiração ✨',
  'Não desiste, falta pouco! 🔥'
];

export const HUMORES = ['😣', '😕', '😐', '🙂', '😄'];
