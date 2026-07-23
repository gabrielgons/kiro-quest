<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useLocale } from '@/i18n/useLocale';

const { isConfigured, isAuthenticated, displayName, avatarUrl, logout } = useAuth();
const { t } = useLocale();
const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

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

// Close the dropdown when clicking/tapping outside of it.
// (Using mouseleave here caused the menu to close before a click on an item
// could register, because the gap between trigger and dropdown counts as
// "outside" the element.)
function handleOutsideClick(event: MouseEvent): void {
  if (!isOpen.value) return;
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    closeMenu();
  }
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeMenu();
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <div
    v-if="isConfigured && isAuthenticated"
    ref="menuRef"
    class="user-menu"
  >
    <button
      class="user-menu__trigger"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click.stop="toggleMenu"
    >
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

    <div v-if="isOpen" class="user-menu__dropdown" role="menu">
      <router-link
        to="/profile"
        class="user-menu__item"
        role="menuitem"
        @click="closeMenu"
      >
        {{ t('user.profile') }}
      </router-link>
      <button
        class="user-menu__item user-menu__item--danger"
        role="menuitem"
        @click="handleLogout"
      >
        {{ t('user.logout') }}
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
  min-height: var(--min-touch-target, 44px);
  border: none;
  border-radius: var(--radius-md, 0.375rem);
  background: transparent;
  cursor: pointer;
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text);
  transition: background-color var(--transition-fast, 150ms ease);
}

.user-menu__trigger:hover {
  background: var(--color-background-secondary);
}

.user-menu__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.user-menu__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: var(--color-text-inverse, #ffffff);
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-semibold, 600);
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
  min-width: 140px;
  background: var(--color-background-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 0.375rem);
  box-shadow: var(--shadow-lg);
  z-index: 50;
  overflow: hidden;
}

.user-menu__item {
  display: block;
  width: 100%;
  padding: 0.625rem 1rem;
  min-height: var(--min-touch-target, 44px);
  border: none;
  background: transparent;
  text-align: left;
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--color-text);
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--transition-fast, 150ms ease);
}

.user-menu__item:hover {
  background: var(--color-background-secondary);
}

.user-menu__item--danger {
  color: var(--color-error);
}

.user-menu__item--danger:hover {
  background: var(--color-error-light);
}

/* On small screens, show only the avatar to keep the header compact
   and avoid overlapping page content. */
@media (max-width: 480px) {
  .user-menu__name {
    display: none;
  }
}
</style>
