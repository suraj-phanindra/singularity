import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/background.js'),
        'content-claude': resolve(__dirname, 'src/content/claude.js'),
        'content-chatgpt': resolve(__dirname, 'src/content/chatgpt.js'),
        'content-gemini': resolve(__dirname, 'src/content/gemini.js'),
        'content-perplexity': resolve(__dirname, 'src/content/perplexity.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
