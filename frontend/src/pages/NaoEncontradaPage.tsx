import { IconMapOff } from '@tabler/icons-react'
import { BotaoLink } from '../components/Botao'
import { Vazio } from '../components/Estados'

export function NaoEncontradaPage() {
  return (
    <div className="pagina">
      <div className="painel">
        <Vazio icone={IconMapOff} titulo="Esta página não existe" acao={<BotaoLink to="/">Voltar ao dashboard</BotaoLink>}>
          Confira o endereço ou use o menu para chegar aonde precisa.
        </Vazio>
      </div>
    </div>
  )
}
