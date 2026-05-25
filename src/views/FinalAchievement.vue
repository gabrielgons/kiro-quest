<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import { generateShareText, shareToLinkedIn, copyToClipboard } from '@/sharing/shareGenerator';

const router = useRouter();
const { t } = useLocale();
const quizStore = useQuizStore();

const shareSuccess = ref(false);

const overall = quizStore.overallScore;

function handleShare() {
  const text = generateShareText({
    stageName: '',
    correctCount: overall.correctCount,
    totalCount: overall.totalCount,
    performanceLevel: overall.performanceLevel,
    isFullQuizComplete: true,
  });

  try {
    shareToLinkedIn(text);
  } catch {
    handleCopy();
  }
}

async function handleCopy() {
  const text = generateShareText({
    stageName: '',
    correctCount: overall.correctCount,
    totalCount: overall.totalCount,
    performanceLevel: overall.performanceLevel,
    isFullQuizComplete: true,
  });

  const success = await copyToClipboard(text);
  if (success) {
    shareSuccess.value = true;
    setTimeout(() => { shareSuccess.value = false; }, 3000);
  }
}

function handleBackToHome() {
  router.push('/');
}
</script>

<template>
  <main :class="$style.container">
    <div :class="$style.content">
      <h1 :class="$style.title">{{ t('achievement.title') }}</h1>
      <p :class="$style.subtitle">{{ t('achievement.subtitle') }}</p>

      <div :class="$style.scoreCard">
        <p :class="$style.score">{{ overall.formatted }}</p>
        <p :class="$style.level">{{ overall.performanceLevel }}</p>
      </div>

      <div :class="$style.actions">
        <button :class="$style.shareButton" @click="handleShare">
          {{ t('share.button') }}
        </button>

        <button :class="$style.copyButton" @click="handleCopy">
          {{ t('share.copyFallback') }}
        </button>

        <p v-if="shareSuccess" :class="$style.shareMessage">{{ t('share.copied') }}</p>
      </div>

      <button :class="$style.homeButton" @click="handleBackToHome">
        {{ t('achievement.backToHome') }}
      </button>
    </div>
  </main>
</template>

<style module>
.container {
  padding: var(--spacing-lg);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.title {
  font-size: var(--font-size-xxl, 2.5rem);
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

.subtitle {
  font-size: var(--font-size-lg, 1.25rem);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.scoreCard {
  padding: var(--spacing-xl);
  border: 3px solid var(--color-primary);
  border-radius: var(--radius-lg, 12px);
  margin-bottom: var(--spacing-xl);
  background: var(--color-primary-light, rgba(59, 130, 246, 0.05));
}

.score {
  font-size: 3rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

.level {
  font-size: var(--font-size-lg, 1.25rem);
  color: var(--color-text);
  font-weight: 600;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
}

.shareButton,
.copyButton {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-md, 1rem);
  min-height: 44px;
  min-width: 220px;
}

.shareButton {
  background: var(--color-primary);
  color: var(--color-white, #fff);
  border: none;
}

.copyButton {
  background: transparent;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.shareButton:focus-visible,
.copyButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.shareMessage {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-success);
}

.homeButton {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: transparent;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-md, 1rem);
  color: var(--color-text);
  min-height: 44px;
}

.homeButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
