import { IconLayoutDashboard, IconMapOff } from '@tabler/icons-react'
import { BotaoLink } from '../components/Botao'
import { Vazio } from '../components/Estados'
import { useTituloDaPagina } from '../components/useTituloDaPagina'

export function NaoEncontradaPage() {
  useTituloDaPagina('Página não encontrada')
  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <h1>Página não encontrada</h1>
      </header>
      <div className="painel">
        <Vazio
          icone={IconMapOff}
          titulo="Este endereço não existe no sistema"
          acao={
            <BotaoLink to="/" icone={IconLayoutDashboard}>
              Ir para o painel
            </BotaoLink>
          }
        >
          Confira o endereço digitado ou use o menu para chegar aonde precisa.
        </Vazio>
      </div>
    </div>
  )
}
