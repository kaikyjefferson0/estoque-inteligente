import { defineConfig, devices } from '@playwright/test'

// Rodado pelo e2e\rodar.mjs (npm run test:e2e), que sobe a API e o site antes.
// Sem trace e sem vídeo: o trace guardaria as senhas digitadas, e elas não podem ir para arquivo.
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: '../test-results/e2e',
  // Os cenários seguem uma história (cadastro, entrada, saída...) no mesmo banco
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
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
