import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(process.env.ANALYZE === 'true'
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
            open: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          if (id.includes('react-router')) {
            return 'vendor-router'
          }
          if (id.includes('firebase')) {
            return 'vendor-firebase'
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase'
          }
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts'
          }
          if (id.includes('framer-motion')) {
            return 'vendor-motion'
          }
          if (id.includes('pdfjs-dist')) {
            return 'vendor-pdfjs'
          }
          if (id.includes('html2pdf.js')) {
            return 'vendor-html2pdf'
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }

          return 'vendor-misc'
        },
      },
    },
  },
})
