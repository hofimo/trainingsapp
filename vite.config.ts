import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base, damit die App unter jedem Pfad läuft (z. B. GitHub Pages /trainingsapp/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
