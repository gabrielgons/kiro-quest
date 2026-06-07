import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSocialAssets, type GenerateResult } from '../generateSocialAssets';
import { STAGE_ORDER } from '@/engine/quizEngine';

const ORIGIN = 'https://kiro-quest.example';

/** A tiny fixed PNG signature the mock rasterizer returns for every call. */
const FAKE_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

/**
 * Feature: dynamic-social-share-preview, Property 5
 *
 * Generator emits the exact expected file set: with a mocked rasterizer,
 * `generateSocialAssets` writes exactly one badge PNG + share page per
 * STAGE_ORDER stage plus one certificate PNG + share page, and invokes the
 * rasterizer once per stage plus once for the certificate.
 *
 * Validates: Requirements 2.1, 2.2
 */
describe('generateSocialAssets (smoke) - Feature: dynamic-social-share-preview, Property 5', () => {
  let outDir: string;

  beforeEach(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'social-assets-'));
  });

  afterEach(async () => {
    await rm(outDir, { recursive: true, force: true });
  });

  it('emits 11 badge + 1 certificate PNG and HTML files following the naming contract', async () => {
    const rasterize = vi.fn(() => FAKE_PNG);

    const result: GenerateResult = await generateSocialAssets({ outDir, siteOrigin: ORIGIN, rasterize });

    // Every stage has its badge PNG and share page on disk.
    for (const stage of STAGE_ORDER) {
      expect(existsSync(join(outDir, 'og', `badge-${stage}.png`)), `PNG for ${stage}`).toBe(true);
      expect(existsSync(join(outDir, 's', 'badge', `${stage}.html`)), `HTML for ${stage}`).toBe(true);
      // Directory-style variant also exists.
      expect(existsSync(join(outDir, 's', 'badge', stage, 'index.html')), `index.html for ${stage}`).toBe(true);
    }

    // Certificate PNG + share page exist.
    expect(existsSync(join(outDir, 'og', 'certificate.png'))).toBe(true);
    expect(existsSync(join(outDir, 's', 'certificate.html'))).toBe(true);
    // Directory-style variant for certificate.
    expect(existsSync(join(outDir, 's', 'certificate', 'index.html'))).toBe(true);

    // Home OG card exists.
    expect(existsSync(join(outDir, 'og', 'home.png'))).toBe(true);

    // Exact counts: 11 stages + 1 certificate + 1 home = 13 PNGs.
    expect(result.pngFiles).toHaveLength(STAGE_ORDER.length + 2);
    // HTML: 12 flat + 12 directory-style index.html = 24.
    expect(result.htmlFiles).toHaveLength((STAGE_ORDER.length + 1) * 2);

    // Rasterizer invoked exactly once per stage + once for the certificate + once for home.
    expect(rasterize).toHaveBeenCalledTimes(STAGE_ORDER.length + 2);
  });

  it('returns paths that all point at files that actually exist', async () => {
    const rasterize = vi.fn(() => FAKE_PNG);

    const result = await generateSocialAssets({ outDir, siteOrigin: ORIGIN, rasterize });

    for (const png of result.pngFiles) {
      expect(existsSync(png), `returned png path ${png} should exist`).toBe(true);
    }
    for (const html of result.htmlFiles) {
      expect(existsSync(html), `returned html path ${html} should exist`).toBe(true);
    }
  });
});
