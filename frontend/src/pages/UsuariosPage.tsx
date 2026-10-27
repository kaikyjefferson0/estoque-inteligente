import { IconPencil, IconPlus, IconUsers } from '@tabler/icons-react'
import { useRecurso } from '../api/useRecurso'
import { useAuth } from '../auth/useAuth'
import { Aviso } from '../components/Aviso'
import { BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import { NOME_DO_PERFIL, type Usuario } from '../types/auth'
import { formatarNumero, plural } from '../utils/formato'
import './UsuariosPage.css'

function resumo(usuarios: Usuario[]): string {
  const inativos = usuarios.filter((u) => !u.ativo).length
  const total = `${formatarNumero(usuarios.length)} ${plural(usuarios.length, 'usuário', 'usuários')}`
  return inativos > 0 ? `${total}, ${formatarNumero(inativos)} ${plural(inativos, 'inativo', 'inativos')}` : total
}

/** A marca "Você" fica grudada na última palavra do nome, sem descer sozinha para outra linha. */
function NomeComMarca({ nome, proprio }: { nome: string; proprio: boolean }) {
  if (!proprio) return <>{nome}</>
  const corte = nome.lastIndexOf(' ')
  return (
    <>
      {nome.slice(0, corte + 1)}
      <span className="usuarios__sem-quebra">
        {nome.slice(corte + 1)}
        <span className="usuarios__voce">Você</span>
      </span>
    </>
  )
}

// RN-02 e RN-20: só o admin chega aqui (RotaAdmin); o backend confere de novo (require_admin)
export function UsuariosPage() {
  useTituloDaPagina('Usuários')
  const { usuario: logado } = useAuth()
  const { dados, erro, carregando, recarregar } = useRecurso<Usuario[]>('/users')
  const mensagem = useMensagemDaNavegacao()
  const vazio = dados?.length === 0

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Usuários</h1>
          <p className="pagina__apoio">{dados && !vazio ? resumo(dados) : 'Quem pode entrar no sistema'}</p>
        </div>
        {dados && !vazio && (
          <div className="pagina__acoes">
            <BotaoLink to="/usuarios/novo" variante="primaria" icone={IconPlus}>
              Cadastrar usuário
            </BotaoLink>
          </div>
        )}
      </header>

      {mensagem && (
        <Aviso situacao="ok">
          <p>{mensagem}</p>
        </Aviso>
      )}

      {!dados && carregando && <Carregando texto="Carregando usuários…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados && vazio && (
        <div className="painel">
          <Vazio
            icone={IconUsers}
            titulo="Nenhum usuário cadastrado"
            acao={
              <BotaoLink to="/usuarios/novo" variante="primaria">
                Cadastrar usuário
              </BotaoLink>
            }
          >
            Cadastre quem vai registrar entradas e saídas no estoque.
          </Vazio>
        </div>
      )}

      {dados && !vazio && (
        <div className="painel">
          <table className="tabela usuarios">
            <caption className="visualmente-oculto">Usuários cadastrados</caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Perfil</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="visualmente-oculto">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.map((u) => {
                const proprio = u.id === logado?.id
                return (
                  <tr key={u.id} className="usuarios__linha" data-inativo={!u.ativo || undefined}>
                    <td className="usuarios__nome">
                      <NomeComMarca nome={u.nome} proprio={proprio} />
                    </td>
                    <td className="usuarios__email">{u.email}</td>
                    <td className="usuarios__perfil">{NOME_DO_PERFIL[u.perfil]}</td>
                    <td className="usuarios__situacao">{u.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td className="usuarios__acao">
                      <BotaoLink to={`/usuarios/${u.id}/editar`} variante="fantasma" icone={IconPencil} aria-label={`Editar ${u.nome}`}>
                        Editar
                      </BotaoLink>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
