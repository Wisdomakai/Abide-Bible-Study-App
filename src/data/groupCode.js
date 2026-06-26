// Friendly, shareable group codes like "grace-274" — easy to read out loud.
const WORDS = [
  'grace', 'faith', 'hope', 'light', 'cedar', 'olive', 'psalm', 'manna',
  'dove', 'vine', 'shalom', 'gilead', 'zion', 'haven', 'ember', 'reed',
];

export function generateCode() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${word}-${num}`;
}

export function normalizeCode(code) {
  return (code || '').trim().toLowerCase().replace(/\s+/g, '-');
}
