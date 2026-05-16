import type { Person, SubTeam, TravelTeam } from "./schemas";

/** Leadership-facing labels (Secretary / Chiefs’ travel cohorts). */
export const TRAVEL_TEAM_LABELS: Record<TravelTeam, string> = {
  secaf: "SECAF — Secretary of the Air Force team",
  csaf: "CSAF — Chief of Staff of the Air Force team",
  cso: "CSO — Chief of Space Operations team",
};

export const TRAVEL_TEAM_SHORT: Record<TravelTeam, string> = {
  secaf: "SECAF",
  csaf: "CSAF",
  cso: "CSO",
};

/** Map marker fill colors (people layer). */
export const TRAVEL_TEAM_MARKER_COLORS: Record<TravelTeam, string> = {
  secaf: "#3ddc97",
  csaf: "#5eeaff",
  cso: "#b388ff",
};

export const TRAVEL_TEAMS = ["secaf", "csaf", "cso"] as const satisfies readonly TravelTeam[];

export function subTeamById(subTeams: SubTeam[], id: string): SubTeam | undefined {
  return subTeams.find((s) => s.id === id);
}

/**
 * Rear / home pool: garrison, staff admin, and members awaiting the next deployment leg.
 * Forward-deployed people are everyone else (mission locations).
 */
export function isHomeStationPerson(person: Person, subTeams: SubTeam[]): boolean {
  if (person.subTeamId.endsWith("-rear")) return true;
  const st = subTeamById(subTeams, person.subTeamId);
  if (st?.id.endsWith("-rear")) return true;
  if (!st) return false;
  const n = st.name.toLowerCase();
  return n.includes("home station") || n.includes("/ rear") || n.includes("rear /");
}

export function personnelAtHomeStation(people: Person[], subTeams: SubTeam[]): Person[] {
  return people.filter((p) => isHomeStationPerson(p, subTeams));
}

export function personnelDeployedForward(people: Person[], subTeams: SubTeam[]): Person[] {
  return people.filter((p) => !isHomeStationPerson(p, subTeams));
}
