import { IconBarcode, IconSearch } from '@tabler/icons-react'
import type { FormEvent, ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { formatarNumero } from '../utils/formato'
import { AnuncioDeErros } from './AnuncioDeErros'
import { Botao } from './Botao'
import { Campo } from './Campo'
import type { Leitura, ProdutoLido } from './useLeituraDeCodigo'

const MAX_CODIGO = 50

/** Campo de código com Enter para buscar; funciona com leitor USB, que digita e aperta Enter. */
export function LeituraDeCodigo({ leitura, campoRef }: { leitura: Leitura; campoRef: Ref<HTMLInputElement> }) {
  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    void leitura.buscar(leitura.codigo)
  }

  return (
    <form className="leitura" onSubmit={aoEnviar} noValidate role="search" aria-label="Produto">
      <AnuncioDeErros mensagem={leitura.erro ?? ''} />
      <Campo
        ref={campoRef}
        rotulo="Código de barras"
        name="codigo"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={MAX_CODIGO}
        className="leitura__campo"
        value={leitura.codigo}
        onChange={(e) => leitura.mudarCodigo(e.target.value)}
        acessorio={
          <>
            <IconBarcode className="leitura__icone" aria-hidden />
            <Botao type="submit" variante="fantasma" icone={IconSearch} carregando={leitura.buscando} textoCarregando="Buscando…" className="leitura__botao">
              Buscar
            </Botao>
          </>
        }
        dica={leitura.erro ? undefined : 'Leia com o leitor ou digite e aperte Enter.'}
        erro={leitura.erro ?? undefined}
      />
      {leitura.naoEncontrado && (
        <Link to={`/produtos/novo?codigo=${encodeURIComponent(leitura.naoEncontrado)}`} className="link-acao leitura__cadastrar">
          Cadastrar produto com este código
        </Link>
      )}
    </form>
  )
}

/** Produto encontrado: nome, saldo e se controla validade, antes de confirmar. */
export function ResumoDoProduto({ lido, children }: { lido: ProdutoLido; children?: ReactNode }) {
  const { produto, saldo } = lido
  // RN-36: o que está em lotes vencidos não sai
  const vencidos = saldo.saldo_fisico - saldo.saldo_disponivel
  return (
    <div className="resumo">
      <div className="resumo__identificacao">
        <h2 id="titulo-produto-lido" className="resumo__nome">
          {produto.nome}
        </h2>
        <p className="resumo__meta">
          <span className="numero">{produto.codigo_barras}</span>
          <span>{produto.controla_validade ? 'Controla validade' : 'Não controla validade'}</span>
          <Link to={`/produtos/${produto.id}`} className="link-acao">
            Ver produto
          </Link>
        </p>
      </div>
      <dl className="resumo__saldos">
        <div className="resumo__saldo">
          <dt>Disponível</dt>
          <dd className="numero">{formatarNumero(saldo.saldo_disponivel)}</dd>
        </div>
        {vencidos > 0 && (
          <div className="resumo__saldo resumo__saldo--fisico">
            <dt>Físico</dt>
            <dd className="numero">{formatarNumero(saldo.saldo_fisico)}</dd>
          </div>
        )}
      </dl>
      {vencidos > 0 && (
        <p className="resumo__nota">
          {formatarNumero(vencidos)} em lotes vencidos, que não saem até serem ajustados.
        </p>
      )}
      {children}
    </div>
  )
}
