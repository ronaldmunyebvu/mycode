import { defineConfig } from 'vite'

export default defineConfig({
  // Serve the project root as the root
  root: '.',
  // Dev server config
  server: {
    port: 3000,
    open: true,
  },
})
