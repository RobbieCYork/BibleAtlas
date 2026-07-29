/** Liturgical "seasonal walks" — short guided journeys through the places of a church-calendar
 * story, auto-surfaced (as a dismissible banner, not a modal) only while today's date falls inside
 * the walk's season window. Each stop drives the existing map-focus + go-to-reference paths, so a
 * reader steps through the story on the map and in the text together. */

export type SeasonWindow = {
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number; // 1-12 — may be numerically before startMonth (a window wrapping New Year)
  endDay: number;
};

export type SeasonalWalkStop = {
  /** 1-based order in the walk. */
  position: number;
  /** Must match an `id` in src/data/locations.ts or src/data/pois.ts — App.tsx resolves against
   * locations first, then POIs, and feeds it to the matching select/focus handler. */
  locationId: string;
  /** Short stop title shown in the walk view, e.g. "Gethsemane — the long night". */
  label: string;
  /** Book names must match src/data/bibleBooks.ts exactly (same rule as dailyVerse.ts). */
  reference: { book: string; chapter: number; verse?: number };
  /** One or two sentences tying the place to this moment of the story — same historical-devotional
   * register as DailyVerseEntry.hook. */
  blurb: string;
};

export type SeasonalWalk = {
  id: string;
  title: string;
  tagline: string;
  /** Single emoji used in the banner pill and the walk view header. */
  emoji: string;
  season: SeasonWindow;
  stops: SeasonalWalkStop[];
};

export const SEASONAL_WALKS: SeasonalWalk[] = [
  {
    id: "holy-week-jerusalem",
    title: "Holy Week in Jerusalem",
    tagline: "Follow the road to the cross",
    emoji: "🕊️",
    // Wide enough to cover nearly every Western and Eastern Easter date.
    season: { startMonth: 3, startDay: 15, endMonth: 4, endDay: 25 },
    stops: [
      {
        position: 1,
        locationId: "bethany",
        label: "Bethany — the week begins",
        reference: { book: "John", chapter: 12, verse: 1 },
        blurb:
          "Six days before Passover, Jesus returned to the village of Mary, Martha, and Lazarus on the far side of the Mount of Olives — the quiet base he would walk from each day of his final week.",
      },
      {
        position: 2,
        locationId: "bethphage",
        label: "Bethphage — a colt is waiting",
        reference: { book: "Matthew", chapter: 21, verse: 1 },
        blurb:
          "From this small village on the mount's eastern slope, Jesus sent two disciples ahead for a donkey's colt — deliberately staging the humble royal entry Zechariah had foreseen five centuries earlier.",
      },
      {
        position: 3,
        locationId: "mount-of-olives",
        label: "Mount of Olives — Jesus weeps over the city",
        reference: { book: "Luke", chapter: 19, verse: 41 },
        blurb:
          "Cresting the ridge, the whole city suddenly spread out below him, Jesus wept over Jerusalem even as the crowds around him shouted 'Hosanna.'",
      },
      {
        position: 4,
        locationId: "jerusalem",
        label: "Jerusalem — cleansing the temple",
        reference: { book: "Matthew", chapter: 21, verse: 12 },
        blurb:
          "Inside a temple compound that swelled to hundreds of thousands of pilgrims at Passover, Jesus overturned the money-changers' tables and reclaimed the courts as a house of prayer.",
      },
      {
        position: 5,
        locationId: "upper-room",
        label: "The Upper Room — a final meal",
        reference: { book: "Luke", chapter: 22, verse: 19 },
        blurb:
          "In a borrowed room on Jerusalem's western hill, Jesus reshaped the Passover meal around himself — 'this is my body, given for you' — the night before the cross.",
      },
      {
        position: 6,
        locationId: "gethsemane",
        label: "Gethsemane — the long night",
        reference: { book: "Matthew", chapter: 26, verse: 39 },
        blurb:
          "Among the olive presses at the mount's foot — some of the trees there today are centuries old — Jesus prayed 'not as I will, but as you will,' and was betrayed with a kiss.",
      },
      {
        position: 7,
        locationId: "golgotha",
        label: "Golgotha — the Place of the Skull",
        reference: { book: "John", chapter: 19, verse: 17 },
        blurb:
          "Outside the city wall, on the rise the Romans used for public executions, Jesus was crucified between two criminals under a sign reading 'King of the Jews.'",
      },
      {
        position: 8,
        locationId: "garden-tomb",
        label: "The empty tomb — he is risen",
        reference: { book: "Matthew", chapter: 28, verse: 6 },
        blurb:
          "At first light on the third day, the women found the stone rolled away and heard the words that changed everything: 'He is not here; he has risen, just as he said.'",
      },
    ],
  },
  {
    id: "road-to-bethlehem",
    title: "The Road to Bethlehem",
    tagline: "Trace the nativity journey",
    emoji: "⭐",
    // Advent through Epiphany (Jan 6) — the window wraps New Year.
    season: { startMonth: 12, startDay: 1, endMonth: 1, endDay: 6 },
    stops: [
      {
        position: 1,
        locationId: "nazareth",
        label: "Nazareth — the announcement",
        reference: { book: "Luke", chapter: 1, verse: 31 },
        blurb:
          "In a Galilean hill village so small it goes unmentioned in the Old Testament, the angel Gabriel told a young woman named Mary she would bear the Son of the Most High.",
      },
      {
        position: 2,
        locationId: "ein-karem",
        label: "Ein Karem — Mary visits Elizabeth",
        reference: { book: "Luke", chapter: 1, verse: 39 },
        blurb:
          "Mary hurried south to the hill country of Judah, where Elizabeth's unborn child leapt at her greeting and Mary answered with the Magnificat.",
      },
      {
        position: 3,
        locationId: "bethlehem",
        label: "Bethlehem — no room at the inn",
        reference: { book: "Luke", chapter: 2, verse: 7 },
        blurb:
          "A census order marched Joseph and Mary some ninety miles from Nazareth to David's hometown, where the promised Son was laid in a manger — 'house of bread' hosting the Bread of Life.",
      },
      {
        position: 4,
        locationId: "shepherds-field",
        label: "The Shepherds' Field — good news of great joy",
        reference: { book: "Luke", chapter: 2, verse: 10 },
        blurb:
          "In the fields east of town, night-watch shepherds — among the humblest workers in Judea — became the first to hear the birth announcement of the Messiah.",
      },
      {
        position: 5,
        locationId: "egypt",
        label: "Egypt — the flight by night",
        reference: { book: "Matthew", chapter: 2, verse: 14 },
        blurb:
          "Warned in a dream after the Magi's visit, Joseph took the child and his mother south into Egypt by night, out of the reach of Herod's sword.",
      },
      {
        position: 6,
        locationId: "nazareth",
        label: "Return to Nazareth",
        reference: { book: "Matthew", chapter: 2, verse: 23 },
        blurb:
          "With Herod dead, the family settled back in Nazareth — fulfilling the word that he would be called a Nazarene, and setting the stage for thirty hidden years.",
      },
    ],
  },
];

/** "Luke 2:7" / "Luke 2"-style string — the exact shape BiblePanel's parseBookChapter understands
 * (same contract as formatDailyReference in dailyVerse.ts). */
export function formatWalkStopReference(stop: SeasonalWalkStop): string {
  const { book, chapter, verse } = stop.reference;
  return verse === undefined ? `${book} ${chapter}` : `${book} ${chapter}:${verse}`;
}

/** True when the local calendar date falls inside the window, including windows that wrap New Year
 * (e.g. Dec 1 – Jan 6). Compared on month/day only — the year never matters. */
export function isDateInSeason(date: Date, season: SeasonWindow): boolean {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const start = season.startMonth * 100 + season.startDay;
  const end = season.endMonth * 100 + season.endDay;
  return start <= end ? md >= start && md <= end : md >= start || md <= end;
}

/** The first walk whose season window contains today, or null outside every window. */
export function getActiveSeasonalWalk(date: Date = new Date()): SeasonalWalk | null {
  return SEASONAL_WALKS.find((walk) => isDateInSeason(date, walk.season)) ?? null;
}

/** localStorage key scoping a banner dismissal to this walk's current season occurrence — for a
 * window that wraps New Year, the January tail belongs to the season that *started* the previous
 * December, so dismissing on Dec 20 keeps the banner gone through Jan 6 but not next December. */
export function getWalkDismissKey(walk: SeasonalWalk, date: Date = new Date()): string {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const start = walk.season.startMonth * 100 + walk.season.startDay;
  const end = walk.season.endMonth * 100 + walk.season.endDay;
  const wraps = start > end;
  const seasonYear = wraps && md <= end ? date.getFullYear() - 1 : date.getFullYear();
  return `seasonal-walk-dismissed:${walk.id}:${seasonYear}`;
}
