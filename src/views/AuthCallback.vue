<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  const success = await authStore.handleCallback(window.location.href);
  if (success) {
    router.replace({ path: '/stages' });
  } else {
    router.replace({ path: '/' });
  }
});
</script>

<template>
  <div class="auth-callback">
    <div class="auth-callback__content">
      <div class="auth-callback__spinner" />
      <p class="auth-callback__text">Autenticando...</p>
      <p v-if="authStore.error" class="auth-callback__error">
        {{ authStore.error }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.auth-callback__content {
  text-align: center;
}

.auth-callback__spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-border, #e2e8f0);
  border-top-color: var(--color-primary, #3b82f6);
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 0.8s linear infinite;
}

.auth-callback__text {
  font-size: 1.125rem;
  color: var(--color-text, #374151);
}

.auth-callback__error {
  color: var(--color-error, #ef4444);
  margin-top: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
