import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite ignore la variable PORT par défaut : sans cela, un hébergeur ou un
  // outil qui impose un port via l'environnement se retrouve avec un serveur
  // écoutant ailleurs.
  server: {
    port: Number(process.env.PORT) || 5175,
  },
})
