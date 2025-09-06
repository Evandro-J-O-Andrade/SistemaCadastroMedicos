import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // Caminhos relativos para evitar erros de rota
  plugins: [react()],
})
