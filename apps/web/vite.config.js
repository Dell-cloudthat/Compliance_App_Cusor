import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // When deployed to GitHub Pages the app lives at /<repo-name>/
  // VITE_BASE_PATH is set in the GitHub Actions workflow; local dev uses '/'
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

