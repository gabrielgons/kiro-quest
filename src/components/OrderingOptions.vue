<script setup lang="ts">
import type { OrderingItem } from '@/data/types';

const props = defineProps<{
  items: OrderingItem[];
  disabled: boolean;
}>();

const emit = defineEmits<{
  reorder: [orderedIds: string[]];
}>();

function moveUp(index: number) {
  if (index <= 0 || props.disabled) return;
  const newOrder = props.items.map((i) => i.id);
  const current = newOrder[index];
  const target = newOrder[index - 1];
  if (!current || !target) return;
  newOrder[index] = target;
  newOrder[index - 1] = current;
  emit('reorder', newOrder);
}

function moveDown(index: number) {
  if (index >= props.items.length - 1 || props.disabled) return;
  const newOrder = props.items.map((i) => i.id);
  const current = newOrder[index];
  const target = newOrder[index + 1];
  if (!current || !target) return;
  newOrder[index] = target;
  newOrder[index + 1] = current;
  emit('reorder', newOrder);
}
</script>

<template>
  <div class="ordering-options">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="order-item"
    >
      <span class="order-position">{{ index + 1 }}.</span>
      <span class="order-label">{{ item.label }}</span>
      <div class="order-controls">
        <button
          class="move-button"
          :disabled="index === 0 || disabled"
          :aria-label="`Mover ${item.label} para cima`"
          @click="moveUp(index)"
        >
          &#9650;
        </button>
        <button
          class="move-button"
          :disabled="index === items.length - 1 || disabled"
          :aria-label="`Mover ${item.label} para baixo`"
          @click="moveDown(index)"
        >
          &#9660;
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ordering-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.order-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fff);
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
</style>
