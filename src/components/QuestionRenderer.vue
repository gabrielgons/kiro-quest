<script setup lang="ts">
import type { QuestionPresentation, AnswerOption, OrderingItem } from '@/data/types';
import MultipleChoiceOptions from './MultipleChoiceOptions.vue';
import TrueFalseOptions from './TrueFalseOptions.vue';
import OrderingOptions from './OrderingOptions.vue';

const props = defineProps<{
  question: QuestionPresentation;
  disabled: boolean;
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
      :selected="null"
      :disabled="disabled"
      @select="handleOptionSelect"
    />

    <TrueFalseOptions
      v-else-if="question.type === 'true-false'"
      :options="(question.options as AnswerOption[])"
      :selected="null"
      :disabled="disabled"
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
  font-size: 1.25rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  color: var(--color-text, #1f2937);
}
</style>
