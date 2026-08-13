// Short, memorable Bible-themed invite codes: one word plus two digits.
const WORDS = [
  'ABIDE', 'ANOINT', 'ARK', 'BELIEVE', 'BLESS', 'BREAD', 'CROWN', 'DAWN',
  'EDEN', 'FAITH', 'FLOURISH', 'GIFT', 'GLORY', 'GRACE', 'HARVEST', 'HEART',
  'HEAVEN', 'HOPE', 'JOY', 'KINGDOM', 'LAMB', 'LIGHT', 'LILY', 'LOVE',
  'MANNA', 'MERCY', 'OLIVE', 'PEACE', 'PRAISE', 'PRAYER', 'PROMISE', 'PSALM',
  'REJOICE', 'REST', 'RIVER', 'ROCK', 'SHEPHERD', 'SHIELD', 'SPIRIT', 'SPRING',
  'STAR', 'TEMPLE', 'THANKS', 'TRUTH', 'VINE', 'WISDOM', 'WORSHIP', 'ZION',
];

function randomIndex(size) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % size;
}

export function generateCode() {
  const number = String(10 + randomIndex(90));
  return `${WORDS[randomIndex(WORDS.length)]}${number}`;
}

export function normalizeCode(code) {
  return (code || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
