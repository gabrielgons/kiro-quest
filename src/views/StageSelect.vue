<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import { questionStore } from '@/data/questionStore';
import type { LearningStage } from '@/engine/types';

const router = useRouter();
const { t } = useLocale();
const quizStore = useQuizStore();

const stages = questionStore.getStages();

function getStageStatus(stage: LearningStage): string {
  if (quizStore.state.completedStages.includes(stage)) {
    return t('stage.completed');
  }
  if (quizStore.state.currentStage === stage && quizStore.state.currentQuestionIndex > 0) {
    return t('stage.inProgress');
  }
  return t('stage.notStarted');
}

function isCompleted(stage: LearningStage): boolean {
  return quizStore.state.completedStages.includes(stage);
}

function selectStage(stage: LearningStage) {
  quizStore.startStage(stage);
  router.push(`/quiz/${stage}`);
}
</script>

<template>
  <main :class="$style.container">
    <h1 :class="$style.title">{{ t('stage.select') }}</h1>

    <div :class="$style.grid">
      <button
        v-for="stage in stages"
        :key="stage"
        :class="[$style.stageCard, isCompleted(stage) && $style.completed]"
        @click="selectStage(stage)"
        @keydown.enter="selectStage(stage)"
      >
        <span :class="$style.stageName">{{ t(`stage.name.${stage}`) }}</span>
        <span :class="$style.stageStatus">{{ getStageStatus(stage) }}</span>
      </button>
    </div>

    <button :class="$style.backButton" @click="router.push('/')">
      {{ t('nav.back') }}
    </button>
  </main>
</template>

<style module>
.container {
  padding: var(--spacing-lg);
  max-width: 900px;
  margin: 0 auto;
  min-height: 100vh;
}

.title {
  text-align: center;
  font-size: var(--font-size-xl, 2rem);
  color: var(--color-primary);
  margin-bottom: var(--spacing-xl);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.stageCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  min-height: 100px;
  min-width: 44px;
  transition: border-color 0.2s ease, transform 0.1s ease;
}

.stageCard:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.stageCard:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.stageCard.completed {
  border-color: var(--color-success);
  background: var(--color-success-light, rgba(34, 197, 94, 0.05));
}

.stageName {
  font-size: var(--font-size-md, 1rem);
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.stageStatus {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text-secondary);
}

.backButton {
  display: block;
  margin: 0 auto;
  padding: var(--spacing-sm) var(--spacing-lg);
  background: transparent;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-size-md, 1rem);
  color: var(--color-text);
  min-height: 44px;
}

.backButton:hover {
  border-color: var(--color-primary);
}

.backButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
