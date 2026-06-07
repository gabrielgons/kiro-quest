/**
 * Vue composable that manages the canvas lifecycle for the Shareable Badges
 * and Certificate feature.
 *
 * Responsibilities (see design "Component 3: useBadgeCanvas() Composable"):
 * - Create an offscreen canvas and invoke the appropriate renderer.
 * - Convert the rendered canvas to a PNG Blob via {@link canvasToBlob}.
 * - Create object URLs for image preview and cache the most recently
 *   generated Blob to avoid re-rendering on repeated preview/share actions.
 * - Manage `isGenerating`, `previewUrl`, and `error` reactive state.
 * - Revoke every created object URL on component unmount and via `cleanup()`
 *   so the feature never leaks memory.
 *
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
 */

import { onUnmounted, ref } from 'vue';

import {
  BADGE_HEIGHT,
  BADGE_WIDTH,
  renderBadge,
} from './badgeRenderer';
import { canvasToBlob, createCanvas } from './canvasUtils';
import {
  CERTIFICATE_HEIGHT,
  CERTIFICATE_WIDTH,
  renderCertificate,
} from './certificateRenderer';
import type {
  BadgeRendererOptions,
  CertificateRendererOptions,
  UseBadgeCanvasReturn,
} from './types';

/** User-facing error message shown when the canvas 2D context is missing. */
const CANVAS_UNAVAILABLE_MESSAGE =
  'Não foi possível gerar a imagem: canvas indisponível neste navegador.';

/** User-facing error message shown when blob generation fails. */
const BLOB_FAILURE_MESSAGE =
  'Não foi possível gerar a imagem. Tente novamente.';

/**
 * Create a badge/certificate canvas controller.
 *
 * The returned object exposes reactive state plus `generateBadge`,
 * `generateCertificate`, and `cleanup`. All generated object URLs are revoked
 * automatically when the consuming component unmounts.
 *
 * @returns The reactive canvas API described by {@link UseBadgeCanvasReturn}.
 */
export function useBadgeCanvas(): UseBadgeCanvasReturn {
  // Optional reference to an in-DOM canvas element. The composable renders to
  // an offscreen canvas, so this is exposed purely for consumers that want to
  // bind a visible canvas; it is not required for generation.
  const canvasRef = ref<HTMLCanvasElement | null>(null);

  // True while a generation is in flight (Requirement 8.4).
  const isGenerating = ref(false);

  // Object URL for previewing the most recently generated image
  // (Requirement 8.2).
  const previewUrl = ref<string | null>(null);

  // Descriptive error message set when generation fails (Requirement 8.5).
  const error = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // Internal caching + URL bookkeeping
  // ---------------------------------------------------------------------------

  // The most recently generated blob, cached alongside the key describing the
  // options that produced it. Repeated calls with identical options reuse the
  // cached blob instead of re-rendering (Requirement 8.2).
  let cachedBlob: Blob | null = null;
  let cachedKey: string | null = null;

  // Every object URL we have created, so cleanup can revoke all of them and we
  // never leak (Requirement 8.3).
  const objectUrls = new Set<string>();

  /**
   * Revoke and forget every object URL we have created, and clear the preview.
   */
  function revokeAllObjectUrls(): void {
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
    objectUrls.clear();
    previewUrl.value = null;
  }

  /**
   * Create a fresh object URL for the given blob, track it for later cleanup,
   * and publish it as the current preview URL. Any previous preview URL is
   * revoked first so only one preview URL is ever live at a time.
   *
   * @param blob - The blob to expose as a preview.
   * @returns The newly created object URL.
   */
  function setPreviewFromBlob(blob: Blob): string {
    // Revoke the previous preview URL (if any) before replacing it.
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      objectUrls.delete(previewUrl.value);
    }

    const url = URL.createObjectURL(blob);
    objectUrls.add(url);
    previewUrl.value = url;
    return url;
  }

  /**
   * Shared generation pipeline used by both `generateBadge` and
   * `generateCertificate`.
   *
   * Creates an offscreen canvas, invokes the supplied `draw` callback to
   * render onto it, converts the result to a PNG blob, and publishes a preview
   * URL. Returns the most recent cached blob when `cacheKey` matches the
   * previous successful generation, avoiding redundant rendering.
   *
   * @param cacheKey - A stable key uniquely describing the render inputs.
   * @param width    - The offscreen canvas width in pixels.
   * @param height   - The offscreen canvas height in pixels.
   * @param draw     - Callback that renders onto the provided 2D context.
   * @returns The generated (or cached) PNG blob, or null on failure.
   */
  async function generate(
    cacheKey: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): Promise<Blob | null> {
    // Reuse the cached blob when the inputs are identical (Requirement 8.2).
    if (cachedBlob && cachedKey === cacheKey) {
      // Ensure a preview URL exists for the cached blob.
      if (!previewUrl.value) {
        setPreviewFromBlob(cachedBlob);
      }
      return cachedBlob;
    }

    isGenerating.value = true;
    error.value = null;

    try {
      // Step 1: Create an offscreen canvas and obtain its 2D context.
      const created = createCanvas(width, height);
      if (!created) {
        // Canvas 2D context unavailable (Requirement 8.5 / Error Scenario 1).
        error.value = CANVAS_UNAVAILABLE_MESSAGE;
        return null;
      }

      // Step 2: Render the badge/certificate onto the context.
      draw(created.ctx);

      // Step 3: Convert the canvas to a PNG blob.
      const blob = await canvasToBlob(created.canvas);
      if (!blob) {
        // Blob generation failed (Requirement 8.5 / Error Scenario 2).
        error.value = BLOB_FAILURE_MESSAGE;
        return null;
      }

      // Step 4: Cache the blob and publish a preview URL (Requirement 8.2).
      cachedBlob = blob;
      cachedKey = cacheKey;
      setPreviewFromBlob(blob);

      return blob;
    } catch (err) {
      // Any unexpected rendering/serialization failure (Requirement 8.5).
      error.value =
        err instanceof Error ? err.message : BLOB_FAILURE_MESSAGE;
      return null;
    } finally {
      // Always reset the loading flag on success or failure (Requirement 8.4).
      isGenerating.value = false;
    }
  }

  /**
   * Generate a stage completion badge PNG blob.
   *
   * @param options - The stage, score, performance level, and theme.
   * @returns A 400x400 PNG blob, or null on failure.
   */
  async function generateBadge(
    options: BadgeRendererOptions,
  ): Promise<Blob | null> {
    const cacheKey = `badge:${JSON.stringify(options)}`;
    return generate(cacheKey, BADGE_WIDTH, BADGE_HEIGHT, (ctx) =>
      renderBadge(ctx, options),
    );
  }

  /**
   * Generate a full completion certificate PNG blob.
   *
   * @param options - The user name, stats, performance level, date, and theme.
   * @returns A 1200x800 PNG blob, or null on failure.
   */
  async function generateCertificate(
    options: CertificateRendererOptions,
  ): Promise<Blob | null> {
    const cacheKey = `certificate:${JSON.stringify({
      ...options,
      // Date does not serialize via JSON.stringify inside a spread reliably
      // across environments, so normalize it explicitly for a stable key.
      completionDate: options.completionDate.getTime(),
    })}`;
    return generate(
      cacheKey,
      CERTIFICATE_WIDTH,
      CERTIFICATE_HEIGHT,
      (ctx) => renderCertificate(ctx, options),
    );
  }

  /**
   * Revoke all created object URLs and reset cached state.
   *
   * Safe to call multiple times. Invoked automatically on unmount, and exposed
   * for consumers that want to release resources eagerly (Requirement 8.3).
   */
  function cleanup(): void {
    revokeAllObjectUrls();
    cachedBlob = null;
    cachedKey = null;
    error.value = null;
  }

  // Revoke all object URLs when the consuming component unmounts so the
  // feature never leaks memory (Requirement 8.3).
  onUnmounted(() => {
    cleanup();
  });

  return {
    canvasRef,
    isGenerating,
    previewUrl,
    error,
    generateBadge,
    generateCertificate,
    cleanup,
  };
}
