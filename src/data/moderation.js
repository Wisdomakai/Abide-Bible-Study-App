// Basic objectionable-content filter for anything other members can see:
// group posts, group names and display names. App Store guideline 1.2 asks
// apps with user-generated content to filter objectionable material, not only
// to let people report it afterwards. Reports and blocks remain the main tool;
// this catches the obvious cases before they are posted.

// Whole words only, so ordinary words that merely contain these letters
// ("class", "Scunthorpe", "assess") are not caught. Variants with repeated or
// swapped letters are matched by the normaliser below.
const BLOCKED = [
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bullshit', 'bitch', 'asshole',
  'cunt', 'pussy', 'slut', 'porn', 'porno',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic', 'tranny',
  'kys',
];
// Deliberately absent: words the KJV itself uses ("whore", "bastard", "cock",
// "ass") and words someone may need in a sincere prayer request ("rape",
// "abuse", "suicide") — those are left to reporting and human review.

// Undo common disguises: leetspeak, accents, repeated letters ("fuuuck") and
// separators inside words ("f.u.c.k").
function normalise(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't')
    .replace(/(\w)[.\-_*]+(?=\w)/g, '$1')
    .replace(/(\w)\1{2,}/g, '$1$1');
}

const words = (text) => normalise(text).split(/[^a-z]+/).filter(Boolean);
const collapse = (word) => word.replace(/(\w)\1+/g, '$1');
const BLOCKED_SET = new Set(BLOCKED.flatMap((word) => [word, collapse(word)]));

export function containsObjectionable(text) {
  const list = words(text);
  if (list.some((word) => BLOCKED_SET.has(word) || BLOCKED_SET.has(collapse(word)))) return true;
  // Phrases that are only harmful together.
  const joined = list.join(' ');
  return /\bkill (?:your ?self|urself)\b/.test(joined);
}

export const OBJECTIONABLE_MESSAGE = 'This contains language that isn’t allowed in Ardent groups. Please edit it and try again — see the Community Guidelines.';

// Error the screens can show as-is (they check `userFacing`).
export function objectionableError() {
  const error = new Error(OBJECTIONABLE_MESSAGE);
  error.userFacing = true;
  return error;
}
