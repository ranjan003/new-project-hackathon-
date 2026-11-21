// Standalone Vite config for running outside Figma Make (pnpm dev / pnpm build / Vercel).
// The original Make config is kept as vite.config.figma-make.ts; it needs .figma/make/site.json,
// which only exists inside Figma Make.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
