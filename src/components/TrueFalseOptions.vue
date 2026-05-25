<script setup lang="ts">
import type { AnswerOption } from '@/data/types';

defineProps<{
  options: AnswerOption[];
  selected: string | null;
  disabled: boolean;
}>();

const emit = defineEmits<{
  select: [optionId: string];
}>();

function handleSelect(optionId: string) {
  emit('select', optionId);
}
</script>

<template>
  <div role="radiogroup" class="true-false-options">
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
  gap: 1rem;
}

.option-button {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fff);
  cursor: pointer;
  text-align: center;
  font-size: 1rem;
  min-height: 44px;
  transition: border-color 0.2s ease;
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
  background: rgba(59, 130, 246, 0.05);
}

.option-button:disabled {
  cursor: default;
  opacity: 0.8;
}
</style>
