export function formatarHoras(valor: unknown) {
  const numero = Number(valor ?? 0);
  return `${Number.isFinite(numero) ? numero.toFixed(2) : '0.00'}h`;
}
