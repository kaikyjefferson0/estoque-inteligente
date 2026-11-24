// O estado do banco depois de cada reset: os mesmos valores do _criar_seed e do EMAIL_ADMIN em
// backend/app/services/e2e_reset.py. Os ids são fixos porque o reset recomeça a contagem.
export const EMAIL_ADMIN = 'admin.e2e@exemplo.com.br'

export const COM_PRODUTO = { id: 1, nome: 'Distribuidora Central', cnpj: '11222333000181', cnpjNaTela: '11.222.333/0001-81' }
export const SEM_PRODUTO = { id: 2, nome: 'Atacado Boa Vista', cnpj: '45987321000110', cnpjNaTela: '45.987.321/0001-10' }
export const TOTAL_DE_FORNECEDORES = 2
