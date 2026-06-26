import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/bvm.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  bundle: true,
})
