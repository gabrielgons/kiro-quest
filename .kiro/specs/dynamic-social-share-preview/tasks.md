# Implementation Plan: Static Social Share Preview (Build-Time, Per-Module)

## Overview

This plan implements **static, build-time, per-module** social share previews with **zero
new runtime cost**. At build time we generate one 1200×630 PNG per `STAGE_ORDER` module
(11) plus one certificate PNG into `public/og/`, and one crawlable HTML share page per
module (plus one for the certificate) into `public/s/`. Each share page carries
per-module Open Graph + Twitter tags whose `og:image` points at the matching static PNG,
then redirects real browsers into the SPA hash route (`#/summary/<stage>`, served by the
existing `vue-router` hash history).

There is **no** Cloudflare Worker, **no** `worker/` directory, **no** `/og/*` or `/s/*`
runtime route handlers, **no** `workers-og`/Satori, **no** `fonts.ts`, **no**
`shareParams` validator / `ShareParamError`, **no** server-side level recomputation,
**no** edge cache, and **no** Miniflare / `@cloudflare/vitest-pool-workers`.
`wrangler.jsonc` keeps serving `./dist` as Static Assets only (no `main` entry, no
bindings). The SVG→PNG rasterizer (`@resvg/resvg-js`) is a **build-time-only
devDependency**, injected into the orchestrator so tests can mock it.

Implementation language is **TypeScript** (matching the existing Vue 3 / Vite / Vitest
project; `tsx` is already a devDependency). All user-facing copy is **Brazilian
Portuguese (pt-BR)**.

**Reused source of truth (do NOT duplicate or modify as part of new logic):**
- `src/badges/badgeDesigns.ts` → `BADGE_DESIGNS` (`icon`, `primaryColor`,
  `secondaryColor`, `displayName`)
- `src/engine/types.ts` → `LearningStage`
- `src/engine/quizEngine.ts` → `STAGE_ORDER` (11 stages)

**Build order of new modules:** pure templates → checkpoint → orchestrator → real
rasterizer entry + build wiring → checkpoint → client share URLs → regression → final
checkpoint.

## Tasks

- [ ] 1. Implement the pure SVG template builder (`scripts/templates/svgTemplate.ts`)
  - [ ] 1.1 Implement `buildBadgeSvg(stage, design)` and `buildCertificateSvg()`
    - Export `OG_WIDTH = 1200` and `OG_HEIGHT = 630` constants
    - `buildBadgeSvg` returns a deterministic `1200×630` SVG string declaring
      `width="1200" height="630" viewBox="0 0 1200 630"`, using `design.primaryColor` /
      `design.secondaryColor` (gradient background), `design.icon`, and
      `design.displayName` from the imported `BADGE_DESIGNS` entry
    - `buildCertificateSvg()` returns a generic 1200×630 certificate card with **no
      per-user data** and pt-BR literal copy
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
      **Validates: Requirements 4.5, 4.7**
    - **Property 6: Determinism** — for every `stage ∈ STAGE_ORDER`, two calls to
      `buildBadgeSvg(stage, BADGE_DESIGNS[stage])` return byte-identical strings
      **Validates: Requirements 5.1**
    - Tag format: **Feature: dynamic-social-share-preview, Property 4 / Property 6**
    - Minimum 100 iterations per property
    - _Requirements: 4.5, 4.7, 5.1_

- [ ] 2. Implement the pure HTML share-page builder (`scripts/templates/shareHtmlTemplate.ts`)
  - [ ] 2.1 Implement `renderShareHtml(meta)`, `buildBadgeShareHtml(stage, design, siteOrigin)`, and `buildCertificateShareHtml(siteOrigin)`
    - Define the `ShareMeta` interface (`title`, `description`, `imageUrl`, `pageUrl`,
      `redirectHash`)
    - `renderShareHtml(meta)` emits a complete crawlable HTML document with
      `<html lang="pt-BR">` and **exactly one each** of: `og:type`, `og:site_name`,
      `og:title`, `og:description`, `og:image`, `og:image:width`=1200,
      `og:image:height`=630, `og:url`, `og:locale`=`pt_BR`,
      `twitter:card`=`summary_large_image`, `twitter:title`, `twitter:description`,
      `twitter:image`
    - Emit a `<script>location.replace(...)</script>` JS redirect, a
      `<meta http-equiv="refresh">` no-JS fallback, and a visible pt-BR interstitial link —
      all pointing at the same-origin `redirectHash`
    - `buildBadgeShareHtml` derives `imageUrl = siteOrigin + "/og/badge-" + stage + ".png"`,
      `pageUrl = siteOrigin + "/s/badge/" + stage`, `redirectHash = "#/summary/" + stage`,
      and pt-BR `title`/`description`
    - `buildCertificateShareHtml` derives the certificate variants
      (`/og/certificate.png`, `/s/certificate`, certificate redirect hash)
    - Add an internal `htmlEscape` helper; HTML-escape every interpolated value and
      JS-quote the redirect target; never emit an absolute external redirect
      (`redirectHash` MUST begin with `#/`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.3, 4.4, 4.6, 4.7, 5.2, 9.1, 9.4_

  - [ ]* 2.2 Write unit/snapshot tests for `shareHtmlTemplate.ts` (`scripts/__tests__/shareHtmlTemplate.test.ts`)
    - Assert all required OG/Twitter tags are present **exactly once**
    - Assert `og:image` equals the correct `<origin>/og/badge-<stage>.png` and the
      certificate variant equals `<origin>/og/certificate.png`
    - Assert the redirect target begins with `#/` and copy is pt-BR (`lang="pt-BR"`,
      `og:locale=pt_BR`)
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 4.6, 9.1, 9.4_

  - [ ]* 2.3 Write fast-check property tests for `shareHtmlTemplate.ts`
    - **Property 1: Every stage gets a complete, well-formed share page** — for every
      `stage ∈ STAGE_ORDER`, all required OG/Twitter tags appear exactly once
      **Validates: Requirements 1.1, 1.2, 1.4, 9.1, 9.4**
    - **Property 2: `og:image` references the matching static PNG** — `og:image` equals
      `origin + "/og/badge-" + stage + ".png"` for every stage
      **Validates: Requirements 1.3, 2.1, 2.3**
    - **Property 3: Redirect target is always a same-origin SPA hash route** — every
      redirect target (`location.replace` arg, `<meta refresh>` URL, link `href`) begins
      with `#/` and is never an absolute external URL
      **Validates: Requirements 1.5, 1.6, 7.5, 8.3**
    - **Property 4: Escaping holds for all interpolated text** — no raw `< > & " '` in any
      interpolated HTML region
      **Validates: Requirements 4.5, 4.7**
    - **Property 6: Determinism** — two calls with identical `stage`/`design`/`siteOrigin`
      return byte-identical strings
      **Validates: Requirements 5.2**
    - Tag format: **Feature: dynamic-social-share-preview, Property 1 / 2 / 3 / 4 / 6**
    - Minimum 100 iterations per property
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.5, 4.7, 5.2, 7.5, 8.3, 9.1, 9.4_

- [ ] 3. Checkpoint — pure template builders
  - Ensure all SVG and HTML template-builder tests pass, ask the user if questions arise.

- [ ] 4. Implement the build orchestrator (`scripts/generateSocialAssets.ts`)
  - [ ] 4.1 Implement `generateSocialAssets({ outDir, siteOrigin, rasterize })`
    - Define `GenerateOptions` (`outDir`, `siteOrigin`, injectable
      `rasterize(svg, width, height) => Uint8Array`) and `GenerateResult`
      (`pngFiles`, `htmlFiles`)
    - Import `STAGE_ORDER` from `@/engine/quizEngine` and `BADGE_DESIGNS` from
      `@/badges/badgeDesigns`; add an `ensureDir` helper that creates `<outDir>/og` and
      `<outDir>/s/badge` as needed
    - Iterate `STAGE_ORDER`: `buildBadgeSvg` → `rasterize` → write
      `public/og/badge-<stage>.png`; `buildBadgeShareHtml` → write
      `public/s/badge/<stage>.html`
    - Then build the certificate SVG → rasterize → write `public/og/certificate.png`, and
      certificate HTML → write `public/s/certificate.html`
    - Return `{ pngFiles, htmlFiles }` (12 + 12 paths); **throw (fail loud) on any
      template, rasterize, or write error** so the build fails without emitting a partial
      or placeholder set
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 8.4_

  - [ ]* 4.2 Write the orchestrator smoke test with a MOCKED rasterizer (`scripts/__tests__/generateSocialAssets.test.ts`)
    - **Property 5: Generator emits the exact expected file set** — call
      `generateSocialAssets` with a mock `rasterize` (returns a tiny fixed byte array) and
      a temp/in-memory `outDir`
    - Assert it emits exactly **11 badge PNGs + 1 certificate PNG** and **11 badge HTML +
      1 certificate HTML** (12 + 12), following the `og/badge-<stage>.png` /
      `s/badge/<stage>.html` naming contract
    - Assert the mock rasterizer is invoked **once per stage + once for the certificate**
      (12 total)
    - **Validates: Requirements 2.1, 2.2**
    - Tag format: **Feature: dynamic-social-share-preview, Property 5**
    - _Requirements: 2.1, 2.2, 8.4_

- [ ] 5. Add the rasterizer dependency and the real build entry
  - [ ] 5.1 Add `@resvg/resvg-js` as a **devDependency**
    - Add to `package.json` `devDependencies` only (or `sharp` as the documented
      alternative); it must ship in neither the SPA bundle nor any Worker
    - _Requirements: 8.2_

  - [ ] 5.2 Implement the thin entry `scripts/generate-social-assets.ts`
    - Import `Resvg` from `@resvg/resvg-js` and `generateSocialAssets` from
      `./generateSocialAssets`
    - Call `generateSocialAssets({ outDir: <repo>/public, siteOrigin: process.env.SITE_ORIGIN ?? '<documented production origin>', rasterize: (svg, w) => new Resvg(svg, { fitTo: { mode: 'width', value: w } }).render().asPng() })`
    - Inject `@resvg/resvg-js` as the real rasterizer here only; let errors propagate
      (non-zero exit) so a broken preview never ships
    - _Requirements: 8.1, 8.2, 8.4_

- [ ] 6. Wire generation into the build and keep static serving
  - [ ] 6.1 Run the generator before `vite build`
    - Update `package.json` `build` to run `scripts/generate-social-assets.ts` (via `tsx`)
      **before** `vue-tsc -b && vite build`, OR register a Vite `buildStart` hook — so the
      generated files exist in `public/` when Vite copies it into `dist/` (confirm
      `public/og` and `public/s` land in `dist/`)
    - _Requirements: 8.1_

  - [ ] 6.2 Confirm `wrangler.jsonc` stays static-assets-only
    - Keep `assets.directory: "./dist"` with **no** `main` Worker entry and **no** bindings
      (no KV/R2/D1/Durable Objects)
    - Set `html_handling: "auto-trailing-slash"` so `/s/badge/<stage>` resolves to
      `<stage>.html`, and `not_found_handling: "single-page-application"` so unmatched
      paths fall back to `index.html`
    - _Requirements: 7.1, 7.6_

  - [ ] 6.3 Decide and apply `.gitignore` policy for generated assets
    - Decision sub-task: determine whether build-generated `public/og/` and `public/s/`
      should be committed or treated as build artifacts; if they should NOT be committed,
      add `public/og/` and `public/s/` to `.gitignore` (consistent with the existing
      `dist` ignore). If they SHOULD be committed (e.g., for diff visibility), document
      that choice and add no ignore entry
    - Either way the files must still be produced into `public/` at build time so Vite
      copies them into `dist/`
    - _Requirements: 8.1_

- [ ] 7. Checkpoint — orchestrator, rasterizer entry, and build wiring
  - Ensure the orchestrator smoke test passes and the build wiring is in place, ask the
    user if questions arise.

- [ ] 8. Extend the client share-URL builder (`src/badges/imageSharer.ts`)
  - [ ] 8.1 Add `buildBadgeShareUrl(stage)` and `buildCertificateShareUrl()`
    - `buildBadgeShareUrl(stage)` returns `${origin}/s/badge/${stage}`;
      `buildCertificateShareUrl()` returns `${origin}/s/certificate`
    - Resolve `origin` from `window.location.origin` with the documented production-origin
      fallback when unavailable; no per-user query params
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ] 8.2 Route social shares through the crawlable `/s/...` URLs
    - Update `openShareWindow` / `shareToSocial` to pass the new `/s/...` URLs
    - **Keep the existing download, native Web Share (image blob), and static
      `index.html` root OG fallback paths untouched**
    - _Requirements: 6.4, 6.5, 7.2, 7.3, 7.4_

  - [ ]* 8.3 Extend the existing imageSharer unit test for the URL builders
    - Assert `buildBadgeShareUrl(stage)` returns the correct `/s/badge/<stage>` path and
      `buildCertificateShareUrl()` returns `/s/certificate`, including origin-fallback
      behavior
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ]* 8.4 Add fast-check property tests for the client URL builders
    - **Property 7: Client URL builders produce same-origin `/s/...` paths** — for every
      `stage ∈ STAGE_ORDER`, `buildBadgeShareUrl(stage)` equals `${origin}/s/badge/${stage}`
      and `buildCertificateShareUrl()` equals `${origin}/s/certificate`, using the resolved
      origin (or the documented fallback)
    - **Validates: Requirements 6.1, 6.2, 6.6**
    - Tag format: **Feature: dynamic-social-share-preview, Property 7**
    - Minimum 100 iterations
    - _Requirements: 6.1, 6.2, 6.6_

- [ ] 9. Backwards-compatibility regression
  - [ ]* 9.1 Verify the static `index.html` root Open Graph card and unchanged share paths
    - **Property 8: Backwards-compatibility floor preserved** — assert the existing root
      OG fallback card and the download + native Web Share (image blob) paths remain
      intact, and any path without a generated share/image file still resolves through the
      existing SPA fallback
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
    - Tag format: **Feature: dynamic-social-share-preview, Property 8**
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 9.2 Verify SPA deep links still resolve after the `/s/*` redirect
    - Assert a `#/summary/<stage>` hash route resolves the existing achievement view after
      redirect (no Worker/Miniflare tests)
    - _Requirements: 7.5, 7.6_

- [ ] 10. Final checkpoint — all tests pass and a real build produces the full asset set
  - Ensure all unit and property tests pass.
  - Run `npm run build` and confirm it succeeds and that `dist/og/` contains **12 PNGs**
    (11 `badge-<stage>.png` + 1 `certificate.png`) and `dist/s/` contains **12 HTML files**
    (11 `badge/<stage>.html` + 1 `certificate.html`).
  - Ask the user if questions arise.

## Notes

- Sub-tasks marked with `*` are optional test tasks and can be skipped for a faster MVP;
  top-level tasks are never optional.
- The rasterizer is injected into `generateSocialAssets`, so the smoke test (Task 4.2)
  uses a **mock** rasterizer and never performs heavy PNG work; the real `@resvg/resvg-js`
  is wired only in the thin entry (Task 5.2).
- Property tests run a minimum of 100 iterations and are quantified over every
  `STAGE_ORDER` stage; each references its design Correctness Property number and the
  requirement clauses it validates. Properties 1–8 map 1:1 onto the test sub-tasks:
  P1/P2/P3 → 2.3; P4 → 1.3 + 2.3; P5 → 4.2; P6 → 1.3 + 2.3; P7 → 8.4; P8 → 9.1.
- This plan deliberately contains **no** `worker/` directory, fetch handler, `/og` or
  `/s` runtime route handlers, `worker/layouts`, `fonts.ts`, `workers-og`/Satori,
  `shareParams` validator / `ShareParamError`, server-side level recomputation, edge
  cache, or Miniflare / `@cloudflare/vitest-pool-workers` work.
- All user-facing copy (titles, descriptions, interstitial text, fallback link, SVG text)
  must be in Brazilian Portuguese (pt-BR).
- `src/badges/badgeDesigns.ts`, `src/engine/types.ts`, and `src/engine/quizEngine.ts`
  remain the unchanged single source of truth and must not be duplicated.

## Task Dependency Graph (Waves)

Tasks within the same wave have no dependencies on each other and may be executed in
parallel. Each wave depends on the completion of the previous wave. Checkpoints (Tasks 3,
7, 10) are gates between waves.

```json
{
  "feature": "dynamic-social-share-preview",
  "criticalPath": ["1", "2", "4", "5", "6", "9", "10"],
  "notes": "Task 8 (client share-URL builders) is independent of the templates and orchestrator; it runs in Wave 1 in parallel and only rejoins the critical path at the Wave 5 regression (Task 9).",
  "waves": [
    {
      "wave": 1,
      "description": "Pure, independent modules — fully parallel",
      "parallel": true,
      "tasks": ["1", "2", "8"],
      "dependsOn": []
    },
    {
      "wave": 2,
      "description": "Checkpoint gate after template builders",
      "parallel": false,
      "tasks": ["3"],
      "dependsOn": ["1", "2"]
    },
    {
      "wave": 3,
      "description": "Build orchestrator — composes the pure template builders",
      "parallel": false,
      "tasks": ["4"],
      "dependsOn": ["1", "2"]
    },
    {
      "wave": 4,
      "description": "Real rasterizer entry and build/static-serving wiring",
      "parallel": false,
      "tasks": ["5", "6"],
      "dependsOn": ["4"]
    },
    {
      "wave": 5,
      "description": "Checkpoint gate after orchestrator + rasterizer entry + build wiring",
      "parallel": false,
      "tasks": ["7"],
      "dependsOn": ["5", "6"]
    },
    {
      "wave": 6,
      "description": "Backwards-compatibility regression — needs build wiring and client URL builders",
      "parallel": false,
      "tasks": ["9"],
      "dependsOn": ["6", "8"]
    },
    {
      "wave": 7,
      "description": "Final checkpoint — all tests pass and npm run build produces 12 PNGs + 12 HTML in dist/",
      "parallel": false,
      "tasks": ["10"],
      "dependsOn": ["9"]
    }
  ]
}
```
