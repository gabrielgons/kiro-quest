import type { LearningStage } from '@/engine/types';
import type { BadgeDesign } from '@/badges/types';

/**
 * Pure SVG template builders for the static social-share preview cards.
 *
 * These functions take a learning stage and its {@link BadgeDesign} entry and
 * return a deterministic 1200x630 SVG string. They perform NO I/O and have no
 * side effects, so they are trivially unit/property testable.
 *
 * All user-facing copy is Brazilian Portuguese (pt-BR). Values originate from
 * the author-controlled `BADGE_DESIGNS` source of truth (not user input), but
 * every interpolated text value is still XML-escaped as a defense-in-depth
 * measure and to satisfy the feature's escaping correctness property.
 *
 * Note: Emoji characters are NOT used in the SVG output because `@resvg/resvg-js`
 * cannot render them without a bundled color-emoji font. Instead, short ASCII
 * labels are mapped from each known emoji to ensure reliable rendering in all
 * environments.
 */

/** Open Graph card width in pixels. */
export const OG_WIDTH = 1200;
/** Open Graph card height in pixels. */
export const OG_HEIGHT = 630;

/**
 * Map of known BADGE_DESIGNS emoji icons to short, ASCII-safe labels that
 * render reliably in sans-serif fonts without requiring a color-emoji font.
 * Used only by the SVG rasterizer path; the client-side Canvas renderer
 * continues to use the actual emoji from BADGE_DESIGNS.
 */
export const OG_ICON_LABELS: Record<string, string> = {
  '🚀': 'KB',
  '📋': 'SP',
  '✨': 'FS',
  '🐛': 'BF',
  '🧭': 'ST',
  '🪝': 'HK',
  '🔌': 'MC',
  '⚡': 'PW',
  '🎯': 'SK',
  '🌍': 'RW',
  '🏢': 'EN',
  '🏆': '★',
};

/**
 * Escape the five XML metacharacters so interpolated text can never break out
 * of an attribute value or element body.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Resolve the OG icon label for a given emoji icon. Falls back to the first
 * 2 characters of the displayName uppercased if no mapping exists.
 */
function resolveIconLabel(icon: string, displayName: string): string {
  return OG_ICON_LABELS[icon] ?? displayName.slice(0, 2).toUpperCase();
}

/**
 * Build the social-card SVG for a single module badge.
 *
 * Returns a deterministic 1200x630 SVG declaring
 * `width="1200" height="630" viewBox="0 0 1200 630"`, a linear-gradient
 * background from `design.primaryColor` to `design.secondaryColor`, a bold
 * ASCII icon label (large, centered, white), the `design.displayName`
 * (centered, white), and a "Kiro Quest" wordmark. Pure — no I/O.
 */
export function buildBadgeSvg(stage: LearningStage, design: BadgeDesign): string {
  const name = xmlEscape(design.displayName);
  const iconLabel = xmlEscape(resolveIconLabel(design.icon, design.displayName));
  const primary = xmlEscape(design.primaryColor);
  const secondary = xmlEscape(design.secondaryColor);

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" ' +
    'viewBox="0 0 1200 630">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="' + primary + '"/>' +
    '<stop offset="1" stop-color="' + secondary + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<text x="600" y="300" text-anchor="middle" font-size="120" ' +
    'font-weight="bold" fill="#ffffff" font-family="sans-serif">' + iconLabel + '</text>' +
    '<text x="600" y="430" text-anchor="middle" font-size="64" ' +
    'fill="#ffffff" font-family="sans-serif">' + name + '</text>' +
    '<text x="600" y="500" text-anchor="middle" font-size="34" ' +
    'fill="#ffffff" font-family="sans-serif">Kiro Quest</text>' +
    '</svg>'
  );
}

/**
 * Build the generic certificate social-card SVG.
 *
 * Returns a deterministic 1200x630 certificate card with pt-BR literal copy
 * ("Certificado de Conclusão" / "Kiro Quest") and NO per-user data. Uses '★'
 * instead of the '🏆' emoji for reliable rendering without a color-emoji font.
 * Pure.
 */
export function buildCertificateSvg(): string {
  const title = xmlEscape('Certificado de Conclusão');
  const wordmark = xmlEscape('Kiro Quest');
  const trophy = xmlEscape('★');

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" ' +
    'viewBox="0 0 1200 630">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#7c3aed"/>' +
    '<stop offset="1" stop-color="#4338ca"/>' +
    '</linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<text x="600" y="290" text-anchor="middle" font-size="160" ' +
    'font-weight="bold" fill="#ffffff" font-family="sans-serif">' + trophy + '</text>' +
    '<text x="600" y="430" text-anchor="middle" font-size="64" ' +
    'fill="#ffffff" font-family="sans-serif">' + title + '</text>' +
    '<text x="600" y="500" text-anchor="middle" font-size="34" ' +
    'fill="#ffffff" font-family="sans-serif">' + wordmark + '</text>' +
    '</svg>'
  );
}

/**
 * Build the generic site-level "home" OG social-card SVG (1200x630).
 *
 * This card is used as the root `og:image` for the index.html page. It uses a
 * purple/blue gradient with the "Kiro Quest" title and pt-BR tagline. No emoji
 * — renders reliably in all environments. Pure — no I/O.
 */
export function buildHomeSvg(): string {
  const title = xmlEscape('Kiro Quest');
  const tagline = xmlEscape('Trilha de Aprendizado Kiro');

  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" ' +
    'viewBox="0 0 1200 630">' +
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#7c3aed"/>' +
    '<stop offset="1" stop-color="#3b82f6"/>' +
    '</linearGradient></defs>' +
    '<rect width="1200" height="630" fill="url(#bg)"/>' +
    '<text x="600" y="280" text-anchor="middle" font-size="96" ' +
    'font-weight="bold" fill="#ffffff" font-family="sans-serif">' + title + '</text>' +
    '<text x="600" y="380" text-anchor="middle" font-size="48" ' +
    'fill="#ffffffcc" font-family="sans-serif">' + tagline + '</text>' +
    '<text x="600" y="470" text-anchor="middle" font-size="32" ' +
    'fill="#ffffff99" font-family="sans-serif">Quiz interativo para dominar o ecossistema Kiro</text>' +
    '</svg>'
  );
}
