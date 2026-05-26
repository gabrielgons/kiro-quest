# Implementation Plan: Dark Mode

## Overview

Implement dark mode support for the Kiro Quest application using a Vue 3 composable (`useTheme`) for theme management, a floating toggle button component (`ThemeToggle`), and CSS variable overrides via `[data-theme="dark"]` selector. The implementation uses localStorage for persistence and system preference detection via `matchMedia`.

## Tasks

- [x] 1. Create useTheme composable with core logic
  - [x] 1.1 Create `src/composables/useTheme.ts` with Theme type, storage key constant, and `initializeTheme()` function
    - Define `Theme` type as `'light' | 'dark'`
    - Define `THEME_STORAGE_KEY = 'kiro-quest-theme'`
    - Implement `initializeTheme()` that reads localStorage first, falls back to `matchMedia`, defaults to `'light'`
    - Wrap localStorage reads in try/catch for private browsing mode
    - Guard against missing `matchMedia` API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.2, 8.3, 8.4_

  - [x] 1.2 Implement `useTheme()` composable with reactive state, DOM sync, and `toggleTheme()`
    - Create `ref<Theme>` initialized via `initializeTheme()`
    - Create `isDark` computed property
    - Implement `applyTheme()` that sets `data-theme` attribute on `document.documentElement`
    - Apply theme synchronously on composable execution
    - Implement `toggleTheme()` that flips theme, applies to DOM, and persists to localStorage
    - Wrap localStorage writes in try/catch
    - Return `UseThemeReturn` interface: `{ theme: Readonly<Ref<Theme>>, isDark: ComputedRef<boolean>, toggleTheme: () => void }`
    - _Requirements: 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.3, 7.1, 7.2, 7.3_

  - [x] 1.3 Add system preference change listener with cleanup via `onScopeDispose`
    - Register `change` event listener on `matchMedia('(prefers-color-scheme: dark)')` result
    - Only react to system changes when no valid user preference exists in localStorage
    - After first manual toggle, stop reacting to system changes
    - Register cleanup via `onScopeDispose` to remove the event listener
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 9.1, 9.2, 9.3_

  - [ ]* 1.4 Write property tests for `initializeTheme()` and toggle logic
    - **Property 5: Valores Sempre Válidos** — For any arbitrary string in localStorage, `initializeTheme()` always returns exactly `'light'` or `'dark'`
    - **Property 6: Inversão por Toggle** — For any initial theme and N toggles, final theme is predictable (N even → initial, N odd → opposite)
    - **Property 3: Detecção Inicial Determinística** — For any combination of localStorage state and system preference, `initializeTheme()` is deterministic
    - **Validates: Requirements 8.2, 8.4, 2.1, 2.2, 1.1, 1.2**

  - [ ]* 1.5 Write unit tests for `useTheme` composable
    - Test initialization from valid localStorage value
    - Test initialization from system preference when no saved value
    - Test initialization defaults to `'light'` when matchMedia unavailable
    - Test `toggleTheme()` flips from light to dark and vice versa
    - Test `toggleTheme()` persists to localStorage
    - Test invalid localStorage values are ignored
    - Test localStorage exceptions are handled gracefully
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 2.1, 2.2, 2.4, 3.4, 8.1, 8.2, 8.5, 8.6_

- [x] 2. Checkpoint - Ensure composable tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Add dark theme CSS variables
  - [x] 3.1 Add `[data-theme="dark"]` rule block to `src/assets/variables.css`
    - Override text colors: `--color-text`, `--color-text-secondary`, `--color-text-inverse`
    - Override background colors: `--color-background`, `--color-background-secondary`, `--color-background-card`, `--color-surface`
    - Override border colors: `--color-border`, `--color-border-focus`
    - Override semantic colors: `--color-primary-light`, `--color-success-light`, `--color-error-light`, `--color-warning-light`
    - Override shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
    - Override derived colors: `--color-error-dark`, `--color-warning-dark`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.2 Add smooth theme transition styles to `src/assets/variables.css`
    - Add `transition: background-color var(--transition-normal), color var(--transition-normal)` to `body` rule
    - _Requirements: 5.4_

- [x] 4. Create ThemeToggle component
  - [x] 4.1 Create `src/components/ThemeToggle.vue` with accessible toggle button
    - Use `useTheme` composable internally
    - Render sun icon (☀️) when dark mode active, moon icon (🌙) when light mode active
    - Set dynamic `aria-label` describing the action (e.g., "Mudar para tema claro" / "Mudar para tema escuro")
    - Position fixed with sufficient z-index to stay above page content
    - Ensure minimum touch target of 44px × 44px
    - Make focusable via Tab and activatable via Enter/Space (native button behavior)
    - Add visible focus indicator with minimum 3:1 contrast ratio
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 2.6_

  - [ ]* 4.2 Write unit tests for ThemeToggle component
    - Test correct icon renders based on theme state
    - Test aria-label reflects opposite action
    - Test click triggers theme toggle
    - Test button has minimum 44px dimensions
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 5. Integrate theme into App.vue
  - [x] 5.1 Wire `useTheme` composable and `ThemeToggle` component into `src/App.vue`
    - Import and call `useTheme()` in App.vue setup
    - Import and render `ThemeToggle` component in the template
    - _Requirements: 1.7, 7.2_

  - [ ]* 5.2 Write property tests for DOM-state consistency and persistence round-trip
    - **Property 1: Consistência DOM-Estado** — After any operation, `theme.value` equals `document.documentElement.getAttribute('data-theme')`
    - **Property 2: Persistência Round-Trip** — After toggling to a theme, localStorage matches theme.value, and re-initialization restores same theme
    - **Property 7: Prioridade da Preferência do Usuário** — When valid saved preference exists, system preference changes are ignored
    - **Validates: Requirements 7.1, 2.3, 7.3, 2.4, 3.1, 3.2, 4.2**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project already has `fast-check` and `@fast-check/vitest` installed
- Vitest is configured with jsdom environment, suitable for DOM-related tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "3.2"] },
    { "id": 2, "tasks": ["1.3", "4.1"] },
    { "id": 3, "tasks": ["1.4", "1.5", "4.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
