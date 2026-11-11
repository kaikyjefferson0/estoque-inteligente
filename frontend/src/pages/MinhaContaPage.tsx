import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="flex max-w-largura-conteudo flex-col gap-esp-5">
      <header className="flex flex-wrap items-end justify-between gap-esp-4">
        <div>
          <h1>Minha conta</h1>
          <p className="pt-esp-1 text-fs-2 wrap-break-word text-texto-suave">Seus dados de acesso e a sua senha.</p>
        </div>
      </header>

      <section
        className="flex max-w-largura-formulario flex-col gap-esp-4 rounded-m border border-borda bg-superficie p-esp-5 ate-640:p-esp-4"
        aria-labelledby="conta-dados"
      >
        <h2 id="conta-dados">Seus dados</h2>
        {/* Detalhe: nome e e-mail aparecem inteiros, quebrando a linha se preciso */}
        <dl className="flex flex-col gap-esp-3">
          <div className="grid grid-cols-rotulo-valor gap-x-esp-4 gap-y-esp-1 ate-640:grid-cols-1">
            <dt className="text-fs-2 text-texto-suave">Nome</dt>
            <dd className="min-w-esp-0 wrap-break-word">{usuario.nome}</dd>
          </div>
          <div className="grid grid-cols-rotulo-valor gap-x-esp-4 gap-y-esp-1 ate-640:grid-cols-1">
            <dt className="text-fs-2 text-texto-suave">E-mail</dt>
            <dd className="min-w-esp-0 wrap-break-word">{usuario.email}</dd>
          </div>
          <div className="grid grid-cols-rotulo-valor gap-x-esp-4 gap-y-esp-1 ate-640:grid-cols-1">
            <dt className="text-fs-2 text-texto-suave">Perfil</dt>
            <dd className="min-w-esp-0">{NOME_DO_PERFIL[usuario.perfil]}</dd>
          </div>
        </dl>
        {/* O e-mail é o login e não muda; o nome, o admin muda no próprio cadastro (RN-22 só
            trava o perfil e a situação dele) e o operador pede a um administrador */}
        {usuario.perfil === 'admin' ? (
          <p className="pt-esp-1 text-fs-2 text-texto-suave">
            O e-mail é o login e não muda. Para mudar o nome,{' '}
            <Link to={`/usuarios/${usuario.id}/editar`}>edite o seu cadastro em Usuários</Link>.
          </p>
        ) : (
          <p className="pt-esp-1 text-fs-2 text-texto-suave">O e-mail é o login e não muda. Para mudar o nome, fale com um administrador.</p>
        )}
      </section>

      {usuario.demo ? (
        // RN-53: um visitante não pode trancar a demonstração para os outros
        <section
          className="flex max-w-largura-formulario flex-col gap-esp-4 rounded-m border border-borda bg-superficie p-esp-5 ate-640:p-esp-4"
          aria-labelledby="conta-senha"
        >
          <h2 id="conta-senha">Senha</h2>
          <p className="pt-esp-1 text-fs-2 text-texto-suave">
            Esta é a conta de demonstração, usada por todos os visitantes. Por isso a senha dela não pode ser trocada: assim
            ninguém tranca a demonstração para os outros.
          </p>
        </section>
      ) : (
        <form
          className="flex max-w-largura-formulario flex-col gap-esp-5 rounded-m border border-borda bg-superficie p-esp-5 ate-640:p-esp-4"
          onSubmit={aoEnviar}
          noValidate
          aria-labelledby="conta-senha"
        >
          <div>
            <h2 id="conta-senha">Trocar senha</h2>
            <p className="pt-esp-1 text-fs-2 text-texto-suave">Depois de trocar, você entra de novo com a nova senha, e os outros acessos abertos com a sua conta são encerrados.</p>
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
          <div className="flex flex-col gap-esp-3 border-t-picote pt-esp-4">
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
          <div className="flex flex-wrap gap-esp-2 pt-esp-2">
            <Botao type="submit" variante="primaria" carregando={enviando} textoCarregando="Trocando…">
              Trocar senha
            </Botao>
          </div>
        </form>
      )}
    </div>
  )
}
