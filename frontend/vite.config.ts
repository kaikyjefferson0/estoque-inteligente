import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Tailwind v4 (integração oficial para Vite): processa o src\styles\tailwind.css
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Fuso do "computador" bem longe de Brasília: as datas da tela não podem depender dele
    env: { TZ: 'Asia/Tokyo' },
    restoreMocks: true,
    unstubGlobals: true,
  },
})
