<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useTheme } from '@/composables/useTheme';
import { useLocale, type Locale } from '@/i18n/useLocale';

const {
  isConfigured,
  isAuthenticated,
  isLoading,
  displayName,
  avatarUrl,
  login,
  logout,
} = useAuth();
const { locale, setLocale, t } = useLocale();
const { isDark, toggleTheme } = useTheme();

const isOpen = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const sheetRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
let previousBodyOverflow = '';

function openMenu(): void {
  isOpen.value = true;
}

function closeMenu(restoreFocus = true): void {
  if (!isOpen.value) return;
  isOpen.value = false;
  if (restoreFocus) {
    void nextTick(() => triggerRef.value?.focus());
  }
}

function selectLocale(newLocale: Locale): void {
  setLocale(newLocale);
}

async function handleLogin(): Promise<void> {
  closeMenu(false);
  await login();
}

function handleLogout(): void {
  closeMenu(false);
  logout();
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isOpen.value) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeMenu();
    return;
  }

  if (event.key !== 'Tab' || !sheetRef.value) return;

  const focusableElements = Array.from(
    sheetRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  );

  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0]!;
  const lastElement = focusableElements[focusableElements.length - 1]!;

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

watch(isOpen, async (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    await nextTick();
    closeButtonRef.value?.focus();
    return;
  }

  document.body.style.overflow = previousBodyOverflow;
});

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = previousBodyOverflow;
});
</script>

<template>
  <div class="mobile-actions-menu">
    <button
      ref="triggerRef"
      class="mobile-actions-menu__trigger"
      type="button"
      :aria-label="t('menu.open')"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click="openMenu"
    >
      <img
        v-if="isAuthenticated && avatarUrl"
        :src="avatarUrl"
        :alt="displayName"
        class="mobile-actions-menu__avatar"
      />
      <span
        v-else-if="isAuthenticated"
        class="mobile-actions-menu__avatar mobile-actions-menu__avatar--placeholder"
        aria-hidden="true"
      >
        {{ displayName.charAt(0).toUpperCase() }}
      </span>
      <svg
        v-else
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </svg>
    </button>

    <Teleport to="body">
      <Transition name="mobile-sheet">
        <div
          v-if="isOpen"
          class="mobile-actions-menu__backdrop"
          @click.self="closeMenu()"
        >
          <section
            ref="sheetRef"
            class="mobile-actions-menu__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-actions-title"
          >
            <div class="mobile-actions-menu__handle" aria-hidden="true" />

            <header class="mobile-actions-menu__header">
              <div>
                <p class="mobile-actions-menu__eyebrow">Kiro Quest</p>
                <h2 id="mobile-actions-title" class="mobile-actions-menu__title">
                  {{ isAuthenticated ? t('menu.accountAndPreferences') : t('menu.preferences') }}
                </h2>
              </div>
              <button
                ref="closeButtonRef"
                class="mobile-actions-menu__close"
                type="button"
                :aria-label="t('menu.close')"
                @click="closeMenu()"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <div v-if="isAuthenticated" class="mobile-actions-menu__account">
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                alt=""
                class="mobile-actions-menu__account-avatar"
              />
              <span
                v-else
                class="mobile-actions-menu__account-avatar mobile-actions-menu__avatar--placeholder"
                aria-hidden="true"
              >
                {{ displayName.charAt(0).toUpperCase() }}
              </span>
              <span class="mobile-actions-menu__account-name">{{ displayName }}</span>
            </div>

            <nav v-if="isAuthenticated" :aria-label="t('menu.account')">
              <router-link
                to="/profile"
                class="mobile-actions-menu__row"
                @click="closeMenu(false)"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
                <span>{{ t('user.profile') }}</span>
                <span class="mobile-actions-menu__chevron" aria-hidden="true">›</span>
              </router-link>
            </nav>

            <div class="mobile-actions-menu__section">
              <p class="mobile-actions-menu__section-title">{{ t('menu.preferences') }}</p>

              <div class="mobile-actions-menu__setting">
                <span id="mobile-language-label" class="mobile-actions-menu__setting-label">
                  {{ t('settings.language') }}
                </span>
                <div
                  class="mobile-actions-menu__segmented"
                  role="group"
                  aria-labelledby="mobile-language-label"
                >
                  <button
                    type="button"
                    :class="{ active: locale === 'pt-BR' }"
                    :aria-pressed="locale === 'pt-BR'"
                    @click="selectLocale('pt-BR')"
                  >
                    PT
                  </button>
                  <button
                    type="button"
                    :class="{ active: locale === 'en' }"
                    :aria-pressed="locale === 'en'"
                    @click="selectLocale('en')"
                  >
                    EN
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="mobile-actions-menu__row mobile-actions-menu__theme"
                @click="toggleTheme"
              >
                <span class="mobile-actions-menu__theme-icon" aria-hidden="true">
                  {{ isDark ? '🌙' : '☀️' }}
                </span>
                <span>{{ t('settings.theme') }}</span>
                <span class="mobile-actions-menu__value">
                  {{ isDark ? t('settings.dark') : t('settings.light') }}
                </span>
              </button>
            </div>

            <button
              v-if="isConfigured && !isAuthenticated"
              type="button"
              class="mobile-actions-menu__primary"
              :disabled="isLoading"
              @click="handleLogin"
            >
              {{ t('login.button') }}
            </button>

            <button
              v-if="isAuthenticated"
              type="button"
              class="mobile-actions-menu__row mobile-actions-menu__logout"
              @click="handleLogout"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5M21 12H9" />
              </svg>
              <span>{{ t('user.logout') }}</span>
            </button>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.mobile-actions-menu {
  display: none;
}

.mobile-actions-menu__trigger,
.mobile-actions-menu__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-background-card);
  color: var(--color-text);
  cursor: pointer;
}

.mobile-actions-menu__trigger:focus-visible,
.mobile-actions-menu__close:focus-visible,
.mobile-actions-menu__row:focus-visible,
.mobile-actions-menu__primary:focus-visible,
.mobile-actions-menu__segmented button:focus-visible {
  outline: 3px solid var(--color-border-focus);
  outline-offset: 2px;
}

.mobile-actions-menu__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.mobile-actions-menu__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: var(--color-text-inverse, #ffffff);
  font-weight: var(--font-weight-semibold, 600);
}

.mobile-actions-menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(15, 23, 42, 0.62);
}

.mobile-actions-menu__sheet {
  width: min(100%, 480px);
  max-height: min(82dvh, 680px);
  overflow-y: auto;
  padding: 0.5rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px));
  border: 1px solid var(--color-border);
  border-bottom: 0;
  border-radius: 20px 20px 0 0;
  background: var(--color-background-card);
  color: var(--color-text);
  box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.25);
  overscroll-behavior: contain;
}

.mobile-actions-menu__handle {
  width: 40px;
  height: 4px;
  margin: 0 auto 0.5rem;
  border-radius: 999px;
  background: var(--color-border);
}

.mobile-actions-menu__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
}

.mobile-actions-menu__eyebrow,
.mobile-actions-menu__section-title {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.mobile-actions-menu__title {
  margin-top: 0.125rem;
  font-size: 1.25rem;
  line-height: 1.3;
}

.mobile-actions-menu__account {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  background: var(--color-background-secondary);
}

.mobile-actions-menu__account-avatar {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 50%;
  object-fit: cover;
}

.mobile-actions-menu__account-name {
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-actions-menu__section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.mobile-actions-menu__section-title {
  margin-bottom: 0.5rem;
}

.mobile-actions-menu__setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 56px;
}

.mobile-actions-menu__setting-label {
  font-weight: 500;
}

.mobile-actions-menu__segmented {
  display: grid;
  grid-template-columns: repeat(2, 48px);
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 10px;
  background: var(--color-background-secondary);
}

.mobile-actions-menu__segmented button {
  min-width: 48px;
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 700;
}

.mobile-actions-menu__segmented button.active {
  background: var(--color-primary);
  color: var(--color-text-inverse, #ffffff);
  box-shadow: var(--shadow-sm);
}

.mobile-actions-menu__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 52px;
  padding: 0.625rem 0.75rem;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  text-decoration: none;
}

.mobile-actions-menu__row:active {
  background: var(--color-background-secondary);
}

.mobile-actions-menu__chevron,
.mobile-actions-menu__value {
  margin-left: auto;
  color: var(--color-text-secondary);
}

.mobile-actions-menu__theme-icon {
  width: 22px;
  text-align: center;
}

.mobile-actions-menu__primary {
  width: 100%;
  min-height: 48px;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-text-inverse, #ffffff);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.mobile-actions-menu__primary:disabled {
  cursor: wait;
  opacity: 0.65;
}

.mobile-actions-menu__logout {
  margin-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  border-radius: 0;
  color: var(--color-error);
}

.mobile-sheet-enter-active,
.mobile-sheet-leave-active {
  transition: background-color 180ms ease;
}

.mobile-sheet-enter-active .mobile-actions-menu__sheet,
.mobile-sheet-leave-active .mobile-actions-menu__sheet {
  transition: transform 180ms ease;
}

.mobile-sheet-enter-from,
.mobile-sheet-leave-to {
  background: transparent;
}

.mobile-sheet-enter-from .mobile-actions-menu__sheet,
.mobile-sheet-leave-to .mobile-actions-menu__sheet {
  transform: translateY(100%);
}

@media (max-width: 640px) {
  .mobile-actions-menu {
    display: block;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-sheet-enter-active,
  .mobile-sheet-leave-active,
  .mobile-sheet-enter-active .mobile-actions-menu__sheet,
  .mobile-sheet-leave-active .mobile-actions-menu__sheet {
    transition-duration: 1ms;
  }
}
</style>
