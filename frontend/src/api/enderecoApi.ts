/** Endereço da API (VITE_API_URL) sem barra no final. Sem http:// nem https://
 *  (ex.: estoque-api.onrender.com), ganha https://, o único que o Render serve. */
export function normalizarEnderecoApi(valor: string | undefined): string {
  const endereco = (valor ?? '').trim().replace(/\/+$/, '')
  if (!endereco) return ''
  return /^https?:\/\//i.test(endereco) ? endereco : `https://${endereco}`
}
