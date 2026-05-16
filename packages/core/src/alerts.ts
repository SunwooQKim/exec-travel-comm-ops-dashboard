import type { Equipment, OpsDataset, Person, TravelTeam } from "./schemas";

const STALE_MS = 48 * 60 * 60 * 1000;

export interface AlertItem {
  id: string;
  severity: "warning" | "critical";
  title: string;
  detail: string;
  entityType: "person" | "equipment";
  entityId: string;
}

function isStale(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > STALE_MS;
}

export function deriveAlerts(dataset: OpsDataset): AlertItem[] {
  const alerts: AlertItem[] = [];
  for (const p of dataset.people) {
    if (isStale(p.lastVerifiedAt)) {
      alerts.push({
        id: `stale-person-${p.id}`,
        severity: "warning",
        title: "Stale personnel verification",
        detail: `${p.name} last verified ${p.lastVerifiedAt}`,
        entityType: "person",
        entityId: p.id,
      });
    }
  }
  for (const e of dataset.equipment) {
    if (e.condition === "non_mission_capable" || e.condition === "maintenance") {
      alerts.push({
        id: `nmc-${e.id}`,
        severity: "critical",
        title: "Equipment not fully capable",
        detail: `${e.nomenclature} — ${e.condition.replaceAll("_", " ")}`,
        entityType: "equipment",
        entityId: e.id,
      });
    }
    if (e.calibrationDueAt && new Date(e.calibrationDueAt).getTime() < Date.now()) {
      alerts.push({
        id: `cal-${e.id}`,
        severity: "warning",
        title: "Calibration overdue",
        detail: `${e.nomenclature} due ${e.calibrationDueAt}`,
        entityType: "equipment",
        entityId: e.id,
      });
    }
    if (!e.custodian || e.custodian.trim() === "") {
      alerts.push({
        id: `cust-${e.id}`,
        severity: "warning",
        title: "Missing custodian",
        detail: e.nomenclature,
        entityType: "equipment",
        entityId: e.id,
      });
    }
  }
  return alerts;
}

export function readinessRollup(equipment: Equipment[]): {
  total: number;
  fmc: number;
  pmc: number;
  nmc: number;
} {
  let fmc = 0;
  let pmc = 0;
  let nmc = 0;
  for (const e of equipment) {
    if (e.condition === "fully_mission_capable") fmc++;
    else if (e.condition === "partially_mission_capable") pmc++;
    else if (e.condition === "non_mission_capable") nmc++;
  }
  return { total: equipment.length, fmc, pmc, nmc };
}

export function personnelByStatus(people: Person[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of people) {
    out[p.status] = (out[p.status] ?? 0) + 1;
  }
  return out;
}

export function personnelByTravelTeam(people: Person[]): Record<TravelTeam, number> {
  const out: Record<TravelTeam, number> = { secaf: 0, csaf: 0, cso: 0 };
  for (const p of people) {
    out[p.travelTeam]++;
  }
  return out;
}
