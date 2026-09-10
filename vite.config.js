import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    allowedHosts: ['stagingstore.bfc.net.ph', 'store.butfirstcoffee.ph', 'staging-store.butfirstcoffee.ph', 'localhost', '127.0.0.1'],
    fs: {
      ignore: ['**/.git/**'],
    },
  },
});
