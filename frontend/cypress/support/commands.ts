// Comandos customizados: deixam os testes legíveis e evitam repetição
import { urlDaApi } from './api'
import { EMAIL_ADMIN } from './seed'

// A mesma chave de src/auth/token.ts
const CHAVE_DO_TOKEN = 'estoque.token'

declare global {
  namespace Cypress {
    interface Chainable {
      /** Elemento com o atributo data-cy igual a `nome`: não quebra se o CSS ou o texto mudar. */
      dataCy(nome: string): Chainable<JQuery<HTMLElement>>
      /** Volta o banco ao seed (rota que só existe no ambiente do teste, RN-67). */
      resetarBanco(): Chainable<void>
      /** Entra como admin pela API e abre a página já com o token, sem passar pela tela de login. */
      visitarComoAdmin(caminho: string): Chainable<void>
      /** Linha de um fornecedor na lista. */
      linhaDoFornecedor(id: number): Chainable<JQuery<HTMLElement>>
      /** Preenche o formulário de fornecedor, apagando o que estiver nos campos. */
      preencherFornecedor(dados: { nome: string; cnpj: string }): Chainable<void>
    }
  }
}

Cypress.Commands.add('dataCy', (nome) => cy.get(`[data-cy="${nome}"]`))

Cypress.Commands.add('resetarBanco', () => {
  cy.request({ method: 'POST', url: urlDaApi('/_test/reset'), headers: { 'X-E2E-Reset': '1' } }).its('status').should('eq', 204)
})

Cypress.Commands.add('visitarComoAdmin', (caminho) => {
  // log: false e failOnStatusCode: false deixam a senha fora do painel, da captura e da mensagem de erro
  cy.env(['SENHA_ADMIN'], { log: false }).then(({ SENHA_ADMIN }) => {
    cy.request({
      method: 'POST',
      url: urlDaApi('/auth/login'),
      form: true,
      body: { username: EMAIL_ADMIN, password: SENHA_ADMIN },
      log: false,
      failOnStatusCode: false,
    }).then(({ status, body }) => {
      expect(status, 'status do login pela API').to.eq(200)
      cy.visit(caminho, {
        onBeforeLoad: (janela) => janela.sessionStorage.setItem(CHAVE_DO_TOKEN, body.access_token),
      })
    })
  })
})

Cypress.Commands.add('linhaDoFornecedor', (id) => cy.dataCy(`fornecedor-${id}`))

Cypress.Commands.add('preencherFornecedor', ({ nome, cnpj }) => {
  cy.dataCy('input-nome').clear()
  cy.dataCy('input-nome').type(nome)
  cy.dataCy('input-cnpj').clear()
  cy.dataCy('input-cnpj').type(cnpj)
})
