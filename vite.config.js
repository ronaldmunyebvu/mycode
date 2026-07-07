import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin.html',
        mymanager: './mymanager.html',
        welcome: './welcome.html',
        manage: './manage.html',
      },
    },
  },
})
