import { defineConfig } from 'vite'
import glslify from 'rollup-plugin-glslify'
import * as path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: 'src',
  base: './',
  optimizeDeps: { disabled: true },
  build: {
    outDir: '../dist',
  },
  server: {
    host: '127.0.0.1',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [glslify()],
})
