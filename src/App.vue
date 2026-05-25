<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuizStore } from '@/stores/quizStore';

const quizStore = useQuizStore();
const showRecoveryError = ref(false);

onMounted(() => {
  const wasCorrupted = quizStore.restoreProgress();

  if (wasCorrupted) {
    showRecoveryError.value = true;
    setTimeout(() => { showRecoveryError.value = false; }, 5000);
  }
});

function dismissError() {
  showRecoveryError.value = false;
}
</script>

<template>
  <!-- Recovery error notification -->
  <div v-if="showRecoveryError" class="notification error" role="alert">
    <p>Progresso anterior não pôde ser recuperado</p>
    <button @click="dismissError()">Fechar</button>
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
  font-size: var(--font-size-sm);
  max-width: 90%;
}

.notification.error {
  background: var(--color-error-light);
  border: 1px solid var(--color-error);
  color: var(--color-error-dark);
}

.notification button {
  background: none;
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  cursor: pointer;
  color: inherit;
  font-size: var(--font-size-sm);
}
</style>
