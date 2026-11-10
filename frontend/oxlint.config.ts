// Configuração do oxlint (npm run lint). Substitui o antigo .oxlintrc.json, com as mesmas regras,
// e acrescenta a checagem de classes do Tailwind pelo eslint-plugin-better-tailwindcss (jsPlugins).
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'oxlint'

const FRONTEND = import.meta.dirname
const SRC = path.join(FRONTEND, 'src')

/**
 * Classes do próprio projeto: todo seletor .classe dos arquivos .css do src.
 * A lista sai do CSS que existe hoje: quando uma tela migrar e o CSS dela for apagado,
 * as classes antigas que sobrarem no TSX passam a dar erro.
 */
function classesDoProjeto(): string[] {
  const classes = new Set<string>()
  for (const entrada of readdirSync(SRC, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile() || !entrada.name.endsWith('.css')) continue
    const css = readFileSync(path.join(entrada.parentPath, entrada.name), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const achado of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(achado[1])
  }
  return [...classes]
}

// Classes usadas no TSX que nenhum CSS define (não têm efeito visual).
// Ficam até a migração da tela, quando são removidas ou ganham estilo.
const CLASSES_SEM_CSS = [
  'ajuste',
  'aviso__texto',
  'estoque__minimo',
  'estoque__produto',
  'estoque__saldo',
  'fornecedores',
  'produtos',
  'produtos__fornecedor',
  'produtos__minimo',
  'produtos__nome',
  'registro__painel',
  'registro__validade',
]

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const conhecidas = [...classesDoProjeto(), ...CLASSES_SEM_CSS].map(escapar).join('|')

export default defineConfig({
  plugins: ['react', 'typescript', 'oxc'],
  jsPlugins: ['eslint-plugin-better-tailwindcss'],
  settings: {
    // A configuração do Tailwind v4 é o próprio CSS: o plugin conhece só as classes que ele gera
    'better-tailwindcss': { entryPoint: path.join(SRC, 'styles', 'tailwind.css') },
  },
  rules: {
    'react/rules-of-hooks': 'error',
    'react/only-export-components': ['warn', { allowConstantExport: true }],
    // Classe que o Tailwind não gera (ex.: p-4, bg-blue-500) e que não é do CSS do projeto
    'better-tailwindcss/no-unknown-classes': ['error', { ignore: [`^(?:${conhecidas})$`] }],
    'better-tailwindcss/no-restricted-classes': [
      'error',
      {
        restrict: [
          { pattern: '\\[', message: 'Valor arbitrário: use um token do theme.css.' },
          { pattern: '\\(--', message: 'Variável arbitrária: registre o token no tailwind.css.' },
          // 1px fixo do próprio Tailwind: fica fora da escala de 4px
          { pattern: '-px$', message: 'Fora da escala de 4px: use p-esp-1 a p-esp-7.' },
        ],
      },
    ],
  },
})
