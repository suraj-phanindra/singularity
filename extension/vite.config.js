import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-files',
      writeBundle() {
        // Copy manifest.json to dist
        copyFileSync('manifest.json', 'dist/manifest.json');

        // Copy the built HTML to root as popup.html
        const htmlSource = 'dist/src/popup/index.html';
        const htmlDest = 'dist/popup.html';
        if (existsSync(htmlSource)) {
          copyFileSync(htmlSource, htmlDest);
          console.log('✓ Copied popup.html to dist root');
        }

        // Copy icons if they exist
        if (existsSync('public/icons')) {
          mkdirSync('dist/icons', { recursive: true });
          const icons = ['icon-16.png', 'icon-48.png', 'icon-128.png'];
          icons.forEach(icon => {
            const iconPath = `public/icons/${icon}`;
            if (existsSync(iconPath)) {
              copyFileSync(iconPath, `dist/icons/${icon}`);
            }
          });
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        format: 'es',
        // Prevent code splitting for non-popup files
        manualChunks: (id, { getModuleInfo }) => {
          // Get the entry point that imports this module
          const moduleInfo = getModuleInfo(id);

          // If this is imported by a content script or background, inline it
          if (id.includes('content/') || id.includes('background/') ||
              id.includes('utils/platform-config') || id.includes('utils/storage')) {
            return null; // Don't create a chunk, inline it
          }

          // For popup, allow vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
});
