<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuizStore } from '@/stores/quizStore';
import { progressTracker } from '@/progress/progressTracker';

const quizStore = useQuizStore();
const showRecoveryError = ref(false);

onMounted(() => {
  // Attempt to restore progress on app mount
  quizStore.restoreProgress();

  // If restore didn't load anything, check if there was corrupted data
  if (quizStore.completedStages.length === 0 && Object.keys(quizStore.userAnswersByStage).length === 0) {
    try {
      const raw = localStorage.getItem('kiro-quest:progress:v1');
      if (raw !== null) {
        // Data existed but failed validation — show notification
        showRecoveryError.value = true;
        progressTracker.clear();
        setTimeout(() => { showRecoveryError.value = false; }, 5000);
      }
    } catch {
      // localStorage unavailable
    }
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
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  max-width: 90%;
}

.notification.error {
  background: #fee2e2;
  border: 1px solid #ef4444;
  color: #991b1b;
}

.notification button {
  background: none;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  color: inherit;
  font-size: 0.875rem;
}
</style>
