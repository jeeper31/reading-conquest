import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev` / `npm run preview` serve on http://localhost (a secure context, so the mic works).
// Set HTTPS=1 to serve with a self-signed cert so other devices on the LAN (e.g. the Chromebook)
// can use the microphone, which browsers only allow on https:// or localhost.
export default defineConfig({
  base: './',
  plugins: process.env.HTTPS ? [basicSsl()] : [],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { chunkSizeWarningLimit: 2000 },
});
