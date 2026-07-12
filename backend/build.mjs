import { build } from 'esbuild';
import { readdirSync } from 'fs';
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

console.log('Build complete.');
