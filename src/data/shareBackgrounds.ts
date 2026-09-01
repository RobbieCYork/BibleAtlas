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
  {
    id: "mount-hood-dawn",
    file: "/share-backgrounds/mount-hood-dawn.webp",
    placeholder: "/share-backgrounds/mount-hood-dawn-tiny.webp",
    title: "Mount Hood at Dawn",
    category: "pacific-northwest",
    // Pale blue dawn sky fills the band above the peak; the lake below is dark.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "old-growth-forest",
    file: "/share-backgrounds/old-growth-forest.webp",
    placeholder: "/share-backgrounds/old-growth-forest-tiny.webp",
    title: "Old-Growth Forest",
    category: "pacific-northwest",
    // God-rays burn out the centre; the mossy floor and ferns below stay deep green-black.
    textColor: "light",
    safeArea: "bottom",
  },
  {
    id: "pnw-waterfall",
    file: "/share-backgrounds/pnw-waterfall.webp",
    placeholder: "/share-backgrounds/pnw-waterfall-tiny.webp",
    title: "Basalt Canyon Falls",
    category: "pacific-northwest",
    // Light enters at the top of the canyon; the plunge pool and wet rock below are darkest.
    textColor: "light",
    safeArea: "bottom",
  },
  {
    id: "oregon-coast-sunset",
    file: "/share-backgrounds/oregon-coast-sunset.webp",
    placeholder: "/share-backgrounds/oregon-coast-sunset-tiny.webp",
    title: "Oregon Coast at Sunset",
    category: "pacific-northwest",
    // Two-thirds of the frame is a clean amber sky gradient above the sea stacks.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "misty-ridgelines",
    file: "/share-backgrounds/misty-ridgelines.webp",
    placeholder: "/share-backgrounds/misty-ridgelines-tiny.webp",
    title: "Misty Ridgelines",
    category: "pacific-northwest",
    // Near-empty cream haze above the ridges; the forested layers below carry all the detail.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "cascade-river",
    file: "/share-backgrounds/cascade-river.webp",
    placeholder: "/share-backgrounds/cascade-river-tiny.webp",
    title: "Cascade River",
    category: "pacific-northwest",
    // Long-exposure water in the lower half smooths to a pale, even sheet.
    textColor: "dark",
    safeArea: "bottom",
  },
  {
    id: "calming-the-storm",
    file: "/share-backgrounds/calming-the-storm.webp",
    placeholder: "/share-backgrounds/calming-the-storm-tiny.webp",
    title: "Calming the Storm",
    category: "scripture",
    // Heavy storm cloud fills the top of the frame around the break of light.
    textColor: "light",
    safeArea: "top",
  },
  {
    id: "sermon-on-the-mount",
    file: "/share-backgrounds/sermon-on-the-mount.webp",
    placeholder: "/share-backgrounds/sermon-on-the-mount-tiny.webp",
    title: "Sermon on the Mount",
    category: "scripture",
    // Wide pale-blue sky over the lake; the seated crowd occupies the bottom third.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "walking-on-water",
    file: "/share-backgrounds/walking-on-water.webp",
    placeholder: "/share-backgrounds/walking-on-water-tiny.webp",
    title: "Walking on Water",
    category: "scripture",
    // Dusky blue pre-dawn sky above the horizon line — even, and dark enough for light ink.
    textColor: "light",
    safeArea: "top",
  },
  {
    id: "good-shepherd",
    file: "/share-backgrounds/good-shepherd.webp",
    placeholder: "/share-backgrounds/good-shepherd-tiny.webp",
    title: "The Good Shepherd",
    category: "scripture",
    // Backlit haze washes the upper half to near-white above the hillside.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "empty-tomb",
    file: "/share-backgrounds/empty-tomb.webp",
    placeholder: "/share-backgrounds/empty-tomb-tiny.webp",
    title: "The Empty Tomb",
    category: "scripture",
    // The doorway blazes in the centre; the tomb floor and walls below are near-black.
    textColor: "light",
    safeArea: "bottom",
  },
  {
    id: "road-to-emmaus",
    file: "/share-backgrounds/road-to-emmaus.webp",
    placeholder: "/share-backgrounds/road-to-emmaus-tiny.webp",
    title: "The Road to Emmaus",
    category: "scripture",
    // Golden evening sky spans the top of the frame above the hills and the road.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "sea-of-galilee-dawn",
    file: "/share-backgrounds/sea-of-galilee-dawn.webp",
    placeholder: "/share-backgrounds/sea-of-galilee-dawn-tiny.webp",
    title: "Sea of Galilee at Dawn",
    category: "holy-land",
    // Pale sunrise sky and mirror-flat water meet with almost no detail in the upper half.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "judean-wilderness",
    file: "/share-backgrounds/judean-wilderness.webp",
    placeholder: "/share-backgrounds/judean-wilderness-tiny.webp",
    title: "Judean Wilderness",
    category: "holy-land",
    // Clear graded sky over the ridgeline; the folded hills below hold all the texture.
    textColor: "dark",
    safeArea: "top",
  },
  {
    id: "olive-grove",
    file: "/share-backgrounds/olive-grove.webp",
    placeholder: "/share-backgrounds/olive-grove-tiny.webp",
    title: "Ancient Olive Grove",
    category: "holy-land",
    // Canopy shadow darkens the top of the frame; the lit ground below is far busier.
    textColor: "light",
    safeArea: "top",
  },
  {
    id: "alpine-lake-sunrise",
    file: "/share-backgrounds/alpine-lake-sunrise.webp",
    placeholder: "/share-backgrounds/alpine-lake-sunrise-tiny.webp",
    title: "Alpine Lake at Sunrise",
    category: "landscape",
    // The still reflection across the middle of the frame is the one uncluttered band, and
    // it sits in cool shadow while the peaks above and rock below carry the detail.
    textColor: "light",
    safeArea: "center",
  },
  {
    id: "desert-canyon",
    file: "/share-backgrounds/desert-canyon.webp",
    placeholder: "/share-backgrounds/desert-canyon-tiny.webp",
    title: "Desert Canyon at Sunrise",
    category: "landscape",
    // Soft pale sky and morning haze fill the top third above the canyon rim.
    textColor: "dark",
    safeArea: "top",
  },
];
