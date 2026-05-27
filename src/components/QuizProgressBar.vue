<script setup lang="ts">
import type { DifficultyLevel } from '@/data/types';

defineProps<{
  current: number;
  total: number;
  stageName: string;
  difficulty: DifficultyLevel;
}>();
</script>

<template>
  <div class="quiz-progress-bar" :aria-label="`Progresso: pergunta ${current} de ${total}`">
    <div class="progress-info">
      <span class="stage-name">{{ stageName }}</span>
      <span class="difficulty-badge" :class="`difficulty-${difficulty}`">{{ difficulty }}</span>
    </div>
    <div class="progress-indicator">
      <span class="progress-text">{{ current }} / {{ total }}</span>
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{ width: `${total > 0 ? (current / total) * 100 : 0}%` }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-progress-bar {
  margin-bottom: 1.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.stage-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.difficulty-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: capitalize;
}

.difficulty-iniciante {
  background: var(--color-success-light, #dcfce7);
  color: var(--color-success-dark, #065f46);
}

.difficulty-intermediário {
  background: var(--color-warning-light, #fef3c7);
  color: var(--color-warning-dark, #92400e);
}

.difficulty-avançado {
  background: var(--color-error-light, #fee2e2);
  color: var(--color-error-dark, #991b1b);
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #6b7280);
  white-space: nowrap;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: var(--color-border, #e5e7eb);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary, #3b82f6);
  border-radius: 3px;
  transition: width 0.3s ease;
}
</style>
