import { IconBarcode, IconPackageExport } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { Campo } from '../components/Campo'
import { Vazio } from '../components/Estados'
import { LeituraDeCodigo, ResumoDoProduto } from '../components/LeituraDeCodigo'
import { useLeituraDeCodigo, type ProdutoLido } from '../components/useLeituraDeCodigo'
import { useErrosDoFormulario } from '../components/useErrosDoFormulario'
import type { SaidaRegistrada } from '../types/estoque'
import type { SaldoProduto } from '../types/produto'
import { formatarComSinal, formatarNumero, plural } from '../utils/formato'
import { descreverLote } from '../utils/situacao'
import { validarQuantidade } from '../utils/validacao'
import './MovimentoPage.css'

const CAMPOS = ['quantidade'] as const

interface FormularioProps {
  lido: ProdutoLido
  aoRegistrar: (resultado: SaidaRegistrada) => void
  aoErroNoCodigo: (mensagem: string) => void
  // 409: o saldo mudou ou não basta; atualiza o resumo com o saldo atual
  aoSaldoMudar: (saldo: SaldoProduto) => void
  aoCancelar: () => void
}

function FormularioSaida({ lido, aoRegistrar, aoErroNoCodigo, aoSaldoMudar, aoCancelar }: FormularioProps) {
  const { produto, saldo } = lido
  const [quantidade, setQuantidade] = useState('')
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const semSaldo = saldo.saldo_disponivel === 0

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, { quantidade: validarQuantidade(quantidade) })) return
    setEnviando(true)
    try {
      const resultado = await api<SaidaRegistrada>('/stock/exits', {
        body: { codigo_barras: produto.codigo_barras, quantidade: Number(quantidade.trim()) },
      })
      aoRegistrar(resultado)
    } catch (erro) {
      setEnviando(false)
      if (!(erro instanceof ApiError)) return setErroGeral(mensagemDeErro(erro))
      if (erro.status === 404) return aoErroNoCodigo('Produto não encontrado. Confira o código e leia de novo.')
      if (erro.campos.codigo_barras) return aoErroNoCodigo(erro.campos.codigo_barras)
      // RN-09 e RN-36: saldo insuficiente; a mensagem da API traz o disponível
      if (erro.status === 409) {
        mostrar(form, { quantidade: erro.message })
        api<SaldoProduto>(`/products/${produto.id}/stock`).then(aoSaldoMudar, () => {})
        return
      }
      if (erro.status === 422 && Object.keys(erro.campos).length === 0) return void mostrar(form, { quantidade: erro.message })
      if (!mostrar(form, { quantidade: erro.campos.quantidade })) return
      setErroGeral(erro.message)
    }
  }

  return (
    <form className="registro__formulario" onSubmit={aoEnviar} noValidate>
      <AnuncioDeErros mensagem={anuncio} />
      {erroGeral && (
        <Aviso situacao="critico">
          <p>{erroGeral}</p>
        </Aviso>
      )}
      {semSaldo && (
        <Aviso situacao="critico">
          <p>Este produto não tem saldo disponível para saída.</p>
        </Aviso>
      )}
      <div className="registro__campos">
        <Campo
          rotulo="Quantidade"
          name="quantidade"
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          className="registro__quantidade"
          value={quantidade}
          erro={erros.quantidade}
          dica={erros.quantidade ? undefined : `Até ${formatarNumero(saldo.saldo_disponivel)}. Sai primeiro do lote que vence antes.`}
          onChange={(e) => {
            setQuantidade(e.target.value)
            limpar('quantidade')
          }}
        />
      </div>
      <div className="formulario__acoes">
        <Botao type="submit" variante="primaria" icone={IconPackageExport} carregando={enviando} textoCarregando="Registrando…">
          Registrar saída
        </Botao>
        <Botao variante="fantasma" onClick={aoCancelar} disabled={enviando}>
          Ler outro código
        </Botao>
      </div>
    </form>
  )
}

function ConfirmacaoDaSaida({ nome, resultado }: { nome: string; resultado: SaidaRegistrada }) {
  const lotes = resultado.lotes.length
  return (
    <Aviso situacao="ok">
      <p>
        <strong>Saída registrada.</strong> {formatarNumero(resultado.quantidade)} de {nome}, de {formatarNumero(lotes)}{' '}
        {plural(lotes, 'lote', 'lotes')}. Saldo total: <span className="numero">{formatarNumero(resultado.saldo_total)}</span>.
      </p>
      {/* RN-10: uma linha por lote, na ordem FEFO em que saiu */}
      <ul className="saida__lotes">
        {resultado.lotes.map((l) => (
          <li key={l.movimentacao_id} className="saida__lote">
            <span>{descreverLote(l.validade)}</span>
            <span className="saida__lote-quantidade numero">{formatarComSinal(-l.quantidade)}</span>
            <span className="saida__lote-resto numero">
              {l.quantidade_lote === 0 ? 'lote zerado' : `ficaram ${formatarNumero(l.quantidade_lote)}`}
            </span>
          </li>
        ))}
      </ul>
    </Aviso>
  )
}

// RN-32: admin e operador registram saídas
export function SaidaPage() {
  const [leitura, campoCodigo] = useLeituraDeCodigo()
  const { lido, setLido } = leitura
  const [ultima, setUltima] = useState<{ nome: string; resultado: SaidaRegistrada } | null>(null)

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Saída</h1>
          <p className="pagina__apoio">Leia o código, confira o saldo disponível e informe a quantidade que sai</p>
        </div>
      </header>

      {ultima && <ConfirmacaoDaSaida nome={ultima.nome} resultado={ultima.resultado} />}

      <div className="painel registro__painel">
        <LeituraDeCodigo leitura={leitura} campoRef={campoCodigo} />

        {!lido && !leitura.buscando && (
          <Vazio icone={IconBarcode} titulo="Nenhum produto lido">
            O produto e o saldo disponível aparecem aqui para você conferir antes de registrar.
          </Vazio>
        )}

        {lido && (
          <section className="registro__produto" aria-labelledby="titulo-produto-lido">
            <ResumoDoProduto lido={lido} />
            <FormularioSaida
              key={lido.vez}
              lido={lido}
              aoRegistrar={(resultado) => {
                setUltima({ nome: lido.produto.nome, resultado })
                leitura.recomecar()
              }}
              aoErroNoCodigo={leitura.mostrarErro}
              aoSaldoMudar={(saldo) => setLido((atual) => (atual && atual.vez === lido.vez ? { ...atual, saldo } : atual))}
              aoCancelar={leitura.recomecar}
            />
          </section>
        )}
      </div>
    </div>
  )
}
