const emailAdmin = 'admin.e2e@exemplo.com.br'
const emailOperador = 'operador.e2e@exemplo.com.br'
const emailNovo = 'novo.e2e@exemplo.com.br'

const campo = (seletor) => cy.get(`[data-cy="${seletor}"]`)
const linha = (email) => cy.get(`[data-cy="usuario-linha"][data-email="${email}"]`)

function entrar(email, senha) {
  campo('login-email').type(email)
  campo('login-senha').type(senha, { log: false })
  campo('login-enviar').click()
}

function cadastrar(email) {
  cy.visit('/usuarios/novo')
  campo('usuario-nome').type('Novo operador')
  campo('usuario-email').type(email)
  campo('usuario-senha').type(Cypress.env('senhaNovoUsuario'), { log: false })
  campo('usuario-confirmacao').type(Cypress.env('senhaNovoUsuario'), { log: false })
  campo('usuario-salvar').click()
}

describe('Cadastro de usuários', () => {
  beforeEach(() => {
    cy.task('resetarBanco')
    cy.visit('/usuarios')
    entrar(emailAdmin, Cypress.env('senhaAdmin'))
    cy.location('pathname').should('eq', '/usuarios')
  })

  it('cadastra um operador', () => {
    cy.intercept('POST', '**/users').as('cadastro')
    cadastrar(emailNovo)
    cy.wait('@cadastro').its('response.statusCode').should('eq', 201)
    linha(emailNovo).should('contain.text', 'Novo operador')
  })

  it('consulta o operador cadastrado no reset', () => {
    linha(emailOperador).should('contain.text', 'Operador E2E')
  })

  it('edita o nome do operador', () => {
    linha(emailOperador).find('[data-cy="usuario-editar"]').click()
    campo('usuario-nome').clear().type('Operador atualizado')
    campo('usuario-salvar').click()
    linha(emailOperador).should('contain.text', 'Operador atualizado')
  })

  it('desativa o operador e bloqueia o login', () => {
    linha(emailOperador).find('[data-cy="usuario-editar"]').click()
    campo('usuario-ativo').uncheck()
    campo('usuario-salvar').click()
    campo('dialogo-confirmar').click()
    linha(emailOperador).should('have.attr', 'data-inativo', 'true')

    cy.intercept('POST', '**/auth/login').as('loginOperador')
    cy.visit('/login', { onBeforeLoad: (janela) => janela.sessionStorage.clear() })
    entrar(emailOperador, Cypress.env('senhaOperador'))
    cy.wait('@loginOperador').its('response.statusCode').should('eq', 401)
  })

  it('mostra o erro de e-mail repetido', () => {
    cy.intercept('POST', '**/users').as('duplicado')
    cadastrar(emailOperador)
    cy.wait('@duplicado').its('response.statusCode').should('eq', 409)
    campo('usuario-email').should('have.attr', 'aria-invalid', 'true')
  })
})
