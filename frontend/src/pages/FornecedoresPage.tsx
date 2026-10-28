import { IconPencil, IconPlus, IconTruck } from '@tabler/icons-react'
import { montarCaminho } from '../api/caminho'
import { useRecurso } from '../api/useRecurso'
import { Aviso } from '../components/Aviso'
import { BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { Paginacao } from '../components/Paginacao'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import { usePaginaNaUrl } from '../components/usePaginaNaUrl'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { Fornecedor } from '../types/fornecedor'
import type { Pagina } from '../types/pagina'
import { formatarCnpj, formatarNumero, plural } from '../utils/formato'
import './FornecedoresPage.css'

// RN-23: fornecedores nunca são apagados, então não há ação de excluir
export function FornecedoresPage() {
  useTituloDaPagina('Fornecedores')
  const { limite, deslocamento, irPara } = usePaginaNaUrl()
  const recurso = useRecurso<Pagina<Fornecedor>>(montarCaminho('/suppliers', { limite, deslocamento: deslocamento || null }))
  const { erro, carregando, recarregar } = recurso
  const dados = recurso.dados?.itens ?? null
  const total = recurso.dados?.total ?? 0
  const mensagem = useMensagemDaNavegacao()
  const vazio = dados !== null && total === 0

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
            <BotaoLink to="/fornecedores/novo" variante="primaria" icone={IconPlus}>
              Cadastrar fornecedor
            </BotaoLink>
          </div>
        )}
      </header>

      {mensagem && (
        <Aviso situacao="ok">
          <p>{mensagem}</p>
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
              <BotaoLink to="/fornecedores/novo" variante="primaria">
                Cadastrar fornecedor
              </BotaoLink>
            }
          >
            Cadastre quem entrega seus produtos para ligar cada produto ao fornecedor.
          </Vazio>
        </div>
      )}

      {dados && !vazio && (
        <div className="painel">
          <table className="tabela fornecedores">
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
                <tr key={f.id}>
                  <td className="fornecedores__nome">{f.nome}</td>
                  <td className="fornecedores__cnpj">
                    {f.cnpj ? (
                      <span className="numero">{formatarCnpj(f.cnpj)}</span>
                    ) : (
                      <span className="tabela__vazio">Sem CNPJ</span>
                    )}
                  </td>
                  <td className="fornecedores__acao">
                    <BotaoLink
                      to={`/fornecedores/${f.id}/editar`}
                      variante="fantasma"
                      icone={IconPencil}
                      aria-label={`Editar ${f.nome}`}
                    >
                      Editar
                    </BotaoLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dados && !vazio && (
        <Paginacao total={total} limite={limite} deslocamento={deslocamento} aoMudar={irPara} nomeDaLista="fornecedores" />
      )}
    </div>
  )
}
