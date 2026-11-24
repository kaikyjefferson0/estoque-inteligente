// CT-115 a CT-120: CRUD de fornecedores com navegador, API e banco de verdade.
// Cada teste parte do mesmo seed (reset antes de cada um), então a ordem não importa.
import { urlDaApi } from '../support/api'
import { COM_PRODUTO, SEM_PRODUTO, TOTAL_DE_FORNECEDORES } from '../support/seed'

const deveTerFornecedores = (quantos: number) =>
  cy.dataCy('tabela-fornecedores').find('[data-cy^="fornecedor-"]').should('have.length', quantos)

describe('CRUD de fornecedores', () => {
  beforeEach(() => {
    cy.resetarBanco()
    cy.intercept('GET', urlDaApi('/suppliers?*')).as('listar')
    cy.intercept('POST', urlDaApi('/suppliers')).as('criar')
    cy.intercept('PUT', urlDaApi('/suppliers/*')).as('editar')
    cy.intercept('DELETE', urlDaApi('/suppliers/*')).as('excluir')
    cy.visitarComoAdmin('/fornecedores')
    deveTerFornecedores(TOTAL_DE_FORNECEDORES)
  })

  it('CT-115: lista os fornecedores do seed (READ)', () => {
    cy.get('@listar').its('response.statusCode').should('eq', 200)
    for (const fornecedor of [COM_PRODUTO, SEM_PRODUTO]) {
      cy.linhaDoFornecedor(fornecedor.id).within(() => {
        cy.dataCy('nome').should('have.text', fornecedor.nome)
        cy.dataCy('cnpj').should('have.text', fornecedor.cnpjNaTela)
      })
    }
  })

  it('CT-116: cadastra um fornecedor (CREATE)', () => {
    const novo = { nome: 'Frios da Serra', cnpj: '12345678000195' }
    cy.dataCy('btn-novo').click()
    cy.preencherFornecedor(novo)
    cy.dataCy('btn-salvar').click()

    cy.wait('@criar').then(({ request, response }) => {
      expect(request.body).to.deep.eq(novo)
      expect(response?.statusCode).to.eq(201)
      cy.linhaDoFornecedor(response?.body.id).within(() => {
        cy.dataCy('nome').should('have.text', novo.nome)
        cy.dataCy('cnpj').should('have.text', '12.345.678/0001-95')
      })
    })
    cy.dataCy('mensagem').should('be.visible').and('contain', 'Fornecedor cadastrado')
    deveTerFornecedores(TOTAL_DE_FORNECEDORES + 1)
  })

  it('CT-117: edita o nome e o CNPJ de um fornecedor (UPDATE)', () => {
    const editado = { nome: 'Atacado Boa Vista Sul', cnpj: '98765432000198' }
    cy.linhaDoFornecedor(SEM_PRODUTO.id).find('[data-cy="btn-editar"]').click()
    cy.dataCy('input-nome').should('have.value', SEM_PRODUTO.nome)
    cy.dataCy('input-cnpj').should('have.value', SEM_PRODUTO.cnpjNaTela)
    cy.preencherFornecedor(editado)
    cy.dataCy('btn-salvar').click()

    cy.wait('@editar').then(({ request, response }) => {
      expect(request.body).to.deep.eq(editado)
      expect(response?.statusCode).to.eq(200)
    })
    cy.dataCy('mensagem').should('be.visible').and('contain', 'Alterações salvas')
    cy.linhaDoFornecedor(SEM_PRODUTO.id).within(() => {
      cy.dataCy('nome').should('have.text', editado.nome)
      cy.dataCy('cnpj').should('have.text', '98.765.432/0001-98')
    })
    deveTerFornecedores(TOTAL_DE_FORNECEDORES)
  })

  it('CT-118: exclui um fornecedor sem produtos (DELETE)', () => {
    cy.linhaDoFornecedor(SEM_PRODUTO.id).find('[data-cy="btn-excluir"]').click()
    cy.dataCy('dialogo-confirmar').should('be.visible')
    cy.dataCy('titulo-dialogo').should('contain', SEM_PRODUTO.nome)
    cy.dataCy('btn-confirmar').click()

    cy.wait('@excluir').its('response.statusCode').should('eq', 204)
    cy.dataCy('dialogo-confirmar').should('not.exist')
    cy.dataCy('mensagem').should('be.visible').and('contain', `Fornecedor excluído: ${SEM_PRODUTO.nome}`)
    cy.linhaDoFornecedor(SEM_PRODUTO.id).should('not.exist')
    deveTerFornecedores(TOTAL_DE_FORNECEDORES - 1)
  })

  it('CT-119: não exclui um fornecedor com produtos (409, RN-59)', () => {
    cy.linhaDoFornecedor(COM_PRODUTO.id).find('[data-cy="btn-excluir"]').click()
    cy.dataCy('btn-confirmar').click()

    cy.wait('@excluir').its('response.statusCode').should('eq', 409)
    cy.dataCy('dialogo-confirmar').should('not.exist')
    cy.dataCy('mensagem-erro').should('be.visible').and('contain', COM_PRODUTO.nome).and('contain', 'tem 1 produto')
    cy.dataCy('mensagem').should('not.exist')
    cy.linhaDoFornecedor(COM_PRODUTO.id).should('be.visible')
    deveTerFornecedores(TOTAL_DE_FORNECEDORES)
  })

  it('CT-120: recusa CNPJ repetido no cadastro (409 no campo)', () => {
    cy.dataCy('btn-novo').click()
    cy.preencherFornecedor({ nome: 'Distribuidora repetida', cnpj: COM_PRODUTO.cnpj })
    cy.dataCy('btn-salvar').click()

    cy.wait('@criar').its('response.statusCode').should('eq', 409)
    cy.dataCy('erro-cnpj').should('be.visible').and('contain', 'já está cadastrado')
    cy.dataCy('input-cnpj').should('have.attr', 'aria-invalid', 'true').and('have.focus')
    // Continua no formulário, e nada foi gravado
    cy.location('pathname').should('eq', '/fornecedores/novo')
    cy.dataCy('btn-cancelar').click()
    deveTerFornecedores(TOTAL_DE_FORNECEDORES)
  })
})
