import { describe, it, expect } from 'vitest';
import {
  renderShareHtml,
  buildBadgeShareHtml,
  buildCertificateShareHtml,
  type ShareMeta,
} from '../templates/shareHtmlTemplate';
import { BADGE_DESIGNS } from '@/badges/badgeDesigns';

const ORIGIN = 'https://kiro-quest.example';

/**
 * The complete set of Open Graph + Twitter meta tags every share page must
 * carry exactly once. Each entry is a substring that uniquely identifies the
 * tag in the rendered HTML.
 */
const REQUIRED_TAGS: readonly string[] = [
  '<meta property="og:type" content="website"/>',
  '<meta property="og:site_name" content="Kiro Quest"/>',
  '<meta property="og:title" content="',
  '<meta property="og:description" content="',
  '<meta property="og:image" content="',
  '<meta property="og:image:width" content="1200"/>',
  '<meta property="og:image:height" content="630"/>',
  '<meta property="og:url" content="',
  '<meta property="og:locale" content="pt_BR"/>',
  '<meta name="twitter:card" content="summary_large_image"/>',
  '<meta name="twitter:title" content="',
  '<meta name="twitter:description" content="',
  '<meta name="twitter:image" content="',
];

/** Count non-overlapping occurrences of `needle` in `haystack`. */
function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count += 1;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

describe('shareHtmlTemplate - buildBadgeShareHtml (unit)', () => {
  it('includes every required OG/Twitter tag exactly once', () => {
    const html = buildBadgeShareHtml('kiro-basics', BADGE_DESIGNS['kiro-basics'], ORIGIN);
    for (const tag of REQUIRED_TAGS) {
      expect(countOccurrences(html, tag), `tag "${tag}" should appear exactly once`).toBe(1);
    }
  });

  it('sets og:image (and twitter:image) to <origin>/og/badge-<stage>.png', () => {
    const html = buildBadgeShareHtml('specs', BADGE_DESIGNS['specs'], ORIGIN);
    const expectedImage = `${ORIGIN}/og/badge-specs.png`;
    expect(html).toContain(`<meta property="og:image" content="${expectedImage}"/>`);
    expect(html).toContain(`<meta name="twitter:image" content="${expectedImage}"/>`);
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/s/badge/specs"/>`);
  });

  it('declares pt-BR document language and og:locale=pt_BR', () => {
    const html = buildBadgeShareHtml('hooks', BADGE_DESIGNS['hooks'], ORIGIN);
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<meta property="og:locale" content="pt_BR"/>');
  });

  it('redirects into the same-origin stage-summary hash route (begins with #/)', () => {
    const html = buildBadgeShareHtml('mcp', BADGE_DESIGNS['mcp'], ORIGIN);
    expect(html).toContain('location.replace("#/summary/mcp")');
    expect(html).toContain('content="0; url=#/summary/mcp"');
    expect(html).toContain('<a href="#/summary/mcp">');
    // The link href / refresh / script targets are all same-origin hashes.
    expect(html).not.toContain('location.replace("http');
  });

  it('embeds pt-BR copy derived from the badge displayName', () => {
    const html = buildBadgeShareHtml('kiro-basics', BADGE_DESIGNS['kiro-basics'], ORIGIN);
    expect(html).toContain('Conquista Fundamentos do Kiro — Kiro Quest');
    expect(html).toContain('Abrindo o Kiro Quest… Clique aqui se nada acontecer.');
  });

  it('matches the share-page snapshot for a known stage', () => {
    const html = buildBadgeShareHtml('kiro-basics', BADGE_DESIGNS['kiro-basics'], ORIGIN);
    expect(html).toMatchSnapshot();
  });
});

describe('shareHtmlTemplate - buildCertificateShareHtml (unit)', () => {
  it('includes every required OG/Twitter tag exactly once', () => {
    const html = buildCertificateShareHtml(ORIGIN);
    for (const tag of REQUIRED_TAGS) {
      expect(countOccurrences(html, tag), `tag "${tag}" should appear exactly once`).toBe(1);
    }
  });

  it('sets og:image to <origin>/og/certificate.png and redirects to #/achievement', () => {
    const html = buildCertificateShareHtml(ORIGIN);
    const expectedImage = `${ORIGIN}/og/certificate.png`;
    expect(html).toContain(`<meta property="og:image" content="${expectedImage}"/>`);
    expect(html).toContain(`<meta name="twitter:image" content="${expectedImage}"/>`);
    expect(html).toContain(`<meta property="og:url" content="${ORIGIN}/s/certificate"/>`);
    expect(html).toContain('location.replace("#/achievement")');
    expect(html).toContain('<a href="#/achievement">');
    expect(html).toContain('content="0; url=#/achievement"');
  });

  it('declares pt-BR document language and og:locale=pt_BR', () => {
    const html = buildCertificateShareHtml(ORIGIN);
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('<meta property="og:locale" content="pt_BR"/>');
  });
});

describe('shareHtmlTemplate - renderShareHtml (unit)', () => {
  it('throws when the redirect target is not a same-origin hash route', () => {
    const meta: ShareMeta = {
      title: 'x',
      description: 'y',
      imageUrl: `${ORIGIN}/og/badge-specs.png`,
      pageUrl: `${ORIGIN}/s/badge/specs`,
      redirectHash: 'https://evil.example/phish',
    };
    expect(() => renderShareHtml(meta)).toThrow(/#\//);
  });

  it('HTML-escapes interpolated text passed through ShareMeta', () => {
    const meta: ShareMeta = {
      title: 'A & B <c> "d" \'e\'',
      description: 'desc',
      imageUrl: `${ORIGIN}/og/badge-specs.png`,
      pageUrl: `${ORIGIN}/s/badge/specs`,
      redirectHash: '#/summary/specs',
    };
    const html = renderShareHtml(meta);
    expect(html).toContain('A &amp; B &lt;c&gt; &quot;d&quot; &apos;e&apos;');
    expect(html).not.toContain('<c>');
  });
});


// ---------------------------------------------------------------------------
// Property-based tests (@fast-check/vitest), quantified over every stage in
// STAGE_ORDER. Minimum 100 iterations per property.
// ---------------------------------------------------------------------------

import { test as fcTest, fc } from '@fast-check/vitest';
import { STAGE_ORDER } from '@/engine/quizEngine';

/** Clean origins (no HTML metacharacters) to quantify over alongside stages. */
const ORIGINS = [
  'https://kiro-quest.example',
  'https://kiro-quest.pages.dev',
  'http://localhost:5173',
  'https://example.com',
] as const;

/** The required tags, expressed so each is uniquely countable in the output. */
const PROP_REQUIRED_TAGS: readonly string[] = REQUIRED_TAGS;

const HTML_METACHARS = ['<', '>', '&', '"', "'"] as const;

describe('shareHtmlTemplate - property tests', () => {
  // Feature: dynamic-social-share-preview, Property 1
  fcTest.prop([fc.constantFrom(...STAGE_ORDER), fc.constantFrom(...ORIGINS)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 1 — every stage gets a complete share page (all required tags exactly once)',
    (stage, origin) => {
      const html = buildBadgeShareHtml(stage, BADGE_DESIGNS[stage], origin);
      for (const tag of PROP_REQUIRED_TAGS) {
        expect(countOccurrences(html, tag)).toBe(1);
      }
      expect(html).toContain('<html lang="pt-BR">');
    },
  );

  // Feature: dynamic-social-share-preview, Property 2
  fcTest.prop([fc.constantFrom(...STAGE_ORDER), fc.constantFrom(...ORIGINS)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 2 — og:image references the matching static PNG',
    (stage, origin) => {
      const html = buildBadgeShareHtml(stage, BADGE_DESIGNS[stage], origin);
      const expectedImage = `${origin}/og/badge-${stage}.png`;
      expect(html).toContain(`<meta property="og:image" content="${expectedImage}"/>`);
      expect(html).toContain(`<meta name="twitter:image" content="${expectedImage}"/>`);
    },
  );

  // Feature: dynamic-social-share-preview, Property 3
  fcTest.prop([fc.constantFrom(...STAGE_ORDER), fc.constantFrom(...ORIGINS)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 3 — every redirect target is a same-origin SPA hash route',
    (stage, origin) => {
      const html = buildBadgeShareHtml(stage, BADGE_DESIGNS[stage], origin);
      const expectedHash = `#/summary/${stage}`;

      // location.replace argument
      expect(html).toContain(`location.replace(${JSON.stringify(expectedHash)})`);
      // <meta http-equiv="refresh"> URL
      expect(html).toContain(`content="0; url=${expectedHash}"`);
      // visible interstitial link href
      expect(html).toContain(`<a href="${expectedHash}">`);

      // The redirect target must begin with "#/" and never be an absolute URL.
      expect(expectedHash.startsWith('#/')).toBe(true);
      expect(html).not.toContain('location.replace("http');
      expect(html).not.toContain('url=http');
      expect(html).not.toContain('<a href="http');
    },
  );

  // Feature: dynamic-social-share-preview, Property 4
  fcTest.prop([fc.constantFrom(...STAGE_ORDER), fc.constantFrom(...ORIGINS)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 4 — escaping holds for all interpolated text',
    (stage, origin) => {
      const design = BADGE_DESIGNS[stage];
      const html = buildBadgeShareHtml(stage, design, origin);

      // Any interpolated source value that itself contains an HTML metacharacter
      // must NOT appear verbatim (it must have been escaped instead).
      for (const value of [design.displayName, design.icon]) {
        const hasMeta = HTML_METACHARS.some((m) => value.includes(m));
        if (hasMeta) {
          expect(html).not.toContain(value);
        }
      }
    },
  );

  // Feature: dynamic-social-share-preview, Property 6
  fcTest.prop([fc.constantFrom(...STAGE_ORDER), fc.constantFrom(...ORIGINS)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 6 — determinism (byte-identical output)',
    (stage, origin) => {
      const design = BADGE_DESIGNS[stage];
      const first = buildBadgeShareHtml(stage, design, origin);
      const second = buildBadgeShareHtml(stage, design, origin);
      expect(first).toBe(second);
    },
  );
});
