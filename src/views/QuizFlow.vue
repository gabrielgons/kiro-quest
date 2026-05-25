<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useLocale } from '@/i18n/useLocale';
import { useQuizStore } from '@/stores/quizStore';
import { useProgressStore } from '@/stores/progressStore';
import type { LearningStage } from '@/engine/types';
import type { AnswerResult } from '@/engine/types';

const router = useRouter();
const route = useRoute();
const { t } = useLocale();
const quizStore = useQuizStore();
const progressStore = useProgressStore();

const selectedAnswer = ref<string | string[] | null>(null);
const feedback = ref<AnswerResult | null>(null);
const hasSubmitted = ref(false);

const stage = route.params.stage as LearningStage;

onMounted(() => {
  if (quizStore.questions.length === 0 || quizStore.state.currentStage !== stage) {
    quizStore.startStage(stage);
  }
});

// React to question changes: reset answer state and initialize ordering
watch(
  () => quizStore.currentQuestionWithRandomizedOptions,
  (question) => {
    if (question?.type === 'ordering') {
      selectedAnswer.value = question.options.map((o) => o.id);
    } else {
      selectedAnswer.value = null;
    }
    hasSubmitted.value = false;
    feedback.value = null;
  }
);

function selectOption(optionId: string) {
  if (hasSubmitted.value) return;
  selectedAnswer.value = optionId;
}

function selectOrdering(orderedIds: string[]) {
  if (hasSubmitted.value) return;
  selectedAnswer.value = orderedIds;
}

function moveItem(index: number, direction: 'up' | 'down') {
  if (hasSubmitted.value) return;
  if (!Array.isArray(selectedAnswer.value)) return;

  const newOrder = [...selectedAnswer.value];
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= newOrder.length) return;

  [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
  selectedAnswer.value = newOrder;
}

function handleSubmit() {
  const question = quizStore.currentQuestionWithRandomizedOptions;
  if (!question || selectedAnswer.value === null) return;

  const result = quizStore.submitAnswer(question.id, selectedAnswer.value);
  feedback.value = result;
  hasSubmitted.value = true;
  progressStore.save(quizStore.state);
}

function handleNext() {
  quizStore.advanceToNext();

  if (quizStore.isFinalStageComplete) {
    progressStore.save(quizStore.state);
    router.push('/achievement');
  } else if (quizStore.isStageComplete) {
    progressStore.save(quizStore.state);
    router.push(`/summary/${stage}`);
  }
}
</script>

<template>
  <main :class="$style.container">
    <!-- Progress Bar -->
    <div :class="$style.progressBar" :aria-label="t('a11y.progressBar')">
      <span :class="$style.progressText">{{ quizStore.stageProgress.formatted }}</span>
      <div :class="$style.progressTrack">
        <div
          :class="$style.progressFill"
          :style="{ width: `${quizStore.stageProgress.percentage}%` }"
        />
      </div>
    </div>

    <!-- Question -->
    <div v-if="quizStore.currentQuestionWithRandomizedOptions" :class="$style.questionArea">
      <h2 :class="$style.questionText">
        {{ quizStore.currentQuestionWithRandomizedOptions.text }}
      </h2>

      <!-- Multiple Choice / True-False / Scenario -->
      <div
        v-if="['multiple-choice', 'true-false', 'scenario'].includes(quizStore.currentQuestionWithRandomizedOptions.type)"
        :class="$style.options"
        role="radiogroup"
      >
        <button
          v-for="option in quizStore.currentQuestionWithRandomizedOptions.options"
          :key="option.id"
          :class="[
            $style.optionButton,
            selectedAnswer === option.id && $style.selected,
            hasSubmitted && feedback?.isCorrect && selectedAnswer === option.id && $style.correct,
            hasSubmitted && !feedback?.isCorrect && selectedAnswer === option.id && $style.incorrect,
            hasSubmitted && option.id === feedback?.correctAnswerId && $style.correctAnswer,
          ]"
          :disabled="hasSubmitted"
          role="radio"
          :aria-checked="selectedAnswer === option.id"
          @click="selectOption(option.id)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- Ordering -->
      <div
        v-if="quizStore.currentQuestionWithRandomizedOptions.type === 'ordering'"
        :class="$style.orderingList"
      >
        <p :class="$style.orderHint">{{ t('quiz.orderItems') }}</p>
        <div
          v-for="(optionId, index) in (selectedAnswer as string[] || [])"
          :key="optionId"
          :class="$style.orderItem"
        >
          <span :class="$style.orderLabel">
            {{ quizStore.currentQuestionWithRandomizedOptions.options.find(o => o.id === optionId)?.label }}
          </span>
          <div :class="$style.orderControls">
            <button
              :class="$style.moveButton"
              :disabled="index === 0 || hasSubmitted"
              :aria-label="t('quiz.moveUp')"
              @click="moveItem(index, 'up')"
            >
              &#9650;
            </button>
            <button
              :class="$style.moveButton"
              :disabled="index === (selectedAnswer as string[]).length - 1 || hasSubmitted"
              :aria-label="t('quiz.moveDown')"
              @click="moveItem(index, 'down')"
            >
              &#9660;
            </button>
          </div>
        </div>
      </div>

      <!-- Submit / Next buttons -->
      <div :class="$style.actions">
        <button
          v-if="!hasSubmitted"
          :class="$style.submitButton"
          :disabled="selectedAnswer === null"
          @click="handleSubmit"
        >
          {{ t('quiz.submit') }}
        </button>

        <button
          v-if="hasSubmitted"
          :class="$style.nextButton"
          @click="handleNext"
        >
          {{ quizStore.stageProgress.current >= quizStore.stageProgress.total ? t('quiz.finish') : t('quiz.next') }}
        </button>
      </div>

      <!-- Feedback Panel -->
      <div v-if="hasSubmitted && feedback" :class="[$style.feedback, feedback.isCorrect ? $style.feedbackCorrect : $style.feedbackIncorrect]">
        <p :class="$style.feedbackTitle">
          {{ feedback.isCorrect ? t('feedback.correct') : t('feedback.incorrect') }}
        </p>
        <p :class="$style.feedbackExplanation">
          <strong>{{ t('feedback.explanation') }}:</strong> {{ feedback.explanation }}
        </p>
        <a
          v-if="feedback.sourceUrl"
          :href="feedback.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          :class="$style.sourceLink"
        >
          {{ t('feedback.source') }}
        </a>
      </div>
    </div>

    <!-- No questions -->
    <div v-else :class="$style.empty">
      <p>{{ t('error.noQuestions') }}</p>
      <button :class="$style.backButton" @click="router.push('/stages')">
        {{ t('nav.back') }}
      </button>
    </div>
  </main>
</template>

<style module>
.container {
  padding: var(--spacing-lg);
  max-width: 700px;
  margin: 0 auto;
  min-height: 100vh;
}

.progressBar {
  margin-bottom: var(--spacing-lg);
}

.progressText {
  display: block;
  text-align: center;
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.progressTrack {
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.questionArea {
  margin-bottom: var(--spacing-xl);
}

.questionText {
  font-size: var(--font-size-lg, 1.25rem);
  color: var(--color-text);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.optionButton {
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  font-size: var(--font-size-md, 1rem);
  min-height: 44px;
  transition: border-color 0.2s ease;
}

.optionButton:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.optionButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.optionButton.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light, rgba(59, 130, 246, 0.05));
}

.optionButton.correct,
.optionButton.correctAnswer {
  border-color: var(--color-success);
  background: var(--color-success-light, rgba(34, 197, 94, 0.1));
}

.optionButton.incorrect {
  border-color: var(--color-error);
  background: var(--color-error-light, rgba(239, 68, 68, 0.1));
}

.optionButton:disabled {
  cursor: default;
  opacity: 0.8;
}

.orderingList {
  margin-bottom: var(--spacing-lg);
}

.orderHint {
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.orderItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  margin-bottom: var(--spacing-xs);
  min-height: 44px;
}

.orderLabel {
  flex: 1;
  font-size: var(--font-size-md, 1rem);
}

.orderControls {
  display: flex;
  gap: var(--spacing-xs);
}

.moveButton {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.moveButton:disabled {
  opacity: 0.3;
  cursor: default;
}

.moveButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.actions {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-lg);
}

.submitButton,
.nextButton {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: var(--font-size-md, 1rem);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  min-height: 44px;
  min-width: 180px;
}

.submitButton {
  background: var(--color-primary);
  color: var(--color-white, #fff);
}

.submitButton:disabled {
  opacity: 0.5;
  cursor: default;
}

.submitButton:focus-visible,
.nextButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.nextButton {
  background: var(--color-primary);
  color: var(--color-white, #fff);
}

.feedback {
  padding: var(--spacing-lg);
  border-radius: var(--radius-md);
  margin-top: var(--spacing-md);
}

.feedbackCorrect {
  background: var(--color-success-light, rgba(34, 197, 94, 0.1));
  border: 2px solid var(--color-success);
}

.feedbackIncorrect {
  background: var(--color-error-light, rgba(239, 68, 68, 0.1));
  border: 2px solid var(--color-error);
}

.feedbackTitle {
  font-size: var(--font-size-lg, 1.25rem);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
}

.feedbackExplanation {
  font-size: var(--font-size-md, 1rem);
  line-height: 1.5;
  margin-bottom: var(--spacing-sm);
}

.sourceLink {
  color: var(--color-primary);
  text-decoration: underline;
  font-size: var(--font-size-sm, 0.875rem);
}

.empty {
  text-align: center;
  padding: var(--spacing-xl);
}

.backButton {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: transparent;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  min-height: 44px;
}

.backButton:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
