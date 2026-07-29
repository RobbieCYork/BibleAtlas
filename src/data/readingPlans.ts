/** Guided, atlas-native reading plans — each day pairs a passage with the place it happened, so
 * following a plan walks the reader across the map as well as through the text.
 *
 * Every `locationId` here must be a real id in locations.ts, and every `poiId` a real id in
 * pois.ts — a day whose place isn't in the atlas simply omits both rather than inventing an id
 * (e.g. Marah, Elim, and Rephidim on the Exodus route have no pin yet). Book names must match
 * bibleBooks.ts exactly, since day clicks feed straight into the chapter loader.
 */

export interface ReadingPlanDay {
  day: number;
  title: string;
  /** Chapter to load on click; when `verse` is present the reader is scrolled to (and flashed on) it. */
  reference: { book: string; chapter: number; verse?: number };
  /** Focuses this pin on the map (locations.ts id) when the day is opened. */
  locationId?: string;
  /** Same, for a point-of-interest pin (pois.ts id) — used when the day's place is a POI, not a location. */
  poiId?: string;
  note?: string;
}

export interface ReadingPlan {
  id: string;
  title: string;
  tagline: string;
  days: ReadingPlanDay[];
}

export const READING_PLANS: ReadingPlan[] = [
  {
    id: "pauls-journeys",
    title: "Paul's Missionary Journeys",
    tagline: "Follow Paul port by port from Antioch to Rome — 14 stops through Acts.",
    days: [
      {
        day: 1,
        title: "Sent out from Antioch",
        reference: { book: "Acts", chapter: 13, verse: 1 },
        locationId: "antioch-syria",
        note: "The church at Antioch lays hands on Barnabas and Saul and sends them out.",
      },
      {
        day: 2,
        title: "Cyprus and Paphos",
        reference: { book: "Acts", chapter: 13, verse: 4 },
        locationId: "cyprus",
        note: "Across the island to Paphos, where the proconsul Sergius Paulus believes.",
      },
      {
        day: 3,
        title: "Preaching in Pisidian Antioch",
        reference: { book: "Acts", chapter: 13, verse: 14 },
        locationId: "antioch-pisidia",
        note: "Paul's first recorded sermon — the whole city gathers the next Sabbath.",
      },
      {
        day: 4,
        title: "A healing at Lystra",
        reference: { book: "Acts", chapter: 14, verse: 8 },
        locationId: "lystra",
        note: "Hailed as gods one day, Paul is stoned and left for dead the next.",
      },
      {
        day: 5,
        title: "The gospel reaches Philippi",
        reference: { book: "Acts", chapter: 16, verse: 12 },
        locationId: "philippi",
        note: "Lydia, an earthquake at midnight, and a jailer's whole household baptized.",
      },
      {
        day: 6,
        title: "Turmoil in Thessalonica",
        reference: { book: "Acts", chapter: 17, verse: 1 },
        locationId: "thessalonica",
        note: "“These who have turned the world upside down have come here too.”",
      },
      {
        day: 7,
        title: "The unknown God in Athens",
        reference: { book: "Acts", chapter: 17, verse: 16 },
        locationId: "athens",
        note: "Paul reasons with the philosophers on the Areopagus.",
      },
      {
        day: 8,
        title: "A year and a half in Corinth",
        reference: { book: "Acts", chapter: 18, verse: 1 },
        locationId: "corinth",
        note: "Tentmaking with Aquila and Priscilla; “I have many people in this city.”",
      },
      {
        day: 9,
        title: "Ephesus in an uproar",
        reference: { book: "Acts", chapter: 19, verse: 1 },
        locationId: "ephesus",
        note: "Two years teaching daily — until the silversmiths riot in the great theatre.",
      },
      {
        day: 10,
        title: "Farewell at Miletus",
        reference: { book: "Acts", chapter: 20, verse: 17 },
        locationId: "miletus",
        note: "Paul's tearful goodbye to the Ephesian elders on the shore.",
      },
      {
        day: 11,
        title: "Arrest in Jerusalem",
        reference: { book: "Acts", chapter: 21, verse: 17 },
        locationId: "jerusalem",
        note: "A riot in the temple courts — and Roman custody that will carry Paul to Rome.",
      },
      {
        day: 12,
        title: "On trial in Caesarea",
        reference: { book: "Acts", chapter: 24, verse: 1 },
        poiId: "caesarea-maritima",
        note: "Two years in Herod's praetorium, testifying before Felix, Festus, and Agrippa.",
      },
      {
        day: 13,
        title: "Storm and shipwreck at Malta",
        reference: { book: "Acts", chapter: 27, verse: 14 },
        locationId: "malta",
        note: "Fourteen nights adrift in the storm — all 276 aboard reach the island alive.",
      },
      {
        day: 14,
        title: "Rome at last",
        reference: { book: "Acts", chapter: 28, verse: 16 },
        locationId: "rome",
        note: "Under guard yet unhindered, Paul preaches the kingdom in the empire's capital.",
      },
    ],
  },
  {
    id: "road-to-the-cross",
    title: "The Road to the Cross",
    tagline: "Walk Holy Week day by day, from Bethany to the empty tomb — 8 days.",
    days: [
      {
        day: 1,
        title: "Anointed at Bethany",
        reference: { book: "John", chapter: 12, verse: 1 },
        locationId: "bethany",
        note: "Six days before Passover, Mary anoints Jesus with costly perfume.",
      },
      {
        day: 2,
        title: "The Triumphal Entry",
        reference: { book: "Matthew", chapter: 21, verse: 1 },
        locationId: "mount-of-olives",
        note: "Down the Mount of Olives on a donkey while the crowds cry “Hosanna!”",
      },
      {
        day: 3,
        title: "Cleansing the temple",
        reference: { book: "Matthew", chapter: 21, verse: 12 },
        locationId: "jerusalem",
        note: "“My house shall be called a house of prayer.”",
      },
      {
        day: 4,
        title: "Teaching on the Mount of Olives",
        reference: { book: "Matthew", chapter: 24, verse: 3 },
        locationId: "mount-of-olives",
        note: "Overlooking the temple, Jesus speaks of what is to come.",
      },
      {
        day: 5,
        title: "The Last Supper",
        reference: { book: "John", chapter: 13, verse: 1 },
        poiId: "upper-room",
        note: "Jesus washes His disciples' feet in the upper room.",
      },
      {
        day: 6,
        title: "Gethsemane",
        reference: { book: "Matthew", chapter: 26, verse: 36 },
        poiId: "gethsemane",
        note: "“Not as I will, but as You will” — then the betrayal and arrest.",
      },
      {
        day: 7,
        title: "The Crucifixion at Golgotha",
        reference: { book: "John", chapter: 19, verse: 17 },
        poiId: "golgotha",
        note: "“It is finished.”",
      },
      {
        day: 8,
        title: "The Resurrection",
        reference: { book: "Matthew", chapter: 28, verse: 1 },
        poiId: "garden-tomb",
        note: "At dawn on the first day of the week, the tomb stands empty.",
      },
    ],
  },
  {
    id: "exodus-road",
    title: "The Exodus Road",
    tagline: "From slavery in Egypt to the words at Sinai — 10 days through Exodus.",
    days: [
      {
        day: 1,
        title: "Slavery in Egypt",
        reference: { book: "Exodus", chapter: 1, verse: 8 },
        locationId: "egypt",
        note: "A new king who did not know Joseph sets taskmasters over Israel.",
      },
      {
        day: 2,
        title: "The burning bush",
        reference: { book: "Exodus", chapter: 3, verse: 1 },
        locationId: "mount-sinai",
        note: "At Horeb, the mountain of God, Moses is sent back to Pharaoh.",
      },
      {
        day: 3,
        title: "“Let My people go”",
        reference: { book: "Exodus", chapter: 5, verse: 1 },
        locationId: "egypt",
        note: "Pharaoh answers by doubling the burden — bricks without straw.",
      },
      {
        day: 4,
        title: "Plagues — and Goshen spared",
        reference: { book: "Exodus", chapter: 8, verse: 22 },
        locationId: "goshen",
        note: "God sets apart the land of Goshen, where His people dwell.",
      },
      {
        day: 5,
        title: "The Passover",
        reference: { book: "Exodus", chapter: 12, verse: 21 },
        locationId: "egypt",
        note: "Blood on the doorposts, and at midnight Israel goes out of Egypt.",
      },
      {
        day: 6,
        title: "Crossing the Red Sea",
        reference: { book: "Exodus", chapter: 14, verse: 21 },
        locationId: "red-sea",
        note: "The waters divide, and Israel walks through on dry ground.",
      },
      {
        day: 7,
        title: "The Song of the Sea",
        reference: { book: "Exodus", chapter: 15, verse: 1 },
        locationId: "red-sea",
        note: "Israel sings on the far shore, then marches on to Marah and Elim.",
      },
      {
        day: 8,
        title: "Bread from heaven",
        reference: { book: "Exodus", chapter: 16, verse: 4 },
        note: "Manna each morning in the Wilderness of Sin — enough for every day.",
      },
      {
        day: 9,
        title: "Water from the rock",
        reference: { book: "Exodus", chapter: 17, verse: 1 },
        note: "At Rephidim the people quarrel, the rock is struck, and Amalek attacks.",
      },
      {
        day: 10,
        title: "The Ten Commandments",
        reference: { book: "Exodus", chapter: 20, verse: 1 },
        locationId: "mount-sinai",
        note: "God speaks all these words from the mountain in fire and smoke.",
      },
    ],
  },
];

/** "Acts 13:4"-style label for a plan day, matching the format the chapter loader parses. */
export function formatPlanDayReference(day: ReadingPlanDay): string {
  const { book, chapter, verse } = day.reference;
  return `${book} ${chapter}${verse ? `:${verse}` : ""}`;
}
