let audioCtx = null;
export let audioUnlocked = false;

export function unlockAudio() {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
  try {
    if (window.speechSynthesis && !audioUnlocked) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  } catch (e) {}
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } catch (e) {}
  audioUnlocked = true;
}

function falar(texto) {
  try {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(texto);
    utter.lang = 'pt-BR';
    window.speechSynthesis.speak(utter);
  } catch (e) {}
}

function notificarDesktop(titulo, corpo) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, { body: corpo });
    }
  } catch (e) {}
}

function beep(freq, startAt, durationSec) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.35, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startAt);
  osc.stop(startAt + durationSec + 0.02);
}

export function playReadyChime(nomeCliente) {
  try {
    unlockAudio();
    if (audioCtx) {
      const now = audioCtx.currentTime;
      beep(784, now, 0.18);
      beep(1047, now + 0.2, 0.28);
    }
  } catch (e) {}
  const nome = (nomeCliente || '').trim();
  falar(nome ? 'A marmita de ' + nome + ' está pronta!' : 'A marmita está pronta!');
  notificarDesktop(
    'Pedido pronto!',
    nome ? 'A marmita de ' + nome + ' está pronta pra entrega ou retirada.' : 'A marmita está pronta pra entrega ou retirada.'
  );
}

export function playNovoPedidoAlerta() {
  try {
    unlockAudio();
    if (audioCtx) {
      const now = audioCtx.currentTime;
      beep(660, now, 0.15);
      beep(880, now + 0.18, 0.22);
    }
  } catch (e) {}
  falar('Tem marmita, confirme para iniciar o preparo.');
  notificarDesktop('Novo pedido!', 'Chegou um pedido de marmita pra cozinha.');
}
