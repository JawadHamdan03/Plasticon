// ─── Plasticon Mobile Design System ─────────────────────────────────────────
// Industrial-clean aesthetic: dark navy tabs, amber active, blue primary.
// Deliberately different from the web app's indigo/purple sidebar design.

export const colors = {
  // Primary — strong blue (not indigo like the web)
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',

  // Accent — amber: industrial warning, active tab indicator
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentLight: '#FEF3C7',

  // Semantic
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Text
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Surfaces
  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',

  // Borders
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Tab bar (dark industrial feel)
  tabBar: '#0D1321',
  tabActive: '#F59E0B',
  tabInactive: '#4B5563',

  // Role colors — matches web app palette for consistency
  roleWorker: '#6366F1',
  roleEngineer: '#0EA5E9',
  roleAccountant: '#F59E0B',
  roleAdmin: '#7C3AED',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const typography = {
  // Big KPI display number
  kpi: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -1.2,
    color: colors.text,
  },
  h1: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.text,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: colors.text,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text,
  },
  h4: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.text,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.textMuted,
  },
  // Section label — ALL CAPS, spaced
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: colors.textMuted,
  },
};

export function roleColor(role?: string): string {
  switch ((role ?? '').toUpperCase()) {
    case 'WORKER':     return colors.roleWorker;
    case 'ENGINEER':   return colors.roleEngineer;
    case 'ACCOUNTANT': return colors.roleAccountant;
    case 'ADMIN':      return colors.roleAdmin;
    default:           return colors.primary;
  }
}
