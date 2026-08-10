/** Verse bank for the "Scripture Memorization Challenge" (MemorizationView.tsx) — ~100 widely-used
 * memory verses (KJV text, public domain), grouped by theme so the picker can be browsed instead of
 * scrolled as one flat wall of 100 rows. Unlike fillBlankVerses.ts, blanking here is computed at
 * runtime by MemorizationView (progressive — more words hidden each round) rather than authored per
 * verse, so all we need is clean reference/text/category triples. */

export type MemorizationCategory =
  | "The Gospel"
  | "Faith & Trust"
  | "Love"
  | "Hope & Comfort"
  | "Strength & Courage"
  | "Peace"
  | "Wisdom"
  | "Prayer"
  | "God's Faithfulness"
  | "Praise & Worship"
  | "Christian Living"
  | "Mission";

export interface MemorizationVerse {
  reference: string;
  text: string;
  category: MemorizationCategory;
}

export const MEMORIZATION_VERSES: MemorizationVerse[] = [
  // --- The Gospel ---
  { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", category: "The Gospel" },
  { reference: "Romans 3:23", text: "For all have sinned, and come short of the glory of God.", category: "The Gospel" },
  { reference: "Romans 5:8", text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", category: "The Gospel" },
  { reference: "Romans 6:23", text: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.", category: "The Gospel" },
  { reference: "Romans 10:9", text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.", category: "The Gospel" },
  { reference: "Ephesians 2:8-9", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.", category: "The Gospel" },
  { reference: "Acts 4:12", text: "Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved.", category: "The Gospel" },
  { reference: "Acts 16:31", text: "And they said, Believe on the Lord Jesus Christ, and thou shalt be saved, and thy house.", category: "The Gospel" },
  { reference: "John 1:12", text: "But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name.", category: "The Gospel" },
  { reference: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.", category: "The Gospel" },
  { reference: "2 Corinthians 5:17", text: "Therefore if any man be in Christ, he is a new creature: old things are passed away; behold, all things are become new.", category: "The Gospel" },
  { reference: "1 John 1:9", text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.", category: "The Gospel" },

  // --- Faith & Trust ---
  { reference: "Proverbs 3:5", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding.", category: "Faith & Trust" },
  { reference: "Proverbs 3:6", text: "In all thy ways acknowledge him, and he shall direct thy paths.", category: "Faith & Trust" },
  { reference: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen.", category: "Faith & Trust" },
  { reference: "Hebrews 11:6", text: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.", category: "Faith & Trust" },
  { reference: "2 Corinthians 5:7", text: "For we walk by faith, not by sight:", category: "Faith & Trust" },
  { reference: "Isaiah 26:3", text: "Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.", category: "Faith & Trust" },

  // --- Love ---
  { reference: "1 Corinthians 13:4", text: "Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,", category: "Love" },
  { reference: "1 Corinthians 13:13", text: "And now abideth faith, hope, charity, these three; but the greatest of these is charity.", category: "Love" },
  { reference: "John 13:34", text: "A new commandment I give unto you, That ye love one another; as I have loved you, that ye also love one another.", category: "Love" },
  { reference: "John 15:13", text: "Greater love hath no man than this, that a man lay down his life for his friends.", category: "Love" },
  { reference: "1 John 4:8", text: "He that loveth not knoweth not God; for God is love.", category: "Love" },
  { reference: "1 John 4:19", text: "We love him, because he first loved us.", category: "Love" },
  { reference: "Romans 8:38-39", text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", category: "Love" },
  { reference: "Proverbs 17:17", text: "A friend loveth at all times, and a brother is born for adversity.", category: "Love" },
  { reference: "Mark 12:30", text: "And thou shalt love the Lord thy God with all thy heart, and with all thy soul, and with all thy mind, and with all thy strength: this is the first commandment.", category: "Love" },
  { reference: "Mark 12:31", text: "And the second is like, namely this, Thou shalt love thy neighbour as thyself. There is none other commandment greater than these.", category: "Love" },

  // --- Hope & Comfort ---
  { reference: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.", category: "Hope & Comfort" },
  { reference: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble.", category: "Hope & Comfort" },
  { reference: "Psalm 147:3", text: "He healeth the broken in heart, and bindeth up their wounds.", category: "Hope & Comfort" },
  { reference: "Lamentations 3:22-23", text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.", category: "Hope & Comfort" },
  { reference: "Romans 15:13", text: "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.", category: "Hope & Comfort" },
  { reference: "Revelation 21:4", text: "And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.", category: "Hope & Comfort" },
  { reference: "1 Peter 5:7", text: "Casting all your care upon him; for he careth for you.", category: "Hope & Comfort" },
  { reference: "Matthew 11:28", text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", category: "Hope & Comfort" },

  // --- Strength & Courage ---
  { reference: "Joshua 1:9", text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.", category: "Strength & Courage" },
  { reference: "Deuteronomy 31:6", text: "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.", category: "Strength & Courage" },
  { reference: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", category: "Strength & Courage" },
  { reference: "Isaiah 41:10", text: "Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.", category: "Strength & Courage" },
  { reference: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me.", category: "Strength & Courage" },
  { reference: "Psalm 27:1", text: "The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?", category: "Strength & Courage" },
  { reference: "Psalm 46:10", text: "Be still, and know that I am God.", category: "Strength & Courage" },
  { reference: "2 Timothy 1:7", text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", category: "Strength & Courage" },
  { reference: "Ephesians 6:11", text: "Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.", category: "Strength & Courage" },
  { reference: "Hebrews 12:1", text: "Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us,", category: "Strength & Courage" },

  // --- Peace ---
  { reference: "John 14:27", text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.", category: "Peace" },
  { reference: "John 16:33", text: "These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world.", category: "Peace" },
  { reference: "Philippians 4:6", text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.", category: "Peace" },
  { reference: "Philippians 4:7", text: "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.", category: "Peace" },
  { reference: "Numbers 6:24-26", text: "The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace.", category: "Peace" },

  // --- Wisdom ---
  { reference: "Proverbs 16:3", text: "Commit thy works unto the LORD, and thy thoughts shall be established.", category: "Wisdom" },
  { reference: "Proverbs 18:10", text: "The name of the LORD is a strong tower: the righteous runneth into it, and is safe.", category: "Wisdom" },
  { reference: "Proverbs 22:6", text: "Train up a child in the way he should go: and when he is old, he will not depart from it.", category: "Wisdom" },
  { reference: "Proverbs 27:17", text: "Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.", category: "Wisdom" },
  { reference: "Ecclesiastes 3:1", text: "To every thing there is a season, and a time to every purpose under the heaven.", category: "Wisdom" },
  { reference: "James 1:5", text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.", category: "Wisdom" },
  { reference: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path.", category: "Wisdom" },
  { reference: "2 Timothy 3:16", text: "All scripture is given by inspiration of God, and is profitable for doctrine, for reproof, for correction, for instruction in righteousness:", category: "Wisdom" },

  // --- Prayer ---
  { reference: "Philippians 4:19", text: "But my God shall supply all your need according to his riches in glory by Christ Jesus.", category: "Prayer" },
  { reference: "Matthew 7:7", text: "Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.", category: "Prayer" },
  { reference: "Jeremiah 33:3", text: "Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.", category: "Prayer" },
  { reference: "James 5:16", text: "The effectual fervent prayer of a righteous man availeth much.", category: "Prayer" },
  { reference: "1 Thessalonians 5:16-18", text: "Rejoice evermore. Pray without ceasing. In every thing give thanks: for this is the will of God in Christ Jesus concerning you.", category: "Prayer" },
  { reference: "1 John 5:14", text: "And this is the confidence that we have in him, that, if we ask any thing according to his will, he heareth us.", category: "Prayer" },

  // --- God's Faithfulness ---
  { reference: "Hebrews 13:5", text: "Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee.", category: "God's Faithfulness" },
  { reference: "1 Corinthians 10:13", text: "There hath no temptation taken you but such as is common to man: but God is faithful, who will not suffer you to be tempted above that ye are able; but will with the temptation also make a way to escape, that ye may be able to bear it.", category: "God's Faithfulness" },
  { reference: "Psalm 100:5", text: "For the LORD is good; his mercy is everlasting; and his truth endureth to all generations.", category: "God's Faithfulness" },
  { reference: "Isaiah 40:8", text: "The grass withereth, the flower fadeth: but the word of our God shall stand for ever.", category: "God's Faithfulness" },

  // --- Praise & Worship ---
  { reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want.", category: "Praise & Worship" },
  { reference: "Psalm 34:8", text: "O taste and see that the LORD is good: blessed is the man that trusteth in him.", category: "Praise & Worship" },
  { reference: "Psalm 118:24", text: "This is the day which the LORD hath made; we will rejoice and be glad in it.", category: "Praise & Worship" },
  { reference: "Psalm 139:14", text: "I will praise thee; for I am fearfully and wonderfully made: marvellous are thy works; and that my soul knoweth right well.", category: "Praise & Worship" },
  { reference: "Psalm 100:3", text: "Know ye that the LORD he is God: it is he that hath made us, and not we ourselves; we are his people, and the sheep of his pasture.", category: "Praise & Worship" },
  { reference: "Genesis 1:1", text: "In the beginning God created the heaven and the earth.", category: "Praise & Worship" },
  { reference: "John 1:1", text: "In the beginning was the Word, and the Word was with God, and the Word was God.", category: "Praise & Worship" },
  { reference: "1 Corinthians 15:57", text: "But thanks be to God, which giveth us the victory through our Lord Jesus Christ.", category: "Praise & Worship" },

  // --- Christian Living ---
  { reference: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", category: "Christian Living" },
  { reference: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.", category: "Christian Living" },
  { reference: "Romans 12:21", text: "Be not overcome of evil, but overcome evil with good.", category: "Christian Living" },
  { reference: "Galatians 2:20", text: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.", category: "Christian Living" },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.", category: "Christian Living" },
  { reference: "Galatians 6:9", text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.", category: "Christian Living" },
  { reference: "Ephesians 4:32", text: "And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ's sake hath forgiven you.", category: "Christian Living" },
  { reference: "Philippians 1:6", text: "Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ:", category: "Christian Living" },
  { reference: "Philippians 4:8", text: "Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things.", category: "Christian Living" },
  { reference: "Colossians 3:23", text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men;", category: "Christian Living" },
  { reference: "James 1:12", text: "Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life, which the Lord hath promised to them that love him.", category: "Christian Living" },
  { reference: "James 4:7", text: "Submit yourselves therefore to God. Resist the devil, and he will flee from you.", category: "Christian Living" },
  { reference: "Micah 6:8", text: "He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?", category: "Christian Living" },
  { reference: "Exodus 20:12", text: "Honour thy father and thy mother: that thy days may be long upon the land which the LORD thy God giveth thee.", category: "Christian Living" },

  // --- Mission ---
  { reference: "Matthew 28:19", text: "Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost:", category: "Mission" },
  { reference: "Mark 16:15", text: "And he said unto them, Go ye into all the world, and preach the gospel to every creature.", category: "Mission" },
  { reference: "Acts 1:8", text: "But ye shall receive power, after that the Holy Ghost is come upon you: and ye shall be witnesses unto me both in Jerusalem, and in all Judaea, and in Samaria, and unto the uttermost part of the earth.", category: "Mission" },
  { reference: "Matthew 5:16", text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.", category: "Mission" },
  { reference: "Matthew 6:33", text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", category: "Mission" },
  { reference: "Matthew 5:9", text: "Blessed are the peacemakers: for they shall be called the children of God.", category: "Mission" },
  { reference: "Luke 2:11", text: "For unto you is born this day in the city of David a Saviour, which is Christ the Lord.", category: "Mission" },
  { reference: "Isaiah 9:6", text: "For unto us a child is born, unto us a son is given: and the government shall be upon his shoulder: and his name shall be called Wonderful, Counsellor, The mighty God, The everlasting Father, The Prince of Peace.", category: "Mission" },
  { reference: "Joshua 24:15", text: "But as for me and my house, we will serve the LORD.", category: "Mission" },
];
