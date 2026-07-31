<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { DraggableEvent } from 'vue-draggable-plus';
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
const pointerDraggedItemId = ref<string | null>(null);
const pointerDragStartIndex = ref<number | null>(null);

function itemsInOrder(items: OrderingItem[], orderedIds: string[]): OrderingItem[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const selectedItems = orderedIds
    .map((id) => itemsById.get(id))
    .filter((item): item is OrderingItem => item !== undefined);
  const selectedIds = new Set(selectedItems.map((item) => item.id));
  const missingItems = items.filter((item) => !selectedIds.has(item.id));

  return [...selectedItems, ...missingItems];
}

async function announceMovement(item: OrderingItem, position: number): Promise<void> {
  announcement.value = '';
  await nextTick();
  announcement.value = t('quiz.movedToPosition', {
    item: item.label,
    position: position + 1,
    total: dragItems.value.length,
  });
}

const dragItems = ref(itemsInOrder(props.items, props.orderedIds));

function handlePointerDragStart(event: DraggableEvent<OrderingItem>): void {
  pointerDraggedItemId.value = event.item.dataset.orderId ?? null;
  pointerDragStartIndex.value = event.oldIndex ?? null;
}

async function handlePointerDragEnd(event: DraggableEvent<OrderingItem>): Promise<void> {
  await nextTick();

  const itemId = pointerDraggedItemId.value ?? event.item.dataset.orderId;
  const initialIndex = pointerDragStartIndex.value;
  const finalIndex = event.newIndex ?? -1;
  const item = dragItems.value.find((candidate) => candidate.id === itemId);

  pointerDraggedItemId.value = null;
  pointerDragStartIndex.value = null;

  if (
    item &&
    initialIndex !== null &&
    finalIndex !== -1 &&
    finalIndex !== initialIndex
  ) {
    emit('reorder', dragItems.value.map((candidate) => candidate.id));
    await announceMovement(item, finalIndex);
  }
}

watch(
  [() => props.items, () => props.orderedIds],
  ([items, orderedIds]) => {
    if (pointerDraggedItemId.value !== null) {
      return;
    }

    const nextItems = itemsInOrder(items, orderedIds);
    const currentSignature = dragItems.value
      .map((item) => `${item.id}\u0000${item.label}`)
      .join('\u0001');
    const nextSignature = nextItems
      .map((item) => `${item.id}\u0000${item.label}`)
      .join('\u0001');

    if (currentSignature !== nextSignature) {
      dragItems.value = nextItems;
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="ordering-options">
    <p :id="instructionsId" class="order-hint">{{ t('quiz.orderItems') }}</p>

    <VueDraggable
      v-model="dragItems"
      tag="div"
      class="order-list"
      :class="{
        'is-dragging': pointerDraggedItemId !== null,
        'is-disabled': disabled,
      }"
      :disabled="disabled"
      handle=".drag-handle"
      :animation="180"
      easing="cubic-bezier(0.22, 1, 0.36, 1)"
      ghost-class="is-drag-placeholder"
      chosen-class="is-dragging"
      drag-class="is-dragging"
      fallback-class="is-synth-dragging"
      :swap-threshold="0.65"
      role="list"
      :aria-describedby="instructionsId"
      @start="handlePointerDragStart"
      @end="handlePointerDragEnd"
    >
      <div
        v-for="(item, index) in dragItems"
        :key="item.id"
        class="order-item"
        role="listitem"
        :data-order-id="item.id"
        :data-testid="`order-item-${item.id}`"
      >
        <span class="order-position">{{ index + 1 }}.</span>
        <span class="order-label">{{ item.label }}</span>
        <span
          class="drag-handle"
          aria-hidden="true"
          :title="t('quiz.dragItem', { item: item.label })"
          :data-testid="`drag-handle-${item.id}`"
        >
          <svg viewBox="0 0 16 24" focusable="false" aria-hidden="true">
            <circle cx="5" cy="5" r="1.5" />
            <circle cx="11" cy="5" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
            <circle cx="5" cy="19" r="1.5" />
            <circle cx="11" cy="19" r="1.5" />
          </svg>
        </span>
      </div>
    </VueDraggable>

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
  grid-template-columns: 1.5rem minmax(0, 1fr) 44px;
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

.order-item.is-drag-placeholder {
  opacity: 0.3;
  box-shadow: none;
}

.order-item.is-synth-dragging {
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 12px 30px rgb(0 0 0 / 24%);
}

.drag-handle {
  display: flex;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  cursor: grab;
  touch-action: none;
}

.drag-handle:hover {
  background: color-mix(in srgb, var(--color-primary, #3b82f6) 12%, transparent);
  color: var(--color-primary, #3b82f6);
}

.drag-handle:active {
  cursor: grabbing;
}

.order-list.is-disabled .drag-handle {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
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
    grid-template-columns: 1.5rem minmax(0, 1fr) 44px;
    gap: 0.5rem;
    padding: 0.625rem 0.5rem;
  }
}
</style>
