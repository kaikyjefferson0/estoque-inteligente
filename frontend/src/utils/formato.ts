// Datas e horas sempre no fuso da operação, em 24h, qualquer que seja o fuso do computador
export const FUSO = 'America/Sao_Paulo'
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23', timeZone: FUSO })
const HORA = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', hourCycle: 'h23', timeZone: FUSO })
// en-CA formata como AAAA-MM-DD
const DIA_ISO = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: FUSO })
const NUMERO = new Intl.NumberFormat('pt-BR')
const MS_DIA = 86_400_000

/** "2027-03-12" -> "12/03/2027", sem passar por fuso horário. */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

/** "Hoje" em Brasília, como AAAA-MM-DD (o mesmo "hoje" do backend, RN-36). */
export function hojeIso(): string {
  return DIA_ISO.format(new Date())
}

/** Dias de `de` até `ate` (datas AAAA-MM-DD); negativo se `ate` já passou. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / MS_DIA)
}

/** Máscara enquanto a pessoa digita: "12032027" -> "12/03/2027". */
export function mascararData(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8)
  let texto = d.slice(0, 2)
  if (d.length > 2) texto += `/${d.slice(2, 4)}`
  if (d.length > 4) texto += `/${d.slice(4, 8)}`
  return texto
}

/** "12/03/2027" -> "2027-03-12"; null se não for uma data de calendário válida. */
export function lerData(valor: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim())
  if (!partes) return null
  const [, dia, mes, ano] = partes
  const iso = `${ano}-${mes}-${dia}`
  const data = new Date(`${iso}T00:00:00Z`)
  // Recusa 31/02, 00/13 e afins: o Date "corrige" e a data deixa de bater
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) return null
  return iso
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

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/** Formata enquanto a pessoa digita: "12345678000195" -> "12.345.678/0001-95". */
export function formatarCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14)
  let texto = d.slice(0, 2)
  if (d.length > 2) texto += `.${d.slice(2, 5)}`
  if (d.length > 5) texto += `.${d.slice(5, 8)}`
  if (d.length > 8) texto += `/${d.slice(8, 12)}`
  if (d.length > 12) texto += `-${d.slice(12, 14)}`
  return texto
}
