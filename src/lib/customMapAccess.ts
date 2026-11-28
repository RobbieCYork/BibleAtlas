import { CUSTOM_MAP_FOR_EVERYONE, useFeatureAdmin } from "./features";

/** What this viewer may do with the Custom Map builder. */
export interface CustomMapAccess {
  /** Draw the "Create custom map" button at all. */
  visible: boolean;
  /** May open the builder and save what it makes. */
  canUse: boolean;
  /** The owner is seeing it only because Test view is on: draw the orange Testing marker. */
  inTesting: boolean;
}

/**
 * THE gate for the Custom Map builder. Nothing else decides who sees or uses it.
 *
 * Today: the owner in Test view only (same audience as a Testing feature), until
 * CUSTOM_MAP_FOR_EVERYONE is turned on.
 *
 * When it becomes a paid feature, change only this function: `visible` true for everyone, and
 * `canUse` from the paid entitlement (the parked paid work asks `has_entitlement('plus')`, exposed
 * as billing `hasPlus`). A visible-but-not-entitled viewer then needs an upgrade prompt where
 * App.tsx opens the builder; none exists yet because nothing can be bought yet. The check is in the
 * app only: the builder runs entirely on the device and reads no protected data.
 */
export function useCustomMapAccess(): CustomMapAccess {
  const { isOwner, testView } = useFeatureAdmin();
  const preview = isOwner && testView;
  const visible = CUSTOM_MAP_FOR_EVERYONE || preview;
  return { visible, canUse: visible, inTesting: !CUSTOM_MAP_FOR_EVERYONE && preview };
}
