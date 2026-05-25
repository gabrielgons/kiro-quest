<script setup lang="ts">
import { onMounted } from 'vue';
import { useProgressStore } from '@/stores/progressStore';

const progressStore = useProgressStore();

onMounted(() => {
  progressStore.initialize();
});
</script>

<template>
  <!-- Storage unavailability notification -->
  <div v-if="!progressStore.isStorageAvailable" class="notification warning">
    <p>{{ 'Progresso não será salvo nesta sessão' }}</p>
  </div>

  <!-- Recovery error notification -->
  <div v-if="progressStore.hasRecoveryError" class="notification error">
    <p>{{ 'Progresso anterior não pôde ser recuperado' }}</p>
    <button @click="progressStore.dismissRecoveryError()">Fechar</button>
  </div>

  <router-view />
</template>

<style>
#app {
  font-family: var(--font-family-base);
  color: var(--color-text);
  background-color: var(--color-background);
  min-height: 100vh;
}

.notification {
  position: fixed;
  top: var(--spacing-md);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm, 0.875rem);
  max-width: 90%;
}

.notification.warning {
  background: var(--color-warning-light, #fef3c7);
  border: 1px solid var(--color-warning, #f59e0b);
  color: var(--color-warning-dark, #92400e);
}

.notification.error {
  background: var(--color-error-light, #fee2e2);
  border: 1px solid var(--color-error, #ef4444);
  color: var(--color-error-dark, #991b1b);
}

.notification button {
  background: none;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  color: inherit;
  font-size: var(--font-size-sm, 0.875rem);
}
</style>
