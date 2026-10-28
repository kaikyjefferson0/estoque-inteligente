import { IconKey, IconPencil, IconPlus, IconUsers } from '@tabler/icons-react'
import { useState } from 'react'
import { montarCaminho } from '../api/caminho'
import { useRecurso } from '../api/useRecurso'
import { useAuth } from '../auth/useAuth'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { Paginacao } from '../components/Paginacao'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import { usePaginaNaUrl } from '../components/usePaginaNaUrl'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import { NOME_DO_PERFIL, type Usuario } from '../types/auth'
import type { Pagina } from '../types/pagina'
import { formatarNumero, plural } from '../utils/formato'
import { DefinirSenhaDialogo } from './DefinirSenhaDialogo'
import './UsuariosPage.css'

function resumo(pagina: Pagina<Usuario>): string {
  const total = `${formatarNumero(pagina.total)} ${plural(pagina.total, 'usuário', 'usuários')}`
  // Os inativos só dá para contar quando a lista inteira cabe numa página
  if (pagina.itens.length < pagina.total) return total
  const inativos = pagina.itens.filter((u) => !u.ativo).length
  return inativos > 0 ? `${total}, ${formatarNumero(inativos)} ${plural(inativos, 'inativo', 'inativos')}` : total
}

/** Nome e e-mail em uma linha cada, com reticências; o texto inteiro fica no title e na edição. */
function Identificacao({ usuario, proprio }: { usuario: Usuario; proprio: boolean }) {
  return (
    <div className="usuarios__identificacao">
      <div className="usuarios__linha-nome">
        <span className="usuarios__nome texto-cortado" title={usuario.nome}>
          {usuario.nome}
        </span>
        {/* Marca o usuário logado (RN-22: perfil e situação dele não mudam) */}
        {proprio && <span className="usuarios__voce">Você</span>}
      </div>
      <span className="usuarios__email texto-cortado" title={usuario.email}>
        {usuario.email}
      </span>
    </div>
  )
}

function Acoes({ usuario, proprio, aoDefinirSenha }: { usuario: Usuario; proprio: boolean; aoDefinirSenha: () => void }) {
  return (
    <div className="usuarios__acoes">
      <BotaoLink to={`/usuarios/${usuario.id}/editar`} variante="fantasma" icone={IconPencil} aria-label={`Editar ${usuario.nome}`}>
        Editar
      </BotaoLink>
      {/* RN-49: a própria senha só muda em Minha conta, com a senha atual */}
      {!proprio && (
        <Botao variante="fantasma" icone={IconKey} onClick={aoDefinirSenha} aria-label={`Definir nova senha de ${usuario.nome}`}>
          Definir nova senha
        </Botao>
      )}
    </div>
  )
}

// RN-02 e RN-20: só o admin chega aqui (RotaAdmin); o backend confere de novo (require_admin)
export function UsuariosPage() {
  useTituloDaPagina('Usuários')
  const { usuario: logado } = useAuth()
  const { limite, deslocamento, irPara } = usePaginaNaUrl()
  const recurso = useRecurso<Pagina<Usuario>>(montarCaminho('/users', { limite, deslocamento: deslocamento || null }))
  const { erro, carregando, recarregar } = recurso
  const dados = recurso.dados?.itens ?? null
  const mensagemDaNavegacao = useMensagemDaNavegacao()
  const [definindoSenha, setDefinindoSenha] = useState<Usuario | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const vazio = recurso.dados?.total === 0
  const aviso = mensagem ?? mensagemDaNavegacao

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Usuários</h1>
          <p className="pagina__apoio">{recurso.dados && !vazio ? resumo(recurso.dados) : 'Quem pode entrar no sistema'}</p>
        </div>
        {dados && !vazio && (
          <div className="pagina__acoes">
            <BotaoLink to="/usuarios/novo" variante="primaria" icone={IconPlus}>
              Cadastrar usuário
            </BotaoLink>
          </div>
        )}
      </header>

      {aviso && (
        <Aviso situacao="ok">
          <p className="texto-inteiro">{aviso}</p>
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

      {/* Duas formas da mesma lista: o painel escolhe pela própria largura (container query).
          Estreito (celular e tablet): um usuário por bloco. Largo: tabela. A escondida sai da leitura de tela. */}
      {dados && !vazio && (
        <div className="painel usuarios">
          <ul className="usuarios__blocos" aria-label="Usuários cadastrados">
            {dados.map((u) => {
              const proprio = u.id === logado?.id
              return (
                <li key={u.id} className="usuarios__bloco" data-inativo={!u.ativo || undefined}>
                  <Identificacao usuario={u} proprio={proprio} />
                  <p className="usuarios__detalhes">
                    <span className="usuarios__perfil">{NOME_DO_PERFIL[u.perfil]}</span>
                    <span className="usuarios__situacao">{u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </p>
                  <Acoes usuario={u} proprio={proprio} aoDefinirSenha={() => setDefinindoSenha(u)} />
                </li>
              )
            })}
          </ul>

          <table className="tabela usuarios__tabela">
            <caption className="visualmente-oculto">Usuários cadastrados</caption>
            <thead>
              <tr>
                <th scope="col">Usuário</th>
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
                  <tr key={u.id} data-inativo={!u.ativo || undefined}>
                    <td className="usuarios__celula-usuario">
                      <Identificacao usuario={u} proprio={proprio} />
                    </td>
                    <td className="usuarios__perfil">{NOME_DO_PERFIL[u.perfil]}</td>
                    <td className="usuarios__situacao">{u.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td className="usuarios__celula-acoes">
                      <Acoes usuario={u} proprio={proprio} aoDefinirSenha={() => setDefinindoSenha(u)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {recurso.dados && !vazio && (
        <Paginacao
          total={recurso.dados.total}
          limite={limite}
          deslocamento={deslocamento}
          aoMudar={irPara}
          nomeDaLista="usuários"
        />
      )}

      <DefinirSenhaDialogo
        usuario={definindoSenha}
        aoFechar={() => setDefinindoSenha(null)}
        aoDefinir={(u) => {
          setDefinindoSenha(null)
          setMensagem(`Senha de ${u.nome} definida. Os acessos abertos dessa pessoa foram encerrados.`)
        }}
      />
    </div>
  )
}
