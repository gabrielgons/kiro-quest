# Implementation Plan: Static Social Share Preview (Build-Time, Per-Module)

## Overview

This plan implements **static, build-time, per-module** social share previews with **zero
new runtime cost**. At build time we generate one 1200×630 PNG per `STAGE_ORDER` module
(11) plus one certificate PNG into `public/og/`, and one crawlable HTML share page per
module (plus one for the certificate) into `public/s/`. Each share page carries
per-module Open Graph + Twitter tags whose `og:image` points at the matching static PNG,
then redirects real browsers into the SPA hash route.

There is **no** Cloudflare Worker, **no** `worker/` directory, **no** `/og/*` runtime
rendering, **no** `workers-og`/Satori, **no** `ShareParamError`/share-param validator,
**no** edge cache, and **no** Miniflare / `@cloudflare/vitest-pool-workers`. `wrangler.jsonc`
keeps serving `./dist` as Static Assets only. The SVG→PNG rasterizer (`@resvg/resvg-js`)
is a **build-time-only devDependency**, injected into the orchestrator so tests can mock it.

Implementation language is **TypeScript** (matching the existing Vue/Vite/vitest project).
All user-facing copy is **Brazilian Portuguese (pt-BR)**.

**Reused source of truth (do NOT duplicate or modify as part of new logic):**
- `src/badges/badgeDesigns.ts` → `BADGE_DESIGNS`
- `src/engine/types.ts` → `LearningStage`
- `src/engine/quizEngine.ts` → `STAGE_ORDER` (11 stages)

**Build order of new modules:** pure templates → orchestrator → real rasterizer entry +
build wiring → client share URLs → regression.

## Tasks

- [ ] 1. Implement the pure SVG template builder (`scripts/templates/svgTemplate.ts`)
  - [ ] 1.1 Implement `buildBadgeSvg(stage, design)` and `buildCertificateSvg()`
    - Export `OG_WIDTH = 1200` and `OG_HEIGHT = 630` constants
    - `buildBadgeSvg` returns a deterministic `1200×630` SVG string declaring
      `width="1200" height="630" viewBox="0 0 1200 630"`, using `design.primaryColor` /
      `design.secondaryColor` (gradient background), `design.icon`, and
      `design.displayName` from the imported `BADGE_DESIGNS` entry
    - `buildCertificateSvg()` returns a generic 1200×630 certificate card with **no
      per-user data**, pt-BR literal copy
    - Add an internal `xmlEscape` helper and XML-escape every interpolated text value
      (`<`, `>`, `&`, `"`, `'`)
    - Import `LearningStage` from `@/engine/types` and `BadgeDesign` from
      `@/badges/badgeDesigns`; keep functions pure (no I/O)
    - _Requirements: 2.3, 2.4, 4.2, 4.4, 4.5, 5.1, 9.2_

  - [ ]* 1.2 Write unit/snapshot tests for `svgTemplate.ts` (`scripts/__tests__/svgTemplate.test.ts`)
    - Assert a known stage's SVG contains the correct `BADGE_DESIGNS[stage]`
      `displayName`, `icon`, `primaryColor`, `secondaryColor`
    - Assert the SVG declares `width="1200"` and `height="630"`
    - Assert XML-escaping of interpolated text holds (snapshot acceptable)
    - _Requirements: 2.3, 4.2, 4.5, 9.2_

  - [ ]* 1.3 Write fast-check property tests for `svgTemplate.ts`
    - **Property 4: Escaping holds for all interpolated text** — quantified over every
      `stage ∈ STAGE_ORDER`, the SVG interpolated regions contain no raw `< > & " '`
    - **Property 6: Determinism** — for every `stage ∈ STAGE_ORDER`, two calls to
      `buildBadgeSvg(stage, BADGE_DESIGNS[stage])` return byte-identical strings
    - Tag format: **Feature: dynamic-social-share-preview, Property 4 / Property 6**
    - _Requirements: 4.5, 5.1_

- [ ] 2. Implement the pure HTML share-page builder (`scripts/templates/shareHtmlTemplate.ts`)
  - [ ] 2.1 Implement `renderShareHtml(meta)`, `buildBadgeShareHtml(stage, design, siteOrigin)`, and `buildCertificateShareHtml(siteOrigin)`
    - Define the `ShareMeta` interface (`title`, `description`, `imageUrl`, `pageUrl`,
      `redirectHash`)
    - `renderShareHtml(meta)` emits a complete crawlable HTML document with `<html
      lang="pt-BR">` and **exactly one each** of: `og:type`, `og:site_name`, `og:title`,
      `og:description`, `og:image`, `og:image:width`=1200, `og:image:height`=630,
      `og:url`, `og:locale`=`pt_BR`, `twitter:card`=`summary_large_image`,
      `twitter:title`, `twitter:description`, `twitter:image`
    - Emit a `<script>location.replace(...)</script>` JS redirect, a
      `<meta http-equiv="refresh">` no-JS fallback, and a visible pt-BR interstitial link —
      all pointing at the same-origin `redirectHash`
    - `buildBadgeShareHtml` derives `imageUrl = siteOrigin + "/og/badge-" + stage + ".png"`,
      `pageUrl = siteOrigin + "/s/badge/" + stage`, `redirectHash = "#/summary/" + stage`,
      pt-BR `title`/`description`
    - `buildCertificateShareHtml` derives the certificate variants
      (`/og/certificate.png`, `/s/certificate`, certificate redirect hash)
    - Add an internal `htmlEscape` helper; HTML-escape every interpolated value and
      JS-quote the redirect target; never emit an absolute external redirect
      (`redirectHash` MUST begin with `#/`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.3, 4.4, 4.6, 4.7, 5.2, 9.1, 9.4_

  - [ ]* 2.2 Write unit/snapshot tests for `shareHtmlTemplate.ts` (`scripts/__tests__/shareHtmlTemplate.test.ts`)
    - Assert all required OG/Twitter tags are present **exactly once**
    - Assert `og:image` equals the correct `<origin>/og/badge-<stage>.png`
    - Assert the redirect target begins with `#/` and copy is pt-BR (`lang="pt-BR"`,
      `og:locale=pt_BR`)
    - _Requirements: 1.3, 1.4, 1.5, 4.6, 9.1, 9.4_

  - [ ]* 2.3 Write fast-check property tests for `shareHtmlTemplate.ts`
    - **Property 1: Every stage gets a complete, well-formed share page** — for every
      `stage ∈ STAGE_ORDER`, all required OG/Twitter tags appear exactly once
    - **Property 2: `og:image` references the matching static PNG** — `og:image` equals
      `origin + "/og/badge-" + stage + ".png"` for every stage
    - **Property 3: Redirect target is always a same-origin SPA hash route** — every
      redirect target (`location.replace` arg, `<meta refresh>` URL, link `href`) begins
      with `#/`
    - **Property 4: Escaping holds** — no raw `< > & " '` in interpolated regions
    - **Property 6: Determinism** — two calls with identical inputs return identical strings
    - Tag format: **Feature: dynamic-social-share-preview, Property 1 / 2 / 3 / 4 / 6**
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.5, 4.6, 5.2, 9.4_

- [ ] 3. Implement the build orchestrator (`scripts/generateSocialAssets.ts`)
  - [ ] 3.1 Implement `generateSocialAssets({ outDir, siteOrigin, rasterize })`
    - Define `GenerateOptions` (`outDir`, `siteOrigin`, injectable
      `rasterize(svg, width, height) => Uint8Array`) and `GenerateResult`
      (`pngFiles`, `htmlFiles`)
    - Import `STAGE_ORDER` from `@/engine/quizEngine` and `BADGE_DESIGNS` from
      `@/badges/badgeDesigns`; ensure `public/og/` and `public/s/badge/` exist
    - Iterate `STAGE_ORDER`: build SVG → `rasterize` → write `public/og/badge-<stage>.png`;
      build HTML → write `public/s/badge/<stage>.html`
    - Then build the certificate SVG → rasterize → write `public/og/certificate.png`, and
      certificate HTML → write `public/s/certificate.html`
    - Return `{ pngFiles, htmlFiles }` (12 + 12 paths); **throw on any template, rasterize,
      or write error** so the build fails (no partial/placeholder set)
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 8.4_

  - [ ]* 3.2 Write the build-script smoke test with a MOCK rasterizer (`scripts/__tests__/generateSocialAssets.test.ts`)
    - **Property 5: Generator emits the exact expected file set** — call
      `generateSocialAssets` with a mock `rasterize` (returns a tiny fixed byte array) and
      a temp/in-memory `outDir`
    - Assert it emits exactly **11 badge PNGs + 1 certificate PNG** and **11 badge HTML +
      1 certificate HTML** (12 + 12)
    - Assert the mock rasterizer is invoked **once per stage + once for the certificate**
    - Tag format: **Feature: dynamic-social-share-preview, Property 5**
    - _Requirements: 2.1, 2.2, 8.4_

- [ ] 4. Checkpoint — pure templates and orchestrator
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Add the rasterizer dependency and the real build entry
  - [ ] 5.1 Add `@resvg/resvg-js` as a **devDependency**
    - Add to `package.json` `devDependencies` only (or `sharp` as the documented
      alternative); it must ship in neither the SPA bundle nor any Worker
    - _Requirements: 8.2_

  - [ ] 5.2 Implement the thin entry `scripts/generate-social-assets.ts`
    - Import `Resvg` from `@resvg/resvg-js` and `generateSocialAssets` from
      `./generateSocialAssets`
    - Call `generateSocialAssets({ outDir: <repo>/public, siteOrigin: process.env.SITE_ORIGIN ?? '<documented production origin>', rasterize: (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng() })`
    - Let errors propagate (non-zero exit) so a broken preview never ships
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 6. Wire generation into the build and keep static serving
  - [ ] 6.1 Run the generator before `vite build`
    - Update `package.json` `build` to run `scripts/generate-social-assets.ts` (via `tsx`)
      **before** `vue-tsc -b && vite build`, OR register a Vite `buildStart` hook — so the
      generated files exist in `public/` when Vite copies it into `dist/`
    - _Requirements: 8.1_

  - [ ] 6.2 Confirm `wrangler.jsonc` stays static-assets-only
    - Keep `assets.directory: "./dist"` with **no** `main` Worker entry and **no** bindings
      (no KV/R2/D1/Durable Objects)
    - Set `html_handling` (e.g. `auto-trailing-slash`) so `/s/badge/<stage>` resolves to
      `<stage>.html`, and `not_found_handling: single-page-application` so unmatched paths
      fall back to `index.html`
    - _Requirements: 7.1, 7.6_

- [ ] 7. Extend the client share-URL builder (`src/badges/imageSharer.ts`)
  - [ ] 7.1 Add `buildBadgeShareUrl(stage)` and `buildCertificateShareUrl()`
    - `buildBadgeShareUrl(stage)` returns `${origin}/s/badge/${stage}`;
      `buildCertificateShareUrl()` returns `${origin}/s/certificate`
    - Resolve `origin` from `window.location.origin` with the documented production-origin
      fallback when unavailable; no per-user query params
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ] 7.2 Route social shares through the crawlable `/s/...` URLs
    - Update `openShareWindow` / `shareToSocial` to pass the new `/s/...` URLs
    - **Keep the existing download, native Web Share (image blob), and static
      `index.html` root OG fallback paths untouched**
    - _Requirements: 6.4, 6.5, 7.2, 7.3, 7.4_

  - [ ]* 7.3 Extend the existing imageSharer test with unit tests for the URL builders
    - Assert `buildBadgeShareUrl(stage)` returns the correct `/s/badge/<stage>` path and
      `buildCertificateShareUrl()` returns `/s/certificate`, including origin-fallback
      behavior
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ]* 7.4 Add fast-check property tests for the client URL builders
    - **Property 7: Client URL builders produce same-origin `/s/...` paths** — for every
      `stage ∈ STAGE_ORDER`, `buildBadgeShareUrl(stage)` equals `${origin}/s/badge/${stage}`
      and `buildCertificateShareUrl()` equals `${origin}/s/certificate`
    - Tag format: **Feature: dynamic-social-share-preview, Property 7**
    - _Requirements: 6.1, 6.2, 6.6_

- [ ] 8. Backwards-compatibility regression
  - [ ]* 8.1 Verify the static `index.html` root Open Graph card is unchanged
    - **Property 8: Backwards-compatibility floor preserved** — assert the existing root
      OG fallback card remains intact
    - Tag format: **Feature: dynamic-social-share-preview, Property 8**
    - _Requirements: 7.4_

  - [ ]* 8.2 Verify SPA deep links still resolve after the `/s/*` redirect
    - Assert a `#/summary/<stage>` hash route resolves the existing achievement view after
      redirect (no Worker/Miniflare tests)
    - _Requirements: 7.5, 7.6_

- [ ] 9. Final checkpoint — all assets, wiring, and tests
  - Ensure all tests pass, ask the user if questions arise.

## Task Dependency Graph (Waves)

Tasks within the same wave have no dependencies on each other and may be done in parallel.
Each wave depends on the completion of the previous wave.

```text
Wave 1 (pure / independent modules — fully parallel):
  - Task 1  svgTemplate.ts            (pure SVG builders)
  - Task 2  shareHtmlTemplate.ts      (pure HTML builders)
  - Task 7  imageSharer.ts URL builders (client; independent of templates/orchestrator)

Wave 2 (orchestration — depends on Wave 1 templates):
  - Task 3  generateSocialAssets.ts   (needs Task 1 + Task 2)

  ── Checkpoint: Task 4 (after Tasks 1–3) ──

Wave 3 (real rasterizer + build wiring — depends on the orchestrator):
  - Task 5  @resvg/resvg-js devDependency + scripts/generate-social-assets.ts entry (needs Task 3)
  - Task 6  package.json build step + wrangler.jsonc static config (needs Task 5)

Wave 4 (regression — depends on build wiring + client work):
  - Task 8  index.html OG fallback + SPA deep-link regression (needs Task 6 + Task 7)

  ── Final checkpoint: Task 9 ──
```

**Critical path:** Task 1 / Task 2 → Task 3 → Task 5 → Task 6 → Task 8 → Task 9.
Task 7 (client URL builders) runs in parallel from Wave 1 and only rejoins at Task 8.

## Notes

- Sub-tasks marked with `*` are optional test tasks and can be skipped for a faster MVP;
  top-level tasks are never optional.
- The rasterizer is injected into `generateSocialAssets`, so the smoke test (Task 3.2)
  uses a **mock** rasterizer and never performs heavy PNG work.
- Property tests run a minimum of 100 iterations and are quantified over every
  `STAGE_ORDER` stage; each references its design Correctness Property number.
- This plan deliberately contains **no** `worker/` directory, fetch handler, `/og` runtime
  rendering, `workers-og`/Satori, `ShareParamError`, edge cache, or
  Miniflare / `@cloudflare/vitest-pool-workers` work.
- All user-facing copy (titles, descriptions, interstitial text, fallback link, SVG text)
  must be in Brazilian Portuguese (pt-BR).
- `src/badges/badgeDesigns.ts`, `src/engine/types.ts`, and `src/engine/quizEngine.ts`
  remain the unchanged single source of truth and must not be duplicated.
