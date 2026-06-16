/**
 * Unit tests for the `useBadgeCanvas()` composable.
 *
 * These tests validate the canvas lifecycle management described in the design
 * document ("Component 3: useBadgeCanvas() Composable") and Requirements:
 * - 8.1: create offscreen canvas, invoke renderer, convert to PNG Blob
 * - 8.2: create object URL for preview and cache blob to avoid re-rendering
 * - 8.3: revoke all created object URLs on unmount / cleanup
 * - 8.4: toggle `isGenerating` true during generation, false on completion
 * - 8.5: set `error` and return null when generation fails
 *
 * The composable runs in a jsdom environment, which does not implement the
 * Canvas 2D context, `canvas.toBlob`, nor `URL.createObjectURL`/
 * `revokeObjectURL`. We mock all of these so the composable's orchestration
 * logic can be exercised in isolation. The composable is mounted inside a tiny
 * harness component (via @vue/test-utils) so its `onUnmounted` hook can fire.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import { useBadgeCanvas } from '../useBadgeCanvas';
import type {
  BadgeRendererOptions,
  CertificateRendererOptions,
  UseBadgeCanvasReturn,
} from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BADGE_OPTIONS: BadgeRendererOptions = {
  stage: 'kiro-basics',
  score: { correct: 8, total: 10 },
  performanceLevel: 'Especialista em Kiro',
  theme: 'light',
};

const CERTIFICATE_OPTIONS: CertificateRendererOptions = {
  userName: 'Maria Silva',
  stats: {
    totalCorrect: 95,
    totalQuestions: 110,
    percentage: 86,
    completedStages: 13,
  },
  performanceLevel: 'Especialista em Kiro',
  completionDate: new Date('2024-01-15T12:00:00Z'),
  theme: 'light',
};

// ---------------------------------------------------------------------------
// Canvas / URL mocking
// ---------------------------------------------------------------------------

/**
 * Build a stub 2D rendering context implementing exactly the surface the badge
 * and certificate renderers touch. Methods are no-ops (rendering is not what we
 * are asserting here) but must exist so the renderers run without throwing.
 */
function createStubContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  const ctx = {
    // Path primitives used by roundedRect.
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    // Fill / stroke operations.
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    // Gradient factory.
    createLinearGradient: vi.fn(() => gradient),
    // Style properties the renderers assign to.
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    lineWidth: 0,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

// Original implementations, restored after each test.
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

// Spies populated in beforeEach so each test starts with fresh call counts.
let getContextSpy: ReturnType<typeof vi.fn>;
let toBlobSpy: ReturnType<typeof vi.fn>;
let createObjectURLSpy: ReturnType<typeof vi.fn>;
let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

/**
 * Mount the composable inside a minimal harness component so that lifecycle
 * hooks (onUnmounted) are wired to a real component instance.
 */
function mountComposable(): {
  api: UseBadgeCanvasReturn;
  wrapper: ReturnType<typeof mount>;
} {
  let api!: UseBadgeCanvasReturn;
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useBadgeCanvas();
        return () => h('div');
      },
    }),
  );
  return { api, wrapper };
}

beforeEach(() => {
  // getContext returns a fresh stub 2D context by default.
  getContextSpy = vi.fn(() => createStubContext());
  HTMLCanvasElement.prototype.getContext =
    getContextSpy as unknown as typeof HTMLCanvasElement.prototype.getContext;

  // toBlob invokes its callback asynchronously with a valid PNG blob.
  toBlobSpy = vi.fn(
    (callback: BlobCallback, type?: string) => {
      const blob = new Blob(['fake-png-bytes'], {
        type: type ?? 'image/png',
      });
      callback(blob);
    },
  );
  HTMLCanvasElement.prototype.toBlob =
    toBlobSpy as unknown as typeof HTMLCanvasElement.prototype.toBlob;

  // Object URL lifecycle: createObjectURL returns a unique fake blob URL each
  // call so we can correlate created/revoked URLs; revokeObjectURL is a spy.
  let urlCounter = 0;
  createObjectURLSpy = vi.fn(() => `blob:mock/${++urlCounter}`);
  revokeObjectURLSpy = vi.fn();
  URL.createObjectURL =
    createObjectURLSpy as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL =
    revokeObjectURLSpy as unknown as typeof URL.revokeObjectURL;
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toBlob = originalToBlob;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBadgeCanvas', () => {
  it('exposes the documented reactive API surface', () => {
    const { api, wrapper } = mountComposable();

    expect(api.canvasRef.value).toBeNull();
    expect(api.isGenerating.value).toBe(false);
    expect(api.previewUrl.value).toBeNull();
    expect(api.error.value).toBeNull();
    expect(typeof api.generateBadge).toBe('function');
    expect(typeof api.generateCertificate).toBe('function');
    expect(typeof api.cleanup).toBe('function');

    wrapper.unmount();
  });

  it('generateBadge returns a non-null PNG Blob and sets the preview URL (Req 8.1, 8.2)', async () => {
    const { api, wrapper } = mountComposable();

    const blob = await api.generateBadge(BADGE_OPTIONS);

    // A real blob is produced via the offscreen canvas + toBlob pipeline.
    expect(blob).not.toBeNull();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/png');

    // A preview object URL was created and published.
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(api.previewUrl.value).toBe('blob:mock/1');

    // The canvas pipeline ran: a 2D context was requested and serialized.
    expect(getContextSpy).toHaveBeenCalledWith('2d');
    expect(toBlobSpy).toHaveBeenCalledTimes(1);

    // No error, and the loading flag is reset (Req 8.4).
    expect(api.error.value).toBeNull();
    expect(api.isGenerating.value).toBe(false);

    wrapper.unmount();
  });

  it('toggles isGenerating to false after generation completes (Req 8.4)', async () => {
    const { api, wrapper } = mountComposable();

    expect(api.isGenerating.value).toBe(false);
    const promise = api.generateBadge(BADGE_OPTIONS);
    await promise;
    expect(api.isGenerating.value).toBe(false);

    wrapper.unmount();
  });

  it('generateCertificate returns a non-null PNG Blob (Req 8.1)', async () => {
    const { api, wrapper } = mountComposable();

    const blob = await api.generateCertificate(CERTIFICATE_OPTIONS);

    expect(blob).not.toBeNull();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('image/png');
    expect(api.previewUrl.value).toBe('blob:mock/1');
    expect(api.error.value).toBeNull();

    wrapper.unmount();
  });

  it('reuses the cached blob when called twice with identical options (Req 8.2)', async () => {
    const { api, wrapper } = mountComposable();

    const first = await api.generateBadge(BADGE_OPTIONS);
    const second = await api.generateBadge({ ...BADGE_OPTIONS });

    // The exact same Blob instance is returned from cache.
    expect(second).toBe(first);

    // Rendering + serialization happened only once (no duplicate work).
    expect(getContextSpy).toHaveBeenCalledTimes(1);
    expect(toBlobSpy).toHaveBeenCalledTimes(1);

    // Only a single preview URL was ever created.
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('re-renders (does not reuse cache) when options differ', async () => {
    const { api, wrapper } = mountComposable();

    const first = await api.generateBadge(BADGE_OPTIONS);
    const second = await api.generateBadge({
      ...BADGE_OPTIONS,
      score: { correct: 9, total: 10 },
    });

    expect(second).not.toBe(first);
    expect(toBlobSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('returns null and sets error when the 2D context is unavailable (Req 8.5)', async () => {
    // Simulate a browser without a usable canvas 2D context.
    getContextSpy.mockReturnValue(null);

    const { api, wrapper } = mountComposable();

    const blob = await api.generateBadge(BADGE_OPTIONS);

    expect(blob).toBeNull();
    expect(api.error.value).not.toBeNull();
    expect(typeof api.error.value).toBe('string');
    expect(api.previewUrl.value).toBeNull();
    // The loading flag is still reset on the failure path (Req 8.4).
    expect(api.isGenerating.value).toBe(false);

    wrapper.unmount();
  });

  it('returns null and sets error when blob generation fails (Req 8.5)', async () => {
    // toBlob yields null (e.g. tainted canvas / memory pressure).
    toBlobSpy.mockImplementation((callback: BlobCallback) => callback(null));

    const { api, wrapper } = mountComposable();

    const blob = await api.generateBadge(BADGE_OPTIONS);

    expect(blob).toBeNull();
    expect(api.error.value).not.toBeNull();
    expect(api.isGenerating.value).toBe(false);

    wrapper.unmount();
  });

  it('cleanup() revokes created object URLs and clears the preview (Req 8.3)', async () => {
    const { api, wrapper } = mountComposable();

    await api.generateBadge(BADGE_OPTIONS);
    expect(api.previewUrl.value).toBe('blob:mock/1');

    api.cleanup();

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock/1');
    expect(api.previewUrl.value).toBeNull();
    expect(api.error.value).toBeNull();

    wrapper.unmount();
  });

  it('clears the cache on cleanup so a later identical call re-renders', async () => {
    const { api, wrapper } = mountComposable();

    const first = await api.generateBadge(BADGE_OPTIONS);
    api.cleanup();
    const second = await api.generateBadge(BADGE_OPTIONS);

    // After cleanup, the cache is gone: a brand-new blob is produced.
    expect(second).not.toBe(first);
    expect(toBlobSpy).toHaveBeenCalledTimes(2);

    wrapper.unmount();
  });

  it('revokes all created object URLs when the component unmounts (Req 8.3)', async () => {
    const { api, wrapper } = mountComposable();

    await api.generateBadge(BADGE_OPTIONS);
    const createdUrl = api.previewUrl.value;
    expect(createdUrl).toBe('blob:mock/1');

    // Unmounting the host component should trigger the onUnmounted cleanup.
    wrapper.unmount();

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock/1');
  });
});
