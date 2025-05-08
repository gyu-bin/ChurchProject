// constants/theme.ts

export const LightTheme = {
  colors: {
    background: '#f9fafb',
    surface: '#ffffff',
    primary: '#2563eb',
    secondary: '#60a5fa',
    text: '#111827',
    subtext: '#6b7280',
    border: '#e5e7eb',
    card: '#ffffff',
    error: '#ef4444',
    placeholder: '#9ca3af',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 20,
    xl: 30,
  },
  font: {
    heading: 24,
    body: 16,
    caption: 13,
  },
};

export const DarkTheme = {
  colors: {
    background: '#1f2937',
    surface: '#374151',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    text: '#f9fafb',
    subtext: '#9ca3af',
    border: '#4b5563',
    card: '#1f2937',
    error: '#f87171',
    placeholder: '#9ca3af',
  },
  spacing: LightTheme.spacing,
  radius: LightTheme.radius,
  font: LightTheme.font,
};
