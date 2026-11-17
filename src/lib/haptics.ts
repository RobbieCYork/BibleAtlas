// Haptic feedback for key interactions. Native app only: in a browser every function returns
// immediately and @capacitor/haptics is never downloaded (dynamic import).
import { Capacitor } from "@capacitor/core";

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function run(fn: (h: typeof import("@capacitor/haptics")) => Promise<void>): Promise<void> {
  if (!isNative()) return;
  try {
    await fn(await import("@capacitor/haptics"));
  } catch {
    /* a device without a haptic engine, or the plugin missing: silently nothing */
  }
}

/** A light tick: a verse or range was selected. */
export function hapticSelect(): void {
  void run(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }));
}

/** A medium tap: a highlight colour was applied or changed. */
export function hapticTap(): void {
  void run(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Medium }));
}

/** Saved, or a right answer. */
export function hapticSuccess(): void {
  void run(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }));
}

/** A wrong answer. */
export function hapticError(): void {
  void run(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Error }));
}

/** Right or wrong in one call, for games. */
export function hapticAnswer(correct: boolean): void {
  if (correct) hapticSuccess();
  else hapticError();
}
