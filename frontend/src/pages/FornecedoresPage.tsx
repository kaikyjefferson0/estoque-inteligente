import { IconPencil, IconPlus, IconTruck } from '@tabler/icons-react'
import { useRecurso } from '../api/useRecurso'
import { Aviso } from '../components/Aviso'
import { BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import type { Fornecedor } from '../types/fornecedor'
import { formatarCnpj, formatarNumero, plural } from '../utils/formato'
import './FornecedoresPage.css'

// RN-23: fornecedores nunca são apagados, então não há ação de excluir
export function FornecedoresPage() {
  const { dados, erro, carregando, recarregar } = useRecurso<Fornecedor[]>('/suppliers')
  const mensagem = useMensagemDaNavegacao()
  const vazio = dados?.length === 0

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Fornecedores</h1>
          <p className="pagina__apoio">
            {dados && !vazio
              ? `${formatarNumero(dados.length)} ${plural(dados.length, 'fornecedor cadastrado', 'fornecedores cadastrados')}`
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
    </div>
  )
}
