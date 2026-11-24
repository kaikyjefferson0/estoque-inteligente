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
export function hojeIso(agora = new Date()): string {
  return DIA_ISO.format(agora)
}

const PARTES_DO_DIA = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
  timeZone: FUSO,
})
const MES_CURTO = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: FUSO })

export interface PartesDoDia {
  dia: string
  mes: string
  mesCurto: string
  ano: string
  diaDaSemana: string
}

/** Partes do dia em Brasília, para a folha da marca e do login: dia "10", mês "novembro",
 *  mês curto "nov", ano "2026" e dia da semana "terça-feira". */
export function partesDoDia(agora = new Date()): PartesDoDia {
  const partes = Object.fromEntries(PARTES_DO_DIA.formatToParts(agora).map((p) => [p.type, p.value]))
  return {
    dia: partes.day,
    mes: partes.month,
    mesCurto: MES_CURTO.format(agora).replace('.', ''),
    ano: partes.year,
    diaDaSemana: partes.weekday,
  }
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

const DIA_E_MES = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: FUSO })
const DIA_DA_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: FUSO })

/** Dia em Brasília para o subtítulo das páginas: "Quarta, 11 de novembro" (sem o "-feira"). */
export function formatarDiaDaSemana(data: Date): string {
  const semana = DIA_DA_SEMANA.format(data).replace('-feira', '')
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${DIA_E_MES.format(data)}`
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

const RELATIVO = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const MS_MINUTO = 60_000
const MS_HORA = 3_600_000

/** Tempo desde `iso`: "há 5 minutos", "há 3 horas", "ontem", "há 12 dias". */
export function formatarTempoDecorrido(iso: string, agora = Date.now()): string {
  const passado = Math.max(agora - Date.parse(iso), 0)
  if (passado < MS_MINUTO) return 'agora há pouco'
  if (passado < MS_HORA) return RELATIVO.format(-Math.floor(passado / MS_MINUTO), 'minute')
  if (passado < MS_DIA) return RELATIVO.format(-Math.floor(passado / MS_HORA), 'hour')
  return RELATIVO.format(-Math.floor(passado / MS_DIA), 'day')
}

/** Grupos do código de barras como vêm impressos sob as barras: EAN-13 em 1-6-6, EAN-8 em 4-4 e
 *  UPC-A em 1-5-5-1. Outro tamanho fica num grupo só. Os grupos vão em elementos separados e o
 *  espaço entre eles é do CSS, então a cópia sai só com os dígitos. */
export function agruparCodigoDeBarras(codigo: string): string[] {
  const tamanhos: Record<number, number[]> = { 13: [1, 6, 6], 8: [4, 4], 12: [1, 5, 5, 1] }
  const grupos = /^\d+$/.test(codigo) ? tamanhos[codigo.length] : undefined
  if (!grupos) return [codigo]
  let inicio = 0
  return grupos.map((tamanho) => {
    const grupo = codigo.slice(inicio, inicio + tamanho)
    inicio += tamanho
    return grupo
  })
}

/** RN-04: o código de barras não tem espaço em branco. Tira todos, em qualquer posição: espaço,
 *  tabulação, quebra de linha (a cópia de um código pode trazer uma) e espaço inseparável:
 *  "3037\r\n3543" -> "30373543". O backend faz o mesmo; aqui é para a busca, o link de cadastro e a
 *  mensagem mostrarem o código como ele é salvo. */
export function normalizarCodigoDeBarras(valor: string): string {
  return valor.replace(/\s/g, '')
}

/** Junta o número à palavra seguinte com espaço inseparável ("800 g", "12 rolos", "5 L"):
 *  o nome quebra entre palavras, mas nunca entre a quantidade e a unidade. */
export function semQuebraNaUnidade(texto: string): string {
  return texto.replace(/(\d)[ \t]+(?=[\p{L}\d])/gu, '$1 ')
}

// ---------- Preço (RN-60) ----------
// A API recebe e devolve o preço como texto com ponto e 2 casas ("79.90"). Aqui ele também fica em
// texto, de ponta a ponta: nada de parseFloat nem Number, que trocariam 0,10 + 0,20 por 0,30000000000000004.

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
// Limite da coluna NUMERIC(10,2): 8 dígitos antes da vírgula
const MAX_DIGITOS_INTEIROS = 8
// Milhar não começa com zero: "0.001" é 3 casas, não mil
const MILHARES = /^[1-9]\d{0,2}(?:\.\d{3})+$/
const COM_VIRGULA = /^(\d+|[1-9]\d{0,2}(?:\.\d{3})+)?,(\d*)$/
const COM_PONTO = /^(\d*)(?:\.(\d*))?$/

export type PrecoLido = { ok: true; valor: string | null } | { ok: false; erro: string }

/** Parte inteira (sem os pontos de milhar) e centavos; null se não for um número. */
function separarCentavos(texto: string): [string, string] | null {
  // Com vírgula: ela separa os centavos, e os pontos antes dela são de milhar ("1.234,56")
  const virgula = COM_VIRGULA.exec(texto)
  if (virgula) return virgula[1] || virgula[2] ? [(virgula[1] ?? '').replaceAll('.', ''), virgula[2]] : null
  // Sem vírgula, um ponto só separa os centavos ("12.5")
  const ponto = COM_PONTO.exec(texto)
  if (ponto && (ponto[1] || ponto[2])) return [ponto[1], ponto[2] ?? '']
  return null
}

/** O que a pessoa digitou no campo Preço -> o texto que vai para a API.
 *  "12,50" -> "12.50", "1.234,56" -> "1234.56", "12.5" -> "12.50", "R$ 7" -> "7.00", vazio -> null. */
export function lerPreco(texto: string): PrecoLido {
  const limpo = texto.replace(/\s/g, '').replace(/^R\$/i, '')
  if (!limpo) return { ok: true, valor: null }
  if (/^[-−]/.test(limpo)) return { ok: false, erro: 'O preço não pode ser negativo. Use 0 ou mais, ou deixe vazio.' }
  // Sem vírgula, "12.345" tanto pode ser doze mil (pt-BR) quanto 12 e uns centavos (estilo americano):
  // adivinhar gravaria um valor mil vezes maior ou menor, então a pessoa escolhe
  if (MILHARES.test(limpo))
    return { ok: false, erro: 'Ficou ambíguo. Use vírgula nos centavos (12,34) ou escreva sem ponto (12345).' }

  const partes = separarCentavos(limpo)
  if (!partes) return { ok: false, erro: 'Use só números, com vírgula nos centavos. Exemplo: 12,50.' }
  const [digitos, centavos] = partes
  if (centavos.length > 2) return { ok: false, erro: 'Use no máximo 2 casas depois da vírgula. Exemplo: 12,50.' }
  const inteiro = digitos.replace(/^0+/, '') || '0'
  if (inteiro.length > MAX_DIGITOS_INTEIROS) return { ok: false, erro: 'Use um preço de até R$ 99.999.999,99.' }
  return { ok: true, valor: `${inteiro}.${centavos.padEnd(2, '0')}` }
}

/** Preço da API -> texto para editar no campo, como na lista: "1234.50" -> "1.234,50"; sem preço,
 *  vazio. Com a vírgula, os pontos de milhar não são ambíguos e o lerPreco devolve o mesmo valor. */
export function precoParaCampo(preco: string | null): string {
  if (preco === null) return ''
  const [inteiro, centavos] = preco.split('.')
  return `${inteiro.replace(/\B(?=(\d{3})+$)/g, '.')},${centavos}`
}

/** Preço da API em reais: "1234.50" -> "R$ 1.234,50" (com espaço inseparável); sem preço, "Sem preço",
 *  como o "Sem fornecedor". O Intl formata o texto como decimal exato, sem converter para float. */
export function formatarPreco(preco: string | null): string {
  return preco === null ? 'Sem preço' : MOEDA.format(preco as Intl.StringNumericLiteral)
}
