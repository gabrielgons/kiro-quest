import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { generateSocialAssets } from './generateSocialAssets';
import { SITE_ORIGIN } from '../src/config/siteOrigin';

/**
 * Thin build-time entry that wires the real SVG -> PNG rasterizer
 * (`@resvg/resvg-js`) into the pure {@link generateSocialAssets} orchestrator.
 *
 * This file is the ONLY place the real rasterizer is imported: it is a
 * build-time-only devDependency that ships in neither the SPA bundle nor any
 * Worker. Tests inject a mock rasterizer into `generateSocialAssets` instead.
 *
 * Run standalone via `tsx scripts/generate-social-assets.ts` (this is wired
 * into `npm run build` before `vite build`). Errors are allowed to propagate
 * and force a non-zero exit so a broken preview never ships.
 */

// Resolve `<repo>/public` relative to this script (works under tsx / ESM).
const outDir = fileURLToPath(new URL('../public', import.meta.url));

// Canonical production origin; overridable via SITE_ORIGIN env var for previews.
const siteOrigin = process.env.SITE_ORIGIN ?? SITE_ORIGIN;

async function main(): Promise<void> {
  const result = await generateSocialAssets({
    outDir,
    siteOrigin,
    // `asPng()` returns a Node Buffer, which is a Uint8Array — satisfies the
    // injected `rasterize: (svg, width, height) => Uint8Array` contract.
    rasterize: (svg, width) =>
      new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng(),
  });

  console.log(
    `[generate-social-assets] wrote ${result.pngFiles.length} PNG(s) and ` +
      `${result.htmlFiles.length} HTML share page(s) into ${outDir} ` +
      `(siteOrigin=${siteOrigin}).`,
  );
}

main().catch((err) => {
  // Fail loud: a broken/partial preview must never ship.
  console.error('[generate-social-assets] generation failed:', err);
  process.exit(1);
});
