// Espelha o schema SupplierOut do backend (GET /suppliers)
export interface Fornecedor {
  id: number
  nome: string
  // Só os 14 números, ou null quando não informado (RN-06, RN-25)
  cnpj: string | null
  criado_em: string
}
