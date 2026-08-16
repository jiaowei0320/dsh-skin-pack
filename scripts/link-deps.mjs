/**
 * Dev-only scaffolding: link the deepseek-harness workspace packages into
 * this plugin's node_modules so esbuild (build) and tsc (type-check) can
 * resolve `@deepseek-ai/*`, `react`, and `esbuild` without publishing or
 * installing anything.
 *
 * Run: node scripts/link-deps.mjs
 * Nothing here ships in the plugin (see package.json "files").
 */
import { mkdirSync, readdirSync, readFileSync, symlinkSync, existsSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HARNESS = '/Users/william/Documents/deepseek-harness'
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const NM = join(ROOT, 'node_modules')
const SCOPED = join(NM, '@deepseek-ai')

function packageName(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name
  } catch {
    return null
  }
}

function link(from, to) {
  if (existsSync(to)) rmSync(to, { recursive: true, force: true })
  symlinkSync(from, to, 'dir')
  console.log(`  link ${to.replace(ROOT, '.')}`)
}

mkdirSync(SCOPED, { recursive: true })
mkdirSync(join(NM, '@types'), { recursive: true })

// All workspace packages: packages/<group>/<pkg> plus the vendored cordis family.
const roots = [join(HARNESS, 'packages'), join(HARNESS, 'vendor')]
let count = 0
function tryLink(pkgDir) {
  const name = packageName(pkgDir)
  if (name === null || !name.startsWith('@deepseek-ai/')) return false
  link(pkgDir, join(SCOPED, name.slice('@deepseek-ai/'.length)))
  count += 1
  return true
}
for (const root of roots) {
  for (const entry of readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory())) {
    const groupDir = join(root, entry.name)
    // packages/<group>/<pkg> layout…
    if (readdirSync(groupDir, { withFileTypes: true }).some(d => d.isDirectory() && existsSync(join(groupDir, d.name, 'package.json')))) {
      for (const pkg of readdirSync(groupDir, { withFileTypes: true }).filter(d => d.isDirectory())) {
        tryLink(join(groupDir, pkg.name))
      }
    } else {
      // …or vendor/<pkg> layout.
      tryLink(groupDir)
    }
  }
}

// react + its types (client bundle externals; types via @types/react).
link(join(HARNESS, 'node_modules/.pnpm/react@18.3.1/node_modules/react'), join(NM, 'react'))
link(join(HARNESS, 'node_modules/.pnpm/@types+react@18.3.31/node_modules/@types/react'), join(NM, '@types', 'react'))
// esbuild binary/JS API used by build.mjs.
link(join(HARNESS, 'node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild'), join(NM, 'esbuild'))
// TypeScript compiler used by the typecheck/build scripts.
link(join(HARNESS, 'node_modules/.pnpm/typescript@6.0.3/node_modules/typescript'), join(NM, 'typescript'))
// Node types for the host half (node:http, process).
link(join(HARNESS, 'node_modules/.pnpm/@types+node@22.20.0/node_modules/@types/node'), join(NM, '@types', 'node'))

console.log(`linked ${count} @deepseek-ai packages + react/@types/react/esbuild`)
