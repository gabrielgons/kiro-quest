import type { LearningStage } from '@/engine/types';
import type { BadgeDesign } from '@/badges/types';

/**
 * Pure HTML share-page builders for the static social-share preview.
 *
 * These functions assemble the tiny, crawlable HTML document that lives at
 * `public/s/badge/<stage>.html` (and `public/s/certificate.html`). Each page
 * carries per-module Open Graph + Twitter meta tags whose `og:image` points at
 * the matching static PNG, then redirects real browsers into the SPA hash
 * route via a `<script>location.replace(...)</script>` (plus a no-JS
 * `<meta http-equiv="refresh">` fallback and a visible pt-BR interstitial
 * link).
 *
 * The functions perform NO I/O and have no side effects, so they are trivially
 * unit/property testable. All user-facing copy is Brazilian Portuguese (pt-BR).
 * Inputs originate from the author-controlled `BADGE_DESIGNS` source of truth
 * (not user input), but every interpolated value is still HTML-escaped and the
 * redirect target is constrained to a same-origin SPA hash route as
 * defense-in-depth.
 */

/**
 * The set of values needed to render a crawlable share page.
 *
 * - `title` / `description` are pt-BR copy (escaped by {@link renderShareHtml}).
 * - `imageUrl` is the absolute same-origin URL of the matching static PNG.
 * - `pageUrl` is the absolute canonical URL of this `/s/` page.
 * - `redirectHash` is the same-origin SPA hash route, e.g. `#/summary/specs`.
 *   It MUST begin with `#/` (enforced by {@link renderShareHtml}).
 */
export interface ShareMeta {
  /** pt-BR document/OG/Twitter title. */
  title: string;
  /** pt-BR OG/Twitter description. */
  description: string;
  /** Absolute same-origin URL to the matching static PNG. */
  imageUrl: string;
  /** Absolute canonical URL of this `/s/` share page. */
  pageUrl: string;
  /** Same-origin SPA hash route beginning with `#/`. */
  redirectHash: string;
}

/**
 * Escape the five HTML metacharacters so interpolated text can never break out
 * of an attribute value or element body.
 */
function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Assemble the full crawlable HTML document from {@link ShareMeta}. Pure.
 *
 * Emits a complete `<!DOCTYPE html><html lang="pt-BR">` document with exactly
 * one each of the required Open Graph and Twitter meta tags, then a
 * `<meta http-equiv="refresh">` no-JS fallback, a visible pt-BR interstitial
 * link, and a `<script>location.replace(...)</script>` redirect — all pointing
 * at the same-origin `meta.redirectHash`.
 *
 * Every interpolated value is HTML-escaped; the redirect target is also
 * JS-quoted via `JSON.stringify` for the inline script.
 *
 * @throws if `meta.redirectHash` does not begin with `#/` (guards against
 * emitting an absolute/external redirect — there must be no open redirect).
 */
export function renderShareHtml(meta: ShareMeta): string {
  if (!meta.redirectHash.startsWith('#/')) {
    throw new Error(
      `renderShareHtml: redirectHash must begin with "#/" (same-origin SPA route), got: ${meta.redirectHash}`,
    );
  }

  const title = htmlEscape(meta.title);
  const description = htmlEscape(meta.description);
  const imageUrl = htmlEscape(meta.imageUrl);
  const pageUrl = htmlEscape(meta.pageUrl);
  // HTML-escaped form for attribute contexts (href / meta refresh url).
  const redirectAttr = htmlEscape(meta.redirectHash);
  // JS-quoted form for the inline location.replace(...) call.
  const redirectJs = JSON.stringify(meta.redirectHash);

  return (
    '<!DOCTYPE html><html lang="pt-BR"><head>' +
    '<meta charset="UTF-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1"/>' +
    '<title>' + title + '</title>' +
    '<meta property="og:type" content="website"/>' +
    '<meta property="og:site_name" content="Kiro Quest"/>' +
    '<meta property="og:title" content="' + title + '"/>' +
    '<meta property="og:description" content="' + description + '"/>' +
    '<meta property="og:image" content="' + imageUrl + '"/>' +
    '<meta property="og:image:width" content="1200"/>' +
    '<meta property="og:image:height" content="630"/>' +
    '<meta property="og:url" content="' + pageUrl + '"/>' +
    '<meta property="og:locale" content="pt_BR"/>' +
    '<meta name="twitter:card" content="summary_large_image"/>' +
    '<meta name="twitter:title" content="' + title + '"/>' +
    '<meta name="twitter:description" content="' + description + '"/>' +
    '<meta name="twitter:image" content="' + imageUrl + '"/>' +
    '<meta http-equiv="refresh" content="0; url=' + redirectAttr + '"/>' +
    '</head><body>' +
    '<p><a href="' + redirectAttr + '">' +
    'Abrindo o Kiro Quest… Clique aqui se nada acontecer.' +
    '</a></p>' +
    '<script>location.replace(' + redirectJs + ');</script>' +
    '</body></html>'
  );
}

/**
 * Build the crawlable HTML share page for a single module badge. Pure.
 *
 * Derives pt-BR `title`/`description` from `design.displayName`, points
 * `og:image` at `${siteOrigin}/og/badge-${stage}.png`, sets the canonical page
 * URL to `${siteOrigin}/s/badge/${stage}`, and redirects into the stage-summary
 * SPA route `#/summary/${stage}`.
 */
export function buildBadgeShareHtml(
  stage: LearningStage,
  design: BadgeDesign,
  siteOrigin: string,
): string {
  const title = `Conquista ${design.displayName} — Kiro Quest`;
  const description =
    `Veja a trilha ${design.displayName} no Kiro Quest e teste seus conhecimentos sobre o Kiro.`;

  return renderShareHtml({
    title,
    description,
    imageUrl: `${siteOrigin}/og/badge-${stage}.png`,
    pageUrl: `${siteOrigin}/s/badge/${stage}`,
    redirectHash: `#/summary/${stage}`,
  });
}

/**
 * Build the crawlable HTML share page for the generic completion certificate.
 * Pure. Contains no per-user data.
 *
 * Points `og:image` at `${siteOrigin}/og/certificate.png`, sets the canonical
 * page URL to `${siteOrigin}/s/certificate`, and redirects into the final
 * achievement SPA route `#/achievement`.
 */
export function buildCertificateShareHtml(siteOrigin: string): string {
  const title = 'Certificado de Conclusão — Kiro Quest';
  const description =
    'Conquiste o Certificado de Conclusão do Kiro Quest e prove seu domínio do Kiro.';

  return renderShareHtml({
    title,
    description,
    imageUrl: `${siteOrigin}/og/certificate.png`,
    pageUrl: `${siteOrigin}/s/certificate`,
    redirectHash: '#/achievement',
  });
}
