import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'
import { Botao } from './Botao'

interface ConfirmarDialogoProps {
  aberto: boolean
  aoMudar: (aberto: boolean) => void
  titulo: string
  descricao: ReactNode
  // Verbo da ação, por exemplo "Registrar ajuste"
  textoConfirmar: string
  aoConfirmar: () => void
  carregando?: boolean
  perigo?: boolean
  // Ao fechar, o Radix devolve o foco a quem abriu; chame preventDefault para levá-lo a outro lugar
  aoFecharFoco?: (evento: Event) => void
}

/** Janela de confirmação (Radix AlertDialog): foco preso, fecha com Esc. */
export function ConfirmarDialogo({
  aberto,
  aoMudar,
  titulo,
  descricao,
  textoConfirmar,
  aoConfirmar,
  carregando,
  perigo,
  aoFecharFoco,
}: ConfirmarDialogoProps) {
  return (
    <AlertDialog.Root open={aberto} onOpenChange={aoMudar}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="sobreposicao" />
        <AlertDialog.Content className="dialogo" onCloseAutoFocus={aoFecharFoco}>
          <AlertDialog.Title className="dialogo__titulo">{titulo}</AlertDialog.Title>
          <AlertDialog.Description className="dialogo__descricao">{descricao}</AlertDialog.Description>
          <div className="dialogo__acoes">
            <AlertDialog.Cancel asChild>
              <Botao variante="fantasma">Cancelar</Botao>
            </AlertDialog.Cancel>
            <Botao variante={perigo ? 'perigo' : 'primaria'} carregando={carregando} onClick={aoConfirmar}>
              {textoConfirmar}
            </Botao>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
