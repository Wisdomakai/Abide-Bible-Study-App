import { useState, useEffect } from 'react';
import { textFor } from '../data/verses';
import { fetchVerseText } from '../data/bibleApi';

// Shows the bundled text immediately (instant + offline-safe), then upgrades to
// the live API text if/when it arrives. Falls back to bundled on any failure.
export default function useVerseText(verse, translation) {
  const bundled = textFor(verse, translation);
  const [text, setText] = useState(bundled);
  const [source, setSource] = useState('bundled');

  useEffect(() => {
    let alive = true;
    setText(bundled);
    setSource('bundled');
    fetchVerseText(verse.ref, translation)
      .then((live) => {
        if (alive && live) { setText(live); setSource('api'); }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [verse.ref, translation, bundled]);

  return { text, source };
}
