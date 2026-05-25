<script setup lang="ts">
import type { QuestionPresentation, AnswerOption, OrderingItem } from '@/data/types';
import MultipleChoiceOptions from './MultipleChoiceOptions.vue';
import TrueFalseOptions from './TrueFalseOptions.vue';
import OrderingOptions from './OrderingOptions.vue';

const props = defineProps<{
  question: QuestionPresentation;
  disabled: boolean;
  selectedAnswer: string | string[] | null;
}>();

const emit = defineEmits<{
  select: [value: string | string[]];
}>();

function handleOptionSelect(optionId: string) {
  emit('select', optionId);
}

function handleReorder(orderedIds: string[]) {
  emit('select', orderedIds);
}
</script>

<template>
  <div class="question-renderer">
    <h2 class="question-text">{{ question.text }}</h2>

    <MultipleChoiceOptions
      v-if="question.type === 'multiple-choice' || question.type === 'scenario'"
      :options="(question.options as AnswerOption[])"
      :selected="typeof selectedAnswer === 'string' ? selectedAnswer : null"
      :disabled="disabled"
      :aria-label="question.text"
      @select="handleOptionSelect"
    />

    <TrueFalseOptions
      v-else-if="question.type === 'true-false'"
      :options="(question.options as AnswerOption[])"
      :selected="typeof selectedAnswer === 'string' ? selectedAnswer : null"
      :disabled="disabled"
      :aria-label="question.text"
      @select="handleOptionSelect"
    />

    <OrderingOptions
      v-else-if="question.type === 'ordering'"
      :items="(question.options as OrderingItem[])"
      :disabled="disabled"
      @reorder="handleReorder"
    />
  </div>
</template>

<style scoped>
.question-renderer {
  margin-bottom: 1.5rem;
}

.question-text {
  font-size: var(--font-size-xl);
  line-height: var(--line-height-normal);
  margin-bottom: var(--spacing-lg);
  color: var(--color-text);
}
</style>
