import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STAGE_ORDER } from '@/engine/quizEngine';
import { BADGE_DESIGNS } from '@/badges/badgeDesigns';
import { buildBadgeSvg, buildCertificateSvg, buildHomeSvg, OG_WIDTH, OG_HEIGHT } from './templates/svgTemplate';
import { buildBadgeShareHtml, buildCertificateShareHtml } from './templates/shareHtmlTemplate';

/**
 * Options for {@link generateSocialAssets}.
 *
 * The SVG -> PNG `rasterize` function is INJECTED rather than imported so this
 * module carries no hard dependency on `@resvg/resvg-js` (the real wiring lives
 * in the thin build entry, Task 5). Tests pass a mock rasterizer to avoid heavy
 * PNG work.
 */
export interface GenerateOptions {
  /** Directory the generated assets are written under (e.g. `<repo>/public`). */
  outDir: string;
  /** Canonical absolute origin used for absolute `og:image` / `og:url` URLs. */
  siteOrigin: string;
  /** Injectable SVG -> PNG rasterizer; returns the raw PNG bytes. */
  rasterize: (svg: string, width: number, height: number) => Uint8Array;
}

/**
 * The set of files {@link generateSocialAssets} wrote on success.
 *
 * For an 11-entry `STAGE_ORDER`, `pngFiles` holds 11 badge PNGs + 1 certificate
 * PNG + 1 home PNG (13), and `htmlFiles` holds 11 badge share pages + 11
 * directory-style badge index.html + 1 certificate share page + 1
 * directory-style certificate index.html (24). All paths are absolute (rooted
 * at `opts.outDir`).
 */
export interface GenerateResult {
  /** Absolute paths of every written PNG (`og/badge-<stage>.png`, `og/certificate.png`). */
  pngFiles: string[];
  /** Absolute paths of every written HTML (`s/badge/<stage>.html`, `s/certificate.html`). */
  htmlFiles: string[];
}

/**
 * Ensure a directory exists, creating parents as needed.
 */
async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/**
 * Generate the full static social-share asset set into `opts.outDir`.
 *
 * For every stage in `STAGE_ORDER` this builds the badge SVG, rasterizes it to
 * a PNG at `og/badge-<stage>.png`, builds the crawlable share page, and writes
 * it to `s/badge/<stage>.html`. It then generates the generic certificate PNG
 * (`og/certificate.png`) and share page (`s/certificate.html`).
 *
 * Errors are NOT swallowed: any missing design, template error, rasterize
 * error, or write error propagates (throws) so the build fails loudly without
 * emitting a partial or placeholder asset set.
 *
 * @returns the absolute paths of the written PNG and HTML files (12 + 12 for an
 * 11-stage `STAGE_ORDER`).
 */
export async function generateSocialAssets(opts: GenerateOptions): Promise<GenerateResult> {
  const ogDir = join(opts.outDir, 'og');
  const badgeHtmlDir = join(opts.outDir, 's', 'badge');
  const certHtmlDir = join(opts.outDir, 's');

  await ensureDir(ogDir);
  await ensureDir(badgeHtmlDir);

  const pngFiles: string[] = [];
  const htmlFiles: string[] = [];

  for (const stage of STAGE_ORDER) {
    const design = BADGE_DESIGNS[stage];
    if (!design) {
      // Fail loud: a stage without a design token would silently drop a card.
      throw new Error(`generateSocialAssets: missing BADGE_DESIGNS entry for stage "${stage}"`);
    }

    const svg = buildBadgeSvg(stage, design);
    const png = opts.rasterize(svg, OG_WIDTH, OG_HEIGHT);
    const pngPath = join(ogDir, `badge-${stage}.png`);
    await writeFile(pngPath, png);
    pngFiles.push(pngPath);

    const html = buildBadgeShareHtml(stage, design, opts.siteOrigin);
    const htmlPath = join(badgeHtmlDir, `${stage}.html`);
    await writeFile(htmlPath, html);
    htmlFiles.push(htmlPath);

    // Belt-and-suspenders: also emit directory-style index.html variant so
    // /s/badge/<stage>/ resolves regardless of html_handling quirks.
    const badgeIndexDir = join(badgeHtmlDir, stage);
    await ensureDir(badgeIndexDir);
    const badgeIndexPath = join(badgeIndexDir, 'index.html');
    await writeFile(badgeIndexPath, html);
    htmlFiles.push(badgeIndexPath);
  }

  // Certificate (generic — no per-user data).
  const certSvg = buildCertificateSvg();
  const certPng = opts.rasterize(certSvg, OG_WIDTH, OG_HEIGHT);
  const certPngPath = join(ogDir, 'certificate.png');
  await writeFile(certPngPath, certPng);
  pngFiles.push(certPngPath);

  const certHtml = buildCertificateShareHtml(opts.siteOrigin);
  const certHtmlPath = join(certHtmlDir, 'certificate.html');
  await writeFile(certHtmlPath, certHtml);
  htmlFiles.push(certHtmlPath);

  // Belt-and-suspenders: directory-style variant for certificate.
  const certIndexDir = join(certHtmlDir, 'certificate');
  await ensureDir(certIndexDir);
  const certIndexPath = join(certIndexDir, 'index.html');
  await writeFile(certIndexPath, certHtml);
  htmlFiles.push(certIndexPath);

  // Home OG card (generic site-level card for index.html og:image).
  const homeSvg = buildHomeSvg();
  const homePng = opts.rasterize(homeSvg, OG_WIDTH, OG_HEIGHT);
  const homePngPath = join(ogDir, 'home.png');
  await writeFile(homePngPath, homePng);
  pngFiles.push(homePngPath);

  return { pngFiles, htmlFiles };
}
