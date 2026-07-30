<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import type { LearningStage } from '@/engine/types';
import type { AnswerOption, OrderingItem } from '@/data/types';
import QuizProgressBar from '@/components/QuizProgressBar.vue';
import FeedbackDisplay from '@/components/FeedbackDisplay.vue';
import OrderingOptions from '@/components/OrderingOptions.vue';

const router = useRouter();
const route = useRoute();
const { t } = useLocale();
const quizStore = useQuizStore();

const selectedAnswer = ref<string | string[] | null>(null);
const feedbackRef = ref<HTMLElement | null>(null);

const stage = route.params.stage as LearningStage;

onMounted(() => {
  if (quizStore.questions.length === 0 || quizStore.currentStage !== stage) {
    if (quizStore.hasInProgressAttempt(stage)) {
      quizStore.resumeStage(stage);
    } else {
      quizStore.startStage(stage);
    }
  }
  initializeAnswer();
});

// Use the randomized-options getter so answer choices are shuffled before
// display. Correctness is checked by option id (not position), so shuffling
// the presentation order is safe and prevents the correct answer from always
// appearing first.
const currentQuestion = computed(() => quizStore.currentQuestionWithRandomizedOptions);
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
  const q = currentQuestion.value;
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

function handleReorder(orderedIds: string[]) {
  if (quizStore.quizPhase !== 'answering') return;
  selectedAnswer.value = orderedIds;
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

function handleBackToStages() {
  router.push('/stages');
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
      <nav class="quiz-navigation" :aria-label="t('quiz.navigation')">
        <button class="quiz-exit-button" @click="handleBackToStages">
          {{ t('quiz.backToStages') }}
        </button>
        <span class="quiz-exit-hint">{{ t('quiz.exitHint') }}</span>
      </nav>

      <QuizProgressBar
        :current="quizStore.currentQuestionIndex + 1"
        :total="quizStore.questions.length"
        :stage-name="t(`stage.name.${stage}`)"
        :difficulty="currentQuestion.difficulty"
      />

      <!-- Aria-live region for question updates -->
      <div aria-live="polite" class="sr-only">
        {{ t('a11y.questionUpdate', { current: quizStore.currentQuestionIndex + 1, total: quizStore.questions.length }) }}
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
      <OrderingOptions
        v-else-if="currentQuestion.type === 'ordering'"
        :items="(currentQuestion.options as OrderingItem[])"
        :ordered-ids="Array.isArray(selectedAnswer) ? selectedAnswer : []"
        :disabled="quizStore.quizPhase !== 'answering'"
        @reorder="handleReorder"
      />

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
  padding-top: 4rem;
  max-width: 700px;
  margin: 0 auto;
  min-height: 100vh;
}

.quiz-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.quiz-exit-button {
  min-height: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
}

.quiz-exit-button:hover {
  border-color: var(--color-primary);
}

.quiz-exit-hint {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  text-align: right;
}

@media (max-width: 640px) {
  .quiz-view {
    padding-top: 1.25rem;
  }

  .quiz-navigation {
    align-items: flex-start;
    flex-direction: column;
  }

  .quiz-exit-hint {
    text-align: left;
  }
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
