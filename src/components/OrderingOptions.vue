<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId } from 'vue';
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
const keyboardGrabbedItemId = ref<string | null>(null);
const keyboardOriginalOrderIds = ref<string[] | null>(null);
const activePointerId = ref<number | null>(null);
let activeDragHandle: HTMLElement | null = null;

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

async function announceStatus(
  key: string,
  item: OrderingItem,
  position: number
): Promise<void> {
  announcement.value = '';
  await nextTick();
  announcement.value = t(key, {
    item: item.label,
    position: position + 1,
    total: orderedItems.value.length,
  });
}

function startDrag(itemId: string, event: PointerEvent): void {
  if (
    props.disabled ||
    keyboardGrabbedItemId.value !== null ||
    activePointerId.value !== null ||
    (event.pointerType === 'mouse' && event.button !== 0)
  ) {
    return;
  }

  const currentOrder = orderedItems.value.map((item) => item.id);
  const itemIndex = currentOrder.indexOf(itemId);
  if (itemIndex === -1) return;

  dragOrderIds.value = currentOrder;
  draggedItemId.value = itemId;
  dropTargetId.value = itemId;
  dragStartIndex.value = itemIndex;
  activePointerId.value = event.pointerId;

  const handle = event.currentTarget as HTMLElement;
  activeDragHandle = handle;
  handle.setPointerCapture?.(event.pointerId);
  addGlobalDragListeners();
}

function handlePointerMove(event: PointerEvent): void {
  const draggedId = draggedItemId.value;
  const currentOrder = dragOrderIds.value;
  if (
    !draggedId ||
    !currentOrder ||
    props.disabled ||
    activePointerId.value === null ||
    event.pointerId !== activePointerId.value ||
    keyboardGrabbedItemId.value !== null
  ) {
    return;
  }

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

function addGlobalDragListeners(): void {
  window.addEventListener('pointerup', handleGlobalPointerEnd, true);
  window.addEventListener('pointercancel', handleGlobalPointerEnd, true);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function removeGlobalDragListeners(): void {
  window.removeEventListener('pointerup', handleGlobalPointerEnd, true);
  window.removeEventListener('pointercancel', handleGlobalPointerEnd, true);
  window.removeEventListener('blur', handleWindowBlur);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function handleGlobalPointerEnd(event: PointerEvent): void {
  void finishDrag(event.pointerId);
}

function handleWindowBlur(): void {
  void finishDrag();
}

function handleVisibilityChange(): void {
  if (document.hidden) {
    void finishDrag();
  }
}

function handleLostPointerCapture(event: PointerEvent): void {
  void finishDrag(event.pointerId);
}

async function finishDrag(pointerId?: number): Promise<void> {
  const currentPointerId = activePointerId.value;
  if (
    currentPointerId === null ||
    (pointerId !== undefined && pointerId !== currentPointerId)
  ) {
    return;
  }

  const draggedId = draggedItemId.value;
  const finalOrder = dragOrderIds.value;
  const initialIndex = dragStartIndex.value;

  removeGlobalDragListeners();
  activePointerId.value = null;

  const handle = activeDragHandle;
  activeDragHandle = null;
  if (handle?.hasPointerCapture?.(currentPointerId)) {
    handle.releasePointerCapture?.(currentPointerId);
  }

  const finalIndex = draggedId && finalOrder ? finalOrder.indexOf(draggedId) : -1;
  const movedItem = draggedId
    ? props.items.find((item) => item.id === draggedId)
    : undefined;

  draggedItemId.value = null;
  dropTargetId.value = null;
  dragStartIndex.value = null;

  await nextTick();
  dragOrderIds.value = null;

  if (
    draggedId &&
    finalOrder &&
    initialIndex !== null &&
    keyboardGrabbedItemId.value === null &&
    movedItem &&
    finalIndex !== -1 &&
    finalIndex !== initialIndex
  ) {
    await announceMovement(movedItem, finalIndex);
  }
}

onBeforeUnmount(() => {
  removeGlobalDragListeners();
  activePointerId.value = null;
  activeDragHandle = null;
});

function startKeyboardMove(itemId: string): void {
  if (props.disabled || draggedItemId.value !== null) return;

  const currentOrder = orderedItems.value.map((item) => item.id);
  const itemIndex = currentOrder.indexOf(itemId);
  const item = props.items.find((candidate) => candidate.id === itemId);
  if (itemIndex === -1 || !item) return;

  dragOrderIds.value = currentOrder;
  keyboardOriginalOrderIds.value = [...currentOrder];
  keyboardGrabbedItemId.value = itemId;
  draggedItemId.value = itemId;
  dragStartIndex.value = itemIndex;
  void announceStatus('quiz.keyboardDragStarted', item, itemIndex);
}

function moveKeyboardItem(itemId: string, direction: -1 | 1): void {
  const currentOrder = dragOrderIds.value;
  if (keyboardGrabbedItemId.value !== itemId || !currentOrder) return;

  const fromIndex = currentOrder.indexOf(itemId);
  const toIndex = fromIndex + direction;
  if (fromIndex === -1 || toIndex < 0 || toIndex >= currentOrder.length) return;

  const targetId = currentOrder[toIndex];
  const newOrder = [...currentOrder];
  newOrder.splice(fromIndex, 1);
  newOrder.splice(toIndex, 0, itemId);
  dragOrderIds.value = newOrder;
  dropTargetId.value = targetId ?? null;
  emit('reorder', newOrder);

  const item = props.items.find((candidate) => candidate.id === itemId);
  if (item) {
    void announceMovement(item, toIndex);
  }
}

async function finishKeyboardMove(itemId: string): Promise<void> {
  const finalOrder = dragOrderIds.value;
  if (keyboardGrabbedItemId.value !== itemId || !finalOrder) return;

  const finalIndex = finalOrder.indexOf(itemId);
  const item = props.items.find((candidate) => candidate.id === itemId);

  keyboardGrabbedItemId.value = null;
  keyboardOriginalOrderIds.value = null;
  draggedItemId.value = null;
  dropTargetId.value = null;
  dragStartIndex.value = null;

  await nextTick();
  dragOrderIds.value = null;

  if (item && finalIndex !== -1) {
    await announceStatus('quiz.keyboardDragDropped', item, finalIndex);
  }
}

async function cancelKeyboardMove(itemId: string): Promise<void> {
  const originalOrder = keyboardOriginalOrderIds.value;
  if (keyboardGrabbedItemId.value !== itemId || !originalOrder) return;

  const originalIndex = originalOrder.indexOf(itemId);
  const item = props.items.find((candidate) => candidate.id === itemId);

  dragOrderIds.value = [...originalOrder];
  emit('reorder', [...originalOrder]);
  keyboardGrabbedItemId.value = null;
  keyboardOriginalOrderIds.value = null;
  draggedItemId.value = null;
  dropTargetId.value = null;
  dragStartIndex.value = null;

  await nextTick();
  dragOrderIds.value = null;

  if (item && originalIndex !== -1) {
    await announceStatus('quiz.keyboardDragCancelled', item, originalIndex);
  }
}

function handleHandleKeydown(itemId: string, event: KeyboardEvent): void {
  if (props.disabled) return;

  if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
    event.preventDefault();
    if (keyboardGrabbedItemId.value === itemId) {
      void finishKeyboardMove(itemId);
    } else if (keyboardGrabbedItemId.value === null) {
      startKeyboardMove(itemId);
    }
    return;
  }

  if (keyboardGrabbedItemId.value !== itemId) return;

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveKeyboardItem(itemId, -1);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveKeyboardItem(itemId, 1);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    void cancelKeyboardMove(itemId);
  }
}

function handleHandleBlur(itemId: string): void {
  if (keyboardGrabbedItemId.value === itemId) {
    void finishKeyboardMove(itemId);
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
        <button
          type="button"
          class="drag-handle"
          :class="{ 'is-keyboard-grabbed': keyboardGrabbedItemId === item.id }"
          :disabled="disabled"
          :aria-pressed="keyboardGrabbedItemId === item.id"
          :aria-describedby="instructionsId"
          :aria-label="t(
            keyboardGrabbedItemId === item.id ? 'quiz.dropItem' : 'quiz.dragItem',
            { item: item.label }
          )"
          :data-testid="`drag-handle-${item.id}`"
          @pointerdown.prevent="startDrag(item.id, $event)"
          @lostpointercapture="handleLostPointerCapture"
          @keydown="handleHandleKeydown(item.id, $event)"
          @blur="handleHandleBlur(item.id)"
        >
          <svg viewBox="0 0 16 24" focusable="false" aria-hidden="true">
            <circle cx="5" cy="5" r="1.5" />
            <circle cx="11" cy="5" r="1.5" />
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="11" cy="12" r="1.5" />
            <circle cx="5" cy="19" r="1.5" />
            <circle cx="11" cy="19" r="1.5" />
          </svg>
        </button>
        <span class="order-position">{{ index + 1 }}.</span>
        <span class="order-label">{{ item.label }}</span>
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
  grid-template-columns: 44px 1.5rem minmax(0, 1fr);
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

.drag-handle:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary, #3b82f6) 12%, transparent);
  color: var(--color-primary, #3b82f6);
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle.is-keyboard-grabbed {
  background: var(--color-primary, #3b82f6);
  color: #fff;
  cursor: grabbing;
}

.drag-handle:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.drag-handle:disabled {
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
    grid-template-columns: 44px 1.5rem minmax(0, 1fr);
    gap: 0.5rem;
    padding: 0.625rem 0.5rem;
  }
}
</style>
