import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'WebGPUASCIIRenderer',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'index.js';
        if (format === 'cjs') return 'index.cjs';
        return 'index.js';
      },
    },
    rollupOptions: {
      output: {
        globals: {},
      },
    },
    target: 'esnext',
  },
  plugins: [
    dts({
      rollupTypes: true,
      include: ['src/**/*'],
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  assetsInclude: ['**/*.glb'],
});
