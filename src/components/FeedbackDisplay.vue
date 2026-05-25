<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { AnswerResult } from '@/engine/types';
import type { QuestionType } from '@/data/types';

defineProps<{
  result: AnswerResult;
  questionType: QuestionType;
}>();

const feedbackRef = ref<HTMLElement | null>(null);

onMounted(() => {
  feedbackRef.value?.focus();
});
</script>

<template>
  <div
    ref="feedbackRef"
    class="feedback-display"
    :class="result.isCorrect ? 'feedback-correct' : 'feedback-incorrect'"
    aria-live="assertive"
    tabindex="-1"
  >
    <p class="feedback-title">
      {{ result.isCorrect ? 'Correto!' : 'Incorreto' }}
    </p>

    <p v-if="!result.isCorrect && questionType !== 'ordering' && result.correctAnswerLabel" class="correct-answer">
      Resposta correta: {{ result.correctAnswerLabel }}
    </p>

    <div v-if="!result.isCorrect && questionType === 'ordering' && result.correctOrderLabels" class="correct-order">
      <p class="correct-order-title">Ordem correta:</p>
      <ol class="correct-order-list">
        <li v-for="(label, index) in result.correctOrderLabels" :key="index">
          {{ label }}
        </li>
      </ol>
    </div>

    <p class="feedback-explanation">{{ result.explanation }}</p>

    <a
      v-if="result.sourceUrl"
      :href="result.sourceUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="source-link"
    >
      Ver documentação
    </a>
  </div>
</template>

<style scoped>
.feedback-display {
  padding: 1.25rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.feedback-display:focus {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.feedback-correct {
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid #22c55e;
}

.feedback-incorrect {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid #ef4444;
}

.feedback-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.correct-answer {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.correct-order {
  margin-bottom: 0.5rem;
}

.correct-order-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.correct-order-list {
  padding-left: 1.5rem;
  margin: 0;
}

.correct-order-list li {
  margin-bottom: 0.25rem;
}

.feedback-explanation {
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.source-link {
  color: var(--color-primary, #3b82f6);
  text-decoration: underline;
  font-size: 0.875rem;
}
</style>
