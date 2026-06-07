import { describe, it, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { buildBadgeSvg, buildCertificateSvg, OG_WIDTH, OG_HEIGHT } from '../templates/svgTemplate';
import { BADGE_DESIGNS } from '@/badges/badgeDesigns';
import { STAGE_ORDER } from '@/engine/quizEngine';
import type { BadgeDesign } from '@/badges/types';

/**
 * Local mirror of the module-internal xmlEscape so tests can derive the
 * expected escaped fragments independently of the implementation. If a design
 * value ever gains an XML metacharacter, these expectations stay correct.
 */
function expectedXmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const METACHARS = ['<', '>', '&', '"', "'"] as const;

describe('svgTemplate - buildBadgeSvg (unit)', () => {
  it('embeds the BADGE_DESIGNS values for a known stage (kiro-basics)', () => {
    const design = BADGE_DESIGNS['kiro-basics'];
    const svg = buildBadgeSvg('kiro-basics', design);

    // displayName + icon appear as well-delimited text nodes
    expect(svg).toContain('>' + design.displayName + '</text>');
    expect(svg).toContain('>' + design.icon + '</text>');
    // gradient stops use the design colors
    expect(svg).toContain('stop-color="' + design.primaryColor + '"');
    expect(svg).toContain('stop-color="' + design.secondaryColor + '"');
    // wordmark present
    expect(svg).toContain('>Kiro Quest</text>');
  });

  it('declares a 1200x630 canvas with matching constants', () => {
    const svg = buildBadgeSvg('specs', BADGE_DESIGNS['specs']);
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg).toContain('viewBox="0 0 1200 630"');
    expect(OG_WIDTH).toBe(1200);
    expect(OG_HEIGHT).toBe(630);
  });

  it('XML-escapes interpolated text (no raw metacharacters leak)', () => {
    // Synthetic design loaded with every XML metacharacter.
    const hostile: BadgeDesign = {
      stage: 'kiro-basics',
      icon: '<i>&"\'</i>',
      primaryColor: '#000000" onload="x',
      secondaryColor: '#fff & <bad>',
      displayName: 'A & B <c> "d" \'e\'',
    };
    const svg = buildBadgeSvg('kiro-basics', hostile);

    // The escaped forms must be present...
    expect(svg).toContain(expectedXmlEscape(hostile.displayName));
    expect(svg).toContain(expectedXmlEscape(hostile.icon));
    // ...and the raw dangerous strings must NOT appear verbatim.
    expect(svg).not.toContain('<i>&"\'</i>');
    expect(svg).not.toContain('A & B <c>');
    expect(svg).not.toContain('onload="x');
  });
});

describe('svgTemplate - buildCertificateSvg (unit)', () => {
  it('renders generic pt-BR certificate copy with no per-user data', () => {
    const svg = buildCertificateSvg();
    expect(svg).toContain('Certificado de Conclus'); // "Certificado de Conclusão"
    expect(svg).toContain('Kiro Quest');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg).toContain('viewBox="0 0 1200 630"');
  });
});

describe('svgTemplate - property tests', () => {
  // Feature: dynamic-social-share-preview, Property 4
  fcTest.prop([fc.constantFrom(...STAGE_ORDER)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 4 — escaping holds for all interpolated text',
    (stage) => {
      const design = BADGE_DESIGNS[stage];
      const svg = buildBadgeSvg(stage, design);

      // Every interpolated design value must appear in its XML-escaped form,
      // sitting inside a well-formed attribute/text region.
      expect(svg).toContain('>' + expectedXmlEscape(design.icon) + '</text>');
      expect(svg).toContain('>' + expectedXmlEscape(design.displayName) + '</text>');
      expect(svg).toContain('stop-color="' + expectedXmlEscape(design.primaryColor) + '"');
      expect(svg).toContain('stop-color="' + expectedXmlEscape(design.secondaryColor) + '"');

      // No interpolated value reintroduces a raw metacharacter: each raw value
      // that contains a metacharacter must NOT appear verbatim in the output.
      for (const value of [design.icon, design.displayName, design.primaryColor, design.secondaryColor]) {
        const hasMeta = METACHARS.some((m) => value.includes(m));
        if (hasMeta) {
          expect(svg).not.toContain(value);
        }
      }
    },
  );

  // Feature: dynamic-social-share-preview, Property 6
  fcTest.prop([fc.constantFrom(...STAGE_ORDER)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 6 — determinism (byte-identical output)',
    (stage) => {
      const design = BADGE_DESIGNS[stage];
      const first = buildBadgeSvg(stage, design);
      const second = buildBadgeSvg(stage, design);
      expect(first).toBe(second);
    },
  );
});
