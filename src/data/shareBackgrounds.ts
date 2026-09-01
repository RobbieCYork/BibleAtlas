/** Share-card backgrounds — real photography, 4:5 portrait (1080x1350), WebP.
 *
 * Each entry ships two files: the full image and a ~20px `placeholder` the picker paints
 * instantly while the real one lazy-loads, so opening the picker costs a few KB rather than
 * one download per background.
 *
 * `textColor` and `safeArea` are not cosmetic — `shareCardRender.ts` drives the adaptive
 * gradient scrim and the text block's placement from them, so they must describe the image
 * honestly: `safeArea` is where the picture is calm enough to hold words, and `textColor` is
 * which ink survives there. Set them by looking at the image, not by guessing from the title.
 *
 * This list is generated as images are produced; adding an entry is the only step needed to
 * surface a new background in the picker. */
export type ShareBackgroundCategory =
  | "scripture"
  | "pacific-northwest"
  | "landscape"
  | "holy-land";

export interface ShareBackground {
  id: string;
  /** Full image, served from `public/share-backgrounds/`. */
  file: string;
  /** Tiny blurred stand-in painted while `file` loads. */
  placeholder: string;
  /** Human label shown in the picker. */
  title: string;
  category: ShareBackgroundCategory;
  /** Which ink is legible over this image's safe area. */
  textColor: "light" | "dark";
  /** Where the image is calm enough to sit text. */
  safeArea: "top" | "bottom" | "center";
}

export const SHARE_BACKGROUNDS: ShareBackground[] = [
  {
    id: "columbia-river-gorge",
    file: "/share-backgrounds/columbia-river-gorge.webp",
    placeholder: "/share-backgrounds/columbia-river-gorge-tiny.webp",
    title: "Columbia River Gorge",
    category: "pacific-northwest",
    // Upper half is an unbroken amber sky gradient — the calmest region in the frame — and
    // it is bright enough that dark ink outreads light there.
    textColor: "dark",
    safeArea: "top",
  },
];
