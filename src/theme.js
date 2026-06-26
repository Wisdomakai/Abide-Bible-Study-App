// Calm, reflective design system for the Bible Study Journal.
// Warm cream canvas + deep indigo + soft gold accent. Lora serif for scripture.
export const colors = {
  bg: '#FBF8F2',          // warm cream canvas
  surface: '#FFFFFF',
  surfaceAlt: '#F3EFE6',  // subtle tinted surface
  primary: '#4B3F9E',     // deep indigo
  primaryDark: '#36306E',
  primarySoft: '#ECE9F8', // indigo tint for chips/backgrounds
  accent: '#C98A3C',      // warm gold
  accentSoft: '#F6ECDB',
  answered: '#4F9D69',    // answered-prayer green
  answeredSoft: '#E5F1E9',
  text: '#2B2540',        // near-black plum
  muted: '#6F6A82',       // secondary text
  faint: '#A8A2B8',       // tertiary / placeholders
  border: '#ECE5D8',      // warm hairline
  danger: '#C0492F',
  white: '#FFFFFF',
};

export const fonts = {
  // Serif for scripture & titles (loaded in App.js)
  serif: 'Lora_500Medium',
  serifBold: 'Lora_600SemiBold',
  serifItalic: 'Lora_400Regular_Italic',
  // Sans for UI & body
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const shadow = {
  card: {
    shadowColor: '#3B2F6E',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#3B2F6E',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};
