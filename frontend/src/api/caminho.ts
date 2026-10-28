type Valor = string | number | boolean | null | undefined

/** "/products" + { busca: "arroz", deslocamento: 0 } -> "/products?busca=arroz&deslocamento=0".
 *  Valores vazios (null, undefined, "" ou false) ficam de fora. */
export function montarCaminho(base: string, parametros: Record<string, Valor>): string {
  const consulta = new URLSearchParams()
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor === null || valor === undefined || valor === '' || valor === false) continue
    consulta.set(chave, String(valor))
  }
  const texto = consulta.toString()
  return texto ? `${base}?${texto}` : base
}
