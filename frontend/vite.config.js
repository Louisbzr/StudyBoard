import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')  // Charge .env
  
  return {
    plugins: [
      react({
        include: '**/*.{js,jsx}',
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
        port: 3000,
        proxy: {
            '/api': {
            target: 'http://127.0.0.1:8000',
            }
        }
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    define: {
      'process.env': process.env,
    },
  }
})
