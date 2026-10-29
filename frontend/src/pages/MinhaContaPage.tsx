import { useState, type FormEvent } from 'react'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { Campo } from '../components/Campo'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import { NOME_DO_PERFIL } from '../types/auth'
import { SENHA_MAXIMA, SENHA_MINIMA } from '../utils/senha'
import './MinhaContaPage.css'

// Ordem dos campos na tela: o foco vai para o primeiro inválido. Os nomes são os da API.
const CAMPOS = ['senha_atual', 'senha_nova', 'confirmacao'] as const
type CampoSenha = (typeof CAMPOS)[number]

interface Valores {
  atual: string
  nova: string
  confirmacao: string
}

function validar({ atual, nova, confirmacao }: Valores): ErrosDeCampo<CampoSenha> {
  const erros: ErrosDeCampo<CampoSenha> = {}
  if (!atual) erros.senha_atual = 'Informe a senha que você usa hoje para entrar.'
  if (!nova) erros.senha_nova = `Informe a nova senha, com pelo menos ${SENHA_MINIMA} caracteres.`
  else if (nova.length < SENHA_MINIMA) erros.senha_nova = `A nova senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  else if (nova.length > SENHA_MAXIMA) erros.senha_nova = `Use até ${SENHA_MAXIMA} caracteres na senha.`
  else if (nova === atual) erros.senha_nova = 'A nova senha precisa ser diferente da atual.'
  if (!confirmacao) erros.confirmacao = 'Repita a nova senha para confirmar.'
  else if (confirmacao !== nova) erros.confirmacao = 'As senhas não são iguais. Digite a mesma nova senha nos dois campos.'
  return erros
}

// RN-48: qualquer usuário logado vê os próprios dados e troca a própria senha (menos a conta de demonstração, RN-53)
export function MinhaContaPage() {
  useTituloDaPagina('Minha conta')
  const { usuario, sairAposTrocarSenha } = useAuth()
  const [valores, setValores] = useState<Valores>({ atual: '', nova: '', confirmacao: '' })
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!usuario) return null

  function alterar(campo: keyof Valores, valor: string, ...limpos: CampoSenha[]) {
    setValores((v) => ({ ...v, [campo]: valor }))
    limpos.forEach(limpar)
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, validar(valores))) return
    setEnviando(true)
    try {
      await api<void>('/auth/change-password', { body: { senha_atual: valores.atual, senha_nova: valores.nova } })
      // O token atual deixou de valer: volta ao login, que avisa da troca
      sairAposTrocarSenha()
    } catch (erro) {
      setEnviando(false)
      if (erro instanceof ApiError && Object.keys(erro.campos).length > 0) {
        mostrar(form, erro.campos)
        setErroGeral('A senha não foi trocada. Corrija o campo destacado e tente de novo.')
      } else {
        setErroGeral(mensagemDeErro(erro))
      }
    }
  }

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Minha conta</h1>
          <p className="pagina__apoio">Seus dados de acesso e a sua senha.</p>
        </div>
      </header>

      <section className="painel conta" aria-labelledby="conta-dados">
        <h2 id="conta-dados" className="conta__titulo">
          Seus dados
        </h2>
        {/* Detalhe: nome e e-mail aparecem inteiros, quebrando a linha se preciso */}
        <dl className="conta__dados">
          <div className="conta__item">
            <dt>Nome</dt>
            <dd className="texto-inteiro">{usuario.nome}</dd>
          </div>
          <div className="conta__item">
            <dt>E-mail</dt>
            <dd className="texto-inteiro">{usuario.email}</dd>
          </div>
          <div className="conta__item">
            <dt>Perfil</dt>
            <dd>{NOME_DO_PERFIL[usuario.perfil]}</dd>
          </div>
        </dl>
        <p className="conta__nota">Para mudar o nome ou o e-mail, fale com um administrador.</p>
      </section>

      {usuario.demo ? (
        // RN-53: um visitante não pode trancar a demonstração para os outros
        <section className="painel conta" aria-labelledby="conta-senha">
          <h2 id="conta-senha" className="conta__titulo">
            Senha
          </h2>
          <p className="conta__nota">
            Esta é a conta de demonstração, usada por todos os visitantes. Por isso a senha dela não pode ser trocada: assim
            ninguém tranca a demonstração para os outros.
          </p>
        </section>
      ) : (
        <form className="painel formulario" onSubmit={aoEnviar} noValidate aria-labelledby="conta-senha">
          <div>
            <h2 id="conta-senha" className="conta__titulo">
              Trocar senha
            </h2>
            <p className="conta__nota">Depois de trocar, você entra de novo com a nova senha, e os outros acessos abertos com a sua conta são encerrados.</p>
          </div>
          <AnuncioDeErros mensagem={anuncio} />
          {erroGeral && (
            <Aviso situacao="critico">
              <p>{erroGeral}</p>
            </Aviso>
          )}
          {/* Campo oculto de usuário: o gerenciador de senhas sabe de qual conta é a senha */}
          <input type="email" name="email" autoComplete="username" value={usuario.email} readOnly hidden />
          <Campo
            rotulo="Senha atual"
            name="senha_atual"
            type="password"
            autoComplete="current-password"
            maxLength={SENHA_MAXIMA}
            value={valores.atual}
            onChange={(e) => alterar('atual', e.target.value, 'senha_atual')}
            erro={erros.senha_atual}
          />
          <div className="formulario__grupo">
            <Campo
              rotulo="Nova senha"
              name="senha_nova"
              type="password"
              autoComplete="new-password"
              maxLength={SENHA_MAXIMA}
              dica={erros.senha_nova ? undefined : `Pelo menos ${SENHA_MINIMA} caracteres, diferente da atual.`}
              value={valores.nova}
              onChange={(e) => alterar('nova', e.target.value, 'senha_nova', 'confirmacao')}
              erro={erros.senha_nova}
            />
            <Campo
              rotulo="Confirme a nova senha"
              name="confirmacao"
              type="password"
              autoComplete="new-password"
              maxLength={SENHA_MAXIMA}
              value={valores.confirmacao}
              onChange={(e) => alterar('confirmacao', e.target.value, 'confirmacao')}
              erro={erros.confirmacao}
            />
          </div>
          <div className="formulario__acoes">
            <Botao type="submit" variante="primaria" carregando={enviando} textoCarregando="Trocando…">
              Trocar senha
            </Botao>
          </div>
        </form>
      )}
    </div>
  )
}
