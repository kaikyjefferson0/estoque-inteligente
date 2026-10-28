import { IconChevronDown } from '@tabler/icons-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { api, mensagemDeErro } from '../api/client'
import type { Pagina } from '../types/pagina'
import { formatarNumero, plural } from '../utils/formato'
import { useAtraso } from '../utils/useAtraso'

export interface OpcaoEscolhida {
  id: number
  texto: string
}

interface Opcao<T> {
  chave: string
  texto: string
  detalhe?: string
  // null na opção vazia (ex.: "Sem fornecedor")
  item: T | null
}

interface SelecaoComBuscaProps<T> {
  rotulo: string
  name: string
  // Caminho da API para o termo digitado (a API filtra e pagina, RN-51)
  caminho: (termo: string) => string
  paraOpcao: (item: T) => { id: number; texto: string; detalhe?: string }
  valor: OpcaoEscolhida | null
  aoEscolher: (item: T | null) => void
  // Texto da opção que deixa o campo vazio; sem ele, o campo é obrigatório
  opcaoVazia?: string
  // Mensagem quando não há nada cadastrado, por exemplo "Nenhum fornecedor cadastrado."
  textoSemItens?: string
  placeholder?: string
  erro?: string
  dica?: ReactNode
  disabled?: boolean
  // Foco no campo ao aparecer (ex.: a tela trocou de trecho depois de uma escolha)
  autoFocus?: boolean
}

const ATRASO_BUSCA_MS = 250

interface Resultado<T> {
  chave: string | null
  pagina: Pagina<T> | null
  erro: string | null
}

/**
 * Campo de escolha com busca no próprio campo, para listas grandes demais para um <select>.
 * Segue o padrão "combobox" do WAI-ARIA: setas para navegar, Enter escolhe, Esc fecha.
 */
export function SelecaoComBusca<T>({
  rotulo,
  name,
  caminho,
  paraOpcao,
  valor,
  aoEscolher,
  opcaoVazia,
  textoSemItens = 'Nada cadastrado ainda.',
  placeholder,
  erro,
  dica,
  disabled,
  autoFocus,
}: SelecaoComBuscaProps<T>) {
  const idCampo = useId()
  const idLista = `${idCampo}-lista`
  const idDica = dica ? `${idCampo}-dica` : undefined
  const idErro = erro ? `${idCampo}-erro` : undefined
  const entrada = useRef<HTMLInputElement>(null)

  const [aberto, setAberto] = useState(false)
  // null: não está digitando, o campo mostra a opção escolhida
  const [texto, setTexto] = useState<string | null>(null)
  // Guarda a chave da opção, não a posição: se a lista mudar antes do Enter, nada diferente é escolhido
  const [ativa, setAtiva] = useState<string | null>(null)
  const termo = useAtraso((texto ?? '').trim(), ATRASO_BUSCA_MS)
  const chave = aberto ? caminho(termo) : null
  const [resultado, setResultado] = useState<Resultado<T>>({ chave: null, pagina: null, erro: null })

  useEffect(() => {
    if (!chave) return
    const controle = new AbortController()
    api<Pagina<T>>(chave, { signal: controle.signal })
      .then((pagina) => setResultado({ chave, pagina, erro: null }))
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setResultado({ chave, pagina: null, erro: mensagemDeErro(e) })
      })
    return () => controle.abort()
  }, [chave])

  const carregando = chave !== null && resultado.chave !== chave

  // Pelo teclado, a opção destacada fica sempre visível na lista
  useEffect(() => {
    if (ativa) document.getElementById(`${idLista}-${ativa}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [ativa, idLista])
  const pagina = resultado.chave === chave ? resultado.pagina : null
  const opcoes: Opcao<T>[] = []
  if (opcaoVazia && !termo) opcoes.push({ chave: 'vazia', texto: opcaoVazia, item: null })
  for (const item of pagina?.itens ?? []) {
    const { id, texto: textoDaOpcao, detalhe } = paraOpcao(item)
    opcoes.push({ chave: String(id), texto: textoDaOpcao, detalhe, item })
  }

  function abrir() {
    if (!aberto) {
      setAberto(true)
      setAtiva(null)
    }
  }

  function fechar() {
    setAberto(false)
    setTexto(null)
    setAtiva(null)
  }

  function escolher(opcao: Opcao<T>) {
    aoEscolher(opcao.item)
    fechar()
  }

  function aoTeclar(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (!aberto) return abrir()
      if (opcoes.length === 0) return
      const passo = evento.key === 'ArrowDown' ? 1 : -1
      const atual = opcoes.findIndex((o) => o.chave === ativa)
      const proxima = atual < 0 ? (passo === 1 ? 0 : opcoes.length - 1) : (atual + passo + opcoes.length) % opcoes.length
      setAtiva(opcoes[proxima].chave)
    } else if (evento.key === 'Enter' && aberto) {
      // Enter com a lista aberta escolhe; não envia o formulário
      evento.preventDefault()
      const opcao = opcoes.find((o) => o.chave === ativa)
      if (opcao) escolher(opcao)
    } else if (evento.key === 'Escape' && aberto) {
      evento.preventDefault()
      fechar()
    }
  }

  function aoSair() {
    // Apagou o texto e saiu: num campo opcional, isso é "sem escolha"
    if (texto !== null && !texto.trim() && opcaoVazia && valor) aoEscolher(null)
    fechar()
  }

  let situacao: string | null = null
  if (carregando) situacao = 'Buscando…'
  else if (resultado.erro) situacao = resultado.erro
  else if (pagina && pagina.total === 0) situacao = termo ? `Nada encontrado com “${termo}”.` : textoSemItens
  else if (pagina && pagina.total > pagina.itens.length)
    situacao = `Mostrando ${formatarNumero(pagina.itens.length)} de ${formatarNumero(pagina.total)}. Digite para refinar.`

  const descritores = [idDica, idErro].filter(Boolean).join(' ') || undefined
  const ativaVisivel = aberto && opcoes.some((o) => o.chave === ativa)
  const idDaOpcao = (chaveDaOpcao: string) => `${idLista}-${chaveDaOpcao}`

  return (
    <div className={['campo', 'selecao-busca', erro && 'campo--erro'].filter(Boolean).join(' ')}>
      <label className="campo__rotulo" htmlFor={idCampo}>
        {rotulo}
      </label>
      <div className="selecao-busca__ancora">
        <div className="campo__caixa">
          <input
            ref={entrada}
            id={idCampo}
            name={name}
            className="campo__entrada"
            type="text"
            role="combobox"
            aria-expanded={aberto}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={ativaVisivel && ativa ? idDaOpcao(ativa) : undefined}
            aria-invalid={erro ? true : undefined}
            aria-describedby={descritores}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autoFocus}
            value={texto ?? valor?.texto ?? ''}
            onChange={(e) => {
              setTexto(e.target.value)
              setAtiva(null)
              setAberto(true)
            }}
            onClick={abrir}
            onKeyDown={aoTeclar}
            onBlur={aoSair}
          />
          {/* Atalho de mouse para abrir a lista; pelo teclado, a seta para baixo faz o mesmo */}
          <button
            type="button"
            className="selecao-busca__abrir"
            tabIndex={-1}
            aria-hidden
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              entrada.current?.focus()
              if (aberto) fechar()
              else abrir()
            }}
          >
            <IconChevronDown aria-hidden />
          </button>
        </div>
        {aberto && (
          // Clique em qualquer parte do painel (opção ou barra de rolagem) não tira o foco do campo:
          // a escolha acontece antes do blur fechar a lista
          <div className="selecao-busca__painel" onMouseDown={(e) => e.preventDefault()}>
            <ul id={idLista} role="listbox" aria-label={rotulo} className="selecao-busca__lista">
              {opcoes.map((opcao) => (
                <li
                  key={opcao.chave}
                  id={idDaOpcao(opcao.chave)}
                  role="option"
                  aria-selected={opcao.chave === ativa}
                  data-escolhida={(opcao.item === null ? valor === null : valor?.id === Number(opcao.chave)) || undefined}
                  className="selecao-busca__opcao"
                  onClick={() => escolher(opcao)}
                >
                  <span className="texto-cortado" title={opcao.texto}>
                    {opcao.texto}
                  </span>
                  {opcao.detalhe && <span className="selecao-busca__detalhe numero">{opcao.detalhe}</span>}
                </li>
              ))}
            </ul>
            {situacao && (
              <p className="selecao-busca__situacao">{situacao}</p>
            )}
          </div>
        )}
      </div>
      {/* Leitor de tela: quantas opções a busca trouxe */}
      <p className="visualmente-oculto" aria-live="polite">
        {aberto && pagina && !carregando
          ? `${formatarNumero(pagina.total)} ${plural(pagina.total, 'opção encontrada', 'opções encontradas')}`
          : ''}
      </p>
      {dica && (
        <p id={idDica} className="campo__dica">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="campo__erro">
          {erro}
        </p>
      )}
    </div>
  )
}
