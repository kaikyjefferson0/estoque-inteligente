export const MAX_INTEIRO = 2_147_483_647 // limite da coluna INTEGER do banco
const INTEIRO = /^\d+$/

/** RN-07: quantidade de entrada e saída, inteira e maior que zero. */
export function validarQuantidade(valor: string): string | undefined {
  const q = valor.trim()
  if (!q) return 'Informe a quantidade, maior que zero.'
  if (!INTEIRO.test(q) || Number(q) === 0) return 'Use um número inteiro maior que zero.'
  if (Number(q) > MAX_INTEIRO) return 'Use um número menor.'
}

/** RN-35: saldo contado no ajuste, inteiro e nunca negativo. */
export function validarSaldoContado(valor: string): string | undefined {
  const q = valor.trim()
  if (!q) return 'Informe quantas unidades você contou. Use 0 se o lote acabou.'
  if (!INTEIRO.test(q)) return 'Use um número inteiro, 0 ou maior.'
  if (Number(q) > MAX_INTEIRO) return 'Use um número menor.'
}
