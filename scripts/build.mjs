import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const root = process.cwd();
const distDir = path.resolve(root, 'dist');

async function run() {
  console.log('[PromptPilot Build] Starting build...');

  // Ensure fresh dist folder
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Build Pages (Popup & Options)
  console.log('[PromptPilot Build] 1/3 Building Popup & Options pages...');
  await build({
    root,
    plugins: [react()],
    base: '',
    build: {
      outDir: distDir,
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: path.resolve(root, 'src/pages/popup/index.html'),
          options: path.resolve(root, 'src/pages/options/index.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
  });

  // Flatten html files to dist/popup.html and dist/options.html
  const popupHtmlSrc = path.resolve(distDir, 'src/pages/popup/index.html');
  const optionsHtmlSrc = path.resolve(distDir, 'src/pages/options/index.html');
  if (fs.existsSync(popupHtmlSrc)) {
    let content = fs.readFileSync(popupHtmlSrc, 'utf-8');
    content = content.replace(/\.\.\/\.\.\/\.\.\/assets\//g, './assets/');
    fs.writeFileSync(path.resolve(distDir, 'popup.html'), content);
  }
  if (fs.existsSync(optionsHtmlSrc)) {
    let content = fs.readFileSync(optionsHtmlSrc, 'utf-8');
    content = content.replace(/\.\.\/\.\.\/\.\.\/assets\//g, './assets/');
    fs.writeFileSync(path.resolve(distDir, 'options.html'), content);
  }
  // Remove temporary src folder in dist
  const distSrcDir = path.resolve(distDir, 'src');
  if (fs.existsSync(distSrcDir)) {
    fs.rmSync(distSrcDir, { recursive: true, force: true });
  }

  // 2. Build Background Service Worker (ES module)
  console.log('[PromptPilot Build] 2/3 Building Background Service Worker...');
  await build({
    root,
    base: '',
    build: {
      outDir: distDir,
      emptyOutDir: false,
      lib: {
        entry: path.resolve(root, 'src/background/index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  // 3. Build Content Script (IIFE for safe execution in host pages)
  console.log('[PromptPilot Build] 3/3 Building Content Script...');
  await build({
    root,
    plugins: [react()],
    base: '',
    build: {
      outDir: distDir,
      emptyOutDir: false,
      rollupOptions: {
        input: path.resolve(root, 'src/content/index.ts'),
        output: {
          format: 'iife',
          name: 'PromptPilotContent',
          entryFileNames: 'content.js',
          inlineDynamicImports: true,
        },
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
  });

  // 4. Copy manifest and icons
  console.log('[PromptPilot Build] Copying manifest and icons...');
  fs.copyFileSync(
    path.resolve(root, 'public/manifest.json'),
    path.resolve(distDir, 'manifest.json')
  );

  const iconsSrcDir = path.resolve(root, 'public/icons');
  const iconsDistDir = path.resolve(distDir, 'icons');
  if (fs.existsSync(iconsSrcDir)) {
    fs.mkdirSync(iconsDistDir, { recursive: true });
    for (const file of fs.readdirSync(iconsSrcDir)) {
      fs.copyFileSync(path.join(iconsSrcDir, file), path.join(iconsDistDir, file));
    }
  }

  console.log('✅ [PromptPilot Build] Extension build complete in dist/ directory!');
}

run().catch((err) => {
  console.error('❌ [PromptPilot Build] Build failed:', err);
  process.exit(1);
});
