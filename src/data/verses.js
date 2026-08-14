// Every offered translation is public domain. Copyrighted texts (NIV, NLT, ESV…)
// may only be added through an approved provider with documented terms.
export const TRANSLATIONS = ['KJV', 'WEB', 'ASV', 'BBE'];

export const TRANSLATION_NAMES = {
  KJV: 'King James Version',
  WEB: 'World English Bible',
  ASV: 'American Standard Version (1901)',
  BBE: 'Bible in Basic English',
};

export const VERSES = [
  { ref: 'John 3:16', kjv: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { ref: 'Jeremiah 29:11', kjv: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
  { ref: 'Proverbs 3:5-6', kjv: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.' },
  { ref: 'Philippians 4:6-7', kjv: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.' },
  { ref: 'Philippians 4:13', kjv: 'I can do all things through Christ which strengtheneth me.' },
  { ref: 'Psalm 23:1', kjv: 'The LORD is my shepherd; I shall not want.' },
  { ref: 'Isaiah 40:31', kjv: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.' },
  { ref: 'Romans 8:28', kjv: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { ref: 'Joshua 1:9', kjv: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
  { ref: 'Matthew 6:33', kjv: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
  { ref: 'Psalm 46:10', kjv: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.' },
  { ref: 'John 14:27', kjv: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.' },
  { ref: 'Psalm 119:105', kjv: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { ref: 'Matthew 11:28', kjv: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { ref: '1 Peter 5:7', kjv: 'Casting all your care upon him; for he careth for you.' },
  { ref: 'Isaiah 41:10', kjv: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
  { ref: 'Romans 12:2', kjv: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.' },
  { ref: 'Galatians 5:22-23', kjv: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law.' },
  { ref: 'Ephesians 2:8-9', kjv: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.' },
  { ref: 'Hebrews 11:1', kjv: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
  { ref: 'James 1:5', kjv: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.' },
  { ref: 'Psalm 27:1', kjv: 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?' },
  { ref: 'Micah 6:8', kjv: 'He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?' },
  { ref: 'Colossians 3:23', kjv: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.' },
  { ref: 'Psalm 37:4', kjv: 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.' },
  { ref: 'Psalm 121:1-2', kjv: 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.' },
  { ref: 'Psalm 34:8', kjv: 'O taste and see that the LORD is good: blessed is the man that trusteth in him.' },
  { ref: 'Romans 15:13', kjv: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.' },
];

export function getVerseForDate(date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return VERSES[((dayNumber % VERSES.length) + VERSES.length) % VERSES.length];
}

// Only the KJV is bundled. Returning it for another translation would print
// KJV wording under that translation's name, so callers get null instead and
// show the live text once it loads.
export function textFor(verse, translation = 'KJV') {
  return translation === 'KJV' ? verse.kjv : null;
}
