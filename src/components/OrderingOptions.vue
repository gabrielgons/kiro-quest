<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue';
import type { OrderingItem } from '@/data/types';
import { useLocale } from '@/i18n/useLocale';

const props = defineProps<{
  items: OrderingItem[];
  orderedIds: string[];
  disabled: boolean;
}>();

const emit = defineEmits<{
  reorder: [orderedIds: string[]];
}>();

const { t } = useLocale();
const announcement = ref('');
const instructionsId = useId();

const orderedItems = computed<OrderingItem[]>(() => {
  const itemsById = new Map(props.items.map((item) => [item.id, item]));
  const selectedItems = props.orderedIds
    .map((id) => itemsById.get(id))
    .filter((item): item is OrderingItem => item !== undefined);
  const selectedIds = new Set(selectedItems.map((item) => item.id));
  const missingItems = props.items.filter((item) => !selectedIds.has(item.id));

  return [...selectedItems, ...missingItems];
});

async function announceMovement(item: OrderingItem, position: number): Promise<void> {
  announcement.value = '';
  await nextTick();
  announcement.value = t('quiz.movedToPosition', {
    item: item.label,
    position: position + 1,
    total: orderedItems.value.length,
  });
}

function moveItem(fromIndex: number, toIndex: number): void {
  if (
    props.disabled ||
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= orderedItems.value.length ||
    toIndex >= orderedItems.value.length
  ) {
    return;
  }

  const newOrder = orderedItems.value.map((item) => item.id);
  const [movedId] = newOrder.splice(fromIndex, 1);
  const movedItem = orderedItems.value[fromIndex];
  if (!movedId || !movedItem) return;

  newOrder.splice(toIndex, 0, movedId);
  emit('reorder', newOrder);
  void announceMovement(movedItem, toIndex);
}

function handlePositionChange(index: number, event: Event): void {
  const select = event.target as HTMLSelectElement;
  moveItem(index, Number(select.value) - 1);
}
</script>

<template>
  <div class="ordering-options">
    <p :id="instructionsId" class="order-hint">{{ t('quiz.orderItems') }}</p>

    <div
      class="order-list"
      role="list"
      :aria-describedby="instructionsId"
    >
      <div
        v-for="(item, index) in orderedItems"
        :key="item.id"
        class="order-item"
        role="listitem"
        :data-testid="`order-item-${item.id}`"
      >
        <span class="order-position">{{ index + 1 }}.</span>
        <span class="order-label">{{ item.label }}</span>

        <div class="order-controls">
          <label class="position-control">
            <span>{{ t('quiz.position') }}</span>
            <select
              class="position-select"
              :value="index + 1"
              :disabled="disabled"
              :aria-label="t('quiz.moveToPosition', { item: item.label })"
              :data-testid="`position-select-${item.id}`"
              @change="handlePositionChange(index, $event)"
            >
              <option
                v-for="position in orderedItems.length"
                :key="position"
                :value="position"
              >
                {{ position }}
              </option>
            </select>
          </label>

          <div class="step-controls">
            <button
              type="button"
              class="move-button"
              :disabled="index === 0 || disabled"
              :aria-label="t('quiz.moveItemUp', { item: item.label })"
              @click="moveItem(index, index - 1)"
            >
              <span aria-hidden="true">&#9650;</span>
            </button>
            <button
              type="button"
              class="move-button"
              :disabled="index === orderedItems.length - 1 || disabled"
              :aria-label="t('quiz.moveItemDown', { item: item.label })"
              @click="moveItem(index, index + 1)"
            >
              <span aria-hidden="true">&#9660;</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <span class="sr-only" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </span>
  </div>
</template>

<style scoped>
.ordering-options {
  margin-bottom: 1.5rem;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.order-hint {
  margin-bottom: 0.25rem;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fff);
  min-height: 60px;
}

.order-position {
  font-weight: 600;
  color: var(--color-text-secondary, #6b7280);
  min-width: 1.5rem;
}

.order-label {
  flex: 1;
  font-size: 1rem;
  min-width: 0;
}

.order-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.position-control {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
}

.position-select {
  min-width: 3.25rem;
  min-height: 44px;
  padding: 0 0.5rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
}

.step-controls {
  display: flex;
  gap: 0.25rem;
}

.move-button {
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.move-button:disabled,
.position-select:disabled {
  opacity: 0.3;
  cursor: default;
}

.move-button:focus-visible,
.position-select:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
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

@media (max-width: 600px) {
  .order-item {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .order-label {
    padding-top: 0.625rem;
  }

  .order-position {
    padding-top: 0.625rem;
  }

  .order-controls {
    width: 100%;
    justify-content: space-between;
    padding-left: 2.25rem;
  }
}
</style>
