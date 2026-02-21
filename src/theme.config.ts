/**
 * Theme configuration — Laundry Fresh & Professional (same as partners).
 * Primary: soft sage (#10B981), navy (#0F172A), sky (#64748B).
 */
export const themeConfig = {
  colors: {
    sage: { DEFAULT: '#10B981', 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669' },
    navy: { DEFAULT: '#0F172A', 800: '#1E293B', 900: '#0F172A' },
    sky: '#64748B',
  },
  radius: { card: '0.75rem', panel: '1rem' },
  shadow: {
    card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
    'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  },
} as const
