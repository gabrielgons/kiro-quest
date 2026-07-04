import type { BadgeDesign, LearningStage } from './types';

/**
 * Visual design configuration for every Kiro Quest learning stage.
 *
 * Each of the 18 {@link LearningStage} values maps to a {@link BadgeDesign}
 * describing the emoji icon, gradient colors, and Portuguese display name
 * used when rendering its completion badge.
 *
 * Invariants (validated by the badge design property tests):
 * - Every LearningStage has exactly one entry.
 * - `icon` is a non-empty emoji/unicode string.
 * - `primaryColor` and `secondaryColor` are valid 6-digit hex color codes.
 * - `displayName` is non-empty Portuguese text not exceeding 30 characters.
 */
export const BADGE_DESIGNS: Record<LearningStage, BadgeDesign> = {
  'kiro-basics': {
    stage: 'kiro-basics',
    icon: '🚀',
    primaryColor: '#3b82f6',
    secondaryColor: '#1d4ed8',
    displayName: 'Fundamentos do Kiro',
  },
  specs: {
    stage: 'specs',
    icon: '📋',
    primaryColor: '#8b5cf6',
    secondaryColor: '#6d28d9',
    displayName: 'Specs',
  },
  'feature-specs': {
    stage: 'feature-specs',
    icon: '✨',
    primaryColor: '#06b6d4',
    secondaryColor: '#0891b2',
    displayName: 'Feature Specs',
  },
  'bugfix-specs': {
    stage: 'bugfix-specs',
    icon: '🐛',
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    displayName: 'Bugfix Specs',
  },
  steering: {
    stage: 'steering',
    icon: '🧭',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
    displayName: 'Steering',
  },
  hooks: {
    stage: 'hooks',
    icon: '🪝',
    primaryColor: '#ec4899',
    secondaryColor: '#db2777',
    displayName: 'Hooks',
  },
  mcp: {
    stage: 'mcp',
    icon: '🔌',
    primaryColor: '#6366f1',
    secondaryColor: '#4f46e5',
    displayName: 'MCP',
  },
  powers: {
    stage: 'powers',
    icon: '⚡',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
    displayName: 'Powers',
  },
  skills: {
    stage: 'skills',
    icon: '🎯',
    primaryColor: '#14b8a6',
    secondaryColor: '#0d9488',
    displayName: 'Skills',
  },
  'real-world-workflows': {
    stage: 'real-world-workflows',
    icon: '🌍',
    primaryColor: '#84cc16',
    secondaryColor: '#65a30d',
    displayName: 'Fluxos Reais',
  },
  'enterprise-scenarios': {
    stage: 'enterprise-scenarios',
    icon: '🏢',
    primaryColor: '#0ea5e9',
    secondaryColor: '#0284c7',
    displayName: 'Cenários Enterprise',
  },
  'kiro-cli': {
    stage: 'kiro-cli',
    icon: '💻',
    primaryColor: '#a855f7',
    secondaryColor: '#9333ea',
    displayName: 'Kiro CLI',
  },
  'kiro-web': {
    stage: 'kiro-web',
    icon: '🌐',
    primaryColor: '#22d3ee',
    secondaryColor: '#06b6d4',
    displayName: 'Kiro Web',
  },
  'chat-modes': {
    stage: 'chat-modes',
    icon: '💬',
    primaryColor: '#7c3aed',
    secondaryColor: '#5b21b6',
    displayName: 'Chat & Modos',
  },
  'custom-agents': {
    stage: 'custom-agents',
    icon: '🤖',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    displayName: 'Agentes Personalizados',
  },
  'editor-tools': {
    stage: 'editor-tools',
    icon: '🛠️',
    primaryColor: '#d97706',
    secondaryColor: '#b45309',
    displayName: 'Editor & Ferramentas',
  },
  'automations': {
    stage: 'automations',
    icon: '⚙️',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    displayName: 'Automações na Nuvem',
  },
  'privacy-security': {
    stage: 'privacy-security',
    icon: '🔒',
    primaryColor: '#dc2626',
    secondaryColor: '#b91c1c',
    displayName: 'Privacidade & Segurança',
  },
};
