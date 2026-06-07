/**
 * Shared canvas drawing primitives and helpers used by the badge and
 * certificate renderers.
 *
 * These utilities have no knowledge of badge/certificate domain concepts —
 * they operate purely on a `CanvasRenderingContext2D` / `HTMLCanvasElement`
 * so they can be reused by any renderer in the badges module.
 *
 * Related design sections:
 * - "Badge Rendering Algorithm" / "Certificate Rendering Algorithm" use
 *   `roundedRect(ctx, x, y, w, h, radius)` to draw backgrounds, overlays,
 *   and decorative borders.
 * - "Image Blob Generation Algorithm" defines `canvasToBlob()`.
 *
 * _Requirements: 1.1, 2.1, 8.1_
 */

/**
 * Default MIME type used when converting a canvas to a Blob. The feature
 * produces PNG images for download and sharing.
 */
export const DEFAULT_IMAGE_TYPE = 'image/png';

/**
 * Default image quality for lossy formats. Ignored for PNG, but kept to
 * mirror the `canvas.toBlob()` signature.
 */
export const DEFAULT_IMAGE_QUALITY = 0.92;

/**
 * Trace a rounded-rectangle sub-path onto the provided 2D context.
 *
 * This function begins a fresh path and traces the rounded rectangle, but it
 * does NOT fill or stroke — the caller is responsible for setting the desired
 * `fillStyle`/`strokeStyle` and invoking `ctx.fill()` or `ctx.stroke()`. This
 * matches the usage in both the badge and certificate rendering algorithms.
 *
 * The corner radius is clamped to at most half of the smaller side so that
 * the path remains valid (and degrades gracefully to a circle/stadium shape)
 * for any non-negative radius, regardless of the rectangle's dimensions.
 *
 * @param ctx    - A valid 2D canvas rendering context.
 * @param x      - The x coordinate of the rectangle's top-left corner.
 * @param y      - The y coordinate of the rectangle's top-left corner.
 * @param width  - The rectangle width in pixels.
 * @param height - The rectangle height in pixels.
 * @param radius - The corner radius in pixels (clamped to [0, min(w,h)/2]).
 */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  // Clamp the radius so it can never exceed half of the smaller side, and
  // never go negative. This keeps the traced path well-formed for any input.
  const maxRadius = Math.min(Math.abs(width), Math.abs(height)) / 2;
  const r = Math.max(0, Math.min(radius, maxRadius));

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Convert a rendered canvas into an image `Blob`.
 *
 * Wraps the callback-based `HTMLCanvasElement.toBlob()` API in a Promise so
 * callers can `await` the result. Resolves with the generated `Blob`, or with
 * `null` if blob generation fails (e.g. a tainted canvas or memory pressure).
 *
 * Preconditions (see design "Image Blob Generation Algorithm"):
 * - `canvas` is a valid HTMLCanvasElement with content already rendered.
 * - `type` is a valid image MIME type ('image/png' or 'image/jpeg').
 * - `quality` is between 0 and 1.
 *
 * Postconditions:
 * - Resolves with a `Blob` containing the image data, or `null` on failure.
 * - The resolved blob's MIME type matches the requested `type`.
 *
 * @param canvas  - The canvas to serialize.
 * @param type    - The output image MIME type (defaults to PNG).
 * @param quality - The image quality for lossy formats (defaults to 0.92).
 * @returns A promise resolving to the image Blob, or null on failure.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = DEFAULT_IMAGE_TYPE,
  quality: number = DEFAULT_IMAGE_QUALITY,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Create an offscreen canvas sized to the given dimensions and return it
 * together with its 2D rendering context.
 *
 * Returns `null` when a 2D context cannot be obtained (extremely rare in
 * modern browsers, but possible — see error scenario "Canvas API Unavailable"
 * in the design). Callers should treat a `null` result as a generation
 * failure and surface an appropriate fallback.
 *
 * @param width  - The canvas width in pixels.
 * @param height - The canvas height in pixels.
 * @returns The canvas and its context, or null if no 2D context is available.
 */
export function createCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  return { canvas, ctx };
}

/**
 * Draw horizontally-centered text at the given baseline position.
 *
 * A thin convenience wrapper over `fillText` that applies the supplied font
 * and fill color before drawing. Centering is achieved via `textAlign`, which
 * both renderers rely on for their centered layouts. Because it uses
 * `fillText`, all text is rendered as pixels, inherently preventing XSS from
 * user-provided strings (see Requirement 10.1).
 *
 * @param ctx   - A valid 2D canvas rendering context.
 * @param text  - The text to draw.
 * @param x     - The horizontal center position.
 * @param y     - The baseline (vertical) position.
 * @param font  - The CSS font shorthand to apply.
 * @param color - The fill color to apply.
 */
export function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

/**
 * Create a linear gradient spanning two color stops from the top-left to the
 * bottom-right of the given rectangle. Used for badge gradient backgrounds.
 *
 * @param ctx            - A valid 2D canvas rendering context.
 * @param width          - The width over which the gradient spans.
 * @param height         - The height over which the gradient spans.
 * @param primaryColor   - The color at gradient stop 0 (top-left).
 * @param secondaryColor - The color at gradient stop 1 (bottom-right).
 * @returns The configured CanvasGradient.
 */
export function createDiagonalGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  primaryColor: string,
  secondaryColor: string,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(1, secondaryColor);
  return gradient;
}
