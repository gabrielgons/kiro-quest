# Requirements Document

## Introduction

Kiro Quest lets learners earn module badges and a final certificate after completing quiz stages. Today the achievements exist only as client-side PNG blobs rendered with the HTML5 Canvas API, and share links are SPA hash routes whose fragments are stripped by social crawlers. As a result, when a user shares a link to LinkedIn, Twitter/X, or WhatsApp, the preview card shows only the generic static Open Graph image declared in `index.html`, never a module-specific card.

This feature adds **static, build-time, per-module social share previews** that crawlers can read with zero new runtime cost. At build time the project generates one static 1200×630 PNG per learning module (one per `LearningStage` in `STAGE_ORDER`, 11 total) plus one generic certificate PNG into `public/og/`, and one tiny crawlable HTML "share page" per module (plus one for the certificate) into `public/s/`. Each share page carries per-module Open Graph + Twitter meta tags whose `og:image` points at the matching static PNG, then redirects real browsers into the SPA hash route. All assets are served purely as Cloudflare Static Assets — there is **no** Cloudflare Worker entry, **no** bindings, **no** KV/R2/D1/Durable Objects, and **no** Workers Paid plan.

The crawlable preview is deliberately **generic per module**: it shows the module's badge design and pt-BR title, but **not** the individual user's score or name. The user's actual personalized badge/certificate continues to be shared through the existing download and native Web Share (image blob) paths, which remain unchanged. Existing badge design tokens (`BADGE_DESIGNS`), the learning-stage union (`LearningStage`), the canonical stage list (`STAGE_ORDER`), and the static fallback Open Graph card are preserved as the single source of truth. All user-facing copy remains in Brazilian Portuguese (pt-BR).

## Glossary

- **Build_Generator**: The Node build script (`scripts/generate-social-assets.ts` + `generateSocialAssets`) that runs at build time, wires the template builders and rasterizer together, and writes all static assets into `public/`.
- **Svg_Template_Builder**: The pure functions (`buildBadgeSvg`, `buildCertificateSvg` in `scripts/templates/svgTemplate.ts`) that turn a stage and its design tokens into a 1200×630 SVG string.
- **Share_Html_Builder**: The pure functions (`renderShareHtml`, `buildBadgeShareHtml`, `buildCertificateShareHtml` in `scripts/templates/shareHtmlTemplate.ts`) that produce the crawlable HTML share page.
- **Rasterizer**: The injectable SVG→PNG conversion function (default `@resvg/resvg-js`, a build-time-only devDependency) passed into the Build_Generator.
- **Client_Share_Builder**: The client-side functions (`buildBadgeShareUrl`, `buildCertificateShareUrl` in `src/badges/imageSharer.ts`) that construct crawlable `/s/...` share URLs.
- **Share_Page**: A generated static HTML file at `public/s/badge/<stage>.html` or `public/s/certificate.html` containing per-module OG/Twitter tags, a redirect, a no-JavaScript fallback, and a pt-BR interstitial link.
- **OG_Image**: A generated static PNG at `public/og/badge-<stage>.png` or `public/og/certificate.png`, sized 1200×630.
- **Static_Assets**: Cloudflare Static Assets serving the contents of `./dist` (the directory Vite produces by copying `public/`), with no Worker main entry and no bindings.
- **LearningStage**: The allowlisted union of valid quiz stage identifiers, defined by `STAGE_ORDER` in `src/engine/quizEngine.ts`.
- **BADGE_DESIGNS**: The author-controlled design-token map (`icon`, `primaryColor`, `secondaryColor`, `displayName`) keyed by `LearningStage`, defined in `src/badges/badgeDesigns.ts`.
- **Redirect_Hash**: The same-origin SPA hash route a Share_Page redirects into, of the form `#/summary/<stage>` (always beginning with `#/`).
- **Social_Crawler**: An automated agent (e.g., LinkedInBot, Twitterbot, WhatsApp) that fetches a shared link to build a preview card and does not execute JavaScript.
- **OG_WIDTH / OG_HEIGHT**: The fixed image dimensions, 1200 and 630 pixels respectively.

## Requirements

### Requirement 1: Crawlable Static Share Pages (Per Module)

**User Story:** As a learner sharing a module link, I want the shared link to expose a module-specific preview, so that social platforms display a recognizable badge card instead of only the generic site image.

#### Acceptance Criteria

1. WHEN the Build_Generator processes a stage in `STAGE_ORDER`, THE Share_Html_Builder SHALL produce a static HTML Share_Page at `public/s/badge/<stage>.html` containing Open Graph and Twitter meta tags for that module.
2. WHEN the Build_Generator generates certificate assets, THE Share_Html_Builder SHALL produce a static HTML Share_Page at `public/s/certificate.html` containing Open Graph and Twitter meta tags for the certificate.
3. WHEN the Share_Html_Builder builds a module Share_Page, THE Share_Html_Builder SHALL set the `og:image` meta tag to the absolute same-origin URL of the matching OG_Image at `<siteOrigin>/og/badge-<stage>.png`.
4. WHEN the Share_Html_Builder builds a Share_Page, THE Share_Html_Builder SHALL include exactly one each of the `og:type`, `og:site_name`, `og:title`, `og:description`, `og:image`, `og:image:width` of 1200, `og:image:height` of 630, `og:url`, `og:locale` of `pt_BR`, `twitter:card` of `summary_large_image`, `twitter:title`, `twitter:description`, and `twitter:image` meta tags.
5. WHEN a real browser loads a Share_Page, THE Share_Html_Builder SHALL emit a client-side JavaScript redirect that navigates to the corresponding Redirect_Hash SPA route.
6. WHERE JavaScript is disabled in the visiting browser, THE Share_Html_Builder SHALL emit a `meta` refresh fallback and a visible pt-BR interstitial link that both navigate to the corresponding Redirect_Hash SPA route.

### Requirement 2: Build-Time Static Image Generation

**User Story:** As a learner sharing a module link, I want a per-module preview image to exist as a static file, so that crawlers can fetch and display the badge card even though they cannot run the client-side Canvas renderer.

#### Acceptance Criteria

1. WHEN the Build_Generator runs, THE Build_Generator SHALL produce exactly one OG_Image at `public/og/badge-<stage>.png` for every stage in `STAGE_ORDER`, each measuring OG_WIDTH by OG_HEIGHT pixels.
2. WHEN the Build_Generator completes successfully, THE Build_Generator SHALL have emitted exactly `STAGE_ORDER` count badge OG_Images plus one certificate OG_Image, and exactly `STAGE_ORDER` count badge Share_Pages plus one certificate Share_Page, having invoked the Rasterizer exactly once per stage plus once for the certificate.
3. WHEN the Svg_Template_Builder composes a module image, THE Svg_Template_Builder SHALL use the `primaryColor`, `secondaryColor`, `icon`, and `displayName` design tokens from `BADGE_DESIGNS` for the requested stage.
4. WHEN the Svg_Template_Builder composes the certificate image, THE Svg_Template_Builder SHALL produce a generic certificate card that contains no per-user data.

### Requirement 3: Generic-Per-Module Personalization Trade-Off

**User Story:** As a product owner, I want the crawlable preview to be generic per module while personalization stays in the existing share paths, so that we gain richer link previews without introducing any new runtime cost.

#### Acceptance Criteria

1. THE Build_Generator SHALL produce Share_Pages and OG_Images that contain only module-level information and SHALL NOT embed any individual user's score or name.
2. THE Build_Generator SHALL produce static files that contain no personally identifiable information.
3. THE system SHALL continue to deliver personalized badge and certificate images through the existing download and native Web Share (image blob) paths without modifying those paths.

### Requirement 4: Output Escaping and Static Safety

**User Story:** As a security-conscious maintainer, I want all interpolated text escaped and all redirects constrained to the same origin, so that the generated static files cannot introduce injection or open-redirect issues.

#### Acceptance Criteria

1. THE Build_Generator SHALL operate only on author-controlled inputs (`BADGE_DESIGNS`, fixed pt-BR copy, and `STAGE_ORDER`) and SHALL NOT accept any runtime user input.
2. WHEN the Svg_Template_Builder interpolates the `displayName` or `icon` into an SVG, THE Svg_Template_Builder SHALL XML-escape the characters `<`, `>`, `&`, `"`, and `'`.
3. WHEN the Share_Html_Builder interpolates the `displayName` or any text into the HTML, THE Share_Html_Builder SHALL HTML-escape the characters `<`, `>`, `&`, `"`, and `'`.
4. THE Build_Generator SHALL emit no unescaped interpolated values in any generated SVG or HTML output.
5. WHEN the Svg_Template_Builder emits an SVG document, THE Svg_Template_Builder SHALL contain no raw occurrences of `<`, `>`, `&`, `"`, or `'` within any interpolated text region.
6. WHEN the Share_Html_Builder constructs the Redirect_Hash, THE Share_Html_Builder SHALL produce a value that begins with `#/` and is a same-origin SPA route.
7. WHEN the Share_Html_Builder emits the redirect target into the HTML, THE Share_Html_Builder SHALL HTML-escape and JavaScript-quote that target and SHALL NOT emit an absolute external URL.

### Requirement 5: Deterministic, CDN-Cacheable Output

**User Story:** As an operator, I want the generated assets to be deterministic and cacheable, so that Cloudflare's CDN serves popular shared links quickly without re-rendering anything at request time.

#### Acceptance Criteria

1. WHEN the Svg_Template_Builder is called twice with the same stage and design tokens, THE Svg_Template_Builder SHALL return byte-identical SVG strings.
2. WHEN the Share_Html_Builder is called twice with the same stage, design tokens, and site origin, THE Share_Html_Builder SHALL return byte-identical HTML strings.
3. THE Build_Generator SHALL emit static files that require no per-request computation and that Cloudflare can cache from its CDN until the next deploy.

### Requirement 6: Client Share URL Building

**User Story:** As a learner, I want the share buttons to generate crawlable links to a module's preview page, so that the social platform fetches and displays the module card.

#### Acceptance Criteria

1. WHEN the Client_Share_Builder builds a badge share URL for a stage, THE Client_Share_Builder SHALL produce an absolute URL of the form `<origin>/s/badge/<stage>` with no per-user query parameters.
2. WHEN the Client_Share_Builder builds a certificate share URL, THE Client_Share_Builder SHALL produce an absolute URL of the form `<origin>/s/certificate` with no per-user query parameters.
3. WHERE `window.location.origin` is unavailable, THE Client_Share_Builder SHALL substitute the documented production-origin fallback when constructing the share URL.
4. WHEN a share action opens a social platform share window, THE Client_Share_Builder SHALL pass the crawlable `/s/...` URL to `openShareWindow` and `shareToSocial`.
5. THE Client_Share_Builder SHALL preserve the existing download and native Web Share (image blob) behaviors without modification.
6. WHEN the Client_Share_Builder constructs a share URL, THE Client_Share_Builder SHALL produce a same-origin URL whose path begins with `/s/`.

### Requirement 7: Backwards Compatibility and Static Serving

**User Story:** As a maintainer, I want all existing application behavior preserved and the new assets served purely statically, so that adding share previews does not regress the SPA, downloads, native sharing, or the static fallback card, and introduces no new runtime infrastructure.

#### Acceptance Criteria

1. THE system SHALL serve all generated Share_Pages and OG_Images as Cloudflare Static_Assets from `./dist`, with no Worker main entry, no bindings, and no KV, R2, D1, or Durable Objects.
2. WHEN a user uses the existing badge or certificate download action, THE system SHALL preserve the existing client-side image download behavior.
3. WHEN a user uses the existing native Web Share action, THE system SHALL preserve the existing image-blob sharing behavior.
4. THE system SHALL preserve the static `index.html` root Open Graph card as a fallback preview.
5. WHEN a real browser is redirected from a Share_Page into the SPA, THE system SHALL resolve the existing SPA hash deep link for the corresponding achievement.
6. IF a requested path matches no generated static file, THEN THE Static_Assets configuration SHALL serve `index.html` through the single-page-application fallback so that no error page is shown.

### Requirement 8: Build Wiring and Failure Handling

**User Story:** As a developer, I want the asset generation wired into the build with a build-time-only rasterizer that fails loudly on errors, so that a broken preview never ships and the rasterizer never reaches the browser.

#### Acceptance Criteria

1. WHEN `npm run build` runs, THE Build_Generator SHALL execute before `vite build` so that the generated files exist in `public/` when Vite copies that directory into `dist/`.
2. THE Rasterizer SHALL be an injectable function provided to the Build_Generator, declared as a devDependency, used only at build time, and shipped in neither the SPA bundle nor any Worker.
3. WHEN the Share_Html_Builder emits the browser redirect target, THE Share_Html_Builder SHALL use only a same-origin Redirect_Hash beginning with `#/` and SHALL NOT emit an absolute external redirect.
4. IF a template builder, the Rasterizer, or a file write fails during generation, THEN THE Build_Generator SHALL throw and cause `npm run build` to exit non-zero without emitting a partial or placeholder asset set.

### Requirement 9: Brazilian Portuguese User-Facing Copy

**User Story:** As a Brazilian Portuguese-speaking user, I want all share preview text in pt-BR, so that the experience is consistent with the rest of the application.

#### Acceptance Criteria

1. WHEN the Share_Html_Builder emits the title, description, interstitial text, and fallback link, THE Share_Html_Builder SHALL render that copy in pt-BR.
2. WHEN the Svg_Template_Builder composes badge or certificate text, THE Svg_Template_Builder SHALL render literal copy in pt-BR.
3. WHEN the Build_Generator emits any user-facing literal copy, THE Build_Generator SHALL render that copy in pt-BR.
4. WHEN the Share_Html_Builder sets the document language and the Open Graph locale, THE Share_Html_Builder SHALL declare the language as pt-BR and the `og:locale` as `pt_BR`.
