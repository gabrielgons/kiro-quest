<script setup lang="ts">
import type { LearningStage } from '@/engine/types';
import type { StageStatus } from './types';

defineProps<{
  stage: LearningStage;
  status: StageStatus;
  isRecommended: boolean;
}>();

const emit = defineEmits<{
  select: [stage: LearningStage];
}>();

const stageLabels: Record<LearningStage, string> = {
  'kiro-basics': 'Kiro Basics',
  'specs': 'Specs',
  'feature-specs': 'Feature Specs',
  'bugfix-specs': 'Bugfix Specs',
  'steering': 'Steering',
  'hooks': 'Hooks',
  'mcp': 'MCP',
  'powers': 'Powers',
  'skills': 'Skills',
  'real-world-workflows': 'Real-World Workflows',
  'enterprise-scenarios': 'Enterprise Scenarios',
};

const statusLabels: Record<StageStatus, string> = {
  'completed': 'Concluído',
  'in-progress': 'Em progresso',
  'not-started': 'Não iniciado',
};
</script>

<template>
  <button
    class="stage-card"
    :class="[`status-${status}`, { recommended: isRecommended }]"
    @click="emit('select', stage)"
  >
    <div class="card-content">
      <span class="stage-name">{{ stageLabels[stage] }}</span>
      <span class="status-badge">{{ statusLabels[status] }}</span>
    </div>
    <span v-if="isRecommended" class="recommended-badge">Recomendado</span>
  </button>
</template>

<style scoped>
.stage-card {
  display: block;
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #fff);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.stage-card:hover {
  border-color: var(--color-primary, #3b82f6);
}

.stage-card:focus-visible {
  outline: 3px solid var(--color-focus, #60a5fa);
  outline-offset: 2px;
}

.stage-card.recommended {
  border-color: var(--color-primary, #3b82f6);
  box-shadow: 0 0 0 1px var(--color-primary, #3b82f6);
}

.stage-card.status-completed {
  border-left: 4px solid #22c55e;
}

.stage-card.status-in-progress {
  border-left: 4px solid #f59e0b;
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stage-name {
  font-weight: 600;
  font-size: 1rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--color-border, #e5e7eb);
  color: var(--color-text-secondary, #6b7280);
}

.status-completed .status-badge {
  background: #d1fae5;
  color: #065f46;
}

.status-in-progress .status-badge {
  background: #fef3c7;
  color: #92400e;
}

.recommended-badge {
  position: absolute;
  top: -8px;
  right: 12px;
  font-size: 0.625rem;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--color-primary, #3b82f6);
  color: #fff;
  font-weight: 600;
  text-transform: uppercase;
}
</style>
