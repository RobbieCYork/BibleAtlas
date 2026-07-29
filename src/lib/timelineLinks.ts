import { timelineEvents } from "../data/timelineEvents";
import { people } from "../data/people";
import type { Person, TimelineEvent } from "../data/types";

/**
 * Thin lookup layer connecting entities (people, locations, POIs, topics) to the timeline events
 * they are central to, via TimelineEvent.primaryEntityIds. Used by the link-choice intercept in
 * VerseText/LinkedVerseText to decide whether a clicked name should offer a "View in Timeline"
 * option — deliberately separate from the auto-linker's name-resolution logic, which it never
 * touches or changes.
 */

/** entityId -> events whose primaryEntityIds include it — built once, on first lookup. */
let eventIndex: Map<string, TimelineEvent[]> | null = null;

function buildEventIndex(): Map<string, TimelineEvent[]> {
  const index = new Map<string, TimelineEvent[]>();
  for (const event of timelineEvents) {
    for (const entityId of event.primaryEntityIds ?? []) {
      const list = index.get(entityId);
      if (list) list.push(event);
      else index.set(entityId, [event]);
    }
  }
  return index;
}

/** Every timeline event whose primaryEntityIds includes this entity id (empty for most entities). */
export function getTimelineEventsForEntity(entityId: string): TimelineEvent[] {
  if (!eventIndex) eventIndex = buildEventIndex();
  return eventIndex.get(entityId) ?? [];
}

/** Lifespan fields are being added to Person by parallel work — treat them as optional. */
type PersonMaybeLifespan = Person & { bornYear?: number };

/** personId -> has lifespan data (bornYear present) — built once, on first lookup. */
let lifespanIds: Set<string> | null = null;

/** True when this person carries lifespan data (bornYear set), i.e. they have a bar on the
 * timeline's Lifespans lane even if no event names them in primaryEntityIds. */
export function personHasLifespan(personId: string): boolean {
  if (!lifespanIds) {
    lifespanIds = new Set(
      (people as PersonMaybeLifespan[])
        .filter((p) => typeof p.bornYear === "number")
        .map((p) => p.id)
    );
  }
  return lifespanIds.has(personId);
}
