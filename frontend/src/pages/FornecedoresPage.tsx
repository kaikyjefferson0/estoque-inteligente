import { IconPencil, IconPlus, IconTrash, IconTruck } from '@tabler/icons-react'
import { useCallback, useRef, useState } from 'react'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { montarCaminho } from '../api/caminho'
import { useRecurso } from '../api/useRecurso'
import { useAuth } from '../auth/useAuth'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { ConfirmarDialogo } from '../components/ConfirmarDialogo'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { NomeEmLista } from '../components/Metadados'
import { Paginacao } from '../components/Paginacao'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import { usePaginaNaUrl } from '../components/usePaginaNaUrl'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { Fornecedor } from '../types/fornecedor'
import type { Pagina } from '../types/pagina'
import { formatarCnpj, formatarNumero, plural } from '../utils/formato'
import './FornecedoresPage.css'

interface ErroDeExclusao {
  nome: string
  // Mensagem da API, como veio (no 409, a quantidade de produtos)
  mensagem: string
  comProdutos: boolean
}

// RN-23 e RN-59: só o admin exclui, e só fornecedor sem produtos (o backend confere e responde 409 se tiver)
export function FornecedoresPage() {
  useTituloDaPagina('Fornecedores')
  const { usuario } = useAuth()
  const admin = usuario?.perfil === 'admin'
  const { limite, deslocamento, irPara } = usePaginaNaUrl()
  const recurso = useRecurso<Pagina<Fornecedor>>(montarCaminho('/suppliers', { limite, deslocamento: deslocamento || null }))
  const { erro, carregando, recarregar } = recurso
  const dados = recurso.dados?.itens ?? null
  const total = recurso.dados?.total ?? 0
  const mensagemDaNavegacao = useMensagemDaNavegacao()
  const vazio = dados !== null && total === 0

  // O alvo continua guardado ao fechar, para o título não mudar durante a animação de saída
  const [alvo, setAlvo] = useState<Fornecedor | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(mensagemDaNavegacao)
  const [erroExclusao, setErroExclusao] = useState<ErroDeExclusao | null>(null)
  // Sem Trigger do Radix, o foco volta por aqui: ao conteúdo quando o fornecedor foi excluído (o botão
  // sumiu com ele); ao aviso de erro, que fica no topo e sairia da tela de quem rolou a lista; ou,
  // ao cancelar, ao botão que abriu o diálogo
  const abriu = useRef<HTMLElement | null>(null)
  const avisoDeErro = useRef<HTMLDivElement>(null)
  const excluiu = useRef(false)

  // O aviso de erro é da página em que a exclusão foi tentada; ao trocar de página, some
  const mudarPagina = useCallback(
    (novoDeslocamento: number) => {
      setErroExclusao(null)
      irPara(novoDeslocamento)
    },
    [irPara],
  )

  function abrirExclusao(fornecedor: Fornecedor, botao: HTMLElement) {
    abriu.current = botao
    setMensagem(null)
    setErroExclusao(null)
    setAlvo(fornecedor)
    setConfirmando(true)
  }

  async function excluir(fornecedor: Fornecedor) {
    setEnviando(true)
    try {
      await api<void>(`/suppliers/${fornecedor.id}`, { method: 'DELETE' })
      excluiu.current = true
      setMensagem(`Fornecedor excluído: ${fornecedor.nome}.`)
      recarregar()
    } catch (falha) {
      // 409 (RN-59): a mensagem da API diz quantos produtos impedem a exclusão; a tela diz de quem
      // é e o que fazer, já que o aviso fica no topo, longe da linha
      setErroExclusao({
        nome: fornecedor.nome,
        mensagem: mensagemDeErro(falha),
        comProdutos: falha instanceof ApiError && falha.status === 409,
      })
      // 404: outra pessoa já excluiu; a lista é atualizada
      if (falha instanceof ApiError && falha.status === 404) recarregar()
    } finally {
      setEnviando(false)
      setConfirmando(false)
    }
  }

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Fornecedores</h1>
          <p className="pagina__apoio">
            {dados && !vazio
              ? `${formatarNumero(total)} ${plural(total, 'fornecedor cadastrado', 'fornecedores cadastrados')}`
              : 'Quem entrega os produtos do estoque'}
          </p>
        </div>
        {/* Um único botão primário: sem fornecedores, ele fica no convite abaixo */}
        {dados && !vazio && (
          <div className="pagina__acoes">
            <BotaoLink to="/fornecedores/novo" variante="primaria" icone={IconPlus} data-cy="btn-novo">
              Cadastrar fornecedor
            </BotaoLink>
          </div>
        )}
      </header>

      {erroExclusao && (
        <div ref={avisoDeErro} tabIndex={-1}>
          <Aviso situacao="critico" dataCy="mensagem-erro">
            <p className="texto-inteiro">
              Não foi possível excluir {erroExclusao.nome}. {erroExclusao.mensagem}
              {erroExclusao.comProdutos && ' Para excluir, troque o fornecedor desses produtos ou deixe-os sem fornecedor.'}
            </p>
          </Aviso>
        </div>
      )}

      {mensagem && (
        <Aviso situacao="ok" dataCy="mensagem">
          <p className="texto-inteiro">{mensagem}</p>
        </Aviso>
      )}

      {!dados && carregando && <Carregando texto="Carregando fornecedores…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados && vazio && (
        <div className="painel">
          <Vazio
            icone={IconTruck}
            titulo="Nenhum fornecedor cadastrado"
            acao={
              <BotaoLink to="/fornecedores/novo" variante="primaria" data-cy="btn-novo">
                Cadastrar fornecedor
              </BotaoLink>
            }
          >
            Cadastre quem entrega seus produtos para ligar cada produto ao fornecedor.
          </Vazio>
        </div>
      )}

      {dados && !vazio && (
        <div className="painel painel--dados tabela-empilhavel">
          <table className="tabela fornecedores" data-cy="tabela-fornecedores">
            <caption className="visualmente-oculto">Fornecedores cadastrados</caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">CNPJ</th>
                <th scope="col">
                  <span className="visualmente-oculto">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.map((f) => (
                <tr key={f.id} data-cy={`fornecedor-${f.id}`}>
                  <td className="fornecedores__nome tabela__principal" data-cy="nome">
                    <NomeEmLista nome={f.nome} />
                  </td>
                  <td className="fornecedores__cnpj tabela__etiqueta" data-cy="cnpj">
                    {f.cnpj ? (
                      <span className="numero">{formatarCnpj(f.cnpj)}</span>
                    ) : (
                      <span className="tabela__vazio">Sem CNPJ</span>
                    )}
                  </td>
                  <td className="fornecedores__acao tabela__acao">
                    <div className="fornecedores__acoes">
                      <BotaoLink
                        to={`/fornecedores/${f.id}/editar`}
                        variante="fantasma"
                        icone={IconPencil}
                        aria-label={`Editar ${f.nome}`}
                        data-cy="btn-editar"
                      >
                        Editar
                      </BotaoLink>
                      {/* Esconder é conveniência: o backend recusa o operador com 403 (require_admin) */}
                      {admin && (
                        <Botao
                          variante="fantasma"
                          icone={IconTrash}
                          onClick={(evento) => abrirExclusao(f, evento.currentTarget)}
                          aria-label={`Excluir ${f.nome}`}
                          data-cy="btn-excluir"
                        >
                          Excluir
                        </Botao>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dados && !vazio && (
        <Paginacao total={total} limite={limite} deslocamento={deslocamento} aoMudar={mudarPagina} nomeDaLista="fornecedores" />
      )}

      {admin && (
        <ConfirmarDialogo
          aberto={confirmando}
          aoMudar={(aberto) => !aberto && !enviando && setConfirmando(false)}
          titulo={`Excluir ${alvo?.nome ?? 'fornecedor'}?`}
          descricao="O fornecedor sai da lista e não pode ser recuperado. Só dá para excluir quem não tem nenhum produto ligado a ele."
          textoConfirmar="Excluir fornecedor"
          perigo
          carregando={enviando}
          aoConfirmar={() => alvo && !enviando && void excluir(alvo)}
          aoFecharFoco={(evento) => {
            const alvoDoFoco = excluiu.current ? document.getElementById('conteudo') : (avisoDeErro.current ?? abriu.current)
            excluiu.current = false
            abriu.current = null
            if (alvoDoFoco?.isConnected) {
              evento.preventDefault()
              alvoDoFoco.focus()
            }
          }}
        />
      )}
    </div>
  )
}
