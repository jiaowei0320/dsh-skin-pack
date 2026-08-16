/**
 * Build dsh-skin-pack with esbuild (resolved from the linked harness store).
 *
 * Outputs:
 *   lib/index.js   — host half, ESM, for the Node-side Cordis Loader.
 *   lib/client.js  — browser half, the __ModuleLoader__ closure-factory
 *                    artifact (lazy CJS table): window.__ModuleLoader__.load
 *                    ({ id, factory: (require) => {...} }) with react and
 *                    react/jsx-runtime resolved from the platform module table.
 *
 * Declarations come from `tsc -p tsconfig.build.json` (see package.json build).
 */
import { build } from 'esbuild'

const PKG = 'dsh-skin-pack'

// Host half. Type-only cordis import means zero runtime externals.
await build({
  entryPoints: { index: 'src/index.ts' },
  outdir: 'lib',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  sourcemap: true,
  logLevel: 'info',
})

// Client half: closure-factory artifact for the browser module loader.
await build({
  entryPoints: { client: 'src/client/index.tsx' },
  outdir: 'lib',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  sourcemap: true,
  // Platform seed entries — the frozen module table answers these requires.
  external: ['react', 'react/jsx-runtime'],
  banner: {
    js: [
      `window.__ModuleLoader__.load({ id: ${JSON.stringify(PKG)}, factory: (require) => {`,
      'var module = { exports: {} }; var exports = module.exports;',
    ].join('\n'),
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

console.log('built lib/index.js + lib/client.js')
