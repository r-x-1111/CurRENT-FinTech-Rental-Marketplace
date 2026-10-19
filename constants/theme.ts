export const colors = {
  navy: '#0B1F3A',
  brandNavy: '#0B1F3A',
  mediumBlue: '#163B70',
  blue: '#2463FF',
  brandBlue: '#2463FF',
  linkBlue: '#2463FF',
  softBlue: '#EAF3FF',
  paleBlue: '#EEF4FF',
  offWhite: '#F7F8FA',
  lightGrey: '#F1F5F9',
  white: '#FFFFFF',
  green: '#16A34A',
  text: '#0B1F3A',
  slate: '#405574',
  muted: '#405574',
  border: '#D9E3EF',
  danger: '#DC2626',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22
};

// DM Sans is loaded as a web font (see app/_layout.tsx); native platforms fall back to the
// system sans-serif since no local font binary ships in this repo. Keep these as the only
// fontFamily tokens referenced across the restyled screens/components.
export const fonts = {
  regular: 'DM Sans, -apple-system, Roboto, sans-serif',
  medium: 'DM Sans, -apple-system, Roboto, sans-serif',
  bold: 'DM Sans, -apple-system, Roboto, sans-serif',
};

export const type = {
  xs12: 12,
  sm14: 14,
  md16: 16,
  lg20: 20,
  xl28: 28,
  xxl40: 40,
};

// Soft, navy-tinted card shadow matching the Canva reference (never pure black).
export const shadow = {
  card: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
};
