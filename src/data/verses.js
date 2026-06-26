// Verse of the Day in three translations: KJV (public domain), NIV, NLT.
// The verse is chosen deterministically from the date, so everyone in the group
// sees the same passage on the same day. The reader picks the translation.
//
// Attribution (shown in Settings → Bible translations):
//  • KJV — King James Version, public domain.
//  • NIV — New International Version®, © 1973–2011 Biblica, Inc. Used by permission.
//  • NLT — New Living Translation, © 1996–2015 Tyndale House Foundation. Used by permission.
export const TRANSLATIONS = ['KJV', 'NIV', 'NLT'];

export const VERSES = [
  {
    ref: 'John 3:16',
    kjv: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    niv: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
    nlt: 'For this is how God loved the world: He gave his one and only Son, so that everyone who believes in him will not perish but have eternal life.',
  },
  {
    ref: 'Jeremiah 29:11',
    kjv: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
    niv: 'For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.',
    nlt: 'For I know the plans I have for you, says the LORD. They are plans for good and not for disaster, to give you a future and a hope.',
  },
  {
    ref: 'Proverbs 3:5-6',
    kjv: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
    niv: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.',
    nlt: 'Trust in the LORD with all your heart; do not depend on your own understanding. Seek his will in all you do, and he will show you which path to take.',
  },
  {
    ref: 'Philippians 4:6-7',
    kjv: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.',
    niv: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.',
    nlt: 'Don’t worry about anything; instead, pray about everything. Tell God what you need, and thank him for all he has done.',
  },
  {
    ref: 'Philippians 4:13',
    kjv: 'I can do all things through Christ which strengtheneth me.',
    niv: 'I can do all this through him who gives me strength.',
    nlt: 'For I can do everything through Christ, who gives me strength.',
  },
  {
    ref: 'Psalm 23:1',
    kjv: 'The LORD is my shepherd; I shall not want.',
    niv: 'The LORD is my shepherd, I lack nothing.',
    nlt: 'The LORD is my shepherd; I have all that I need.',
  },
  {
    ref: 'Isaiah 40:31',
    kjv: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
    niv: 'but those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.',
    nlt: 'But those who trust in the LORD will find new strength. They will soar high on wings like eagles. They will run and not grow weary. They will walk and not faint.',
  },
  {
    ref: 'Romans 8:28',
    kjv: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
    niv: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
    nlt: 'And we know that God causes everything to work together for the good of those who love God and are called according to his purpose for them.',
  },
  {
    ref: 'Joshua 1:9',
    kjv: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
    niv: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
    nlt: 'This is my command—be strong and courageous! Do not be afraid or discouraged. For the LORD your God is with you wherever you go.',
  },
  {
    ref: 'Matthew 6:33',
    kjv: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.',
    niv: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.',
    nlt: 'Seek the Kingdom of God above all else, and live righteously, and he will give you everything you need.',
  },
  {
    ref: 'Psalm 46:10',
    kjv: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.',
    niv: 'Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.',
    nlt: 'Be still, and know that I am God! I will be honored by every nation. I will be honored throughout the world.',
  },
  {
    ref: 'John 14:27',
    kjv: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.',
    niv: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.',
    nlt: 'I am leaving you with a gift—peace of mind and heart. And the peace I give is a gift the world cannot give. So don’t be troubled or afraid.',
  },
  {
    ref: '2 Corinthians 12:9',
    kjv: 'And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness.',
    niv: 'But he said to me, “My grace is sufficient for you, for my power is made perfect in weakness.”',
    nlt: 'Each time he said, “My grace is all you need. My power works best in weakness.”',
  },
  {
    ref: 'Psalm 119:105',
    kjv: 'Thy word is a lamp unto my feet, and a light unto my path.',
    niv: 'Your word is a lamp for my feet, a light on my path.',
    nlt: 'Your word is a lamp to guide my feet and a light for my path.',
  },
  {
    ref: 'Matthew 11:28',
    kjv: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
    niv: 'Come to me, all you who are weary and burdened, and I will give you rest.',
    nlt: 'Come to me, all of you who are weary and carry heavy burdens, and I will give you rest.',
  },
  {
    ref: '1 Peter 5:7',
    kjv: 'Casting all your care upon him; for he careth for you.',
    niv: 'Cast all your anxiety on him because he cares for you.',
    nlt: 'Give all your worries and cares to God, for he cares about you.',
  },
  {
    ref: 'Psalm 46:1',
    kjv: 'God is our refuge and strength, a very present help in trouble.',
    niv: 'God is our refuge and strength, an ever-present help in trouble.',
    nlt: 'God is our refuge and strength, always ready to help in times of trouble.',
  },
  {
    ref: 'Isaiah 41:10',
    kjv: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.',
    niv: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.',
    nlt: 'Don’t be afraid, for I am with you. Don’t be discouraged, for I am your God. I will strengthen you and help you. I will hold you up with my victorious right hand.',
  },
  {
    ref: 'Romans 12:2',
    kjv: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.',
    niv: 'Do not conform to the pattern of this world, but be transformed by the renewing of your mind. Then you will be able to test and approve what God’s will is—his good, pleasing and perfect will.',
    nlt: 'Don’t copy the behavior and customs of this world, but let God transform you into a new person by changing the way you think. Then you will learn to know God’s will for you, which is good and pleasing and perfect.',
  },
  {
    ref: 'Galatians 5:22-23',
    kjv: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, meekness, temperance: against such there is no law.',
    niv: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control. Against such things there is no law.',
    nlt: 'But the Holy Spirit produces this kind of fruit in our lives: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control. There is no law against these things!',
  },
  {
    ref: 'Ephesians 2:8-9',
    kjv: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.',
    niv: 'For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God— not by works, so that no one can boast.',
    nlt: 'God saved you by his grace when you believed. And you can’t take credit for this; it is a gift from God. Salvation is not a reward for the good things we have done, so none of us can boast about it.',
  },
  {
    ref: 'Hebrews 11:1',
    kjv: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    niv: 'Now faith is confidence in what we hope for and assurance about what we do not see.',
    nlt: 'Faith is the confidence that what we hope for will actually happen; it gives us assurance about things we cannot see.',
  },
  {
    ref: 'James 1:5',
    kjv: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.',
    niv: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.',
    nlt: 'If you need wisdom, ask our generous God, and he will give it to you. He will not rebuke you for asking.',
  },
  {
    ref: 'Psalm 27:1',
    kjv: 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?',
    niv: 'The LORD is my light and my salvation—whom shall I fear? The LORD is the stronghold of my life—of whom shall I be afraid?',
    nlt: 'The LORD is my light and my salvation—so why should I be afraid? The LORD is my fortress, protecting me from danger, so why should I tremble?',
  },
  {
    ref: 'Lamentations 3:22-23',
    kjv: 'It is of the LORD’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.',
    niv: 'Because of the LORD’s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.',
    nlt: 'The faithful love of the LORD never ends! His mercies never cease. Great is his faithfulness; his mercies begin afresh each morning.',
  },
  {
    ref: 'Micah 6:8',
    kjv: 'He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?',
    niv: 'He has shown you, O mortal, what is good. And what does the LORD require of you? To act justly and to love mercy and to walk humbly with your God.',
    nlt: 'O people, the LORD has told you what is good, and this is what he requires of you: to do what is right, to love mercy, and to walk humbly with your God.',
  },
  {
    ref: 'Colossians 3:23',
    kjv: 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men.',
    niv: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.',
    nlt: 'Work willingly at whatever you do, as though you were working for the Lord rather than for people.',
  },
  {
    ref: 'Psalm 37:4',
    kjv: 'Delight thyself also in the LORD; and he shall give thee the desires of thine heart.',
    niv: 'Take delight in the LORD, and he will give you the desires of your heart.',
    nlt: 'Take delight in the LORD, and he will give you your heart’s desires.',
  },
  {
    ref: 'Deuteronomy 31:6',
    kjv: 'Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.',
    niv: 'Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you.',
    nlt: 'So be strong and courageous! Do not be afraid and do not panic before them. For the LORD your God will personally go ahead of you. He will neither fail you nor abandon you.',
  },
  {
    ref: 'Psalm 121:1-2',
    kjv: 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.',
    niv: 'I lift up my eyes to the mountains—where does my help come from? My help comes from the LORD, the Maker of heaven and earth.',
    nlt: 'I look up to the mountains—does my help come from there? My help comes from the LORD, who made heaven and earth!',
  },
  {
    ref: 'Psalm 34:8',
    kjv: 'O taste and see that the LORD is good: blessed is the man that trusteth in him.',
    niv: 'Taste and see that the LORD is good; blessed is the one who takes refuge in him.',
    nlt: 'Taste and see that the LORD is good. Oh, the joys of those who take refuge in him!',
  },
  {
    ref: 'Romans 15:13',
    kjv: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.',
    niv: 'May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.',
    nlt: 'I pray that God, the source of hope, will fill you completely with joy and peace because you trust in him. Then you will overflow with confident hope through the power of the Holy Spirit.',
  },
];

// Days since epoch → stable index for the day (same verse for everyone, that day).
export function getVerseForDate(date = new Date()) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000
  );
  return VERSES[((dayNumber % VERSES.length) + VERSES.length) % VERSES.length];
}

export function textFor(verse, translation) {
  const key = (translation || 'NIV').toLowerCase();
  return verse[key] || verse.niv || verse.kjv;
}
