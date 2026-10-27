/** Região viva, invisível, que anuncia ao leitor de tela o resumo dos erros do formulário. */
export function AnuncioDeErros({ mensagem }: { mensagem: string }) {
  return (
    <div className="visualmente-oculto" role="status" aria-live="polite" aria-atomic="true">
      {mensagem}
    </div>
  )
}
