import { describe, it, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { buildBadgeSvg, buildCertificateSvg, buildHomeSvg, OG_WIDTH, OG_HEIGHT, OG_ICON_LABELS } from '../templates/svgTemplate';
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
  it('embeds the OG_ICON_LABELS mapped label and BADGE_DESIGNS values for a known stage (kiro-basics)', () => {
    const design = BADGE_DESIGNS['kiro-basics'];
    const svg = buildBadgeSvg('kiro-basics', design);

    // displayName appears as a well-delimited text node
    expect(svg).toContain('>' + design.displayName + '</text>');
    // icon is mapped to the ASCII label (not the raw emoji)
    const expectedLabel = OG_ICON_LABELS[design.icon] ?? design.displayName.slice(0, 2).toUpperCase();
    expect(svg).toContain('>' + expectedLabel + '</text>');
    // raw emoji should NOT be present in the SVG
    expect(svg).not.toContain(design.icon);
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

    // The escaped forms of displayName, primaryColor, secondaryColor must be present...
    expect(svg).toContain(expectedXmlEscape(hostile.displayName));
    expect(svg).toContain(expectedXmlEscape(hostile.primaryColor));
    expect(svg).toContain(expectedXmlEscape(hostile.secondaryColor));
    // The icon is mapped to a fallback label (first 2 chars of displayName uppercased)
    // since the hostile icon won't be in OG_ICON_LABELS. The label is 'A ' escaped.
    const fallbackLabel = hostile.displayName.slice(0, 2).toUpperCase();
    expect(svg).toContain(expectedXmlEscape(fallbackLabel));
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
    expect(svg).toContain('★'); // ASCII star instead of emoji trophy
    expect(svg).not.toContain('🏆'); // no emoji in SVG output
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg).toContain('viewBox="0 0 1200 630"');
  });
});

describe('svgTemplate - buildHomeSvg (unit)', () => {
  it('renders a generic 1200x630 site-level OG card with no emoji', () => {
    const svg = buildHomeSvg();
    expect(svg).toContain('Kiro Quest');
    expect(svg).toContain('Trilha de Aprendizado Kiro');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg).toContain('viewBox="0 0 1200 630"');
    // No emoji characters in the home SVG
    expect(svg).not.toMatch(/[\u{1F000}-\u{1FFFF}]/u);
  });
});

describe('svgTemplate - property tests', () => {
  // Feature: dynamic-social-share-preview, Property 4
  fcTest.prop([fc.constantFrom(...STAGE_ORDER)], { numRuns: 100 })(
    'Feature: dynamic-social-share-preview, Property 4 — escaping holds for all interpolated text',
    (stage) => {
      const design = BADGE_DESIGNS[stage];
      const svg = buildBadgeSvg(stage, design);

      // The mapped icon label (not the raw emoji) must appear XML-escaped
      const iconLabel = OG_ICON_LABELS[design.icon] ?? design.displayName.slice(0, 2).toUpperCase();
      expect(svg).toContain('>' + expectedXmlEscape(iconLabel) + '</text>');
      expect(svg).toContain('>' + expectedXmlEscape(design.displayName) + '</text>');
      expect(svg).toContain('stop-color="' + expectedXmlEscape(design.primaryColor) + '"');
      expect(svg).toContain('stop-color="' + expectedXmlEscape(design.secondaryColor) + '"');

      // No interpolated value reintroduces a raw metacharacter: each raw value
      // that contains a metacharacter must NOT appear verbatim in the output.
      for (const value of [iconLabel, design.displayName, design.primaryColor, design.secondaryColor]) {
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
