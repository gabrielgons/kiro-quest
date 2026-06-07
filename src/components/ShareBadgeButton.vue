<script setup lang="ts">
/**
 * Reusable button component that triggers badge/certificate generation and
 * exposes download + social-share actions for the generated PNG.
 *
 * See design "Component 6: ShareBadgeButton.vue". The component drives the
 * `useBadgeCanvas()` composable to render an offscreen badge or certificate,
 * shows a loading state while generating, previews the result, and offers
 * "Baixar" (download), "LinkedIn", and "Twitter/X" share actions. All visible
 * text is in Portuguese (pt-BR).
 *
 * _Requirements: 1.4, 2.5, 4.1, 4.2, 5.1, 5.2_
 */
import { computed, ref, watch } from 'vue';

import {
  useBadgeCanvas,
  canUseWebShareAPI,
  downloadImage,
  generateBadgeShareText,
  generateCertificateShareText,
  getBadgeFileName,
  getCertificateFileName,
  shareToSocial,
  buildBadgeShareUrl,
  buildCertificateShareUrl,
  buildLinkedInAddToProfileUrl,
} from '@/badges';
import type {
  CertificateRendererOptions,
  LearningStage,
  PerformanceLevel,
} from '@/badges';
import { useTheme } from '@/composables/useTheme';

interface Props {
  /** Whether to generate a stage badge or a full completion certificate. */
  type: 'badge' | 'certificate';
  /** The completed stage. Required when `type` is 'badge'. */
  stage?: LearningStage;
  /** Optional custom button label; falls back to a Portuguese default. */
  label?: string;
  /** The stage score. Required when `type` is 'badge'. */
  score?: { correct: number; total: number };
  /** The computed performance tier label (used by both types). */
  performanceLevel?: PerformanceLevel;
  /** Aggregate completion statistics. Required when `type` is 'certificate'. */
  stats?: CertificateRendererOptions['stats'];
  /** The user's name for the certificate. Empty/undefined uses a fallback. */
  userName?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  generated: [blob: Blob];
}>();

const {
  isGenerating,
  previewUrl,
  error,
  generateBadge,
  generateCertificate,
  cleanup,
} = useBadgeCanvas();
const { isDark } = useTheme();

/** The most recently generated blob, retained for download/share actions. */
const generatedBlob = ref<Blob | null>(null);

/**
 * One-time capability check for the native Web Share API. When true, the UI
 * exposes a "Compartilhar" action that shares the generated PNG file natively
 * (typically on mobile).
 */
const canShare = canUseWebShareAPI();

/**
 * Invalidate the cached preview when the theme changes so a subsequent
 * generation re-renders with the new colors. Resetting `previewUrl` (via
 * `cleanup()`) brings the generate button back, and clearing the retained blob
 * forces a fresh render.
 */
watch(isDark, () => {
  cleanup();
  generatedBlob.value = null;
});

/** Default Portuguese label depending on the artifact type. */
const buttonLabel = computed(
  () =>
    props.label ??
    (props.type === 'badge' ? 'Compartilhar Conquista' : 'Gerar Certificado'),
);

/** Canonical download filename for the current artifact. */
const fileName = computed(() =>
  props.type === 'badge' && props.stage
    ? getBadgeFileName(props.stage)
    : getCertificateFileName(),
);

/** Pre-filled Portuguese share text for the current artifact. */
const shareText = computed(() => {
  if (props.type === 'badge' && props.stage && props.performanceLevel) {
    return generateBadgeShareText(props.stage, props.performanceLevel);
  }
  if (props.performanceLevel) {
    return generateCertificateShareText(props.performanceLevel);
  }
  return '';
});

/** Alt text for the generated image preview. */
const previewAlt = computed(() =>
  props.type === 'badge'
    ? 'Pré-visualização da conquista'
    : 'Pré-visualização do certificado',
);

/**
 * Render the badge or certificate via the composable, retain the resulting
 * blob, and emit it to the parent. The current theme determines the rendered
 * variant (Requirements 7.x), and no-op safely if required props are missing.
 */
async function handleGenerate(): Promise<void> {
  const theme = isDark.value ? 'dark' : 'light';
  let blob: Blob | null = null;

  if (props.type === 'badge') {
    if (!props.stage || !props.score || !props.performanceLevel) {
      return;
    }
    blob = await generateBadge({
      stage: props.stage,
      score: props.score,
      performanceLevel: props.performanceLevel,
      theme,
    });
  } else {
    if (!props.stats || !props.performanceLevel) {
      return;
    }
    blob = await generateCertificate({
      userName: props.userName ?? '',
      stats: props.stats,
      performanceLevel: props.performanceLevel,
      completionDate: new Date(),
      theme,
    });
  }

  if (blob) {
    generatedBlob.value = blob;
    emit('generated', blob);
  }
}

/** Trigger a browser download of the generated image (Requirements 4.1, 4.2). */
function handleDownload(): void {
  if (generatedBlob.value) {
    downloadImage(generatedBlob.value, fileName.value);
  }
}

/** Crawlable `/s/...` share URL for the current artifact (badge or certificate). */
const shareUrl = computed(() =>
  props.type === 'badge' && props.stage
    ? buildBadgeShareUrl(props.stage)
    : buildCertificateShareUrl(),
);

/**
 * Share the generated image to the given social platform (Requirements 5.1,
 * 5.2).
 *
 * For LinkedIn, opens the "Add to Profile" (Certification) form pre-filled
 * with badge/certificate data. For Twitter, opens the standard share dialog.
 *
 * @param platform - The target platform ('linkedin' or 'twitter').
 */
async function handleShare(platform: 'linkedin' | 'twitter'): Promise<void> {
  if (!generatedBlob.value) {
    return;
  }

  if (platform === 'linkedin') {
    const url = props.type === 'badge' && props.stage
      ? buildLinkedInAddToProfileUrl({ type: 'badge', stage: props.stage })
      : buildLinkedInAddToProfileUrl({ type: 'certificate' });
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  await shareToSocial({
    blob: generatedBlob.value,
    fileName: fileName.value,
    shareText: shareText.value,
    shareUrl: shareUrl.value,
    platform,
  });
}

/**
 * Share the generated image file natively via the Web Share API
 * (`platform: 'generic'`). Only reachable when {@link canShare} is true.
 */
async function handleNativeShare(): Promise<void> {
  if (!generatedBlob.value) return;
  await shareToSocial({
    blob: generatedBlob.value,
    fileName: fileName.value,
    shareText: shareText.value,
    platform: 'generic',
  });
}
</script>

<template>
  <div class="share-badge">
    <button
      v-if="!previewUrl"
      class="generate-button"
      type="button"
      :disabled="isGenerating"
      @click="handleGenerate"
    >
      <span v-if="isGenerating" class="generating">
        <span class="spinner" aria-hidden="true"></span>
        Gerando...
      </span>
      <span v-else>{{ buttonLabel }}</span>
    </button>

    <p v-if="error" class="error-message" role="alert">{{ error }}</p>

    <div v-if="previewUrl" class="preview">
      <img :src="previewUrl" :alt="previewAlt" class="preview-image" />

      <div class="actions">
        <button
          v-if="canShare"
          class="action-button"
          type="button"
          @click="handleNativeShare"
        >
          Compartilhar
        </button>
        <button class="action-button download" type="button" @click="handleDownload">
          Baixar
        </button>
        <button
          class="action-button linkedin"
          type="button"
          @click="handleShare('linkedin')"
        >
          Adicionar ao LinkedIn
        </button>
        <button
          class="action-button twitter"
          type="button"
          @click="handleShare('twitter')"
        >
          Twitter/X
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
}

.generate-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--min-touch-target);
  padding: var(--spacing-sm) var(--spacing-xl);
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: background-color var(--transition-fast), box-shadow var(--transition-fast);
  box-shadow: var(--shadow-sm);
}

.generate-button:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.generate-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.generate-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.generating {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--color-text-inverse);
  border-top-color: transparent;
  border-radius: var(--radius-full);
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}

.error-message {
  margin: 0;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  background: var(--color-error-light);
  color: var(--color-error-dark);
  font-size: var(--font-size-sm);
  text-align: center;
}

.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 100%;
}

.preview-image {
  max-width: 100%;
  height: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--spacing-sm);
}

.action-button {
  min-height: var(--min-touch-target);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-family-base);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.action-button:hover {
  border-color: var(--color-primary);
  background: var(--color-background-secondary);
}

.action-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.action-button.download {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
}

.action-button.download:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}
</style>
