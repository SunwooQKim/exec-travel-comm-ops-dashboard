import { EQUIPMENT_CATALOG_PLACEHOLDERS } from "./equipment-catalog";
import { PENTAGON_REAR_POOL_MAP_ANCHOR } from "./geo";
import type { Equipment, EquipmentIssueLogEntry, OpsDataset, Person, Site, SubTeam, TravelTeam } from "./schemas";

const iso = (d: Date) => d.toISOString();

const ENLISTED_RANKS = [
  "AB",
  "Amn",
  "A1C",
  "SrA",
  "SrA",
  "SrA",
  "SSgt",
  "SSgt",
  "TSgt",
  "MSgt",
  "SMSgt",
  "CMSgt",
] as const;
const AFSC = "RF Trans";

const FIRST = [
  "Jordan",
  "Riley",
  "Casey",
  "Morgan",
  "Quinn",
  "Avery",
  "Parker",
  "Reese",
  "Drew",
  "Skyler",
  "Jamie",
  "Taylor",
  "Cameron",
  "Logan",
  "Harper",
  "Hayden",
  "Emerson",
  "Rowan",
  "Dakota",
  "Phoenix",
] as const;

const LAST = [
  "Hayes",
  "Nguyen",
  "Patel",
  "Kowalski",
  "Morales",
  "Okonkwo",
  "Frost",
  "Dubois",
  "Nakamura",
  "Silva",
  "Reed",
  "Vance",
  "Boyd",
  "Choi",
  "Ibrahim",
  "Martinez",
  "Olsen",
  "Park",
  "Singh",
  "Torres",
  "Walsh",
  "Yamazaki",
  "Abbott",
  "Bennett",
  "Carver",
  "Dalton",
  "Ellis",
  "Fuentes",
  "Griffin",
  "Hughes",
] as const;

function rankForIndex(i: number): (typeof ENLISTED_RANKS)[number] {
  return ENLISTED_RANKS[i % ENLISTED_RANKS.length];
}

function nameForIndex(i: number): string {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
}

type SubTeamSeed = SubTeam & { travelTeam: TravelTeam };

export function createSeedDataset(): OpsDataset {
  const now = new Date();
  /** Garrison / home for members not on mission (rear cohorts). */
  const pentagon = PENTAGON_REAR_POOL_MAP_ANCHOR;
  const tinker = { lat: 35.415, lng: -97.386 } as const;
  const andersen = { lat: 13.584, lng: 144.93 } as const;
  const ramstein = { lat: 49.436, lng: 7.6 } as const;
  const jber = { lat: 61.25, lng: -149.8 } as const;

  const sites: Site[] = [
    {
      id: "site-pentagon",
      name: "The Pentagon",
      country: "United States",
      timezone: "America/New_York",
      coordinates: pentagon,
    },
    {
      id: "site-tinker",
      name: "Tinker AFB",
      icao: "KTIK",
      country: "United States",
      timezone: "America/Chicago",
      coordinates: tinker,
    },
    {
      id: "site-andersen",
      name: "Andersen AFB",
      icao: "PGUA",
      country: "Guam",
      timezone: "Pacific/Guam",
      coordinates: andersen,
    },
    {
      id: "site-ramstein",
      name: "Ramstein AB",
      icao: "ETAR",
      country: "Germany",
      timezone: "Europe/Berlin",
      coordinates: ramstein,
    },
    {
      id: "site-jber",
      name: "Joint Base Elmendorf-Richardson",
      icao: "PAED",
      country: "United States",
      timezone: "America/Anchorage",
      coordinates: jber,
    },
  ];

  const subTeams: SubTeamSeed[] = [
    {
      id: "st-secaf-sin",
      travelTeam: "secaf",
      name: "SECAF — Singapore comm detail",
      locationLabel: "Singapore",
      coordinates: { lat: 1.3521, lng: 103.8198 },
      missionSummary: "Eight-member detachment; HF/SATCOM support (demo).",
    },
    {
      id: "st-secaf-geo",
      travelTeam: "secaf",
      name: "SECAF — Georgia advance party",
      locationLabel: "Robins AFB, GA",
      coordinates: { lat: 32.6401, lng: -83.5919 },
      missionSummary: "Two-member advance / relay node (demo).",
    },
    {
      id: "st-secaf-deu",
      travelTeam: "secaf",
      name: "SECAF — Germany node",
      locationLabel: "Ramstein AB",
      coordinates: ramstein,
      missionSummary: "European corridor comm package (demo).",
    },
    {
      id: "st-secaf-rear",
      travelTeam: "secaf",
      name: "SECAF — Pentagon / home station",
      locationLabel: "The Pentagon",
      coordinates: pentagon,
      missionSummary: "Garrison pool & staging — not currently deployed (demo).",
    },
    {
      id: "st-csaf-uk",
      travelTeam: "csaf",
      name: "CSAF — United Kingdom detail",
      locationLabel: "RAF Mildenhall area",
      coordinates: { lat: 52.3613, lng: 0.4904 },
      missionSummary: "UK trip comm cell (demo).",
    },
    {
      id: "st-csaf-jp",
      travelTeam: "csaf",
      name: "CSAF — Japan detail",
      locationLabel: "Yokota AB area",
      coordinates: { lat: 35.7485, lng: 139.348 },
      missionSummary: "INDOPACOM leg support (demo).",
    },
    {
      id: "st-csaf-conus",
      travelTeam: "csaf",
      name: "CSAF — NCR / CONUS trip",
      locationLabel: "Washington D.C.",
      coordinates: { lat: 38.9072, lng: -77.0369 },
      missionSummary: "CONUS movement team (demo).",
    },
    {
      id: "st-csaf-rear",
      travelTeam: "csaf",
      name: "CSAF — Pentagon / home station",
      locationLabel: "The Pentagon",
      coordinates: pentagon,
      missionSummary: "Garrison pool & staging — not currently deployed (demo).",
    },
    {
      id: "st-cso-pet",
      travelTeam: "cso",
      name: "CSO — Peterson SFB detail",
      locationLabel: "Peterson SFB, CO",
      coordinates: { lat: 38.8057, lng: -104.7004 },
      missionSummary: "USSF staff & transport comm (demo).",
    },
    {
      id: "st-cso-cape",
      travelTeam: "cso",
      name: "CSO — Cape support detail",
      locationLabel: "Cape Canaveral SFS, FL",
      coordinates: { lat: 28.4889, lng: -80.5778 },
      missionSummary: "Launch support comm subset (demo).",
    },
    {
      id: "st-cso-ak",
      travelTeam: "cso",
      name: "CSO — Alaska range team",
      locationLabel: "JBER",
      coordinates: jber,
      missionSummary: "Arctic / range comm (demo).",
    },
    {
      id: "st-cso-rear",
      travelTeam: "cso",
      name: "CSO — Pentagon / home station",
      locationLabel: "The Pentagon",
      coordinates: pentagon,
      missionSummary: "Garrison pool & staging — not currently deployed (demo).",
    },
  ];

  const assignments: { subTeamId: string; n: number }[] = [
    { subTeamId: "st-secaf-sin", n: 8 },
    { subTeamId: "st-secaf-geo", n: 2 },
    { subTeamId: "st-secaf-deu", n: 5 },
    { subTeamId: "st-secaf-rear", n: 12 },
    { subTeamId: "st-csaf-uk", n: 6 },
    { subTeamId: "st-csaf-jp", n: 7 },
    { subTeamId: "st-csaf-conus", n: 4 },
    { subTeamId: "st-csaf-rear", n: 10 },
    { subTeamId: "st-cso-pet", n: 8 },
    { subTeamId: "st-cso-cape", n: 5 },
    { subTeamId: "st-cso-ak", n: 3 },
    { subTeamId: "st-cso-rear", n: 10 },
  ];

  const subById = new Map(subTeams.map((s) => [s.id, s]));
  const people: Person[] = [];
  let idx = 0;
  for (const asg of assignments) {
    const st = subById.get(asg.subTeamId);
    if (!st) throw new Error(`missing subteam ${asg.subTeamId}`);
    const isRear = asg.subTeamId.endsWith("-rear");
    for (let k = 0; k < asg.n; k++) {
      const id = `p-${String(idx + 1).padStart(3, "0")}`;
      const rank = rankForIndex(idx);
      const nm = nameForIndex(idx);
      const status = isRear ? "garrison" : idx % 4 === 0 ? "tdy" : "deployed";
      const hoursAgo = (idx * 13) % 72;
      people.push({
        id,
        name: nm,
        rankRole: `${rank} — ${AFSC}`,
        unit: st.locationLabel,
        travelTeam: st.travelTeam,
        subTeamId: st.id,
        status,
        locationLabel: st.locationLabel,
        coordinates: { lat: st.coordinates.lat, lng: st.coordinates.lng },
        homeCoordinates: { lat: pentagon.lat, lng: pentagon.lng },
        homeLocationLabel: "The Pentagon — home station (demo)",
        siteId: isRear ? "site-pentagon" : undefined,
        lastVerifiedAt: iso(new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)),
      });
      idx++;
    }
  }

  const sinDetail = subById.get("st-secaf-sin")!;
  const firstSin = people.find((p) => p.subTeamId === "st-secaf-sin");
  const firstDeu = people.find((p) => p.subTeamId === "st-secaf-deu");
  const firstCsafRearForDemo = people.find((p) => p.subTeamId === "st-csaf-rear");

  const equipmentDemo: Equipment[] = [
    {
      id: "e-201",
      nomenclature: "SATCOM fly-away kit (demo)",
      serialOrId: "SN-DEMO-88421",
      custodian: firstSin ? firstSin.name : `${rankForIndex(0)} ${nameForIndex(0)}`,
      homeStation: "The Pentagon (demo)",
      locationLabel: sinDetail.locationLabel,
      coordinates: { lat: sinDetail.coordinates.lat, lng: sinDetail.coordinates.lng },
      homeCoordinates: pentagon,
      homeLocationLabel: "The Pentagon",
      condition: "fully_mission_capable",
      calibrationDueAt: iso(new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)),
      subTeamId: "st-secaf-sin",
      category: "Transport Layer (SATCOM)",
      description: "Legacy demo kit carried with SECAF Singapore detail.",
      personId: firstSin?.id,
    },
    {
      id: "e-202",
      nomenclature: "Tactical radio set",
      serialOrId: "TR-992",
      custodian: firstDeu ? firstDeu.name : `${rankForIndex(12)} ${nameForIndex(12)}`,
      homeStation: "Ramstein AB",
      locationLabel: "Ramstein AB",
      coordinates: ramstein,
      siteId: "site-ramstein",
      condition: "partially_mission_capable",
      calibrationDueAt: iso(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
      subTeamId: "st-secaf-deu",
      category: "End-User Devices (EUDs)",
      personId: firstDeu?.id,
    },
    {
      id: "e-203",
      nomenclature: "Mobile server stack",
      custodian: firstCsafRearForDemo ? firstCsafRearForDemo.name : `${rankForIndex(24)} ${nameForIndex(24)}`,
      homeStation: "The Pentagon (demo)",
      locationLabel: "The Pentagon",
      coordinates: pentagon,
      homeCoordinates: pentagon,
      homeLocationLabel: "The Pentagon",
      siteId: "site-pentagon",
      condition: "maintenance",
      subTeamId: "st-csaf-rear",
      category: "Cryptographic & Boundary Gear (COMSEC)",
      personId: firstCsafRearForDemo?.id,
    },
  ];

  const forwardSubTeamIds = subTeams.filter((s) => !s.id.endsWith("-rear")).map((s) => s.id);
  const conds = ["fully_mission_capable", "fully_mission_capable", "partially_mission_capable", "unknown"] as const;

  const equipmentCatalog: Equipment[] = EQUIPMENT_CATALOG_PLACEHOLDERS.map((row, i) => {
    const subTeamId = forwardSubTeamIds[i % forwardSubTeamIds.length]!;
    const st = subById.get(subTeamId)!;
    const custodianPerson = people.find((p) => p.subTeamId === subTeamId);
    return {
      id: `e-cat-${String(i + 1).padStart(3, "0")}`,
      nomenclature: row.nomenclature,
      serialOrId: `PLACEHOLDER-${String(i + 1).padStart(3, "0")}`,
      custodian: custodianPerson ? custodianPerson.name : "TBD — assign custodian",
      personId: custodianPerson?.id,
      homeStation: "The Pentagon (catalog)",
      locationLabel: st.locationLabel,
      coordinates: { lat: st.coordinates.lat, lng: st.coordinates.lng },
      homeCoordinates: pentagon,
      homeLocationLabel: "The Pentagon",
      condition: conds[i % conds.length]!,
      category: row.category,
      description: row.description,
      subTeamId,
      isPlaceholder: true,
    };
  });

  const equipment = [...equipmentDemo, ...equipmentCatalog];

  const equipmentIssueLog: EquipmentIssueLogEntry[] = [
    {
      id: "iss-1",
      reportedAt: iso(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)),
      symptom: "VSAT modem lost sync after host-nation power flicker; red alarm on HAIPE path.",
      context: "Forward SATCOM det — humid op",
      resolution:
        "Confirmed conditioner bypass at drop; re-racked per PM pocket checklist. Resync via NOC script; documented grounding defect for civil engineering.",
      equipmentId: "e-cat-001",
      tags: ["satcom", "power", "haipe", "sync"],
    },
    {
      id: "iss-2",
      reportedAt: iso(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
      symptom: "BGAN drops when tactical Wi-Fi and encryptor both pinned to same UPS leg.",
      context: "Multi-team rehearsal",
      resolution: "Split loads per TO — BGAN on conditioner A, COMSEC stack on B with staggered boot order.",
      equipmentId: "e-cat-002",
      tags: ["bgan", "ups", "load-shed"],
    },
    {
      id: "iss-3",
      reportedAt: iso(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)),
      symptom: "Secure handset shows register but no dial tone after tent relocation.",
      context: "Portable SCIF tear-down / re-raise",
      resolution: "Reseated fiber to VoIP gateway; updated voice VLAN at deployable switch; cold-boot HAIPE pair.",
      equipmentId: "e-cat-006",
      tags: ["voip", "scif", "lan"],
    },
  ];

  const pSingapore = people.find((p) => p.subTeamId === "st-secaf-sin");
  if (!pSingapore) throw new Error("seed: Singapore detail empty");
  const pCsafRear = people.find((p) => p.subTeamId === "st-csaf-rear");
  if (!pCsafRear) throw new Error("seed: CSAF rear empty");

  const sin = subById.get("st-secaf-sin")!;
  const events = [
    {
      id: "ev-1",
      at: iso(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)),
      kind: "movement" as const,
      summary: "SECAF Singapore detail footprint confirmed (demo)",
      entityType: "person" as const,
      entityId: pSingapore.id,
      actor: "Ops Desk",
      meta: {
        patch: {
          lat: sin.coordinates.lat,
          lng: sin.coordinates.lng,
          locationLabel: "Singapore",
        },
      },
    },
    {
      id: "ev-2",
      at: iso(new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)),
      kind: "status_change" as const,
      summary: "CSAF rear party posture update (demo)",
      entityType: "person" as const,
      entityId: pCsafRear.id,
    },
    {
      id: "ev-3",
      at: iso(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      kind: "equipment_condition" as const,
      summary: "Tactical radio set — awaiting parts (demo)",
      entityType: "equipment" as const,
      entityId: "e-202",
      actor: "Maintenance",
    },
    {
      id: "ev-4",
      at: iso(new Date(now.getTime() - 8 * 60 * 60 * 1000)),
      kind: "movement" as const,
      summary: "SATCOM kit confirmed with Singapore detail (demo)",
      entityType: "equipment" as const,
      entityId: "e-201",
      actor: "Cargo",
      meta: {
        patch: {
          lat: sin.coordinates.lat,
          lng: sin.coordinates.lng,
          locationLabel: "Singapore",
        },
      },
    },
  ];

  return {
    version: 2,
    sites,
    subTeams,
    people,
    equipment,
    equipmentIssueLog,
    events,
    updatedAt: iso(now),
  };
}
