import { useFeatures, useFeatureAdmin, type FeatureKey, type FeatureVisibility } from "./features";
import { MOBILE_TAB_ORDER, type MobileTabKey } from "./mobileTabs";

/** The bottom-bar destinations that sit behind a feature stage (lib/features.ts). MobileTabBar and
 * MobileNavMenu omit these when the stage hides them from this viewer; Settings has to know the same
 * thing, or its switch reads "on" for a button that can never appear. */
const TAB_FEATURE = {
  timeline: "timeline",
  articles: "library_articles",
  games: "games_trivia",
} as const satisfies Partial<Record<MobileTabKey, FeatureKey>>;

const FEATURE_KEYS = Object.values(TAB_FEATURE);

export interface TabStages {
  /** The owner account. Only he is told about a destination he cannot currently see; for everyone
   * else a Testing feature is simply absent, switch and all. */
  isOwner: boolean;
  /** This destination's stage for this viewer, or null for one that has no stage. */
  stageOf: (key: MobileTabKey) => FeatureVisibility | null;
  /** Whether the bar and the menus can draw this destination for this viewer. */
  isAvailable: (key: MobileTabKey) => boolean;
  /** The destinations hidden from this viewer, in bar order. */
  unavailable: MobileTabKey[];
}

export function useTabStages(): TabStages {
  const { isOwner } = useFeatureAdmin();
  const stages = useFeatures(FEATURE_KEYS);
  const stageOf = (key: MobileTabKey) =>
    key in TAB_FEATURE ? stages[TAB_FEATURE[key as keyof typeof TAB_FEATURE]] : null;
  const isAvailable = (key: MobileTabKey) => stageOf(key)?.visible !== false;
  return { isOwner, stageOf, isAvailable, unavailable: MOBILE_TAB_ORDER.filter((k) => !isAvailable(k)) };
}
