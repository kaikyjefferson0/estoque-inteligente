import { defineConfig } from 'cypress'

// Rodado pelo cypress/rodar.mjs (npm run cy:e2e ou npm run cy:open), que sobe a API e o site antes
// e passa por variável de ambiente os endereços e a senha do admin, gerada na hora.
export default defineConfig({
  e2e: {
    baseUrl: process.env.E2E_SITE ?? 'http://localhost:5175',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    // Segredo: só o cy.env() lê
    env: { SENHA_ADMIN: process.env.E2E_SENHA_ADMIN },
    expose: { API: process.env.E2E_API ?? 'http://127.0.0.1:8001' },
  },
  // Sem vídeo: ele gravaria o que é digitado
  video: false,
  screenshotOnRunFailure: true,
  screenshotsFolder: 'cypress/screenshots',
  viewportWidth: 1280,
  viewportHeight: 900,
  // Um teste que só passa na segunda tentativa está quebrado
  retries: 0,
})
