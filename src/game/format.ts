const SUFFIXES = [
  '', 'B', 'M', 'Mr', 'T', 'Kt', 'Kn', 'Sk', 'Sp', 'Ok', 'Nn', 'Dk',
];

/** Para ve buyuk sayilar icin kisa gosterim. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    if (n < 10 && n % 1 !== 0) return n.toFixed(1);
    return Math.floor(n).toString();
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier >= SUFFIXES.length) return n.toExponential(2);
  const scaled = n / Math.pow(1000, tier);
  return `${scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
}

/** Agirlik gosterimi; gramin altina inmez. */
export function fmtKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  if (kg >= 1) return `${kg.toFixed(2)} kg`;
  return `${Math.max(1, Math.round(kg * 1000))} g`;
}

export function fmtDepth(m: number): string {
  return `${Math.round(m)} m`;
}
