import { IconAdjustmentsHorizontal, IconBox, IconPackageImport } from '@tabler/icons-react'
import { useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { useAlertasAtivos } from '../alertas/useAlertasAtivos'
import { useRecurso } from '../api/useRecurso'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { Campo } from '../components/Campo'
import { CampoSelecao } from '../components/CampoSelecao'
import { ConfirmarDialogo } from '../components/ConfirmarDialogo'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { AjusteRegistrado, ItemEstoque } from '../types/estoque'
import type { Lote, SaldoProduto } from '../types/produto'
import { formatarComSinal, formatarNumero, hojeIso } from '../utils/formato'
import { descreverLote, situacaoDoLote } from '../utils/situacao'
import { validarSaldoContado } from '../utils/validacao'
import './AjustesPage.css'

// Ordem na tela: o foco vai para o primeiro inválido
const CAMPOS = ['lote', 'saldo_contado', 'motivo'] as const
type CampoAjuste = (typeof CAMPOS)[number]

const MAX_MOTIVO = 255 // tamanho da coluna

interface Pendente {
  lote: Lote
  contado: number
  motivo: string
}

function validar(lote: Lote | undefined, contado: string, motivo: string): ErrosDeCampo<CampoAjuste> {
  const erros: ErrosDeCampo<CampoAjuste> = {}
  if (!lote) erros.lote = 'Escolha o lote que você contou.'
  const erroContado = validarSaldoContado(contado)
  if (erroContado) erros.saldo_contado = erroContado
  // RN-11: ajuste exige motivo
  if (!motivo.trim()) erros.motivo = 'Informe o motivo do ajuste, por exemplo “contagem do inventário” ou “vencido”.'
  else if (motivo.trim().length > MAX_MOTIVO) erros.motivo = `Use até ${MAX_MOTIVO} caracteres no motivo.`
  return erros
}

// Erros de regra chegam como texto; o assunto da mensagem diz o campo
function campoDoErro(erro: ApiError): CampoAjuste {
  if (erro.status === 404) return 'lote'
  return /motivo/i.test(erro.message) ? 'motivo' : 'saldo_contado'
}

function FormularioAjuste({ produtoId, aoRegistrar }: { produtoId: number; aoRegistrar: (r: AjusteRegistrado) => void }) {
  const saldo = useRecurso<SaldoProduto>(`/products/${produtoId}/stock`)
  const [loteId, setLoteId] = useState<number | null>(null)
  const [contado, setContado] = useState('')
  const [motivo, setMotivo] = useState('')
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [pendente, setPendente] = useState<Pendente | null>(null)
  const [enviando, setEnviando] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  // Campo que recebe o foco quando a janela fecha por um erro da API
  const focarAoFechar = useRef<CampoAjuste | null>(null)

  const hoje = hojeIso()
  const lotes = saldo.dados?.lotes ?? []
  const lote = lotes.find((l) => l.id === loteId)

  async function registrar(dados: Pendente) {
    const form = formRef.current
    if (!form) return
    focarAoFechar.current = null
    setEnviando(true)
    setErroGeral(null)
    try {
      const resultado = await api<AjusteRegistrado>('/stock/adjustments', {
        body: { lote_id: dados.lote.id, saldo_contado: dados.contado, motivo: dados.motivo },
      })
      setPendente(null)
      setLoteId(null)
      setContado('')
      setMotivo('')
      saldo.recarregar()
      aoRegistrar(resultado)
    } catch (erro) {
      if (!(erro instanceof ApiError)) {
        setPendente(null)
        setErroGeral(mensagemDeErro(erro))
        return
      }
      // 422 de validação: erros por campo; 409 e 422 de regra: a mensagem vai para o campo
      const porCampo: ErrosDeCampo<CampoAjuste> = Object.keys(erro.campos).length
        ? { lote: erro.campos.lote_id, saldo_contado: erro.campos.saldo_contado, motivo: erro.campos.motivo }
        : { [campoDoErro(erro)]: erro.message }
      if (erro.status === 404) saldo.recarregar()
      focarAoFechar.current = CAMPOS.find((c) => porCampo[c]) ?? null
      setPendente(null)
      if (mostrar(form, porCampo)) setErroGeral(erro.message)
    } finally {
      setEnviando(false)
    }
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroGeral(null)
    if (!mostrar(evento.currentTarget, validar(lote, contado, motivo)) || !lote) return
    const dados = { lote, contado: Number(contado.trim()), motivo: motivo.trim() }
    // RN-35: sem diferença não há o que confirmar; a API recusa e a mensagem dela vai para o campo
    if (dados.contado === lote.quantidade) void registrar(dados)
    else setPendente(dados)
  }

  if (!saldo.dados && saldo.carregando) return <Carregando texto="Carregando os lotes…" />
  if (saldo.erro && !saldo.dados) return <ErroEstado mensagem={saldo.erro} aoTentarDeNovo={saldo.recarregar} />
  if (lotes.length === 0) {
    return (
      <Vazio
        icone={IconBox}
        titulo="Este produto não tem lote com saldo"
        acao={
          <BotaoLink to="/entrada" icone={IconPackageImport}>
            Registrar entrada
          </BotaoLink>
        }
      >
        Só dá para ajustar um lote que tenha unidades. Registre uma entrada para criar o lote.
      </Vazio>
    )
  }

  const diferenca = pendente ? pendente.contado - pendente.lote.quantidade : 0

  return (
    <form ref={formRef} className="ajuste__formulario" onSubmit={aoEnviar} noValidate>
      <AnuncioDeErros mensagem={anuncio} />
      {erroGeral && (
        <Aviso situacao="critico">
          <p>{erroGeral}</p>
        </Aviso>
      )}

      {/* tabIndex -1: recebe o foco quando falta escolher o lote */}
      <fieldset
        name="lote"
        tabIndex={-1}
        className={['ajuste__lotes', erros.lote && 'ajuste__lotes--erro'].filter(Boolean).join(' ')}
        aria-describedby={erros.lote ? 'ajuste-lote-erro' : undefined}
        aria-busy={saldo.carregando}
      >
        <legend className="campo__rotulo">Lote</legend>
        {/* Ordem FEFO, como vem da API; RN-38: lote vencido também pode ser ajustado */}
        <ul className="ajuste__lista">
          {lotes.map((l) => {
            const situacao = situacaoDoLote(l, hoje)
            return (
              <li key={l.id}>
                <label className={`lote-opcao etiqueta etiqueta--${situacao.etiqueta}`} data-problema={situacao.etiqueta !== 'ok' || undefined}>
                  <input
                    type="radio"
                    name="lote_id"
                    value={l.id}
                    checked={loteId === l.id}
                    onChange={() => {
                      setLoteId(l.id)
                      limpar('lote')
                      limpar('saldo_contado')
                    }}
                  />
                  <span className="lote-opcao__validade">{descreverLote(l.validade)}</span>
                  <span className="lote-opcao__situacao">{situacao.rotulo}</span>
                  <span className="lote-opcao__saldo numero">
                    {formatarNumero(l.quantidade)} <span className="lote-opcao__unidade">no sistema</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
        {erros.lote && (
          <p id="ajuste-lote-erro" className="campo__erro">
            {erros.lote}
          </p>
        )}
      </fieldset>

      <div className="ajuste__campos">
        <Campo
          rotulo="Saldo contado"
          name="saldo_contado"
          inputMode="numeric"
          autoComplete="off"
          value={contado}
          erro={erros.saldo_contado}
          dica={erros.saldo_contado ? undefined : lote ? `No sistema: ${formatarNumero(lote.quantidade)}.` : 'Quantas unidades há no lote.'}
          onChange={(e) => {
            setContado(e.target.value)
            limpar('saldo_contado')
          }}
        />
        <Campo
          rotulo="Motivo"
          name="motivo"
          autoComplete="off"
          maxLength={MAX_MOTIVO}
          value={motivo}
          erro={erros.motivo}
          dica={erros.motivo ? undefined : 'Fica no histórico do produto.'}
          onChange={(e) => {
            setMotivo(e.target.value)
            limpar('motivo')
          }}
        />
      </div>

      <div className="formulario__acoes">
        <Botao type="submit" variante="primaria" icone={IconAdjustmentsHorizontal} carregando={enviando && !pendente} textoCarregando="Conferindo…">
          Revisar ajuste
        </Botao>
      </div>

      <ConfirmarDialogo
        aberto={pendente !== null}
        aoMudar={(aberto) => !aberto && !enviando && setPendente(null)}
        titulo="Registrar este ajuste?"
        descricao={
          pendente && (
            <>
              <span className="ajuste__confirmacao numero">
                {descreverLote(pendente.lote.validade)}: {formatarNumero(pendente.lote.quantidade)} <span aria-hidden>→</span>
                <span className="visualmente-oculto"> para </span> {formatarNumero(pendente.contado)} (
                {formatarComSinal(diferenca)})
              </span>
              <span className="ajuste__confirmacao">Motivo: {pendente.motivo}</span>
              <span className="ajuste__confirmacao">O ajuste fica no histórico e não pode ser desfeito.</span>
            </>
          )
        }
        textoConfirmar="Registrar ajuste"
        aoConfirmar={() => pendente && void registrar(pendente)}
        carregando={enviando}
        aoFecharFoco={(evento) => {
          const campo = focarAoFechar.current
          focarAoFechar.current = null
          const alvo = campo && formRef.current?.elements.namedItem(campo)
          if (alvo instanceof HTMLElement) {
            evento.preventDefault()
            alvo.focus()
          }
        }}
      />
    </form>
  )
}

// RN-02, RN-32 e RN-33: só o admin ajusta. A rota fica em <RotaAdmin>; quem garante é o backend (require_admin)
export function AjustesPage() {
  useTituloDaPagina('Ajustes')
  const [parametros, setParametros] = useSearchParams()
  const produtoId = Number(parametros.get('produto')) || null
  const estoque = useRecurso<ItemEstoque[]>('/stock')
  const [ultimo, setUltimo] = useState<{ nome: string; resultado: AjusteRegistrado } | null>(null)
  const { atualizarAlertas } = useAlertasAtivos()

  const produtos = estoque.dados ?? []
  const selecionado = produtos.find((p) => p.produto_id === produtoId)

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Ajustes</h1>
          <p className="pagina__apoio">Corrija o saldo de um lote com a contagem física</p>
        </div>
      </header>

      {ultimo && (
        <Aviso situacao="ok">
          <p>
            <strong>Ajuste registrado.</strong> {ultimo.nome}, {descreverLote(ultimo.resultado.validade).toLowerCase()}:{' '}
            <span className="numero">
              {formatarNumero(ultimo.resultado.saldo_anterior)} <span aria-hidden>→</span>
              <span className="visualmente-oculto"> para </span> {formatarNumero(ultimo.resultado.saldo_novo)} (
              {formatarComSinal(ultimo.resultado.quantidade)})
            </span>
            .
          </p>
        </Aviso>
      )}

      {!estoque.dados && estoque.carregando && <Carregando texto="Carregando os produtos…" />}
      {estoque.erro && <ErroEstado mensagem={estoque.erro} aoTentarDeNovo={estoque.recarregar} />}

      {estoque.dados && produtos.length === 0 && (
        <div className="painel">
          <Vazio
            icone={IconBox}
            titulo="Nenhum produto cadastrado"
            acao={
              <BotaoLink to="/produtos/novo" variante="primaria">
                Cadastrar produto
              </BotaoLink>
            }
          >
            Cadastre os produtos e registre as entradas; depois os lotes podem ser ajustados aqui.
          </Vazio>
        </div>
      )}

      {produtos.length > 0 && (
        <div className="painel ajuste">
          <div className="ajuste__produto">
            <CampoSelecao
              rotulo="Produto"
              name="produto"
              value={selecionado ? String(selecionado.produto_id) : ''}
              onChange={(e) => {
                setUltimo(null)
                setParametros(e.target.value ? { produto: e.target.value } : {}, { replace: true })
              }}
            >
              <option value="">Escolha o produto</option>
              {produtos.map((p) => (
                <option key={p.produto_id} value={p.produto_id}>
                  {p.nome} ({p.codigo_barras})
                </option>
              ))}
            </CampoSelecao>
          </div>
          {selecionado ? (
            <FormularioAjuste
              key={selecionado.produto_id}
              produtoId={selecionado.produto_id}
              aoRegistrar={(resultado) => {
                setUltimo({ nome: selecionado.nome, resultado })
                estoque.recarregar()
                // RN-40: o ajuste já gerou os alertas do produto; o menu mostra a nova contagem
                atualizarAlertas()
              }}
            />
          ) : (
            <Vazio icone={IconAdjustmentsHorizontal} titulo="Escolha o produto contado">
              Depois escolha o lote, informe quantas unidades contou e o motivo.
            </Vazio>
          )}
        </div>
      )}
    </div>
  )
}
