/** An article a game's reveal can open: a person (people.ts), a place (locations.ts), a map site
 * (pois.ts) or a topic (topics.ts). GameView passes the opener down; App.tsx leaves Games mode and
 * opens the article exactly as a link in Bible text would. */
export interface GameArticleTarget {
  kind: "person" | "place" | "site" | "topic";
  id: string;
}

export type OpenGameArticle = (target: GameArticleTarget) => void;
