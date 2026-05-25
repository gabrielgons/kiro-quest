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
  if (!optionId) return;
  emit('select', optionId);
}

function handleKeydown(event: KeyboardEvent, options: AnswerOption[], currentIndex: number) {
  let nextIndex = -1;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault();
    nextIndex = (currentIndex + 1) % options.length;
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault();
    nextIndex = (currentIndex - 1 + options.length) % options.length;
  }

  if (nextIndex >= 0) {
    emit('select', options[nextIndex].id);
    const el = document.querySelector(`[data-option-index="${nextIndex}"]`) as HTMLElement;
    el?.focus();
  }
}
</script>

<template>
  <div role="radiogroup" :aria-label="ariaLabel" class="multiple-choice-options">
    <button
      v-for="(option, index) in options"
      :key="option.id"
      role="radio"
      :aria-checked="selected === option.id"
      :disabled="disabled"
      :data-option-index="index"
      :tabindex="selected === option.id || (!selected && index === 0) ? 0 : -1"
      class="option-button"
      :class="{ selected: selected === option.id }"
      @click="handleSelect(option.id)"
      @keydown="handleKeydown($event, options, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.multiple-choice-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.option-button {
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
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
