import { useRecurso } from '../api/useRecurso'
import type { SaldoProduto } from '../types/produto'
import { formatarNumero } from '../utils/formato'

/**
 * Saldo do produto depois de uma entrada ou saída, com os mesmos termos das outras telas:
 * "Disponível" e, quando há lotes vencidos (RN-36), também "físico".
 * Se a consulta falhar, mostra o físico que veio na resposta do registro.
 */
export function SaldoAtualizado({ produtoId, saldoFisico }: { produtoId: number; saldoFisico: number }) {
  const { dados, erro } = useRecurso<SaldoProduto>(`/products/${produtoId}/stock`)
  if (erro) {
    return (
      <>
        Físico: <span className="numero">{formatarNumero(saldoFisico)}</span>.
      </>
    )
  }
  if (!dados) return null
  return (
    <>
      Disponível: <span className="numero">{formatarNumero(dados.saldo_disponivel)}</span>
      {dados.saldo_fisico !== dados.saldo_disponivel && (
        <>
          ; físico: <span className="numero">{formatarNumero(dados.saldo_fisico)}</span>
        </>
      )}
      .
    </>
  )
}
