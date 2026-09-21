export function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

export function fmtHora(ts) {
  const d = new Date(ts);
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

export function fmtBRL(n) {
  return 'R$ ' + (n || 0).toFixed(2).replace('.', ',');
}

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function inPeriodo(ts, periodo) {
  const now = Date.now();
  if (periodo === 'hoje') return ts >= startOfDay(now);
  if (periodo === '7dias') return ts >= now - 7 * 24 * 60 * 60 * 1000;
  if (periodo === '30dias') return ts >= now - 30 * 24 * 60 * 60 * 1000;
  return true;
}
