import { defineConfig } from 'tsdown'

// Self-contained bundle for the plugin. The harness build pipeline
// (`pnpm run build:lib:client` inside a deepseek-harness workspace) is the
// authoritative producer of lib/client.js; this config lets the repo build
// standalone when the harness packages are available (workspace or git dep).
export default defineConfig({
  entry: [
    'src/index.ts',
    'src/invariant.ts',
    'src/client/index.ts',
  ],
  outDir: 'lib',
  format: 'esm',
  target: 'es2022',
  dts: false,
  clean: false,
})
