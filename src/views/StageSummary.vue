<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import { getNextStageInOrder, calculatePerformanceLevel } from '@/engine/quizEngine';
import type { LearningStage } from '@/engine/types';
import type { MistakeItem } from '@/components/types';
import MistakeReview from '@/components/MistakeReview.vue';
import ShareBadgeButton from '@/components/ShareBadgeButton.vue';
import { questionStore } from '@/data/questionStore';

const router = useRouter();
const route = useRoute();
const { t } = useLocale();
const quizStore = useQuizStore();

const stage = route.params.stage as LearningStage;
const showMistakes = ref(false);

const stageResult = computed(() => quizStore.stageResults[stage]);
const nextStage = computed(() => getNextStageInOrder(stage));
const hasMoreStages = computed(() => nextStage.value !== null);
const allCorrect = computed(() => stageResult.value?.correctCount === stageResult.value?.totalCount);

const stagePerformanceLevel = computed(() =>
  stageResult.value
    ? calculatePerformanceLevel(stageResult.value.correctCount, stageResult.value.totalCount)
    : quizStore.performanceLevel
);

const mistakes = computed<MistakeItem[]>(() => {
  const stageAnswers = quizStore.userAnswersByStage[stage] ?? [];
  const incorrectAnswers = stageAnswers.filter((a) => !a.isCorrect);

  return incorrectAnswers.map((answer) => {
    const question = questionStore.getQuestionById(answer.questionId);
    let userAnswerLabel = '';
    let correctAnswerLabel = '';

    if (question) {
      if (question.type === 'ordering') {
        const items = question.options as { id: string; label: string }[];
        const toLabel = (id: string) => items.find((i) => i.id === id)?.label ?? id;

        userAnswerLabel = Array.isArray(answer.selectedOptionId)
          ? answer.selectedOptionId.map(toLabel).join(', ')
          : String(answer.selectedOptionId);
        try {
          const answerKey = questionStore.getAnswerKey(answer.questionId);
          correctAnswerLabel = (answerKey.correctOrder ?? []).map(toLabel).join(', ');
        } catch {
          correctAnswerLabel = '';
        }
      } else {
        const options = question.options as { id: string; label: string }[];
        const selectedOpt = options.find((o) => o.id === answer.selectedOptionId);
        userAnswerLabel = selectedOpt?.label ?? String(answer.selectedOptionId);
        try {
          const answerKey = questionStore.getAnswerKey(answer.questionId);
          const correctOpt = options.find((o) => o.id === answerKey.correctAnswerId);
          correctAnswerLabel = correctOpt?.label ?? '';
        } catch {
          correctAnswerLabel = '';
        }
      }
    }

    return {
      questionText: question?.text ?? answer.questionId,
      userAnswerLabel,
      correctAnswerLabel,
      explanation: question?.explanation ?? '',
      sourceUrl: question?.sourceUrl || undefined,
    };
  });
});

function handleNextStage() {
  if (nextStage.value) {
    quizStore.startStage(nextStage.value);
    router.push(`/quiz/${nextStage.value}`);
  }
}

function handleRetry() {
  quizStore.retryStage(stage);
  router.push(`/quiz/${stage}`);
}

function handleBackToStages() {
  router.push('/stages');
}

function handleBackToHome() {
  router.push('/');
}

function toggleMistakes() {
  showMistakes.value = !showMistakes.value;
}
</script>

<template>
  <main class="stage-summary">
    <h1 class="page-title">{{ t('summary.title') }}</h1>

    <div v-if="stageResult" class="result-card">
      <p class="stage-name">{{ t(`stage.name.${stage}`) }}</p>
      <p class="score">{{ stageResult.correctCount }} de {{ stageResult.totalCount }}</p>

      <!-- All correct congratulation -->
      <p v-if="allCorrect" class="congratulations">{{ t('summary.allCorrect') }}</p>

      <!-- Overall performance if all stages complete -->
      <div v-if="quizStore.isAllComplete" class="overall-performance">
        <p class="percentage">{{ quizStore.overallPercentage }}%</p>
        <p class="performance-level">{{ quizStore.performanceLevel }}</p>
      </div>
    </div>

    <!-- Shareable badge -->
    <div v-if="stageResult" class="share-section">
      <ShareBadgeButton
        type="badge"
        :stage="stage"
        :score="{ correct: stageResult.correctCount, total: stageResult.totalCount }"
        :performance-level="stagePerformanceLevel"
      />
    </div>

    <!-- Actions -->
    <div class="actions">
      <button v-if="hasMoreStages" class="btn-primary" @click="handleNextStage">
        {{ t('summary.nextStage') }}
      </button>

      <button class="btn-secondary" @click="handleRetry">
        {{ t('summary.retry') }}
      </button>

      <button v-if="!allCorrect" class="btn-secondary" @click="toggleMistakes">
        {{ t('summary.reviewErrors') }}
      </button>

      <button class="btn-secondary" @click="handleBackToStages">
        {{ t('summary.backToStages') }}
      </button>

      <button class="btn-link" @click="handleBackToHome">
        {{ t('summary.backToHome') }}
      </button>
    </div>

    <!-- Mistake Review -->
    <MistakeReview v-if="showMistakes && mistakes.length > 0" :mistakes="mistakes" />
  </main>
</template>

<style scoped>
.stage-summary {
  padding: 1.5rem;
  max-width: 700px;
  margin: 0 auto;
  min-height: 100vh;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 1.5rem;
}

.result-card {
  text-align: center;
  padding: 2rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  margin-bottom: 2rem;
  background: var(--color-surface, #fff);
}

.stage-name {
  font-size: 1rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 0.5rem;
}

.score {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text, #1f2937);
  margin-bottom: 0.5rem;
}

.congratulations {
  color: var(--color-success, #16a34a);
  font-weight: 600;
  margin-top: 0.5rem;
}

.overall-performance {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #e5e7eb);
}

.percentage {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary, #3b82f6);
}

.performance-level {
  font-size: 1rem;
  color: var(--color-text-secondary, #6b7280);
  margin-top: 0.25rem;
}

.actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.share-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background-color: var(--color-primary, #3b82f6);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  min-width: 240px;
}

.btn-primary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: transparent;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
  min-width: 240px;
}

.btn-secondary:hover {
  border-color: var(--color-primary, #3b82f6);
}

.btn-secondary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.btn-link {
  background: none;
  border: none;
  color: var(--color-text-secondary, #6b7280);
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.875rem;
  min-height: 44px;
}

.btn-link:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}
</style>
