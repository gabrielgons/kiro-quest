<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

const { isConfigured, isAuthenticated, displayName, avatarUrl, logout } = useAuth();
const isOpen = ref(false);

function toggleMenu(): void {
  isOpen.value = !isOpen.value;
}

function closeMenu(): void {
  isOpen.value = false;
}

function handleLogout(): void {
  closeMenu();
  logout();
}
</script>

<template>
  <div
    v-if="isConfigured && isAuthenticated"
    class="user-menu"
    @mouseleave="closeMenu"
  >
    <button class="user-menu__trigger" @click="toggleMenu">
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="displayName"
        class="user-menu__avatar"
      />
      <span v-else class="user-menu__avatar user-menu__avatar--placeholder">
        {{ displayName.charAt(0).toUpperCase() }}
      </span>
      <span class="user-menu__name">{{ displayName }}</span>
    </button>

    <div v-if="isOpen" class="user-menu__dropdown">
      <router-link
        to="/profile"
        class="user-menu__item"
        @click="closeMenu"
      >
        Perfil
      </router-link>
      <button class="user-menu__item user-menu__item--danger" @click="handleLogout">
        Sair
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
  display: inline-block;
}

.user-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text, #374151);
  transition: background-color 0.2s;
}

.user-menu__trigger:hover {
  background: var(--color-bg-hover, #f3f4f6);
}

.user-menu__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.user-menu__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary, #3b82f6);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.user-menu__name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  min-width: 120px;
  background: var(--color-bg, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 50;
  overflow: hidden;
}

.user-menu__item {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 0.875rem;
  color: var(--color-text, #374151);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s;
}

.user-menu__item:hover {
  background: var(--color-bg-hover, #f3f4f6);
}

.user-menu__item--danger {
  color: var(--color-error, #ef4444);
}

.user-menu__item--danger:hover {
  background: #fef2f2;
}
</style>
