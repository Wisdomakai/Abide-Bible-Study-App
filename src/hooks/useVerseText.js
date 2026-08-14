import { useState, useEffect } from 'react';
import { textFor } from '../data/verses';
import { fetchVerseText } from '../data/bibleApi';

// Shows the bundled text immediately (instant + offline-safe), then upgrades to
// the live API text if/when it arrives.
//
// Only the KJV is bundled, so for any other translation there is nothing to
// show until the fetch lands, and a failed fetch falls back to KJV wording.
// `shownTranslation` reports what the returned text actually is, so the caller
// can label it honestly rather than assuming it got what it asked for.
export default function useVerseText(verse, translation) {
  const bundled = textFor(verse, translation);
  const [state, setState] = useState({
    text: bundled,
    source: bundled ? 'bundled' : 'loading',
    shownTranslation: bundled ? translation : null,
  });

  useEffect(() => {
    let alive = true;
    setState({
      text: bundled,
      source: bundled ? 'bundled' : 'loading',
      shownTranslation: bundled ? translation : null,
    });
    fetchVerseText(verse.ref, translation)
      .then((live) => {
        if (!alive) return;
        if (live) {
          setState({ text: live, source: 'api', shownTranslation: translation });
        } else if (!bundled) {
          // Nothing bundled for this translation — show KJV and say so.
          setState({ text: textFor(verse, 'KJV'), source: 'fallback', shownTranslation: 'KJV' });
        }
      })
      .catch(() => {
        if (alive && !bundled) {
          setState({ text: textFor(verse, 'KJV'), source: 'fallback', shownTranslation: 'KJV' });
        }
      });
    return () => { alive = false; };
  }, [verse.ref, translation, bundled]);

  return state;
}
