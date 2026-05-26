<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import type { LearningStage } from '@/engine/types';
import type { AnswerOption, OrderingItem } from '@/data/types';
import QuizProgressBar from '@/components/QuizProgressBar.vue';
import FeedbackDisplay from '@/components/FeedbackDisplay.vue';

const router = useRouter();
const route = useRoute();
const { t } = useLocale();
const quizStore = useQuizStore();

const selectedAnswer = ref<string | string[] | null>(null);
const feedbackRef = ref<HTMLElement | null>(null);

const stage = route.params.stage as LearningStage;

onMounted(() => {
  if (quizStore.questions.length === 0 || quizStore.currentStage !== stage) {
    quizStore.startStage(stage);
  }
  initializeAnswer();
});

const currentQuestion = computed(() => quizStore.currentQuestion);
const isLastQuestion = computed(() => quizStore.currentQuestionIndex >= quizStore.questions.length - 1);

const submitLabel = computed(() => {
  if (currentQuestion.value?.type === 'ordering') {
    return t('quiz.confirmOrder');
  }
  return t('quiz.confirm');
});

const canSubmit = computed(() => {
  if (quizStore.quizPhase !== 'answering') return false;
  if (currentQuestion.value?.type === 'ordering') return true;
  return selectedAnswer.value !== null;
});

// Watch question changes to reset local answer state
watch(
  () => quizStore.currentQuestionIndex,
  () => {
    initializeAnswer();
  }
);

function initializeAnswer() {
  const q = quizStore.currentQuestionWithRandomizedOptions;
  if (q?.type === 'ordering') {
    selectedAnswer.value = (q.options as OrderingItem[]).map((o) => o.id);
  } else {
    selectedAnswer.value = null;
  }
}

function selectOption(optionId: string) {
  if (quizStore.quizPhase !== 'answering') return;
  selectedAnswer.value = optionId;
}

function moveItem(index: number, direction: 'up' | 'down') {
  if (quizStore.quizPhase !== 'answering') return;
  if (!Array.isArray(selectedAnswer.value)) return;

  const newOrder = [...selectedAnswer.value];
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= newOrder.length) return;

  const current = newOrder[index]!;
  const target = newOrder[swapIndex]!;
  newOrder[index] = target;
  newOrder[swapIndex] = current;
  selectedAnswer.value = newOrder;
}

function handleSubmit() {
  if (!canSubmit.value || selectedAnswer.value === null) return;
  quizStore.submitAnswer(selectedAnswer.value);
}

function handleNext() {
  if (isLastQuestion.value) {
    quizStore.completeStage();
    router.push(`/summary/${stage}`);
  } else {
    quizStore.nextQuestion();
  }
}
</script>

<template>
  <main class="quiz-view">
    <!-- Error state -->
    <div v-if="quizStore.errorMessage" class="error-state">
      <p class="error-message">{{ quizStore.errorMessage }}</p>
      <button class="btn-secondary" @click="router.push('/stages')">
        {{ t('summary.backToStages') }}
      </button>
    </div>

    <!-- Quiz content -->
    <template v-else-if="currentQuestion">
      <QuizProgressBar
        :current="quizStore.currentQuestionIndex + 1"
        :total="quizStore.questions.length"
        :stage-name="t(`stage.name.${stage}`)"
        :difficulty="currentQuestion.difficulty"
      />

      <!-- Aria-live region for question updates -->
      <div aria-live="polite" class="sr-only">
        Pergunta {{ quizStore.currentQuestionIndex + 1 }} de {{ quizStore.questions.length }}
      </div>

      <!-- Question text -->
      <h2 class="question-text">{{ currentQuestion.text }}</h2>

      <!-- Multiple Choice / Scenario -->
      <div
        v-if="currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'scenario'"
        role="radiogroup"
        :aria-label="currentQuestion.text"
        class="options"
      >
        <button
          v-for="option in (currentQuestion.options as AnswerOption[])"
          :key="option.id"
          role="radio"
          :aria-checked="selectedAnswer === option.id"
          :disabled="quizStore.quizPhase !== 'answering'"
          class="option-button"
          :class="{ selected: selectedAnswer === option.id }"
          @click="selectOption(option.id)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- True/False -->
      <div
        v-else-if="currentQuestion.type === 'true-false'"
        role="radiogroup"
        :aria-label="currentQuestion.text"
        class="options options-row"
      >
        <button
          v-for="option in (currentQuestion.options as AnswerOption[])"
          :key="option.id"
          role="radio"
          :aria-checked="selectedAnswer === option.id"
          :disabled="quizStore.quizPhase !== 'answering'"
          class="option-button"
          :class="{ selected: selectedAnswer === option.id }"
          @click="selectOption(option.id)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- Ordering -->
      <div v-else-if="currentQuestion.type === 'ordering'" class="ordering-list">
        <p class="order-hint">{{ t('quiz.orderItems') }}</p>
        <div
          v-for="(optionId, index) in (selectedAnswer as string[] || [])"
          :key="optionId"
          class="order-item"
        >
          <span class="order-position">{{ index + 1 }}.</span>
          <span class="order-label">
            {{ (currentQuestion.options as OrderingItem[]).find(o => o.id === optionId)?.label }}
          </span>
          <div class="order-controls">
            <button
              class="move-button"
              :disabled="index === 0 || quizStore.quizPhase !== 'answering'"
              :aria-label="`Mover ${(currentQuestion.options as OrderingItem[]).find(o => o.id === optionId)?.label} para cima`"
              @click="moveItem(index, 'up')"
            >
              &#9650;
            </button>
            <button
              class="move-button"
              :disabled="index === (selectedAnswer as string[]).length - 1 || quizStore.quizPhase !== 'answering'"
              :aria-label="`Mover ${(currentQuestion.options as OrderingItem[]).find(o => o.id === optionId)?.label} para baixo`"
              @click="moveItem(index, 'down')"
            >
              &#9660;
            </button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button
          v-if="quizStore.quizPhase === 'answering'"
          class="btn-primary"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </button>

        <button
          v-if="quizStore.quizPhase === 'feedback'"
          class="btn-primary"
          @click="handleNext"
        >
          {{ isLastQuestion ? t('quiz.finish') : t('quiz.next') }}
        </button>
      </div>

      <!-- Feedback -->
      <FeedbackDisplay
        v-if="quizStore.quizPhase === 'feedback' && quizStore.lastAnswerResult"
        ref="feedbackRef"
        :result="quizStore.lastAnswerResult"
        :question-type="currentQuestion.type"
      />
    </template>

    <!-- No questions fallback -->
    <div v-else class="error-state">
      <p class="error-message">{{ t('error.noQuestions') }}</p>
      <button class="btn-secondary" @click="router.push('/stages')">
        {{ t('summary.backToStages') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.quiz-view {
  padding: 1.5rem;
  max-width: 700px;
  margin: 0 auto;
  min-height: 100vh;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.question-text {
  font-size: 1.25rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  color: var(--color-text, #1f2937);
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.options-row {
  flex-direction: row;
}

.option-button {
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #1f2937);
  cursor: pointer;
  text-align: left;
  font-size: 1rem;
  min-height: 44px;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.options-row .option-button {
  flex: 1;
  text-align: center;
}

.option-button:hover:not(:disabled) {
  border-color: var(--color-primary, #3b82f6);
}

.option-button:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.option-button.selected {
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-primary-light, #e0e7ff);
}

.option-button:disabled {
  cursor: default;
  opacity: 0.8;
}

.ordering-list {
  margin-bottom: 1.5rem;
}

.order-hint {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 0.5rem;
}

.order-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fff);
  margin-bottom: 0.5rem;
  min-height: 44px;
}

.order-position {
  font-weight: 600;
  margin-right: 0.75rem;
  color: var(--color-text-secondary, #6b7280);
  min-width: 1.5rem;
}

.order-label {
  flex: 1;
  font-size: 1rem;
}

.order-controls {
  display: flex;
  gap: 0.25rem;
}

.move-button {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 4px;
  background: var(--color-surface, #fff);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.move-button:disabled {
  opacity: 0.3;
  cursor: default;
}

.move-button:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.actions {
  display: flex;
  justify-content: center;
  margin-bottom: 1.5rem;
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
  min-width: 180px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-primary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  background: transparent;
  color: var(--color-text, #1f2937);
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  min-height: 44px;
}

.btn-secondary:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.error-state {
  text-align: center;
  padding: 3rem 1rem;
}

.error-message {
  margin-bottom: 1rem;
  color: var(--color-error, #ef4444);
}
</style>
