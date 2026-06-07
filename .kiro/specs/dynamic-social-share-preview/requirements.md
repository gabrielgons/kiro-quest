# Requirements Document

## Introduction

Kiro Quest lets learners earn personalized badges and a final certificate after completing quiz stages. Today those achievements exist only as client-side PNG blobs rendered with the HTML5 Canvas API, and share links are SPA hash routes whose fragments are stripped by social crawlers. As a result, when a user shares a link to LinkedIn, Twitter/X, or WhatsApp, the preview card shows only the generic static Open Graph image declared in `index.html`, never the personalized achievement.

This feature adds a **personalized, crawlable social share preview rendered at the Cloudflare edge**. A Cloudflare Worker runs in front of the existing Vite SPA and introduces two new families of routes: crawlable share routes (`/s/badge/:stage`, `/s/certificate`) that return per-request HTML with personalized Open Graph and Twitter meta tags and then redirect real browsers into the SPA, and dynamic image routes (`/og/badge/:stage.png`, `/og/certificate.png`) that render a 1200×630 PNG on demand from validated URL parameters.

The achievement is encoded entirely in URL query parameters. The performance level is never trusted from the client; it is always recomputed at the edge so a forged level value cannot produce an inconsistent card. Existing badge design tokens, the learning-stage union, the performance-level calculation, the existing download and native Web Share paths, and the static fallback Open Graph card are all preserved as the single source of truth. All user-facing copy remains in Brazilian Portuguese (pt-BR).

## Glossary

- **Worker**: The Cloudflare Worker `fetch` handler (entry `worker/index.ts`) that runs in front of the static SPA assets and dispatches requests to share-route handlers, image-route handlers, or the static-asset binding.
- **Share_Route_Handler**: The component that produces crawlable Open Graph HTML for `/s/badge/:stage` and `/s/certificate` requests.
- **Image_Route_Handler**: The component that renders and returns the dynamic PNG for `/og/badge/:stage.png` and `/og/certificate.png` requests.
- **Param_Validator**: The shared strict parser/validator/sanitizer (`worker/shareParams.ts`) used by both share-route and image-route handlers to parse, bound-check, sanitize, and normalize share parameters.
- **OG_HTML_Renderer**: The function that assembles the complete crawlable HTML document (Open Graph + Twitter meta tags, redirect script, no-JavaScript fallback, and pt-BR interstitial link).
- **Image_Renderer**: The edge-compatible rendering component (workers-og = Satori + resvg WASM) that produces 1200×630 PNG bytes from validated parameters.
- **Client_Share_Builder**: The client-side functions (`buildBadgeShareUrl`, `buildCertificateShareUrl` in `src/badges/imageSharer.ts`) that construct crawlable `/s/...` share URLs.
- **Asset_Binding**: The Cloudflare Static Assets binding (`env.ASSETS`) that serves the unchanged Vite SPA and static files.
- **Edge_Cache**: The Cloudflare Cache API used to store and retrieve rendered PNG responses by a normalized cache key.
- **LearningStage**: The allowlisted union of valid quiz stage identifiers, defined by `STAGE_ORDER` in `src/engine/quizEngine.ts`.
- **PerformanceLevel**: The achievement tier (e.g., "Mestre em Kiro") computed by `calculatePerformanceLevel(correct, total)`.
- **MAX_TOTAL**: The upper bound (100) on the question count for a single badge.
- **MAX_NAME_LENGTH**: The maximum printed length (40 characters) of an optional user name.
- **Social_Crawler**: An automated agent (e.g., LinkedInBot, Twitterbot, WhatsApp) that fetches a shared link to build a preview card and does not execute JavaScript.
- **ShareParamError**: The error type thrown by the Param_Validator when input parameters are invalid.

## Requirements

### Requirement 1: Crawlable Personalized Share Routes

**User Story:** As a learner sharing my achievement, I want the shared link to carry personalized preview metadata, so that social platforms display my specific badge or certificate instead of a generic image.

#### Acceptance Criteria

1. WHEN the Worker receives a GET request for `/s/badge/:stage` with valid parameters, THE Share_Route_Handler SHALL return a 200 response with content type `text/html` containing personalized Open Graph and Twitter meta tags.
2. WHEN the Worker receives a GET request for `/s/certificate` with valid parameters, THE Share_Route_Handler SHALL return a 200 response with content type `text/html` containing personalized Open Graph and Twitter meta tags.
3. WHEN the Share_Route_Handler builds the share HTML, THE Share_Route_Handler SHALL set the `og:image` meta tag to an absolute same-origin URL pointing at the matching `/og/...png` image route using the same normalized parameters.
4. WHEN the Share_Route_Handler builds the share HTML, THE OG_HTML_Renderer SHALL include the `og:title`, `og:description`, `og:image`, `og:image:width` of 1200, `og:image:height` of 630, `og:url`, `og:type`, `og:locale` of `pt_BR`, `twitter:card` of `summary_large_image`, `twitter:title`, `twitter:description`, and `twitter:image` meta tags.
5. WHEN a real browser loads a `/s/badge/:stage` or `/s/certificate` page, THE OG_HTML_Renderer SHALL provide a client-side JavaScript redirect into the corresponding SPA hash route.
6. WHERE JavaScript is disabled in the visiting browser, THE OG_HTML_Renderer SHALL provide a `meta` refresh fallback and a visible pt-BR link that navigate to the corresponding SPA hash route.

### Requirement 2: Dynamic Edge Image Generation

**User Story:** As a learner sharing my achievement, I want a personalized preview image generated on demand, so that the social card shows my badge or certificate even though crawlers cannot run the client-side Canvas renderer.

#### Acceptance Criteria

1. WHEN the Image_Route_Handler receives a GET request for `/og/badge/:stage.png` with valid parameters, THE Image_Route_Handler SHALL return a 200 response with content type `image/png` containing a 1200×630 pixel PNG.
2. WHEN the Image_Route_Handler receives a GET request for `/og/certificate.png` with valid parameters, THE Image_Route_Handler SHALL return a 200 response with content type `image/png` containing a 1200×630 pixel PNG.
3. WHEN the Image_Renderer composes a badge image, THE Image_Renderer SHALL use the design tokens (`primaryColor`, `secondaryColor`, `icon`, `displayName`) from `BADGE_DESIGNS` for the requested stage.
4. WHEN the Image_Renderer composes an image, THE Image_Renderer SHALL load font buffers from a bundled font asset rather than from any client-supplied or remote URL.
5. THE Image_Renderer SHALL render text using a font set that supports pt-BR diacritics.

### Requirement 3: Server-Side Performance Level Recomputation (Anti-Forgery)

**User Story:** As a product owner, I want the displayed achievement level to be derived from the score at the edge, so that a user cannot forge a higher level by tampering with the share URL.

#### Acceptance Criteria

1. WHEN the Param_Validator parses badge or certificate parameters, THE Param_Validator SHALL compute the PerformanceLevel by calling `calculatePerformanceLevel` with the validated correct and total values.
2. WHERE a `level` query parameter is present in the request, THE Param_Validator SHALL ignore the client-supplied `level` value when determining the PerformanceLevel.
3. WHEN the Param_Validator returns validated parameters, THE Param_Validator SHALL set the PerformanceLevel equal to `calculatePerformanceLevel(correct, total)` for the validated score.

### Requirement 4: Strict Parameter Validation and Sanitization

**User Story:** As a security-conscious maintainer, I want all share parameters validated and sanitized at the edge, so that malformed or malicious input cannot produce broken cards, injection, or rendering failures.

#### Acceptance Criteria

1. IF the requested stage segment is not a member of `STAGE_ORDER`, THEN THE Param_Validator SHALL throw a ShareParamError.
2. IF the `correct` or `total` parameter does not match the strict non-negative integer format, THEN THE Param_Validator SHALL throw a ShareParamError.
3. IF the validated `total` is less than 1 or greater than MAX_TOTAL, THEN THE Param_Validator SHALL throw a ShareParamError.
4. IF the validated `correct` value is greater than the validated `total` value, THEN THE Param_Validator SHALL throw a ShareParamError.
5. WHEN the Param_Validator sanitizes the optional `name` parameter, THE Param_Validator SHALL trim surrounding whitespace, remove control characters, HTML-escape the characters `<`, `>`, `&`, `"`, and `'`, and cap the result at MAX_NAME_LENGTH characters.
6. IF the `name` parameter is absent, THEN THE Param_Validator SHALL produce an empty string for the name.
7. WHEN the OG_HTML_Renderer interpolates any value into the share HTML, THE OG_HTML_Renderer SHALL emit only HTML-escaped values.
8. IF the Image_Route_Handler receives parameters that the Param_Validator rejects, THEN THE Image_Route_Handler SHALL return a 400 response with content type `text/plain` and a pt-BR error message without attempting to render an image.

### Requirement 5: Edge Caching and Performance

**User Story:** As an operator, I want rendered images cached at the edge with a stable key, so that popular shared links are served quickly without re-rendering on every request.

#### Acceptance Criteria

1. WHEN the Param_Validator normalizes validated parameters into a query string, THE Param_Validator SHALL produce an identical normalized query string regardless of the ordering of the input query parameters.
2. WHEN the Param_Validator builds the normalized query string, THE Param_Validator SHALL omit the derived `level` value from the normalized query string.
3. WHEN the Image_Route_Handler receives an image request, THE Image_Route_Handler SHALL query the Edge_Cache using a cache key composed of the request origin, path, and normalized query string before rendering.
4. WHEN a matching cached response exists in the Edge_Cache, THE Image_Route_Handler SHALL return the cached response without re-rendering the image.
5. WHEN the Image_Route_Handler renders an image on a cache miss, THE Image_Route_Handler SHALL store the rendered response in the Edge_Cache asynchronously without blocking the returned response.
6. WHEN the Image_Route_Handler returns a rendered image response, THE Image_Route_Handler SHALL include a `Cache-Control` header.
7. IF storing a response in the Edge_Cache fails, THEN THE Image_Route_Handler SHALL still return the already-rendered response to the requester.

### Requirement 6: Client Share URL Building

**User Story:** As a learner, I want the share buttons to generate crawlable links to my achievement, so that the social platform fetches and displays my personalized card.

#### Acceptance Criteria

1. WHEN the Client_Share_Builder builds a badge share URL, THE Client_Share_Builder SHALL produce an absolute URL of the form `{origin}/s/badge/{stage}` with `correct` and `total` query parameters.
2. WHEN the Client_Share_Builder builds a certificate share URL, THE Client_Share_Builder SHALL produce an absolute URL of the form `{origin}/s/certificate` with the score query parameters.
3. WHEN the Client_Share_Builder includes any parameter value in a share URL, THE Client_Share_Builder SHALL URL-encode that value.
4. WHERE a non-empty name is provided, THE Client_Share_Builder SHALL include the URL-encoded `name` query parameter in the share URL.
5. IF the provided name is absent or contains only whitespace, THEN THE Client_Share_Builder SHALL omit the `name` query parameter from the share URL.
6. WHEN the share action opens a social platform share window, THE Client_Share_Builder SHALL pass the crawlable `/s/...` URL to the share window.

### Requirement 7: Backwards Compatibility and Asset Fall-Through

**User Story:** As a maintainer, I want all existing application behavior preserved, so that adding the Worker does not regress the SPA, downloads, native sharing, or the static fallback card.

#### Acceptance Criteria

1. WHEN the Worker receives a request whose path is not a share route or image route, THE Worker SHALL delegate the request to the Asset_Binding so the SPA and static assets are served unchanged.
2. WHEN a user uses the existing badge or certificate download action, THE system SHALL preserve the existing client-side image download behavior.
3. WHEN a user uses the existing native Web Share action, THE system SHALL preserve the existing image-blob sharing behavior.
4. THE system SHALL preserve the static `index.html` Open Graph card as a fallback preview.
5. WHEN a real browser is redirected from a `/s/...` route into the SPA, THE system SHALL resolve the existing SPA hash deep link for the corresponding achievement.

### Requirement 8: Resilient and Safe Error Handling

**User Story:** As a learner who clicks a malformed or broken share link, I want to still reach the application, so that a bad parameter never leaves me on an error page.

#### Acceptance Criteria

1. IF a handler throws a ShareParamError, THEN THE Worker SHALL translate the error into a 400 response with a safe pt-BR body and SHALL NOT propagate an unhandled error to the runtime.
2. IF an unexpected error occurs while rendering an image, THEN THE Image_Route_Handler SHALL return a 500 response with a safe pt-BR body.
3. WHEN the OG_HTML_Renderer emits the browser redirect target, THE OG_HTML_Renderer SHALL use only a same-origin SPA hash route beginning with `#/` and SHALL NOT emit an absolute external redirect.
4. WHEN the Worker receives a request to the SPA root or to a share or image route without parameters, THE system SHALL return a valid response that preserves the static fallback Open Graph card.

### Requirement 9: Brazilian Portuguese User-Facing Copy

**User Story:** As a Brazilian Portuguese-speaking user, I want all share preview text in pt-BR, so that the experience is consistent with the rest of the application.

#### Acceptance Criteria

1. WHEN the OG_HTML_Renderer emits the title, description, interstitial text, and fallback link, THE OG_HTML_Renderer SHALL render that copy in pt-BR.
2. WHEN the Image_Renderer composes badge or certificate text, THE Image_Renderer SHALL render literal copy in pt-BR.
3. WHEN the Worker returns an error response body, THE Worker SHALL render the error message in pt-BR.
4. WHEN the OG_HTML_Renderer sets the document and Open Graph locale, THE OG_HTML_Renderer SHALL declare the language as pt-BR.
