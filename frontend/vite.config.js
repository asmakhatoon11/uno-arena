import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from root or frontend directory
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const port = parseInt(env.FRONTEND_PORT || '3000', 10);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    server: {
      port,
      host: true,
      open: false,
    },
  };
});
