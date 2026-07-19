<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useLocale } from '@/i18n/useLocale'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm', name: string): void
  (e: 'skip'): void
  (e: 'close'): void
}>()

const { t } = useLocale()
const MAX_LENGTH = 60

const name = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const modalRef = ref<HTMLElement | null>(null)
const previouslyFocused = ref<HTMLElement | null>(null)

const titleId = 'name-input-modal-title'
const descriptionId = 'name-input-modal-description'

const trimmedName = computed(() => name.value.trim())
const isTooLong = computed(() => name.value.length > MAX_LENGTH)
const canConfirm = computed(() => !isTooLong.value)

function focusInput(): void {
  void nextTick(() => {
    inputRef.value?.focus()
  })
}

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      previouslyFocused.value =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      name.value = ''
      focusInput()
    } else {
      const target = previouslyFocused.value
      if (target) {
        void nextTick(() => target.focus())
      }
    }
  },
)

function handleConfirm(): void {
  if (!canConfirm.value) {
    return
  }
  emit('confirm', trimmedName.value)
}

function handleSkip(): void {
  emit('skip')
}

function handleClose(): void {
  emit('close')
}

function handleOverlayClick(): void {
  handleClose()
}

function getFocusableElements(): HTMLElement[] {
  if (!modalRef.value) {
    return []
  }
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return Array.from(modalRef.value.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
    return
  }

  if (event.key === 'Tab') {
    const focusable = getFocusableElements()
    if (focusable.length === 0) {
      event.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) {
      return
    }
    const active = document.activeElement as HTMLElement | null

    if (event.shiftKey) {
      if (active === first || !modalRef.value?.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (active === last || !modalRef.value?.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal-overlay"
      @click.self="handleOverlayClick"
    >
      <div
        ref="modalRef"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descriptionId"
        @keydown="handleKeydown"
      >
        <h2 :id="titleId" class="modal-title">{{ t('certificate.title') }}</h2>
        <p :id="descriptionId" class="modal-description">
          {{ t('certificate.description') }}
        </p>

        <div class="modal-field">
          <label :for="'name-input-modal-field'" class="modal-label">
            {{ t('certificate.nameLabel') }}
          </label>
          <input
            :id="'name-input-modal-field'"
            ref="inputRef"
            v-model="name"
            type="text"
            class="modal-input"
            :class="{ 'modal-input--error': isTooLong }"
            :maxlength="MAX_LENGTH"
            :aria-invalid="isTooLong"
            aria-describedby="name-input-modal-hint"
            :placeholder="t('certificate.namePlaceholder')"
            autocomplete="name"
            @keydown.enter.prevent="handleConfirm"
          />
          <p id="name-input-modal-hint" class="modal-hint" :class="{ 'modal-hint--error': isTooLong }">
            <span v-if="isTooLong">{{ t('certificate.charLimit', { max: MAX_LENGTH }) }}</span>
            <span v-else>{{ t('certificate.charCount', { current: name.length, max: MAX_LENGTH }) }}</span>
          </p>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="modal-button modal-button--secondary"
            @click="handleSkip"
          >
            {{ t('certificate.skip') }}
          </button>
          <button
            type="button"
            class="modal-button modal-button--primary"
            :disabled="!canConfirm"
            @click="handleConfirm"
          >
            {{ t('certificate.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;

  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);

  background-color: rgba(0, 0, 0, 0.5);
}

.modal {
  width: 100%;
  max-width: 28rem;

  background-color: var(--color-background-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);

  padding: var(--spacing-xl);
}

.modal-title {
  margin: 0 0 var(--spacing-sm);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.modal-description {
  margin: 0 0 var(--spacing-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: var(--line-height-normal);
}

.modal-field {
  margin-bottom: var(--spacing-lg);
}

.modal-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.modal-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);

  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  color: var(--color-text);

  background-color: var(--color-background);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);

  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.modal-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: var(--focus-ring);
}

.modal-input--error {
  border-color: var(--color-error);
}

.modal-hint {
  margin: var(--spacing-xs) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.modal-hint--error {
  color: var(--color-error);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
}

.modal-button {
  min-height: var(--min-touch-target);
  padding: var(--spacing-sm) var(--spacing-lg);

  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);

  border: 2px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;

  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast);
}

.modal-button:focus-visible {
  outline: 3px solid var(--color-border-focus);
  outline-offset: 2px;
}

.modal-button--primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
}

.modal-button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.modal-button--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-button--secondary {
  background-color: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.modal-button--secondary:hover {
  background-color: var(--color-background-secondary);
  border-color: var(--color-border-focus);
}
</style>
