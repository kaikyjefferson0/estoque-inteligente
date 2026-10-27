import { IconBarcode, IconPackageImport } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { Campo } from '../components/Campo'
import { Vazio } from '../components/Estados'
import { LeituraDeCodigo, ResumoDoProduto } from '../components/LeituraDeCodigo'
import { useLeituraDeCodigo, type ProdutoLido } from '../components/useLeituraDeCodigo'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import type { EntradaRegistrada } from '../types/estoque'
import { formatarNumero, hojeIso, lerData, mascararData } from '../utils/formato'
import { descreverLote } from '../utils/situacao'
import { validarQuantidade } from '../utils/validacao'
import './MovimentoPage.css'

const CAMPOS = ['quantidade', 'validade'] as const
type CampoEntrada = (typeof CAMPOS)[number]

function validar(quantidade: string, validade: string, controlaValidade: boolean): ErrosDeCampo<CampoEntrada> {
  const erros: ErrosDeCampo<CampoEntrada> = {}
  const erroQuantidade = validarQuantidade(quantidade)
  if (erroQuantidade) erros.quantidade = erroQuantidade
  // RN-08 e RN-31: com controle de validade, a data é obrigatória e não pode estar vencida
  if (controlaValidade) {
    const iso = lerData(validade)
    if (!validade.trim()) erros.validade = 'Informe a validade, no formato dd/mm/aaaa.'
    else if (!iso) erros.validade = 'Data inválida. Use dd/mm/aaaa, por exemplo 31/12/2027.'
    else if (iso < hojeIso()) erros.validade = 'Esta validade já passou. Produto vencido não entra no estoque.'
  }
  return erros
}

interface FormularioProps {
  lido: ProdutoLido
  aoRegistrar: (resultado: EntradaRegistrada) => void
  // 404 e erros do código voltam para o campo de código
  aoErroNoCodigo: (mensagem: string) => void
  aoCancelar: () => void
}

function FormularioEntrada({ lido, aoRegistrar, aoErroNoCodigo, aoCancelar }: FormularioProps) {
  const { produto } = lido
  const [quantidade, setQuantidade] = useState('')
  const [validade, setValidade] = useState('')
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, validar(quantidade, validade, produto.controla_validade))) return
    setEnviando(true)
    try {
      const resultado = await api<EntradaRegistrada>('/stock/entries', {
        body: {
          codigo_barras: produto.codigo_barras,
          quantidade: Number(quantidade.trim()),
          // RN-31: sem controle de validade, a entrada não informa validade
          validade: produto.controla_validade ? lerData(validade) : null,
        },
      })
      aoRegistrar(resultado)
    } catch (erro) {
      setEnviando(false)
      if (!(erro instanceof ApiError)) return setErroGeral(mensagemDeErro(erro))
      if (erro.status === 404) return aoErroNoCodigo('Produto não encontrado. Confira o código e leia de novo.')
      if (erro.campos.codigo_barras) return aoErroNoCodigo(erro.campos.codigo_barras)
      // Regra recusada (422 com texto): a mensagem diz se é da validade ou da quantidade
      if (erro.status === 422 && Object.keys(erro.campos).length === 0) {
        const campo: CampoEntrada = /validade/i.test(erro.message) && produto.controla_validade ? 'validade' : 'quantidade'
        return void mostrar(form, { [campo]: erro.message })
      }
      if (!mostrar(form, { quantidade: erro.campos.quantidade, validade: erro.campos.validade })) return
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
          onChange={(e) => {
            setQuantidade(e.target.value)
            limpar('quantidade')
          }}
        />
        {/* RN-08: só produto que controla validade informa a data */}
        {produto.controla_validade && (
          <Campo
            rotulo="Validade"
            name="validade"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            className="registro__validade"
            value={validade}
            erro={erros.validade}
            dica={erros.validade ? undefined : 'Cada validade forma um lote.'}
            onChange={(e) => {
              setValidade(mascararData(e.target.value))
              limpar('validade')
            }}
          />
        )}
      </div>
      <div className="formulario__acoes">
        <Botao type="submit" variante="primaria" icone={IconPackageImport} carregando={enviando} textoCarregando="Registrando…">
          Registrar entrada
        </Botao>
        <Botao variante="fantasma" onClick={aoCancelar} disabled={enviando}>
          Ler outro código
        </Botao>
      </div>
    </form>
  )
}

interface Ultima {
  nome: string
  resultado: EntradaRegistrada
}

// RN-32: admin e operador registram entradas
export function EntradaPage() {
  const [leitura, campoCodigo] = useLeituraDeCodigo()
  const { lido } = leitura
  const [ultima, setUltima] = useState<Ultima | null>(null)

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Entrada</h1>
          <p className="pagina__apoio">Leia o código, confira o produto e informe a quantidade recebida</p>
        </div>
      </header>

      {ultima && (
        <Aviso situacao="ok">
          <p>
            <strong>Entrada registrada.</strong> {formatarNumero(ultima.resultado.quantidade)} de {ultima.nome}
            {ultima.resultado.validade &&
              `, ${descreverLote(ultima.resultado.validade).toLowerCase()} (lote agora com ${formatarNumero(ultima.resultado.quantidade_lote)})`}
            . Saldo total: <span className="numero">{formatarNumero(ultima.resultado.saldo_total)}</span>.
          </p>
        </Aviso>
      )}

      <div className="painel registro__painel">
        <LeituraDeCodigo leitura={leitura} campoRef={campoCodigo} />

        {!lido && !leitura.buscando && (
          <Vazio icone={IconBarcode} titulo="Nenhum produto lido">
            O produto aparece aqui para você conferir antes de registrar.
          </Vazio>
        )}

        {lido && (
          <section className="registro__produto" aria-labelledby="titulo-produto-lido">
            <ResumoDoProduto lido={lido} />
            <FormularioEntrada
              key={lido.vez}
              lido={lido}
              aoRegistrar={(resultado) => {
                setUltima({ nome: lido.produto.nome, resultado })
                // Pronta para o próximo item
                leitura.recomecar()
              }}
              aoErroNoCodigo={leitura.mostrarErro}
              aoCancelar={leitura.recomecar}
            />
          </section>
        )}
      </div>
    </div>
  )
}
