import { z } from "zod";

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const PersonStatusSchema = z.enum([
  "garrison",
  "tdy",
  "deployed",
  "leave",
  "training",
  "td",
]);

export const EquipmentConditionSchema = z.enum([
  "fully_mission_capable",
  "partially_mission_capable",
  "non_mission_capable",
  "maintenance",
  "unknown",
]);

export const SiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  icao: z.string().optional(),
  country: z.string(),
  timezone: z.string().optional(),
  coordinates: GeoPointSchema,
});

/** Top-level travel cohort (executive travel organization). */
export const TravelTeamSchema = z.enum(["secaf", "csaf", "cso"]);

/** Smaller deployed team inside a travel cohort (e.g. “7 to Singapore”). */
export const SubTeamSchema = z.object({
  id: z.string(),
  travelTeam: TravelTeamSchema,
  name: z.string(),
  locationLabel: z.string(),
  coordinates: GeoPointSchema,
  missionSummary: z.string().optional(),
});

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  rankRole: z.string(),
  unit: z.string(),
  travelTeam: TravelTeamSchema,
  /** Member of this deployed / rear sub-team within the travel cohort. */
  subTeamId: z.string(),
  contactNote: z.string().optional(),
  status: PersonStatusSchema,
  locationLabel: z.string(),
  coordinates: GeoPointSchema,
  /** Baseline location before replayed movement events (ops picture “home” / start) */
  homeCoordinates: GeoPointSchema.optional(),
  homeLocationLabel: z.string().optional(),
  siteId: z.string().optional(),
  ordersRemarks: z.string().optional(),
  lastVerifiedAt: z.string(),
});

export const EquipmentSchema = z.object({
  id: z.string(),
  nomenclature: z.string(),
  serialOrId: z.string().optional(),
  custodian: z.string(),
  homeStation: z.string(),
  locationLabel: z.string(),
  coordinates: GeoPointSchema,
  homeCoordinates: GeoPointSchema.optional(),
  homeLocationLabel: z.string().optional(),
  siteId: z.string().optional(),
  condition: EquipmentConditionSchema,
  calibrationDueAt: z.string().optional(),
  accountabilityRef: z.string().optional(),
  /** Capability group, e.g. “Transport Layer (SATCOM)”. */
  category: z.string().optional(),
  /** Plain-language role of the kit (shown in admin / knowledge-style workflows). */
  description: z.string().optional(),
  /** Deployed cell carrying this kit (same id space as `Person.subTeamId`). */
  subTeamId: z.string().optional(),
  /** Optional link to a person record accountable for the kit (custodian remains human-readable). */
  personId: z.string().optional(),
  /** Catalog / template row — not fully serialized to a real asset yet. */
  isPlaceholder: z.boolean().optional(),
});

/** Past symptoms & fixes — feed future search / assistant tooling so recurring faults resolve faster. */
export const EquipmentIssueLogEntrySchema = z.object({
  id: z.string(),
  reportedAt: z.string(),
  /** Free text: what broke or what the operator saw. */
  symptom: z.string(),
  /** Mission, site, or leg (e.g. “SECAF Singapore detail”). */
  context: z.string().optional(),
  /** What worked (procedure, LRU swap, config). */
  resolution: z.string().optional(),
  /** Related equipment row, when known. */
  equipmentId: z.string().optional(),
  /** Broad buckets for search (e.g. “satcom”, “haipe”, “power”). */
  tags: z.array(z.string()).optional(),
});

export const EventKindSchema = z.enum([
  "movement",
  "status_change",
  "equipment_condition",
  "note",
]);

export const OpsEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  kind: EventKindSchema,
  summary: z.string(),
  entityType: z.enum(["person", "equipment"]).optional(),
  entityId: z.string().optional(),
  actor: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const OpsDatasetSchema = z.object({
  version: z.literal(2),
  sites: z.array(SiteSchema),
  subTeams: z.array(SubTeamSchema),
  people: z.array(PersonSchema),
  equipment: z.array(EquipmentSchema),
  events: z.array(OpsEventSchema),
  /** Running log of field issues + resolutions — ground truth for repeat failures on future missions. */
  equipmentIssueLog: z.array(EquipmentIssueLogEntrySchema).default([]),
  updatedAt: z.string(),
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;
export type PersonStatus = z.infer<typeof PersonStatusSchema>;
export type EquipmentCondition = z.infer<typeof EquipmentConditionSchema>;
export type Site = z.infer<typeof SiteSchema>;
export type TravelTeam = z.infer<typeof TravelTeamSchema>;
export type SubTeam = z.infer<typeof SubTeamSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Equipment = z.infer<typeof EquipmentSchema>;
export type EquipmentIssueLogEntry = z.infer<typeof EquipmentIssueLogEntrySchema>;
export type OpsEvent = z.infer<typeof OpsEventSchema>;
export type OpsDataset = z.infer<typeof OpsDatasetSchema>;
