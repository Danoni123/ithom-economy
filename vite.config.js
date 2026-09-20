import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — чтобы собранный сайт (dist) открывался из любой папки / хостинга
export default defineConfig({
  plugins: [react()],
  base: './',
})
