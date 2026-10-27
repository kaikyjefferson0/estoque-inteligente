const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const HORA = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' })
const NUMERO = new Intl.NumberFormat('pt-BR')

/** "2027-03-12" -> "12/03/2027", sem passar por fuso horário. */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarDataHora(iso: string): string {
  return DATA_HORA.format(new Date(iso))
}

export function formatarHora(data: Date): string {
  return HORA.format(data)
}

export function formatarNumero(valor: number): string {
  return NUMERO.format(valor)
}

/** Quantidade com sinal: "+40", "−12" (sinal de menos tipográfico). */
export function formatarComSinal(valor: number): string {
  if (valor > 0) return `+${NUMERO.format(valor)}`
  if (valor < 0) return `−${NUMERO.format(Math.abs(valor))}`
  return '0'
}

export function plural(valor: number, singular: string, varios: string): string {
  return valor === 1 ? singular : varios
}
