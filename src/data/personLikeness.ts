import { personImages, type PersonImage } from "./personImages";

/**
 * The only pictures a person article shows (Robbie, 2026-11-28): real likenesses. A photograph, or a
 * portrait made in the sitter's lifetime by a named artist. (No record of a sitting was found for the
 * Wilberforce and Spurgeon paintings; see the list named below.) Everything else in
 * personImages.ts (imagined or later depictions, including every biblical figure; posthumous works;
 * later copies; anonymous or uncertain attributions) stays on file and is not displayed.
 *
 * An allow-list on purpose: a new record in personImages.ts shows nothing until its credit and source
 * page have been checked and its id is added here. The decision and reason for every image are in
 * automation/manager/people-images.md.
 *
 * The app (PersonPanel) and the public person pages (scripts/seo/render.mjs, through loadData) both
 * read this, and draw the picture below "Dig Deeper".
 */
export const LIKENESS_IMAGE_IDS: ReadonlySet<string> = new Set([
  "martin-luther", // Lucas Cranach the Elder, 1528
  "thomas-cranmer", // Gerlach Flicke, 1545
  "william-wilberforce", // Anton Hickel, 1794
  "charles-spurgeon", // Alexander Melville, 1885
  "david-livingstone", // photograph, Thomas Annan, 1864
  "hudson-taylor", // photograph reproduced as a book frontispiece, 1893
  "fanny-crosby", // photograph, before 1915
  "william-seymour", // photograph, 1910s
]);

export const likenessImage = (personId: string): PersonImage | undefined =>
  LIKENESS_IMAGE_IDS.has(personId) ? personImages[personId] : undefined;
