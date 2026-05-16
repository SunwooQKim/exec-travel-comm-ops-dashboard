import type { OpsDataset, OpsEvent, Person, Equipment } from "./schemas";

function parseTime(isoStr: string): number {
  return new Date(isoStr).getTime();
}

/** Events sorted ascending by time */
export function sortEvents(events: OpsEvent[]): OpsEvent[] {
  return [...events].sort((a, b) => parseTime(a.at) - parseTime(b.at));
}

export interface ReplayFrame {
  at: string;
  people: Person[];
  equipment: Equipment[];
}

/**
 * Reconstruct approximate positions at time T using last known state before T from events.
 * MVP heuristic: start from current dataset; walk events after T in reverse... simplified:
 * For prototype we apply movements: each movement event before/at T updates entity location from snapshot in meta if present,
 * else we use seeded initial locations by replaying forward from empty - too heavy.
 *
 * Simpler approach for MVP: store only current state in people/equipment; replay only highlights events up to T on map
 * and keeps current coordinates (demo). Proper implementation would use event-sourced state.
 *
 * Here we replay **forward** from synthetic baselines: clone current entities, sort events ascending,
 * for each event <= T with meta.patch apply patch.
 */
export function buildStateAtTime(dataset: OpsDataset, atIso: string): ReplayFrame {
  const t = parseTime(atIso);
  const people = structuredClone(dataset.people).map((p) => ({
    ...p,
    coordinates: p.homeCoordinates ?? p.coordinates,
    locationLabel: p.homeLocationLabel ?? p.locationLabel,
  }));
  const equipment = structuredClone(dataset.equipment).map((e) => ({
    ...e,
    coordinates: e.homeCoordinates ?? e.coordinates,
    locationLabel: e.homeLocationLabel ?? e.homeStation,
  }));
  const sorted = sortEvents(dataset.events);

  for (const ev of sorted) {
    if (parseTime(ev.at) > t) break;
    const patch = ev.meta?.patch as
      | { lat?: number; lng?: number; locationLabel?: string }
      | undefined;
    if (ev.entityType === "person" && ev.entityId && patch) {
      const p = people.find((x) => x.id === ev.entityId);
      if (p) {
        if (patch.lat != null && patch.lng != null) {
          p.coordinates = { lat: patch.lat, lng: patch.lng };
        }
        if (patch.locationLabel) p.locationLabel = patch.locationLabel;
      }
    }
    if (ev.entityType === "equipment" && ev.entityId && patch) {
      const e = equipment.find((x) => x.id === ev.entityId);
      if (e) {
        if (patch.lat != null && patch.lng != null) {
          e.coordinates = { lat: patch.lat, lng: patch.lng };
        }
        if (patch.locationLabel) e.locationLabel = patch.locationLabel;
      }
    }
  }

  return { at: atIso, people, equipment };
}

export function latestEventTime(dataset: OpsDataset): number {
  if (dataset.events.length === 0) return Date.now();
  return Math.max(...dataset.events.map((e) => parseTime(e.at)));
}

export function earliestEventTime(dataset: OpsDataset): number {
  if (dataset.events.length === 0) return Date.now();
  return Math.min(...dataset.events.map((e) => parseTime(e.at)));
}
