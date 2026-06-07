# Implementation Plan: Dynamic Social Share Preview

## Overview

This plan implements an edge-rendered, crawlable social share preview for Kiro Quest
(Option C) on the existing Cloudflare Workers deployment. Work proceeds bottom-up: first
the build wiring and the pure, shared parameter validator (the highest-risk surface),
then font loading, the OG HTML renderer and share-route handlers, the Satori layouts,
the dynamic image handlers with edge caching, the Worker entry that dispatches and falls
through to static assets, and finally the client share-URL builders. Each step builds on
the previous one and ends by wiring the pieces into `worker/index.ts` and the SPA's
share buttons, so no code is left orphaned.

Implementation language: **TypeScript**. Tests use **vitest** + **@fast-check/vitest**
(already installed) for property tests, plus **@cloudflare/vitest-pool-workers** for
Worker handler tests. The shared modules `src/badges/badgeDesigns.ts` (`BADGE_DESIGNS`),
`src/engine/quizEngine.ts` (`calculatePerformanceLevel`, `STAGE_ORDER`), and
`src/engine/types.ts` (`LearningStage`, `PerformanceLevel`) are reused as the single
source of truth. All user-facing copy is in pt-BR.

## Tasks

- [ ] 1. Set up Worker build configuration and dependencies
  - [ ] 1.1 Configure Wrangler Worker entry, asset binding, fonts, and dependencies
    - Add `workers-og` (Satori + resvg WASM) to `dependencies` and
      `@cloudflare/vitest-pool-workers` to `devDependencies` in `package.json`
    - Modify `wrangler.jsonc`: add `main: "worker/index.ts"`, add
      `assets.binding: "ASSETS"` alongside the existing `assets.directory: "./dist"`,
      add `compatibility_flags: ["nodejs_compat"]`, and keep
      `not_found_handling: "single-page-application"`
    - Add a bundled woff/ttf font asset under `assets/fonts/` (Inter or Noto Sans —
      must cover pt-BR diacritics) and configure Wrangler/esbuild to import it as an
      `ArrayBuffer` binary module
    - Add a Worker `tsconfig` that mirrors the `@` path alias so `worker/` can import
      `src/engine/*` and `src/badges/*`; verify `BADGE_DESIGNS`,
      `calculatePerformanceLevel`, `STAGE_ORDER`, `LearningStage`, and
      `PerformanceLevel` resolve from the Worker bundle
    - _Requirements: 7.1, 2.4, 2.5_

- [ ] 2. Implement the shared parameter validator (`worker/shareParams.ts`)
  - [ ] 2.1 Implement parse, validate, sanitize, and normalize logic
    - Define `MAX_TOTAL = 100`, `MAX_NAME_LENGTH = 40`, `ShareParamError`,
      `ValidatedBadgeParams`, and `ValidatedCertificateParams`
    - Implement `parseBoundedInt` (strict `^[0-9]{1,4}$` regex + min/max bounds),
      `parseBadgeParams` (strip `.png`, allowlist `stage` against `STAGE_ORDER`,
      cross-field `correct <= total` check, recompute `level` via
      `calculatePerformanceLevel`, ignore any client `level`), and
      `parseCertificateParams`
    - Implement `sanitizeName` (trim, strip control chars, HTML-escape `< > & " '`,
      cap at `MAX_NAME_LENGTH`; absent → `''`)
    - Implement `buildNormalizedQuery` (sorted params, name URL-encoded, derived
      `level` omitted) for a stable cache key
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2_

  - [ ]* 2.2 Write unit tests for `shareParams`
    - Cover happy paths, `.png` stripping, `correct > total`, out-of-range, NaN,
      missing params, name capping/escaping, and `buildNormalizedQuery` output
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 5.2_

  - [ ]* 2.3 Write property test for stage allowlist
    - **Property 1: Stage allowlist**
    - **Validates: Requirements 4.1**

  - [ ]* 2.4 Write property test for score bounds
    - **Property 2: Score bounds (success iff `0 <= c <= t <= MAX_TOTAL` and `t >= 1`)**
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ]* 2.5 Write property test for level recomputation
    - **Property 3: Level is recomputed and independent of any forged `level` input**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 2.6 Write property test for name sanitization
    - **Property 4: Name is bounded (`<= MAX_NAME_LENGTH`), escaped, and control-char-free**
    - **Validates: Requirements 4.5**

  - [ ]* 2.7 Write property test for query normalization
    - **Property 5: `buildNormalizedQuery` is order-insensitive (stable cache key)**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 3. Checkpoint - Ensure all validator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement font loading for Satori (`worker/fonts.ts`)
  - [ ] 4.1 Implement `loadFonts` returning a memoized `FontSet`
    - Load `regular`/`bold` buffers from the bundled font asset (no remote/user URL —
      SSRF guard); memoize across invocations within an isolate
    - Document emoji handling for badge `icon` glyphs via a fixed, bundled set
      (Satori `graphemeImages`/`loadAdditionalAsset` bound to bundled assets only)
    - _Requirements: 2.4, 2.5_

- [ ] 5. Implement OG HTML renderer and share-route handlers (`worker/routes/shareHtml.ts`)
  - [ ] 5.1 Implement `renderOgHtml(meta: OgMeta)`
    - Emit a complete `lang="pt-BR"` HTML document with all required tags: `og:type`,
      `og:site_name`, `og:title`, `og:description`, `og:image`, `og:image:width=1200`,
      `og:image:height=630`, `og:url`, `og:locale=pt_BR`, `twitter:card=summary_large_image`,
      `twitter:title`, `twitter:description`, `twitter:image`
    - Add the JS `location.replace` redirect, a `<meta http-equiv="refresh">` fallback,
      and a visible pt-BR interstitial link; assume all interpolated values are
      pre-escaped and only emit escaped values
    - _Requirements: 1.4, 1.5, 1.6, 4.7, 8.3, 9.1, 9.4_

  - [ ] 5.2 Implement `handleBadgeShare` and `handleCertificateShare`
    - Validate via `shareParams`; build the absolute same-origin `og:image` URL pointing
      at the matching `/og/...png` using `buildNormalizedQuery`; build the same-origin
      `redirectHash` (`#/...`); assemble pt-BR `OgMeta` and return `200 text/html`
    - _Requirements: 1.1, 1.2, 1.3, 8.3, 9.1_

  - [ ]* 5.3 Write snapshot/unit tests for `renderOgHtml`
    - Snapshot the emitted HTML; assert every required OG/Twitter tag is present, all
      interpolated values are escaped, and the redirect target begins with `#/`
    - _Requirements: 1.4, 4.7, 8.3, 9.1, 9.4_

- [ ] 6. Implement Satori layouts (`worker/layouts/`)
  - [ ] 6.1 Implement `badgeElement` in `badgeLayout.ts`
    - Build the 1200×630 Satori element tree (flexbox-only CSS subset) reusing
      `BADGE_DESIGNS[stage]` for `primaryColor`, `secondaryColor`, `icon`, `displayName`;
      lay out icon, displayName, `correct/total`, level label, and branding in pt-BR
    - _Requirements: 2.3, 9.2_

  - [ ] 6.2 Implement `certificateElement` in `certificateLayout.ts`
    - Build the 1200×630 certificate element tree with name + stats + level in pt-BR
    - _Requirements: 9.2_

  - [ ]* 6.3 Write snapshot tests for the layout element trees
    - Assert the returned plain-object trees reference the correct `BADGE_DESIGNS`
      colors/icon/displayName and pt-BR literal copy (no pixel assertions)
    - _Requirements: 2.3, 9.2_

- [ ] 7. Implement dynamic image-route handlers (`worker/routes/ogImage.ts`)
  - [ ] 7.1 Implement `handleBadgeImage` and `handleCertificateImage`
    - Validate params (400 `text/plain` pt-BR on `ShareParamError`, no render attempted);
      build the stable cache key from origin + path + `buildNormalizedQuery`; check
      `caches.default` first and return the cached response on hit
    - On miss, render a 1200×630 PNG via `workers-og` (Satori + resvg) using `loadFonts`
      and the layout element; return `200 image/png` with a `Cache-Control` header and
      store the clone via `ctx.waitUntil(cache.put(...))`; wrap render in try/catch for
      a 500 pt-BR body on unexpected failure
    - _Requirements: 2.1, 2.2, 4.8, 5.3, 5.4, 5.5, 5.6, 5.7, 8.2, 9.3_

  - [ ]* 7.2 Write unit tests for the image handler control flow
    - With a mocked renderer/cache: assert 400 on invalid params (no render), cache-hit
      short-circuit, `Cache-Control` present on render, non-blocking `cache.put`, and
      500 on render failure
    - _Requirements: 4.8, 5.3, 5.4, 5.6, 5.7, 8.2_

- [ ] 8. Checkpoint - Ensure all renderer and layout tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement the Worker entry and route dispatch (`worker/index.ts`)
  - [ ] 9.1 Implement the `fetch` handler with dispatch and error mapping
    - Route `/s/badge/*`, `/s/certificate`, `/og/badge/*`, `/og/certificate.png` to their
      handlers and delegate everything else to `env.ASSETS.fetch(request)`; wrap all
      handlers in try/catch mapping `ShareParamError` → 400 and any other error → 500,
      both with safe pt-BR bodies, so no unhandled error reaches the runtime
    - _Requirements: 7.1, 8.1, 8.2, 8.4, 9.3_

- [ ] 10. Extend the client share-URL builders (`src/badges/imageSharer.ts`)
  - [ ] 10.1 Add `buildBadgeShareUrl` / `buildCertificateShareUrl` and wire share buttons
    - Build absolute `{origin}/s/badge/{stage}` and `{origin}/s/certificate` URLs with
      `encodeURIComponent`-encoded `correct`/`total`, including `name` only when non-empty
      after trim; fall back to the canonical origin when `window.location.origin` is absent
    - Update `openShareWindow`/`shareToSocial` to pass the new `/s/...` URL; leave the
      existing download and native Web Share (image blob) paths and the static
      `index.html` OG fallback untouched
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.2, 7.3, 7.4_

  - [ ]* 10.2 Write unit tests for the URL builders
    - Cover path/encoding correctness, optional-name inclusion/omission, and origin
      fallback (extend the existing `imageSharer` test file)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 11. Worker handler integration tests
  - [ ]* 11.1 Write end-to-end Worker tests with `@cloudflare/vitest-pool-workers`
    - Assert `/og/badge/kiro-basics.png?correct=9&total=10` returns `200` + `image/png`
      + `Cache-Control` (+ PNG magic-byte smoke check); `/s/badge/...` returns HTML
      containing the expected `og:image` URL; unknown paths fall through to `env.ASSETS`;
      and a no-param request still yields a valid response (static fallback preserved)
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 5.6, 7.1, 8.4_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test sub-tasks and can be skipped for a faster MVP;
  core implementation sub-tasks are never optional.
- Each task references specific granular requirement clauses for traceability.
- Property tests (2.3-2.7) map one-to-one to the Correctness Properties in the design and
  target the pure, highest-risk validator surface.
- Worker handler tests assert status, content type, and cache headers (plus a PNG
  magic-byte smoke check) rather than pixel output.
- The shared modules (`BADGE_DESIGNS`, `calculatePerformanceLevel`, `STAGE_ORDER`,
  `LearningStage`, `PerformanceLevel`) are reused, never duplicated, in the Worker bundle.
- All user-facing copy (HTML interstitial, image text, error bodies, locale tags) is pt-BR.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "10.1"] },
    { "id": 1, "tasks": ["2.1", "4.1", "5.1", "10.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "5.2", "5.3", "6.1", "6.2"] },
    { "id": 3, "tasks": ["2.4", "6.3", "7.1"] },
    { "id": 4, "tasks": ["2.5", "7.2", "9.1"] },
    { "id": 5, "tasks": ["2.6", "11.1"] },
    { "id": 6, "tasks": ["2.7"] }
  ]
}
```
