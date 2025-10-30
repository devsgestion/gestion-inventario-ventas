import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Ignorar archivos que no necesitan vigilancia
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/.vscode/**',
        '**/*.md',
        '**/docs/**',
        '**/.env*',
      ],
      // Reducir el uso de CPU
      usePolling: false,
    },
    // Configuración de HMR más estable
    hmr: {
      overlay: true,
      // Reducir la frecuencia de actualizaciones
      timeout: 30000,
    },
    // Configuración adicional para estabilidad
    fs: {
      strict: false,
    },
  },
  // Optimizar dependencias
  optimizeDeps: {
    exclude: ['lucide-react'],
    // Incluir dependencias comunes para evitar re-bundling
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  // Configuración de build más estable
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
