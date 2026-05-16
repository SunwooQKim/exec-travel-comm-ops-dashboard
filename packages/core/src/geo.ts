import type { OpsDataset } from "./schemas";
import { isHomeStationPerson } from "./teams";

/**
 * Fixed map point for The Pentagon / comm wing rear pool (Arlington County, VA, near Washington, D.C.).
 * The personnel “home station” ring uses this only — never {@link Site} table coordinates, so a mis-keyed
 * or imported `site-pentagon` row (e.g. coordinates pasted from another installation) cannot move that ring.
 */
export const PENTAGON_REAR_POOL_MAP_ANCHOR = {
  lat: 38.871,
  lng: -77.056,
} as const;

/** Demo / reference point for Tinker AFB, OK — used only to detect mistaken Pentagon coordinates. */
const TINKER_AFB_REFERENCE = { lat: 35.415, lng: -97.386 } as const;

function coordinatesLookLikeTinkerAfb(lat: number, lng: number): boolean {
  return (
    Math.abs(lat - TINKER_AFB_REFERENCE.lat) < 0.4 && Math.abs(lng - TINKER_AFB_REFERENCE.lng) < 0.4
  );
}

/** If `site-pentagon` was saved with Tinker (or nearby) coordinates, snap it back to Arlington. */
export function normalizeCommOpsDataset(dataset: OpsDataset): OpsDataset {
  let changed = false;

  const sites = dataset.sites.map((s) => {
    if (s.id !== "site-pentagon") return s;
    if (!coordinatesLookLikeTinkerAfb(s.coordinates.lat, s.coordinates.lng)) return s;
    changed = true;
    return {
      ...s,
      coordinates: { ...PENTAGON_REAR_POOL_MAP_ANCHOR },
    };
  });

  const subTeams = dataset.subTeams.map((st) => {
    if (!st.id.endsWith("-rear")) return st;
    if (!coordinatesLookLikeTinkerAfb(st.coordinates.lat, st.coordinates.lng)) return st;
    changed = true;
    return {
      ...st,
      coordinates: { ...PENTAGON_REAR_POOL_MAP_ANCHOR },
    };
  });

  const people = dataset.people.map((p) => {
    if (!isHomeStationPerson(p, dataset.subTeams)) return p;
    if (!coordinatesLookLikeTinkerAfb(p.coordinates.lat, p.coordinates.lng)) return p;
    changed = true;
    const loc =
      /tinker/i.test(p.locationLabel) || /tinker/i.test(p.unit)
        ? "The Pentagon"
        : p.locationLabel;
    return {
      ...p,
      coordinates: { ...PENTAGON_REAR_POOL_MAP_ANCHOR },
      locationLabel: loc,
      unit: /tinker/i.test(p.unit) ? "The Pentagon" : p.unit,
    };
  });

  if (!changed) return dataset;
  return { ...dataset, sites, subTeams, people };
}
