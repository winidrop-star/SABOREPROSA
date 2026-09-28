// Lembretes e notificações.
//
// O que funciona nesta versão (sem servidor):
//  - Com o app aberto ou em segundo plano recente, os lembretes disparam no
//    horário configurado.
//  - No Android (app instalado pelo Chrome), a mensagem da manhã também é
//    registrada como "sincronização periódica", que o sistema roda cerca de
//    uma vez por dia mesmo com o app fechado (o Chrome decide o horário exato).
// Para lembretes pontuais com o app fechado — inclusive no iPhone — é preciso
// o envio pelo servidor (Web Push via Supabase), que é o próximo passo.
import { S, mudarQuieto, eu, dia, metas, hoje } from './store.js';

export const suportado = () => 'Notification' in window && 'serviceWorker' in navigator;
export const permissao = () => (suportado() ? Notification.permission : 'unsupported');

export async function pedirPermissao() {
  if (!suportado()) return 'unsupported';
  const r = await Notification.requestPermission();
  if (r === 'granted') registrarSyncPeriodico();
  return r;
}

export async function notificar(titulo, corpo, tag) {
  if (permissao() !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  reg.showNotification(titulo, {
    body: corpo, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    vibrate: [80, 40, 80], data: { url: './' }
  });
}

async function registrarSyncPeriodico() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return;
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (st.state !== 'granted') return;
    await reg.periodicSync.register('ww-manha', { minInterval: 12 * 60 * 60 * 1000 });
  } catch (e) { /* navegador sem suporte */ }
}

const minutos = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function jaDisparou(chave) {
  return !!S().config.disparados[chave];
}
function marcar(chave) {
  mudarQuieto((s) => {
    s.config.disparados[chave] = true;
    // guarda só as chaves de hoje
    for (const k of Object.keys(s.config.disparados)) if (!k.startsWith(hoje())) delete s.config.disparados[k];
  });
}

function verificar() {
  if (permissao() !== 'granted' || !Object.keys(S().usuarios).length) return;
  const L = S().config.lembretes;
  const agora = new Date();
  const min = agora.getHours() * 60 + agora.getMinutes();
  const d = hoje();
  const u = eu();
  const tentar = (chave, alvo, titulo, corpo) => {
    const k = `${d}:${chave}`;
    // dispara se já passou do horário, com tolerância de 45 min
    if (min >= alvo && min - alvo <= 45 && !jaDisparou(k)) {
      marcar(k);
      notificar(titulo, corpo, chave);
    }
  };

  if (L.manha.on) {
    const m = window.WW_MENSAGENS.mensagemDoDia();
    tentar('manha', minutos(L.manha.hora), '🌅 Bom dia! Palavra do dia', `"${m.versiculo}" — ${m.referencia}\n✨ ${m.motivacao}`);
  }
  if (L.agua.on) {
    const de = minutos(L.agua.de);
    const ate = minutos(L.agua.ate);
    for (let t = de; t <= ate; t += Number(L.agua.cada) || 120) {
      const bebido = dia(u.id).agua * metas(u.id).copo;
      if (bebido < metas(u.id).agua) tentar(`agua${t}`, t, '💧 Hora de beber água!', `${u.nome}, você está em ${bebido} de ${metas(u.id).agua} ml hoje.`);
    }
  }
  if (L.refeicoes.on) {
    const refs = [['cafe', 'café da manhã'], ['almoco', 'almoço'], ['lanche', 'lanche'], ['jantar', 'jantar']];
    L.refeicoes.horas.forEach((h, i) => {
      const [id, nome] = refs[i] || [];
      const vazia = !(dia(u.id).refeicoes?.[id]?.length);
      if (id && vazia) tentar(`ref${i}`, minutos(h) + 30, '🍽️ Já registrou a refeição?', `Anote o ${nome} no W+W Fit 📒`);
    });
  }
  if (L.treino.on) {
    const treinou = S().sessoes.some((x) => x.user === u.id && x.data === d);
    if (!treinou) tentar('treino', minutos(L.treino.hora), '🏋️ Hora do treino!', 'Bora mexer o corpo hoje? Um treino curto já vale! 💪');
  }
  if (L.pesagem.on && agora.getDay() === Number(L.pesagem.dia)) {
    tentar('pesagem', minutos(L.pesagem.hora), '⚖️ Dia de pesagem!', 'Em jejum, depois do banheiro. Registre no app 📈');
  }
}

export function iniciarLembretes() {
  verificar();
  setInterval(verificar, 30 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) verificar(); });
  if (permissao() === 'granted') registrarSyncPeriodico();
}
