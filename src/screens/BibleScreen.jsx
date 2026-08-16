import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../components/Icon';
import { useApp } from '../data/AppContext';
import { BOOKS } from '../data/bibleBooks';
import { fetchChapter } from '../data/bibleApi';
import { TRANSLATIONS } from '../data/verses';
import { loadJSON, saveJSON, KEYS, verseKey } from '../data/storage';
import { colors, fonts, spacing, radius, shadow, highlightPens, penFor } from '../theme';

// "3", "3-5" or "3, 7, 9" — used for the toolbar label and the note title.
function refRange(verses) {
  if (verses.length === 0) return '';
  const contiguous = verses.every((v, i) => i === 0 || v === verses[i - 1] + 1);
  if (contiguous && verses.length > 1) return `${verses[0]}-${verses[verses.length - 1]}`;
  return verses.join(', ');
}

export default function BibleScreen({ navigation }) {
  const { translation, setTranslation, highlights, highlightVerses, removeHighlights } = useApp();
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pickerBook, setPickerBook] = useState(null); // book object whose chapters are shown
  const [picking, setPicking] = useState(false);
  const [pickerChapter, setPickerChapter] = useState(null); // chapter chosen inside the picker
  const [pickerVerses, setPickerVerses] = useState([]);     // its verse numbers, once fetched
  const [pickerLoading, setPickerLoading] = useState(false);
  const [jumpTo, setJumpTo] = useState(null);               // verse to scroll to after opening
  const [flash, setFlash] = useState(null);                 // briefly marks the verse jumped to
  const [selected, setSelected] = useState([]); // verse numbers awaiting a colour
  const scrollRef = useRef(null);
  const requestId = useRef(0);

  const bookInfo = BOOKS.find((b) => b.name === book) || BOOKS[0];

  const toggleVerse = (n) =>
    setSelected((prev) => (prev.includes(n) ? prev.filter((v) => v !== n) : [...prev, n].sort((a, b) => a - b)));

  const selectedKeys = selected.map((n) => verseKey(book, chapter, n));
  const anyHighlighted = selectedKeys.some((k) => highlights[k]);
  const selectedVerses = () =>
    selected.map((n) => (data?.verses || []).find((v) => v.verse === n)).filter(Boolean);

  const applyPen = (penKey) => {
    highlightVerses(
      selectedVerses().map((v) => ({ book, chapter, verse: v.verse, text: v.text, translation })),
      penKey
    );
    setSelected([]);
  };

  const clearPen = () => { removeHighlights(selectedKeys); setSelected([]); };

  // Send the passage to a new journal note, marking it so it stays findable.
  const saveToJournal = () => {
    const chosen = selectedVerses();
    if (!chosen.length) return;
    const ref = `${book} ${chapter}:${refRange(selected)}`;
    const quoted = chosen.map((v) => `${v.verse} ${v.text}`).join('\n');
    if (!anyHighlighted) applyPen(highlightPens[0].key);
    else setSelected([]);
    navigation.navigate('NoteEditor', {
      prefill: {
        title: ref,
        body: `${quoted}\n— ${ref} (${data?.translationName || translation})\n\n`,
        tag: book,
        verseRef: ref,
      },
    });
  };

  // Restore last position once.
  useEffect(() => {
    loadJSON(KEYS.biblePos, null).then((p) => { if (p?.book) { setBook(p.book); setChapter(p.chapter || 1); } });
  }, []);

  const load = useCallback(async () => {
    // Drop the previous chapter first. Keeping it meant a pending verse jump
    // fired against the old text and scrolled to the wrong place before the new
    // chapter had loaded.
    setLoading(true); setError(false); setData(null);
    const id = ++requestId.current;
    try {
      const d = await fetchChapter(book, chapter, translation);
      if (id !== requestId.current) return;
      setData(d);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (e) { if (id === requestId.current) { setError(true); setData(null); } }
    finally { if (id === requestId.current) setLoading(false); }
  }, [book, chapter, translation]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { saveJSON(KEYS.biblePos, { book, chapter }); setSelected([]); }, [book, chapter]);

  // Verses render inline inside one flowing paragraph, so there is no per-verse
  // layout to measure. Each carries a data-verse attribute instead, which the
  // DOM can scroll to directly — the app runs on react-native-web everywhere,
  // web and Android alike.
  useEffect(() => {
    if (!jumpTo || loading || !data) return undefined;
    const timer = setTimeout(() => {
      const node = typeof document !== 'undefined' && document.querySelector(`[data-verse="${jumpTo}"]`);
      // Positioned instantly rather than smooth-scrolled: opening at a verse
      // should land there, and smooth behaviour silently does nothing when the
      // view is not actively rendering.
      if (node?.scrollIntoView) node.scrollIntoView({ block: 'center' });
      setFlash(jumpTo);
      setJumpTo(null);
    }, 80);
    return () => clearTimeout(timer);
  }, [jumpTo, loading, data]);

  useEffect(() => {
    if (flash == null) return undefined;
    const timer = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(timer);
  }, [flash]);

  const go = (delta) => {
    const idx = BOOKS.findIndex((b) => b.name === book);
    let c = chapter + delta;
    if (c < 1) { if (idx > 0) { setBook(BOOKS[idx - 1].name); setChapter(BOOKS[idx - 1].chapters); } return; }
    if (c > bookInfo.chapters) { if (idx < BOOKS.length - 1) { setBook(BOOKS[idx + 1].name); setChapter(1); } return; }
    setChapter(c);
  };

  const openBook = (b) => { setPickerBook(b); setPickerChapter(null); setPickerVerses([]); };

  // Picking a chapter now lists its verses rather than opening straight away,
  // so a passage can be opened at the verse you actually want.
  const chooseChapter = async (c) => {
    setPickerChapter(c);
    setPickerLoading(true);
    try {
      const d = await fetchChapter(pickerBook.name, c, translation);
      setPickerVerses((d.verses || []).map((v) => v.verse));
    } catch (_) {
      setPickerVerses([]); // offline or failed — "Whole chapter" still works
    } finally {
      setPickerLoading(false);
    }
  };

  const openAt = (verse) => {
    setBook(pickerBook.name);
    setChapter(pickerChapter);
    setPicking(false);
    setPickerBook(null);
    setPickerChapter(null);
    setPickerVerses([]);
    setJumpTo(verse);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => { setPickerBook(bookInfo); setPicking(true); }} style={styles.refBtn}>
          <Text style={styles.refText}>{book} {chapter}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </Pressable>
        <View style={styles.trans}>
          {TRANSLATIONS.map((t) => (
            <Pressable key={t} onPress={() => setTranslation(t)} style={[styles.tBtn, translation === t && styles.tBtnOn]}>
              <Text style={[styles.tText, translation === t && styles.tTextOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>Couldn’t load this chapter.</Text>
          <Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.reader}>
          <Text style={styles.chapterTitle}>{book} {chapter}</Text>
          <Text style={styles.sourceNote}>{data?.translationName}</Text>
          <Text style={styles.hint}>Tap a verse to highlight it or save it to your journal.</Text>
          <Text style={styles.passage}>
            {(data?.verses || []).map((v) => {
              const mark = highlights[verseKey(book, chapter, v.verse)];
              const isSelected = selected.includes(v.verse);
              return (
                <Text
                  key={v.verse}
                  onPress={() => toggleVerse(v.verse)}
                  dataSet={{ verse: v.verse }}
                  style={[
                    mark && { backgroundColor: penFor(mark.color).bg },
                    flash === v.verse && styles.vFlash,
                    isSelected && styles.vSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Verse ${v.verse}${mark ? ', highlighted' : ''}`}
                >
                  <Text style={styles.vnum}>{v.verse} </Text>{v.text}{' '}
                </Text>
              );
            })}
          </Text>
        </ScrollView>
      )}

      {selected.length > 0 && (
        <View style={styles.tools}>
          <View style={styles.toolsTop}>
            <Text style={styles.toolsRef}>{book} {chapter}:{refRange(selected)}</Text>
            <Pressable onPress={() => setSelected([])} hitSlop={8} accessibilityLabel="Clear selection">
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.pens}>
            {highlightPens.map((pen) => (
              <Pressable
                key={pen.key}
                onPress={() => applyPen(pen.key)}
                style={({ pressed }) => [styles.pen, { backgroundColor: pen.bg, borderColor: pen.bar }, pressed && { transform: [{ scale: 0.92 }] }]}
                accessibilityRole="button"
                accessibilityLabel={`Highlight ${pen.label}`}
              />
            ))}
            {anyHighlighted ? (
              <Pressable onPress={clearPen} style={({ pressed }) => [styles.pen, styles.penClear, pressed && { opacity: 0.6 }]} accessibilityLabel="Remove highlight">
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable onPress={saveToJournal} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}>
            <Ionicons name="create-outline" size={18} color={colors.white} />
            <Text style={styles.saveText}>Save to journal</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.nav}>
        <Pressable onPress={() => go(-1)} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} /><Text style={styles.navText}>Prev</Text>
        </Pressable>
        <Pressable onPress={() => go(1)} style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.navText}>Next</Text><Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Book / chapter picker */}
      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.pickerHead}>
            <Text style={styles.pickerTitle}>
              {!pickerBook ? 'Choose a book' : pickerChapter ? `${pickerBook.name} ${pickerChapter}` : pickerBook.name}
            </Text>
            <Pressable onPress={() => setPicking(false)} hitSlop={8}><Ionicons name="close" size={24} color={colors.muted} /></Pressable>
          </View>
          {!pickerBook || pickerChapter ? null : (
            <View style={styles.chapWrap}>
              <Pressable onPress={() => setPickerBook(null)} style={styles.backRow}>
                <Ionicons name="chevron-back" size={18} color={colors.primary} /><Text style={styles.backText}>All books</Text>
              </Pressable>
              <Text style={styles.pickerHint}>Choose a chapter</Text>
              <ScrollView contentContainerStyle={styles.chapGrid}>
                {Array.from({ length: pickerBook.chapters }, (_, i) => i + 1).map((c) => (
                  <Pressable key={c} onPress={() => chooseChapter(c)} style={styles.chapCell}>
                    <Text style={styles.chapNum}>{c}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {pickerBook && pickerChapter ? (
            <View style={styles.chapWrap}>
              <Pressable onPress={() => { setPickerChapter(null); setPickerVerses([]); }} style={styles.backRow}>
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
                <Text style={styles.backText}>Chapters</Text>
              </Pressable>
              <Pressable onPress={() => openAt(null)} style={({ pressed }) => [styles.wholeChapter, pressed && { opacity: 0.85 }]}>
                <Ionicons name="book-outline" size={17} color={colors.white} />
                <Text style={styles.wholeChapterText}>Read the whole chapter</Text>
              </Pressable>
              <Text style={styles.pickerHint}>Or open at a verse</Text>
              {pickerLoading ? (
                <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
              ) : (
                <ScrollView contentContainerStyle={styles.chapGrid}>
                  {pickerVerses.map((v) => (
                    <Pressable key={v} onPress={() => openAt(v)} style={styles.chapCell}>
                      <Text style={styles.chapNum}>{v}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
          {pickerBook ? null : (
            <FlatList
              data={BOOKS}
              keyExtractor={(b) => b.name}
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
              renderItem={({ item, index }) => (
                <React.Fragment key={item.name}>
                  {(index === 0 || BOOKS[index - 1].t !== item.t) && (
                    <Text style={styles.section}>{item.t === 'OT' ? 'Old Testament' : 'New Testament'}</Text>
                  )}
                  <Pressable onPress={() => openBook(item)} style={({ pressed }) => [styles.bookRow, pressed && { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={styles.bookName}>{item.name}</Text>
                    <Text style={styles.bookChaps}>{item.chapters} ch</Text>
                  </Pressable>
                </React.Fragment>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  refBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  refText: { fontFamily: fonts.serifBold, fontSize: 26, color: colors.text },
  trans: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 3, marginTop: spacing.md, alignSelf: 'flex-start' },
  tBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  tBtnOn: { backgroundColor: colors.primary },
  tText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted },
  tTextOn: { color: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  retry: { paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
  retryText: { fontFamily: fonts.bodySemi, color: colors.white },
  reader: { padding: spacing.xl, paddingBottom: 100 },
  chapterTitle: { fontFamily: fonts.serifBold, fontSize: 22, color: colors.text, marginBottom: 4 },
  sourceNote: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginBottom: spacing.lg },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, marginBottom: spacing.md },
  passage: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 31, color: colors.text },
  vnum: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accent },
  vSelected: { textDecorationLine: 'underline', textDecorationColor: colors.primary },
  vFlash: { backgroundColor: colors.primarySoft },
  pickerHint: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: spacing.xl, marginBottom: spacing.sm },
  wholeChapter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.lg, height: 46,
    borderRadius: radius.pill, backgroundColor: colors.primary,
  },
  wholeChapterText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.white },
  tools: {
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.md,
  },
  toolsTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolsRef: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  pens: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pen: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  penClear: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    height: 46, borderRadius: radius.pill, backgroundColor: colors.primary,
  },
  saveText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.white },
  nav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingVertical: 8 },
  navText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primary },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl, paddingBottom: spacing.md },
  pickerTitle: { fontFamily: fonts.serifBold, fontSize: 24, color: colors.text },
  section: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  bookRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: 14 },
  bookName: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.text },
  bookChaps: { fontFamily: fonts.body, fontSize: 13, color: colors.faint },
  chapWrap: { flex: 1 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  backText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.primary },
  chapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.xl },
  chapCell: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  chapNum: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
});
