/** Endereço de uma rota da API do teste. */
export const urlDaApi = (caminho: string): string => `${Cypress.expose('API')}${caminho}`
