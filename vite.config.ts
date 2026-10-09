import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? '/NO-ESCUCHES/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: [
        '**/*.tsbuildinfo',
        '**/docs/**',
        '**/validation/**',
        '**/test-results/**',
        '**/playwright-report/**',
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          validation: ['zod'],
          motion: ['gsap'],
        },
      },
    },
  },
}));
