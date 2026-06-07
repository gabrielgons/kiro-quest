import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  buildBadgeShareHtml,
  buildCertificateShareHtml,
} from '../templates/shareHtmlTemplate';
import { BADGE_DESIGNS } from '@/badges/badgeDesigns';
import { STAGE_ORDER } from '@/engine/quizEngine';
import {
  downloadImage,
  shareViaWebAPI,
  canUseWebShareAPI,
  shareToSocial,
} from '@/badges';

/**
 * Backwards-compatibility regression tests for the static social-share-preview
 * feature. These tests assert the pre-existing behavior floor (the generic SPA
 * shell fallback, the unchanged download / native Web Share paths, the
 * static-assets-only Cloudflare config, and the SPA deep links the share pages
 * redirect into) is preserved by this feature.
 *
 * Feature: dynamic-social-share-preview, Property 8
 */

// Resolve repo-root files from the process working directory (vitest runs from
// the repo root). This keeps the file reads independent of how the test module
// URL is transformed.
const readRepoFile = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), 'utf8');

/** Strip JSONC comments (block + whole-line `//`) so JSON.parse can read it. */
function parseJsonc(source: string): Record<string, unknown> {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/^\s*\/\/.*$/gm, ''); // whole-line `//` comments
  return JSON.parse(stripped) as Record<string, unknown>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Backwards-compatibility floor preserved (Property 8) — Validates Requirements 7.1, 7.2, 7.3, 7.4', () => {
  // ---------------------------------------------------------------------------
  // Requirement 7.4 — the static index.html root remains the generic fallback
  // preview. NOTE: the repo's index.html is the SPA shell and does NOT declare
  // any per-stage Open Graph card; this feature must keep it that way (the root
  // stays the *generic* fallback — per-module cards live only under /s/*). We
  // assert the genuine, file-grounded backward-compat floor here. (We do not
  // assert og:title/og:description/og:image on the root because the actual repo
  // index.html declares none, and this task must not modify source/templates.)
  // ---------------------------------------------------------------------------
  describe('static index.html root fallback (Req 7.4)', () => {
    const indexHtml = readRepoFile('index.html');

    it('is preserved as the generic pt-BR SPA shell fallback preview', () => {
      // Generic, site-level preview metadata floor is intact.
      expect(indexHtml).toContain('lang="pt-BR"');
      expect(indexHtml).toMatch(/<meta\s+name="description"/i);
      expect(indexHtml).toContain('<title>KiroQuest</title>');
      // SPA shell still mounts the app — index.html is the fallback document.
      expect(indexHtml).toContain('id="app"');
      expect(indexHtml).toContain('/src/main.ts');
    });

    it('keeps the root generic — it references NO per-stage /og/badge-*.png card', () => {
      // The root must stay the generic fallback; per-stage OG cards are emitted
      // only into the generated /s/* + /og/* static assets, never inlined here.
      expect(indexHtml).not.toMatch(/\/og\/badge-[^\s"']*\.png/);
      // And the root is not rewritten to point at a per-stage share page.
      expect(indexHtml).not.toContain('/s/badge/');
    });
  });

  // ---------------------------------------------------------------------------
  // Requirements 7.2 / 7.3 — the existing download + native Web Share (image
  // blob) paths in imageSharer are intact and unchanged in signature. The new
  // `shareUrl` is optional, so existing shareToSocial calls without it still
  // work (backward compatible).
  // ---------------------------------------------------------------------------
  describe('download + native Web Share paths intact (Req 7.2, 7.3)', () => {
    it('still exports downloadImage / shareViaWebAPI / canUseWebShareAPI as functions', () => {
      expect(typeof downloadImage).toBe('function');
      expect(typeof shareViaWebAPI).toBe('function');
      expect(typeof canUseWebShareAPI).toBe('function');
      // Arity is part of the public signature contract.
      expect(downloadImage.length).toBe(2); // (blob, fileName)
      expect(shareViaWebAPI.length).toBe(3); // (blob, text, fileName)
      expect(canUseWebShareAPI.length).toBe(0);
    });

    it('shareToSocial("linkedin") without shareUrl still resolves true (shareUrl is optional)', async () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      // Note: NO `shareUrl` field — exercising the pre-existing call shape.
      const result = await shareToSocial({
        blob: new Blob(['png-bytes'], { type: 'image/png' }),
        fileName: 'kiro-quest-badge-specs.png',
        shareText: 'Completei a fase no Kiro Quest!',
        platform: 'linkedin',
      });

      expect(result).toBe(true);
      expect(openSpy).toHaveBeenCalledTimes(1);
      // Falls back to the current-page URL when shareUrl is omitted (unchanged).
      const openedUrl = openSpy.mock.calls[0]?.[0] as string;
      expect(openedUrl).toContain('linkedin.com');
    });
  });

  // ---------------------------------------------------------------------------
  // Requirement 7.1 (+ 7.6 SPA fallback) — wrangler stays static-assets-only:
  // no `main` Worker entry, and any path without a generated static file falls
  // back to index.html via the single-page-application not_found_handling.
  // ---------------------------------------------------------------------------
  describe('wrangler stays static-assets-only with SPA fallback (Req 7.1)', () => {
    const wrangler = parseJsonc(readRepoFile('wrangler.jsonc'));

    it('keeps not_found_handling === "single-page-application"', () => {
      const assets = wrangler.assets as Record<string, unknown> | undefined;
      expect(assets).toBeDefined();
      expect(assets?.not_found_handling).toBe('single-page-application');
      // Serving ./dist as static assets is preserved.
      expect(assets?.directory).toBe('./dist');
    });

    it('declares NO `main` Worker entry (no runtime Worker introduced)', () => {
      expect('main' in wrangler).toBe(false);
    });
  });
});

describe('SPA deep links still resolve after the /s/* redirect — Validates Requirements 7.5, 7.6', () => {
  // The router source is read as text rather than imported, because importing
  // it pulls in the pinia store and view modules — heavier and unnecessary for
  // asserting that the redirect targets map onto declared routes.
  const routerSource = readRepoFile('src/router/index.ts');

  /** Extract the redirect hash the share page navigates to (location.replace arg). */
  function extractRedirectHash(html: string): string {
    const match = html.match(/location\.replace\("(#\/[^"]+)"\)/);
    expect(match, 'share HTML must contain a location.replace("#/...") redirect').not.toBeNull();
    const hash = match![1]!;
    // The same hash must also appear in the no-JS fallbacks (href + meta refresh).
    expect(html).toContain(`href="${hash}"`);
    expect(html).toContain(`url=${hash}"`);
    return hash;
  }

  it('badge share pages redirect to #/summary/<stage>, which maps to the real /summary/:stage route', () => {
    expect(routerSource).toContain("path: '/summary/:stage'");

    // Cover a couple of stages from STAGE_ORDER.
    const sampleStages = [STAGE_ORDER[0]!, STAGE_ORDER[1]!, STAGE_ORDER[STAGE_ORDER.length - 1]!];

    for (const stage of sampleStages) {
      // At least one stage is provably a member of STAGE_ORDER.
      expect(STAGE_ORDER).toContain(stage);

      const html = buildBadgeShareHtml(stage, BADGE_DESIGNS[stage], 'https://kiro-quest.example');
      const hash = extractRedirectHash(html);

      expect(hash).toBe(`#/summary/${stage}`);
      // The hash route (#/summary/<stage>) corresponds to the declared
      // dynamic route path '/summary/:stage'.
      expect(hash.startsWith('#/summary/')).toBe(true);
    }
  });

  it('certificate share page redirects to #/achievement, which maps to the real /achievement route', () => {
    expect(routerSource).toContain("path: '/achievement'");

    const html = buildCertificateShareHtml('https://kiro-quest.example');
    const hash = extractRedirectHash(html);

    expect(hash).toBe('#/achievement');
  });
});
