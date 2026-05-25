<script setup lang="ts">
import type { AnswerOption } from '@/data/types';

defineProps<{
  options: AnswerOption[];
  selected: string | null;
  disabled: boolean;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  select: [optionId: string];
}>();

function handleSelect(optionId: string) {
  emit('select', optionId);
}
</script>

<template>
  <div role="radiogroup" :aria-label="ariaLabel" class="true-false-options">
    <button
      v-for="option in options"
      :key="option.id"
      role="radio"
      :aria-checked="selected === option.id"
      :disabled="disabled"
      class="option-button"
      :class="{ selected: selected === option.id }"
      @click="handleSelect(option.id)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.true-false-options {
  display: flex;
  gap: var(--spacing-md);
}

.option-button {
  flex: 1;
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
  text-align: center;
  font-size: var(--font-size-base);
  min-height: var(--min-touch-target);
  transition: border-color var(--transition-fast);
}

.option-button:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.option-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.option-button.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.option-button:disabled {
  cursor: default;
  opacity: 0.8;
}
</style>
