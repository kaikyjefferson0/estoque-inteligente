import { defineConfig, devices } from '@playwright/test'

// Rodado pelo e2e\rodar.mjs (npm run test:e2e), que sobe a API e o site antes.
// Sem trace e sem vídeo: o trace guardaria as senhas digitadas, e elas não podem ir para arquivo.

// O rodar.mjs chama o Playwright uma vez por arquivo, e cada rodada limpa a própria saída.
// Com uma pasta por etapa, a segunda rodada não apaga o que a primeira guardou.
const etapa = process.env.E2E_ETAPA ?? 'avulso'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: `../test-results/e2e/${etapa}`,
  // Os cenários seguem uma história (cadastro, entrada, saída...) no mesmo banco
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // O relatório HTML só existe no CI, onde vira artifact numa falha. Ele guarda o que foi digitado:
  // o rodar.mjs troca as senhas por *** (backend\tests\e2e_limpar_relatorio.py)
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: `../playwright-report/${etapa}`, open: 'never' }]]
    : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.E2E_SITE,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    // Uma ação que não acontece falha logo, em vez de esperar o tempo do teste inteiro
    actionTimeout: 10_000,
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
})
