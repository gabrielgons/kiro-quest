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
const dragOrderIds = ref<string[] | null>(null);
const draggedItemId = ref<string | null>(null);
const dropTargetId = ref<string | null>(null);
const dragStartIndex = ref<number | null>(null);

const orderedItems = computed<OrderingItem[]>(() => {
  const itemsById = new Map(props.items.map((item) => [item.id, item]));
  const activeOrder = dragOrderIds.value ?? props.orderedIds;
  const selectedItems = activeOrder
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

function startDrag(itemId: string, event: PointerEvent): void {
  if (props.disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;

  const currentOrder = orderedItems.value.map((item) => item.id);
  const itemIndex = currentOrder.indexOf(itemId);
  if (itemIndex === -1) return;

  dragOrderIds.value = currentOrder;
  draggedItemId.value = itemId;
  dropTargetId.value = itemId;
  dragStartIndex.value = itemIndex;

  const handle = event.currentTarget as HTMLElement;
  handle.setPointerCapture?.(event.pointerId);
}

function handlePointerMove(event: PointerEvent): void {
  const draggedId = draggedItemId.value;
  const currentOrder = dragOrderIds.value;
  if (!draggedId || !currentOrder || props.disabled) return;

  event.preventDefault();
  const target = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>('[data-order-id]');
  const targetId = target?.dataset.orderId;
  if (!targetId || targetId === draggedId) return;

  const fromIndex = currentOrder.indexOf(draggedId);
  const toIndex = currentOrder.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

  const newOrder = [...currentOrder];
  newOrder.splice(fromIndex, 1);
  newOrder.splice(toIndex, 0, draggedId);
  dragOrderIds.value = newOrder;
  dropTargetId.value = targetId;
  emit('reorder', newOrder);
}

async function finishDrag(event: PointerEvent): Promise<void> {
  const draggedId = draggedItemId.value;
  const finalOrder = dragOrderIds.value;
  const initialIndex = dragStartIndex.value;
  if (!draggedId || !finalOrder || initialIndex === null) return;

  const handle = event.currentTarget as HTMLElement;
  if (handle.hasPointerCapture?.(event.pointerId)) {
    handle.releasePointerCapture?.(event.pointerId);
  }

  const finalIndex = finalOrder.indexOf(draggedId);
  const movedItem = props.items.find((item) => item.id === draggedId);

  draggedItemId.value = null;
  dropTargetId.value = null;
  dragStartIndex.value = null;

  await nextTick();
  dragOrderIds.value = null;

  if (movedItem && finalIndex !== -1 && finalIndex !== initialIndex) {
    await announceMovement(movedItem, finalIndex);
  }
}
</script>

<template>
  <div class="ordering-options">
    <p :id="instructionsId" class="order-hint">{{ t('quiz.orderItems') }}</p>

    <TransitionGroup
      name="order"
      tag="div"
      class="order-list"
      :class="{
        'is-dragging': draggedItemId !== null,
        'is-disabled': disabled,
      }"
      role="list"
      :aria-describedby="instructionsId"
      @pointermove="handlePointerMove"
      @pointerup="finishDrag"
      @pointercancel="finishDrag"
    >
      <div
        v-for="(item, index) in orderedItems"
        :key="item.id"
        class="order-item"
        :class="{
          'is-dragging': draggedItemId === item.id,
          'is-drop-target': dropTargetId === item.id && draggedItemId !== item.id,
        }"
        role="listitem"
        :data-order-id="item.id"
        :data-testid="`order-item-${item.id}`"
      >
        <span
          class="drag-handle"
          aria-hidden="true"
          :title="t('quiz.dragItem', { item: item.label })"
          :data-testid="`drag-handle-${item.id}`"
          @pointerdown.prevent="startDrag(item.id, $event)"
        >
          <svg viewBox="0 0 16 24" focusable="false">
            <circle cx="5" cy="5" r="1.5" />
            <circle cx="11" cy="5" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
            <circle cx="5" cy="19" r="1.5" />
            <circle cx="11" cy="19" r="1.5" />
          </svg>
        </span>
        <span class="order-position">{{ index + 1 }}.</span>
        <span class="order-label">{{ item.label }}</span>

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
    </TransitionGroup>

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

.order-list.is-dragging {
  user-select: none;
}

.order-hint {
  margin-bottom: 0.25rem;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.875rem;
}

.order-item {
  display: grid;
  grid-template-columns: 44px 1.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 10px;
  background: var(--color-surface, #fff);
  min-height: 64px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.order-item.is-dragging {
  z-index: 1;
  border-color: var(--color-primary, #3b82f6);
  background: var(--color-primary-light, #e0e7ff);
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
  opacity: 0.92;
}

.order-item.is-drop-target {
  border-color: var(--color-primary, #3b82f6);
}

.order-move {
  transition: transform 0.18s ease;
}

.drag-handle {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary, #6b7280);
  cursor: grab;
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.order-list.is-disabled .drag-handle {
  opacity: 0.35;
  cursor: default;
}

.drag-handle svg {
  width: 16px;
  height: 24px;
  fill: currentColor;
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

.move-button:disabled {
  opacity: 0.3;
  cursor: default;
}

.move-button:focus-visible {
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
    grid-template-columns: 44px 1.5rem minmax(0, 1fr) auto;
    gap: 0.5rem;
    padding: 0.625rem 0.5rem;
  }
}
</style>
