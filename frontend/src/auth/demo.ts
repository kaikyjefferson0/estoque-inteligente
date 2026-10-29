// RN-53 e RN-55: conta de demonstração, mostrada no login só quando VITE_DEMO está ligada
export interface ContaDemo {
  email: string
  senha: string
}

type Ambiente = Partial<Record<'VITE_DEMO' | 'VITE_DEMO_EMAIL' | 'VITE_DEMO_SENHA', string>>

/** Devolve a conta de demonstração, ou null se o modo está desligado ou incompleto. */
export function lerContaDemo(ambiente: Ambiente): ContaDemo | null {
  if ((ambiente.VITE_DEMO ?? '').trim().toLowerCase() !== 'true') return null
  const email = (ambiente.VITE_DEMO_EMAIL ?? '').trim()
  const senha = ambiente.VITE_DEMO_SENHA ?? ''
  return email && senha ? { email, senha } : null
}

export const CONTA_DEMO = lerContaDemo({
  VITE_DEMO: import.meta.env.VITE_DEMO,
  VITE_DEMO_EMAIL: import.meta.env.VITE_DEMO_EMAIL,
  VITE_DEMO_SENHA: import.meta.env.VITE_DEMO_SENHA,
})
