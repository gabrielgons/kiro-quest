<script setup lang="ts">
import type { LearningStage } from '@/engine/types';
import type { StageStatus } from './types';
import { useLocale } from '@/i18n/useLocale';

defineProps<{
  stage: LearningStage;
  status: StageStatus;
  isRecommended: boolean;
}>();

const emit = defineEmits<{
  select: [stage: LearningStage];
}>();

const { t } = useLocale();

const statusKeys: Record<StageStatus, string> = {
  'completed': 'stage.completed',
  'in-progress': 'stage.inProgress',
  'not-started': 'stage.notStarted',
};
</script>

<template>
  <button
    class="stage-card"
    :class="[`status-${status}`, { recommended: isRecommended }]"
    @click="emit('select', stage)"
  >
    <div class="card-content">
      <span class="stage-name">{{ t(`stage.name.${stage}`) }}</span>
      <span class="status-badge">{{ t(statusKeys[status]) }}</span>
    </div>
    <span v-if="isRecommended" class="recommended-badge">{{ t('stage.recommended') }}</span>
  </button>
</template>

<style scoped>
.stage-card {
  display: block;
  width: 100%;
  padding: var(--spacing-md) var(--spacing-lg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  cursor: pointer;
  text-align: left;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  position: relative;
}

.stage-card:hover {
  border-color: var(--color-primary);
}

.stage-card:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.stage-card.recommended {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.stage-card.status-completed {
  border-left: 4px solid var(--color-success);
}

.stage-card.status-in-progress {
  border-left: 4px solid var(--color-warning);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stage-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-base);
}

.status-badge {
  font-size: var(--font-size-xs);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-border);
  color: var(--color-text-secondary);
}

.status-completed .status-badge {
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success-dark, #065f46);
}

.status-in-progress .status-badge {
  background: var(--color-warning-light, #fef3c7);
  color: var(--color-warning-dark, #92400e);
}

.recommended-badge {
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 0.625rem;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
}
</style>
