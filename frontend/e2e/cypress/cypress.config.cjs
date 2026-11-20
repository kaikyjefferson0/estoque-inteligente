const { defineConfig } = require('cypress')
const { spawnSync } = require('node:child_process')
const path = require('node:path')

const backend = path.resolve(__dirname, '../../../backend')

module.exports = defineConfig({
  video: false,
  screenshotOnRunFailure: false,
  env: {
    senhaAdmin: process.env.E2E_SENHA_ADMIN,
    senhaOperador: process.env.E2E_SENHA_OPERADOR,
    senhaNovoUsuario: process.env.E2E_SENHA_USUARIO,
  },
  e2e: {
    baseUrl: process.env.E2E_SITE,
    supportFile: false,
    specPattern: 'usuarios.cy.js',
    taskTimeout: 60_000,
    setupNodeEvents(on) {
      on('task', {
        resetarBanco() {
          const preparo = spawnSync(process.env.E2E_PYTHON, ['-m', 'tests.e2e_preparar'], {
            cwd: backend,
            env: process.env,
            stdio: 'inherit',
          })
          if (preparo.error) throw preparo.error
          if (preparo.status !== 0) throw new Error('Falha ao recriar o banco E2E.')
          return null
        },
      })
    },
  },
})
