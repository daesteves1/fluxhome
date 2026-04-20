/**
 * Credit calculation utilities.
 * Reference rate used for indicative monthly payment is 4 % p.a.
 */
const REFERENCE_RATE = 4; // % per annum

/** Returns LTV as a percentage (0-100+). Returns 0 when inputs are invalid. */
export function calcLTV(montante: number, valorImovel: number): number {
  if (!montante || !valorImovel) return 0;
  return (montante / valorImovel) * 100;
}

/**
 * Returns indicative monthly payment using standard annuity formula.
 * M = P * r / (1 − (1+r)^−n)
 */
export function calcMensalidade(
  montante: number,
  prazoMeses: number,
  taxaAnual = REFERENCE_RATE,
): number {
  if (!montante || !prazoMeses) return 0;
  const r = taxaAnual / 100 / 12;
  if (r === 0) return montante / prazoMeses;
  return (montante * r) / (1 - Math.pow(1 + r, -prazoMeses));
}
