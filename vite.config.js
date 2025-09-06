import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // ⚠️ Caminhos relativos para assets
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'; // separa libs externas em um chunk
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // opcional, para silenciar warning >500 KB
  },
});
