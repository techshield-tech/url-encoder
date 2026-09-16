import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this app from https://techshield-tech.github.io/url-encoder/
  // so all built asset URLs must be prefixed with the repo name.
  base: '/url-encoder/',
  plugins: [react(), tailwindcss()],
});
