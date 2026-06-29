import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path: '/chainfund/' when building for GitHub Pages (project site),
// '/' for local dev and custom-domain hosting.
export default defineConfig({
  base: process.env.GH_PAGES ? '/chainfund/' : '/',
  plugins: [react()],
})
