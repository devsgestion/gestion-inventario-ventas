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
      ],
      // Reducir el uso de CPU
      usePolling: false,
    },
    // Configuración de HMR más estable
    hmr: {
      overlay: true,
    },
  },
  // Optimizar dependencias
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
