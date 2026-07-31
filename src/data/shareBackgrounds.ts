/** Share-card backgrounds — pure CSS (gradients + an optional large emoji symbol layer), not real
 * photography: there's no image-asset pipeline in this app, and licensing a photo library is out of
 * scope, so every theme is drawn instead. Grouped into the three categories the share modal's picker
 * shows as tabs. */
export interface ShareBackground {
  id: string;
  label: string;
  category: "Nature" | "Symbols" | "Holidays";
  /** CSS `background` shorthand value. */
  css: string;
  /** A large, low-opacity centered emoji — gives Cross/Hearts/holiday themes a literal, recognizable
   * icon that a gradient alone can't convey. */
  symbol?: string;
  /** Text color with good contrast against `css`. */
  textColor: string;
}

export const SHARE_BACKGROUNDS: ShareBackground[] = [
  {
    id: "mountains",
    label: "Mountains",
    category: "Nature",
    css: "linear-gradient(180deg, #fbbf7d 0%, #f4886b 32%, #8a5aab 68%, #2f2657 100%)",
    textColor: "#ffffff",
  },
  {
    id: "ocean",
    label: "Ocean",
    category: "Nature",
    css: "linear-gradient(180deg, #8ec9e8 0%, #3f8fc4 45%, #155e8a 100%)",
    textColor: "#ffffff",
  },
  {
    id: "lake",
    label: "Lake",
    category: "Nature",
    css: "linear-gradient(180deg, #cdeee0 0%, #6fb8a3 50%, #1f5f52 100%)",
    textColor: "#0d332b",
  },
  {
    id: "river",
    label: "River",
    category: "Nature",
    css: "linear-gradient(160deg, #a8e6b0 0%, #4fa77a 45%, #1c5c4a 100%)",
    textColor: "#ffffff",
  },
  {
    id: "trees",
    label: "Trees",
    category: "Nature",
    css: "linear-gradient(180deg, #274d3a 0%, #123024 60%, #08160f 100%)",
    textColor: "#ffffff",
  },
  {
    id: "cross",
    label: "The Cross",
    category: "Symbols",
    css: "linear-gradient(180deg, #4a3b6b 0%, #241c3d 60%, #0f0b1c 100%)",
    symbol: "✝️",
    textColor: "#ffffff",
  },
  {
    id: "hearts",
    label: "Hearts",
    category: "Symbols",
    css: "linear-gradient(160deg, #ffd1dc 0%, #ff9eb5 45%, #e05780 100%)",
    symbol: "❤️",
    textColor: "#ffffff",
  },
  {
    id: "christmas",
    label: "Christmas",
    category: "Holidays",
    css: "linear-gradient(180deg, #0b3d2e 0%, #0f5132 55%, #7a1f2b 100%)",
    symbol: "🎄",
    textColor: "#ffffff",
  },
  {
    id: "easter",
    label: "Easter",
    category: "Holidays",
    css: "linear-gradient(160deg, #fde2e4 0%, #d8e2fc 50%, #c9f2c7 100%)",
    symbol: "🐣",
    textColor: "#3a3542",
  },
  {
    id: "thanksgiving",
    label: "Thanksgiving",
    category: "Holidays",
    css: "linear-gradient(180deg, #f4a259 0%, #c9622a 50%, #5c2a0f 100%)",
    symbol: "🍂",
    textColor: "#ffffff",
  },
  {
    id: "passover",
    label: "Passover",
    category: "Holidays",
    css: "linear-gradient(180deg, #1e3a5f 0%, #274472 50%, #c9a34e 100%)",
    symbol: "✡️",
    textColor: "#ffffff",
  },
  {
    id: "good-friday",
    label: "Good Friday",
    category: "Holidays",
    css: "linear-gradient(180deg, #1a1015 0%, #2b0f14 55%, #0a0608 100%)",
    symbol: "✝️",
    textColor: "#d8c9cc",
  },
];

export const SHARE_BACKGROUND_CATEGORIES = ["Nature", "Symbols", "Holidays"] as const;
