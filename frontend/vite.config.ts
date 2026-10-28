import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    // Fuso do "computador" bem longe de Brasília: as datas da tela não podem depender dele
    env: { TZ: 'Asia/Tokyo' },
    restoreMocks: true,
    unstubGlobals: true,
  },
})
