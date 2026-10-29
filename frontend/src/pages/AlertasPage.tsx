import { IconBellCheck, IconBellRinging, IconBuildingWarehouse } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, mensagemDeErro } from '../api/client'
import { montarCaminho } from '../api/caminho'
import { useRecurso } from '../api/useRecurso'
import { useAlertasAtivos } from '../alertas/useAlertasAtivos'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { CaixaDeMarcar } from '../components/CaixaDeMarcar'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { Metadados, NomeEmLista } from '../components/Metadados'
import { Paginacao } from '../components/Paginacao'
import { PARAMETRO_PAGINA, usePaginaNaUrl } from '../components/usePaginaNaUrl'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { Alerta, GeracaoDeAlertas, TipoAlerta } from '../types/alerta'
import type { Pagina } from '../types/pagina'
import type { Situacao } from '../types/situacao'
import { formatarDataHora, formatarNumero, formatarTempoDecorrido, plural } from '../utils/formato'
import { descreverLote } from '../utils/situacao'
import './AlertasPage.css'

// RN-13 a RN-15: vencido é crítico; vencimento próximo e estoque baixo pedem atenção
const TIPO: Record<TipoAlerta, { rotulo: string; etiqueta: Situacao }> = {
  vencido: { rotulo: 'Vencido', etiqueta: 'critico' },
  vencimento_proximo: { rotulo: 'Vencimento próximo', etiqueta: 'atencao' },
  estoque_baixo: { rotulo: 'Estoque baixo', etiqueta: 'atencao' },
}

type Filtro = 'todos' | TipoAlerta

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'vencido', rotulo: 'Vencido' },
  { valor: 'vencimento_proximo', rotulo: 'Vencimento próximo' },
  { valor: 'estoque_baixo', rotulo: 'Estoque baixo' },
]

function lerFiltro(valor: string | null): Filtro {
  return valor === 'vencido' || valor === 'vencimento_proximo' || valor === 'estoque_baixo' ? valor : 'todos'
}

function descreverGeracao({ criados, resolvidos }: GeracaoDeAlertas): string {
  if (criados === 0 && resolvidos === 0) return 'Nada mudou desde a última verificação.'
  const partes = []
  if (criados > 0) partes.push(`${formatarNumero(criados)} ${plural(criados, 'alerta criado', 'alertas criados')}`)
  if (resolvidos > 0) partes.push(`${formatarNumero(resolvidos)} ${plural(resolvidos, 'resolvido', 'resolvidos')}`)
  return `${partes.join(' e ')}.`
}

function ItemAlerta({ alerta }: { alerta: Alerta }) {
  const { rotulo, etiqueta } = TIPO[alerta.tipo]
  const resolvido = alerta.resolvido_em !== null
  return (
    <li className={`alerta etiqueta etiqueta--${etiqueta}`} data-resolvido={resolvido || undefined}>
      {/* O item inteiro leva ao produto: nome numa linha própria, etiquetas embaixo */}
      <Link to={`/produtos/${alerta.produto_id}`} className="alerta__link">
        <NomeEmLista nome={alerta.produto_nome} className="alerta__produto" />
        <Metadados
          itens={[
            { rotulo: 'Tipo', valor: rotulo, className: 'alerta__tipo' },
            alerta.validade ? { rotulo: 'Lote', valor: descreverLote(alerta.validade) } : null,
            // RN-39: o resolvido continua na lista, com a data em que a condição deixou de existir
            alerta.resolvido_em
              ? {
                  rotulo: 'Resolvido em',
                  rotuloVisivel: true,
                  valor: <time dateTime={alerta.resolvido_em}>{formatarDataHora(alerta.resolvido_em)}</time>,
                }
              : {
                  rotulo: 'Aberto',
                  valor: (
                    <time dateTime={alerta.criado_em} title={formatarDataHora(alerta.criado_em)}>
                      {formatarTempoDecorrido(alerta.criado_em)}
                    </time>
                  ),
                },
          ]}
        />
      </Link>
    </li>
  )
}

// RN-43: admin e operador veem e verificam os alertas
export function AlertasPage() {
  useTituloDaPagina('Alertas')
  const { atualizarAlertas } = useAlertasAtivos()
  const [parametros, setParametros] = useSearchParams()
  const [filtro, setFiltro] = useState(() => lerFiltro(parametros.get('tipo')))
  const [resolvidos, setResolvidos] = useState(() => parametros.get('resolvidos') === 'sim')

  const { limite, deslocamento, irPara } = usePaginaNaUrl()
  const caminho = montarCaminho('/alerts', {
    tipo: filtro === 'todos' ? null : filtro,
    incluir_resolvidos: resolvidos,
    limite,
    deslocamento: deslocamento || null,
  })
  const { dados, erro, carregando, recarregar } = useRecurso<Pagina<Alerta>>(caminho)

  const [verificando, setVerificando] = useState(false)
  const [resultado, setResultado] = useState<{ situacao: Situacao; texto: string } | null>(null)

  // Filtro e "mostrar resolvidos" ficam no endereço para sobreviver ao "voltar" do navegador
  function mudar(chave: 'tipo' | 'resolvidos', valor: string) {
    if (chave === 'tipo') setFiltro(lerFiltro(valor))
    else setResolvidos(valor === 'sim')
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        if (valor && valor !== 'todos' && valor !== 'nao') novos.set(chave, valor)
        else novos.delete(chave)
        novos.delete(PARAMETRO_PAGINA)
        return novos
      },
      { replace: true },
    )
  }

  async function verificarAgora() {
    setVerificando(true)
    setResultado(null)
    try {
      const geracao = await api<GeracaoDeAlertas>('/alerts/generate', { method: 'POST' })
      setResultado({ situacao: 'ok', texto: descreverGeracao(geracao) })
      recarregar()
      atualizarAlertas()
    } catch (e) {
      setResultado({ situacao: 'critico', texto: mensagemDeErro(e) })
    } finally {
      setVerificando(false)
    }
  }

  // A API já manda os ativos primeiro e, em cada grupo, do mais recente ao mais antigo
  const alertas = dados?.itens ?? []
  const total = dados?.total ?? 0
  const trocando = carregando && dados !== null

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Alertas</h1>
          <p className="pagina__apoio">Lotes vencidos, vencimentos próximos e estoque baixo</p>
        </div>
        <div className="pagina__acoes">
          <Botao
            variante="primaria"
            icone={IconBellRinging}
            onClick={verificarAgora}
            carregando={verificando}
            textoCarregando="Verificando…"
          >
            Verificar agora
          </Botao>
        </div>
      </header>

      {resultado && (
        <Aviso situacao={resultado.situacao}>
          <p>
            {resultado.situacao === 'ok' && <strong>Verificação concluída. </strong>}
            {resultado.texto}
          </p>
        </Aviso>
      )}

      <div className="alertas__filtros">
        <fieldset className="segmentos">
          <legend className="visualmente-oculto">Tipo de alerta</legend>
          {FILTROS.map((f) => (
            <label key={f.valor} className="segmentos__opcao">
              <input
                type="radio"
                name="tipo"
                value={f.valor}
                checked={filtro === f.valor}
                onChange={() => mudar('tipo', f.valor)}
              />
              <span>{f.rotulo}</span>
            </label>
          ))}
        </fieldset>
        <CaixaDeMarcar
          rotulo="Mostrar resolvidos"
          name="resolvidos"
          checked={resolvidos}
          onChange={(e) => mudar('resolvidos', e.target.checked ? 'sim' : 'nao')}
        />
        {dados && (trocando || total > 0) && (
          <p className="alertas__contagem" role="status">
            {trocando
              ? 'Carregando…'
              : resolvidos
                ? `${formatarNumero(total)} ${plural(total, 'alerta', 'alertas')}, entre ativos e resolvidos`
                : `${formatarNumero(total)} ${plural(total, 'alerta ativo', 'alertas ativos')}`}
          </p>
        )}
      </div>

      {!dados && carregando && <Carregando texto="Carregando os alertas…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados && !trocando && total === 0 && (
        <div className="painel">
          {filtro === 'todos' ? (
            <Vazio
              icone={IconBellCheck}
              titulo={resolvidos ? 'Nenhum alerta registrado' : 'Nenhum alerta ativo'}
              acao={
                <BotaoLink to="/estoque" icone={IconBuildingWarehouse}>
                  Ver estoque
                </BotaoLink>
              }
            >
              Na última verificação, nenhum produto estava abaixo do mínimo e nenhum lote estava vencido ou perto de vencer.
            </Vazio>
          ) : (
            <Vazio
              icone={IconBellCheck}
              titulo={`Nenhum alerta de ${TIPO[filtro].rotulo.toLowerCase()} ${resolvidos ? 'registrado' : 'ativo'}`}
              acao={<Botao onClick={() => mudar('tipo', 'todos')}>Ver todos os tipos</Botao>}
            >
              Os alertas dos outros tipos continuam em “Todos”.
            </Vazio>
          )}
        </div>
      )}

      {alertas.length > 0 && (
        <div className="alertas__painel" aria-busy={trocando}>
          <ul className="alertas" aria-label={resolvidos ? 'Alertas ativos e resolvidos' : 'Alertas ativos'}>
            {alertas.map((alerta) => (
              <ItemAlerta key={alerta.id} alerta={alerta} />
            ))}
          </ul>
        </div>
      )}

      {total > 0 && (
        <Paginacao total={total} limite={limite} deslocamento={deslocamento} aoMudar={irPara} nomeDaLista="alertas" />
      )}
    </div>
  )
}
