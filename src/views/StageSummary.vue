<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import { generateShareText, shareToLinkedIn, copyToClipboard } from '@/sharing/shareGenerator';
import { calculateScorePercentage, calculatePerformanceLevel } from '@/engine/scoring';
import type { LearningStage } from '@/engine/types';

const router = useRouter();
const route = useRoute();
const { t } = useLocale();
const quizStore = useQuizStore();

const stage = route.params.stage as LearningStage;
const shareSuccess = ref(false);

const stageResult = computed(() => quizStore.state.stageResults[stage]);

const stageName = computed(() => t(`stage.name.${stage}`));

const percentage = computed(() => {
  if (!stageResult.value) return 0;
  return calculateScorePercentage(stageResult.value.correctCount, stageResult.value.totalCount);
});

const performanceLevel = computed(() => calculatePerformanceLevel(percentage.value));

function handleShare() {
  if (!stageResult.value) return;

  const text = generateShareText({
    stageName: stageName.value,
    correctCount: stageResult.value.correctCount,
    totalCount: stageResult.value.totalCount,
    performanceLevel: performanceLevel.value,
    isFullQuizComplete: false,
  });

  try {
    shareToLinkedIn(text);
  } catch {
    handleCopy();
  }
}

async function handleCopy() {
  if (!stageResult.value) return;

  const text = generateShareText({
    stageName: stageName.value,
    correctCount: stageResult.value.correctCount,
    totalCount: stageResult.value.totalCount,
    performanceLevel: performanceLevel.value,
    isFullQuizComplete: false,
  });

  const success = await copyToClipboard(text);
  if (success) {
    shareSuccess.value = true;
    setTimeout(() => { shareSuccess.value = false; }, 3000);
  }
}

function handleNextStage() {
  const next = quizStore.nextStage;
  if (next) {
    quizStore.startStage(next);
    router.push(`/quiz/${next}`);
  }
}

function handleRetry() {
  quizStore.startStage(stage);
  router.push(`/quiz/${stage}`);
}

function handleBackToStages() {
  router.push('/stages');
}
</script>

<template>
  <main :class="$style.container">
    <h1 :class="$style.title">{{ t('summary.title') }}</h1>
    <h2 :class="$style.stageName">{{ stageName }}</h2>

    <div v-if="stageResult" :class="$style.scoreCard">
      <p :class="$style.score">
        {{ stageResult.correctCount }} / {{ stageResult.totalCount }}
      </p>
      <p :class="$style.level">{{ performanceLevel }}</p>
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

    <div :class="$style.navigation">
      <button
        v-if="quizStore.nextStage"
        :class="$style.primaryButton"
        @click="handleNextStage"
      >
        {{ t('summary.nextStage') }}
      </button>

      <button :class="$style.secondaryButton" @click="handleRetry">
        {{ t('summary.retryStage') }}
      </button>

      <button :class="$style.secondaryButton" @click="handleBackToStages">
        {{ t('summary.backToStages') }}
      </button>
    </div>
  </main>
</template>

<style module>
.container {
  padding: var(--spacing-lg);
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: var(--font-size-xl, 2rem);
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

.stageName {
  font-size: var(--font-size-lg, 1.25rem);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.scoreCard {
  text-align: center;
  padding: var(--spacing-xl);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-lg, 12px);
  margin-bottom: var(--spacing-xl);
  min-width: 200px;
}

.score {
  font-size: var(--font-size-xxl, 2.5rem);
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: var(--spacing-sm);
}

.level {
  font-size: var(--font-size-md, 1rem);
  color: var(--color-text-secondary);
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
  min-width: 200px;
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

.navigation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.primaryButton {
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--color-primary);
  color: var(--color-white, #fff);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-md, 1rem);
  min-height: 44px;
  min-width: 200px;
}

.secondaryButton {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: transparent;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-md, 1rem);
  color: var(--color-text);
  min-height: 44px;
  min-width: 200px;
}

.primaryButton:focus-visible,
.secondaryButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
