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

// Verse highlighter pens. `bg` tints the verse in the reader, `bar` marks the
// entry in the Journal — both muted enough to keep scripture readable.
export const highlightPens = [
  { key: 'gold', label: 'Gold', bg: '#FAE8C0', bar: '#D3A03A' },
  { key: 'rose', label: 'Rose', bg: '#F9DCE1', bar: '#CD647B' },
  { key: 'sky', label: 'Sky', bg: '#D9E7F8', bar: '#4F87C4' },
  { key: 'leaf', label: 'Leaf', bg: '#DCEDE0', bar: '#569A6C' },
  { key: 'violet', label: 'Violet', bg: '#E4DEF7', bar: '#7A6BC4' },
];

export const penFor = (key) => highlightPens.find((p) => p.key === key) || highlightPens[0];

export const fonts = {
  serif: 'Georgia, Cambria, serif',
  serifBold: 'Georgia, Cambria, serif',
  serifItalic: 'Georgia, Cambria, serif',
  body: 'Inter, ui-sans-serif, system-ui, sans-serif',
  bodyMedium: 'Inter, ui-sans-serif, system-ui, sans-serif',
  bodySemi: 'Inter, ui-sans-serif, system-ui, sans-serif',
  bodyBold: 'Inter, ui-sans-serif, system-ui, sans-serif',
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
