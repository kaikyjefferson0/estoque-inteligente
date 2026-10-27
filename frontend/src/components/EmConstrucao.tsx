import { IconTool } from '@tabler/icons-react'
import { BotaoLink } from './Botao'
import { Vazio } from './Estados'

export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <h1>{titulo}</h1>
      </header>
      <div className="painel">
        <Vazio icone={IconTool} titulo="Esta página está em construção" acao={<BotaoLink to="/">Voltar ao painel</BotaoLink>}>
          Ela chega nas próximas etapas. Por enquanto, acompanhe o estoque pelo painel.
        </Vazio>
      </div>
    </div>
  )
}
