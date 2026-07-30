import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import MobileActionsMenu from '../MobileActionsMenu.vue';

const mockState = vi.hoisted(() => ({
  isConfigured: false,
  isAuthenticated: false,
  isLoading: false,
  displayName: '',
  avatarUrl: null as string | null,
  locale: 'pt-BR',
  isDark: false,
}));

const mockActions = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  setLocale: vi.fn(),
  toggleTheme: vi.fn(),
}));

vi.mock('@/composables/useAuth', async () => {
  const { computed } = await import('vue');
  return {
    useAuth: () => ({
      isConfigured: computed(() => mockState.isConfigured),
      isAuthenticated: computed(() => mockState.isAuthenticated),
      isLoading: computed(() => mockState.isLoading),
      displayName: computed(() => mockState.displayName),
      avatarUrl: computed(() => mockState.avatarUrl),
      login: mockActions.login,
      logout: mockActions.logout,
    }),
  };
});

vi.mock('@/composables/useTheme', async () => {
  const { computed } = await import('vue');
  return {
    useTheme: () => ({
      isDark: computed(() => mockState.isDark),
      toggleTheme: mockActions.toggleTheme,
    }),
  };
});

vi.mock('@/i18n/useLocale', async () => {
  const { computed } = await import('vue');
  const labels: Record<string, string> = {
    'menu.open': 'Open account and preferences',
    'menu.close': 'Close account and preferences',
    'menu.account': 'Account',
    'menu.preferences': 'Preferences',
    'menu.accountAndPreferences': 'Account and preferences',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'login.button': 'Sign in',
    'user.profile': 'Profile',
    'user.logout': 'Sign out',
  };

  return {
    useLocale: () => ({
      locale: computed(() => mockState.locale),
      setLocale: mockActions.setLocale,
      t: (key: string) => labels[key] ?? key,
    }),
  };
});

function mountMenu(): VueWrapper {
  return mount(MobileActionsMenu, {
    attachTo: document.body,
    global: {
      stubs: {
        teleport: true,
        transition: false,
        RouterLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>',
        },
      },
    },
  });
}

describe('MobileActionsMenu', () => {
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    mockState.isConfigured = false;
    mockState.isAuthenticated = false;
    mockState.isLoading = false;
    mockState.displayName = '';
    mockState.avatarUrl = null;
    mockState.locale = 'pt-BR';
    mockState.isDark = false;
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.style.overflow = '';
  });

  it('opens as an accessible modal sheet, locks scrolling, and closes with Escape', async () => {
    wrapper = mountMenu();

    const trigger = wrapper.get('.mobile-actions-menu__trigger');
    expect(trigger.attributes('aria-expanded')).toBe('false');

    await trigger.trigger('click');
    await nextTick();

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(wrapper.get('.mobile-actions-menu__close').element);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger.element);
  });

  it('offers explicit locale choices and theme control with touch-sized semantics', async () => {
    wrapper = mountMenu();
    await wrapper.get('.mobile-actions-menu__trigger').trigger('click');

    const localeButtons = wrapper.findAll('.mobile-actions-menu__segmented button');
    expect(localeButtons).toHaveLength(2);
    expect(localeButtons[0]!.attributes('aria-pressed')).toBe('true');
    expect(localeButtons[1]!.attributes('aria-pressed')).toBe('false');

    await localeButtons[1]!.trigger('click');
    expect(mockActions.setLocale).toHaveBeenCalledWith('en');

    await wrapper.get('.mobile-actions-menu__theme').trigger('click');
    expect(mockActions.toggleTheme).toHaveBeenCalledOnce();
  });

  it('uses the authenticated avatar as the trigger and exposes account actions', async () => {
    mockState.isAuthenticated = true;
    mockState.displayName = 'Ada Lovelace';
    mockState.avatarUrl = 'https://example.com/ada.jpg';
    wrapper = mountMenu();

    expect(wrapper.get('.mobile-actions-menu__avatar').attributes('alt')).toBe('Ada Lovelace');

    await wrapper.get('.mobile-actions-menu__trigger').trigger('click');

    expect(wrapper.text()).toContain('Ada Lovelace');
    expect(wrapper.get('a[href="/profile"]').text()).toContain('Profile');

    await wrapper.get('.mobile-actions-menu__logout').trigger('click');
    expect(mockActions.logout).toHaveBeenCalledOnce();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('shows sign-in inside the preferences sheet when authentication is available', async () => {
    mockState.isConfigured = true;
    wrapper = mountMenu();

    await wrapper.get('.mobile-actions-menu__trigger').trigger('click');
    await wrapper.get('.mobile-actions-menu__primary').trigger('click');

    expect(mockActions.login).toHaveBeenCalledOnce();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });
});
