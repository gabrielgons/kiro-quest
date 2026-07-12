import { build } from 'esbuild';
import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const handlersDir = join(import.meta.dirname, 'src', 'handlers');
const handlers = readdirSync(handlersDir)
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
  .map((f) => join(handlersDir, f));

await build({
  entryPoints: handlers,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: 'dist',
  external: ['@aws-sdk/*'],
  sourcemap: true,
  minify: true,
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
});

// Lambda Node.js 20 needs a package.json with "type": "module" in the
// deployment bundle to treat .js files as ESM. Without this, the runtime
// defaults to CommonJS and fails to parse import/export syntax.
writeFileSync(
  join(import.meta.dirname, 'dist', 'package.json'),
  JSON.stringify({ type: 'module' }),
);

console.log('Build complete.');
