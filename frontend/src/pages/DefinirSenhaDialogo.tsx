import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useState, type FormEvent } from 'react'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { Campo } from '../components/Campo'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import type { Usuario } from '../types/auth'
import { SENHA_MAXIMA, SENHA_MINIMA } from '../utils/senha'

// Ordem dos campos na tela: o foco vai para o primeiro inválido
const CAMPOS = ['senha_nova', 'confirmacao'] as const
type CampoSenha = (typeof CAMPOS)[number]

function validar(senha: string, confirmacao: string): ErrosDeCampo<CampoSenha> {
  const erros: ErrosDeCampo<CampoSenha> = {}
  if (!senha) erros.senha_nova = `Informe a nova senha, com pelo menos ${SENHA_MINIMA} caracteres.`
  else if (senha.length < SENHA_MINIMA) erros.senha_nova = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  else if (senha.length > SENHA_MAXIMA) erros.senha_nova = `Use até ${SENHA_MAXIMA} caracteres na senha.`
  if (!confirmacao) erros.confirmacao = 'Repita a senha para confirmar.'
  else if (confirmacao !== senha) erros.confirmacao = 'As senhas não são iguais. Digite a mesma senha nos dois campos.'
  return erros
}

interface Props {
  // null: janela fechada
  usuario: Usuario | null
  aoFechar: () => void
  aoDefinir: (usuario: Usuario) => void
}

/** RN-49: o admin define a senha de outro usuário, confirmando numa janela (Radix AlertDialog). */
export function DefinirSenhaDialogo({ usuario, aoFechar, aoDefinir }: Props) {
  return (
    <AlertDialog.Root open={usuario !== null} onOpenChange={(aberto) => !aberto && aoFechar()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="sobreposicao" />
        <AlertDialog.Content className="dialogo">
          {/* key: cada usuário abre o formulário limpo */}
          {usuario && <Formulario key={usuario.id} usuario={usuario} aoFechar={aoFechar} aoDefinir={aoDefinir} />}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

function Formulario({ usuario, aoFechar, aoDefinir }: { usuario: Usuario } & Omit<Props, 'usuario'>) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, validar(senha, confirmacao))) return
    setEnviando(true)
    try {
      await api<void>(`/users/${usuario.id}/password`, { body: { senha_nova: senha } })
      aoDefinir(usuario)
    } catch (erro) {
      setEnviando(false)
      if (erro instanceof ApiError && Object.keys(erro.campos).length > 0) {
        mostrar(form, erro.campos)
        setErroGeral(erro.message)
      } else {
        setErroGeral(mensagemDeErro(erro))
      }
    }
  }

  return (
    <form className="definir-senha" onSubmit={aoEnviar} noValidate>
      <AlertDialog.Title className="dialogo__titulo">Definir nova senha</AlertDialog.Title>
      <AlertDialog.Description className="dialogo__descricao">
        Para <strong className="texto-inteiro">{usuario.nome}</strong> ({usuario.email}). Os acessos abertos dessa pessoa
        são encerrados na hora, e ela passa a entrar com a senha que você definir.
      </AlertDialog.Description>
      <AnuncioDeErros mensagem={anuncio} />
      {erroGeral && (
        <Aviso situacao="critico">
          <p>{erroGeral}</p>
        </Aviso>
      )}
      <Campo
        rotulo="Nova senha"
        name="senha_nova"
        type="password"
        autoComplete="new-password"
        autoFocus
        maxLength={SENHA_MAXIMA}
        dica={erros.senha_nova ? undefined : `Pelo menos ${SENHA_MINIMA} caracteres.`}
        value={senha}
        onChange={(e) => {
          setSenha(e.target.value)
          limpar('senha_nova')
          limpar('confirmacao')
        }}
        erro={erros.senha_nova}
      />
      <Campo
        rotulo="Confirme a nova senha"
        name="confirmacao"
        type="password"
        autoComplete="new-password"
        maxLength={SENHA_MAXIMA}
        value={confirmacao}
        onChange={(e) => {
          setConfirmacao(e.target.value)
          limpar('confirmacao')
        }}
        erro={erros.confirmacao}
      />
      <div className="dialogo__acoes">
        <Botao type="button" variante="fantasma" onClick={aoFechar} disabled={enviando}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primaria" carregando={enviando} textoCarregando="Definindo…">
          Definir nova senha
        </Botao>
      </div>
    </form>
  )
}
