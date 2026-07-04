<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';

const { user, displayName, avatarUrl, logout } = useAuth();
</script>

<template>
  <div class="user-profile">
    <div class="user-profile__header">
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="displayName"
        class="user-profile__avatar"
      />
      <div v-else class="user-profile__avatar user-profile__avatar--placeholder">
        {{ displayName.charAt(0).toUpperCase() }}
      </div>
      <h1 class="user-profile__name">{{ displayName }}</h1>
      <p v-if="user?.email" class="user-profile__email">{{ user.email }}</p>
    </div>
    <div class="user-profile__actions">
      <button class="user-profile__logout-btn" @click="logout">
        Sair
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-profile {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
}

.user-profile__header {
  margin-bottom: 2rem;
}

.user-profile__avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 1rem;
  display: block;
  object-fit: cover;
}

.user-profile__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary, #3b82f6);
  color: white;
  font-size: 2rem;
  font-weight: bold;
}

.user-profile__name {
  font-size: 1.5rem;
  margin: 0 0 0.25rem;
  color: var(--color-text, #1f2937);
}

.user-profile__email {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.user-profile__actions {
  margin-top: 2rem;
}

.user-profile__logout-btn {
  padding: 0.5rem 1.5rem;
  border: 1px solid var(--color-border, #d1d5db);
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-text, #374151);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.user-profile__logout-btn:hover {
  background: var(--color-bg-hover, #f3f4f6);
}
</style>
