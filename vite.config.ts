import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /<repo-name>/
export default defineConfig({
  base: '/HOQ_AI_Matchmaker/',
  plugins: [react()],
});
