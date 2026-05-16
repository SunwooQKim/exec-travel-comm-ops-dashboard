import {
  PersonSchema,
  EquipmentSchema,
  SubTeamSchema,
  type Person,
  type Equipment,
  type OpsDataset,
  type PersonStatus,
  type EquipmentCondition,
  type TravelTeam,
  type SubTeam,
  TRAVEL_TEAMS,
  TRAVEL_TEAM_LABELS,
  TRAVEL_TEAM_SHORT,
  subTeamById,
} from "@comm-ops/core";
import { MapPin, Trash2, Upload } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useOps } from "../store/OpsContext";

const personStatuses: PersonStatus[] = [
  "garrison",
  "tdy",
  "deployed",
  "leave",
  "training",
  "td",
];
const equipConditions: EquipmentCondition[] = [
  "fully_mission_capable",
  "partially_mission_capable",
  "non_mission_capable",
  "maintenance",
  "unknown",
];

export function AdminPanel() {
  const {
    dataset,
    importJson,
    exportJson,
    resetToSeed,
    upsertPerson,
    upsertEquipment,
    upsertSubTeam,
    deleteSubTeam,
    deletePerson,
    deleteEquipment,
    setMapPickTarget,
    setPickMode,
  } = useOps();

  const [tab, setTab] = useState<"people" | "equipment" | "data">("people");
  const [jsonArea, setJsonArea] = useState("");
  const [adminTeamView, setAdminTeamView] = useState<TravelTeam | "all">("all");
  const [newSubTeamTravelTeam, setNewSubTeamTravelTeam] = useState<TravelTeam>("secaf");

  const rearId = (team: TravelTeam) => `st-${team}-rear`;

  const blankPerson = (): Person =>
    PersonSchema.parse({
      id: `p-${crypto.randomUUID().slice(0, 8)}`,
      name: "",
      rankRole: "Amn — RF Trans",
      unit: "",
      travelTeam: "secaf",
      subTeamId: rearId("secaf"),
      status: "garrison",
      locationLabel: "The Pentagon",
      coordinates: { lat: 38.871, lng: -77.056 },
      homeCoordinates: { lat: 38.871, lng: -77.056 },
      homeLocationLabel: "The Pentagon",
      lastVerifiedAt: new Date().toISOString(),
    });

  const blankSubTeam = (travelTeam: TravelTeam): SubTeam =>
    SubTeamSchema.parse({
      id: `st-${travelTeam}-${crypto.randomUUID().slice(0, 6)}`,
      travelTeam,
      name: "",
      locationLabel: "",
      coordinates: { lat: 38.871, lng: -77.056 },
      missionSummary: "",
    });

  const blankEquipment = (): Equipment =>
    EquipmentSchema.parse({
      id: `e-${crypto.randomUUID().slice(0, 8)}`,
      nomenclature: "",
      custodian: "",
      homeStation: "",
      locationLabel: "",
      coordinates: { lat: 0, lng: 0 },
      condition: "unknown",
    });

  const [draftPerson, setDraftPerson] = useState<Person | null>(null);
  const [draftEquipment, setDraftEquipment] = useState<Equipment | null>(null);
  const [draftSubTeam, setDraftSubTeam] = useState<SubTeam | null>(null);

  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="panel-header">
        <span>Command post</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(["people", "equipment", "data"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${tab === t ? "chip-active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-y" style={{ padding: 12, flex: 1 }}>
        {tab === "people" && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <button type="button" className="btn btn-primary" onClick={() => setDraftPerson(blankPerson())}>
                New person
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  className="select"
                  style={{ width: 140 }}
                  value={newSubTeamTravelTeam}
                  onChange={(e) => setNewSubTeamTravelTeam(e.target.value as TravelTeam)}
                >
                  {TRAVEL_TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {TRAVEL_TEAM_SHORT[t]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDraftSubTeam(blankSubTeam(newSubTeamTravelTeam))}
                >
                  New sub-team
                </button>
              </div>
            </div>

            {draftSubTeam && (
              <SubTeamForm
                key={draftSubTeam.id}
                initial={draftSubTeam}
                onCancel={() => setDraftSubTeam(null)}
                onSave={(st) => {
                  upsertSubTeam(SubTeamSchema.parse(st));
                  setDraftSubTeam(null);
                }}
                onDelete={
                  draftSubTeam.id.endsWith("-rear")
                    ? undefined
                    : () => {
                        if (confirm("Delete sub-team? Members will move to the cohort rear team.")) {
                          deleteSubTeam(draftSubTeam.id);
                          setDraftSubTeam(null);
                        }
                      }
                }
              />
            )}

            {draftPerson && (
              <PersonForm
                key={draftPerson.id}
                initial={draftPerson}
                subTeams={dataset.subTeams}
                onCancel={() => setDraftPerson(null)}
                onSave={(p) => {
                  upsertPerson(PersonSchema.parse(p));
                  setDraftPerson(null);
                }}
                onPickMap={() => {
                  upsertPerson(PersonSchema.parse(draftPerson));
                  setMapPickTarget({ kind: "person", id: draftPerson.id });
                  setPickMode(true);
                }}
              />
            )}

            <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
              <button
                type="button"
                className={`chip ${adminTeamView === "all" ? "chip-active" : ""}`}
                onClick={() => setAdminTeamView("all")}
              >
                All teams
              </button>
              {TRAVEL_TEAMS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${adminTeamView === t ? "chip-active" : ""}`}
                  title={TRAVEL_TEAM_LABELS[t]}
                  onClick={() => setAdminTeamView(t)}
                >
                  {TRAVEL_TEAM_SHORT[t]}
                </button>
              ))}
            </div>

            {(adminTeamView === "all" ? TRAVEL_TEAMS : [adminTeamView]).map((team) => {
              const teamSubs = dataset.subTeams.filter((s) => s.travelTeam === team);
              const teamPeople = dataset.people.filter((p) => p.travelTeam === team);
              if (adminTeamView !== "all" && adminTeamView !== team) return null;
              return (
                <details key={team} open style={{ marginBottom: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <summary style={{ cursor: "pointer", padding: "10px 12px", fontWeight: 700, fontSize: 12 }}>
                    {TRAVEL_TEAM_SHORT[team]} — {teamPeople.length} member{teamPeople.length === 1 ? "" : "s"} ·{" "}
                    {TRAVEL_TEAM_LABELS[team]}
                  </summary>
                  <div style={{ padding: "4px 8px 12px" }}>
                    {teamSubs
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((st) => {
                        const members = teamPeople.filter((p) => p.subTeamId === st.id);
                        return (
                          <details key={st.id} style={{ marginTop: 8, background: "rgba(0,0,0,0.12)" }}>
                            <summary style={{ cursor: "pointer", padding: "8px 10px", fontSize: 11 }}>
                              <strong>{st.name || st.id}</strong> ({members.length}) — {st.locationLabel}
                              <span style={{ marginLeft: 8 }}>
                                <button
                                  type="button"
                                  className="btn"
                                  style={{ padding: "2px 8px", fontSize: 10 }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDraftSubTeam(st);
                                  }}
                                >
                                  Edit sub-team
                                </button>
                              </span>
                            </summary>
                            <div style={{ padding: "4px 8px 10px" }}>
                              {members.length === 0 ? (
                                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>No members assigned.</div>
                              ) : (
                                members.map((p) => (
                                  <div
                                    key={p.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "6px 0",
                                      borderBottom: "1px solid var(--border)",
                                    }}
                                  >
                                    <div style={{ flex: 1, fontSize: 12 }}>
                                      <strong>{p.rankRole.split("—")[0]?.trim()}</strong> {p.name}
                                      <div style={{ color: "var(--text-dim)", fontSize: 11 }}>{p.status} · {p.locationLabel}</div>
                                    </div>
                                    <button type="button" className="btn" onClick={() => setDraftPerson(p)}>
                                      Edit
                                    </button>
                                    <button type="button" className="btn" onClick={() => deletePerson(p.id)}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </details>
                        );
                      })}
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {tab === "equipment" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setDraftEquipment(blankEquipment())}
              >
                New equipment
              </button>
            </div>
            {draftEquipment && (
              <EquipmentForm
                key={draftEquipment.id}
                dataset={dataset}
                initial={draftEquipment}
                onCancel={() => setDraftEquipment(null)}
                onSave={(e) => {
                  upsertEquipment(EquipmentSchema.parse(e));
                  setDraftEquipment(null);
                }}
                onPickMap={() => {
                  upsertEquipment(EquipmentSchema.parse(draftEquipment));
                  setMapPickTarget({ kind: "equipment", id: draftEquipment.id });
                  setPickMode(true);
                }}
              />
            )}
            <div style={{ marginTop: 16 }}>
              {dataset.equipment.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong>{e.nomenclature || e.id}</strong>
                    {e.isPlaceholder && (
                      <span className="chip" style={{ marginLeft: 6, fontSize: 9 }}>
                        placeholder
                      </span>
                    )}
                    <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{e.custodian}</div>
                    {e.category && (
                      <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{e.category}</div>
                    )}
                  </div>
                  <button type="button" className="btn" onClick={() => setDraftEquipment(e)}>
                    Edit
                  </button>
                  <button type="button" className="btn" onClick={() => deleteEquipment(e.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "data" && (
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const blob = new Blob([exportJson()], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "comm-ops-dataset.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export JSON
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  try {
                    importJson(jsonArea || exportJson());
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                <Upload size={14} /> Import JSON
              </button>
              <button type="button" className="btn" onClick={() => resetToSeed()}>
                Reset demo seed
              </button>
            </div>
            <textarea
              className="textarea"
              rows={12}
              value={jsonArea}
              onChange={(e) => setJsonArea(e.target.value)}
              placeholder="Paste JSON dataset to import, or edit and click Import…"
              style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SubTeamForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: SubTeam;
  onSave: (st: SubTeam) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <div className="panel" style={{ padding: 12, marginBottom: 12, background: "var(--bg-panel-2)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Sub-team (deployed group)</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Travel cohort">
          <select
            className="select"
            value={v.travelTeam}
            onChange={(e) => setV({ ...v, travelTeam: e.target.value as TravelTeam })}
          >
            {TRAVEL_TEAMS.map((t) => (
              <option key={t} value={t}>
                {TRAVEL_TEAM_SHORT[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Name (e.g. Singapore detail)">
          <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Location label">
          <input
            className="input"
            value={v.locationLabel}
            onChange={(e) => setV({ ...v, locationLabel: e.target.value })}
          />
        </Field>
        <Field label="Mission summary">
          <input
            className="input"
            value={v.missionSummary ?? ""}
            onChange={(e) => setV({ ...v, missionSummary: e.target.value || undefined })}
          />
        </Field>
        <Field label="Lat">
          <input
            type="number"
            className="input"
            value={v.coordinates.lat}
            onChange={(e) =>
              setV({
                ...v,
                coordinates: { ...v.coordinates, lat: Number(e.target.value) },
              })
            }
          />
        </Field>
        <Field label="Lng">
          <input
            type="number"
            className="input"
            value={v.coordinates.lng}
            onChange={(e) =>
              setV({
                ...v,
                coordinates: { ...v.coordinates, lng: Number(e.target.value) },
              })
            }
          />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={() => onSave(v)}>
          Save sub-team
        </button>
        {onDelete && (
          <button type="button" className="btn" onClick={onDelete} style={{ borderColor: "var(--danger)" }}>
            Delete
          </button>
        )}
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function PersonForm({
  initial,
  subTeams,
  onSave,
  onCancel,
  onPickMap,
}: {
  initial: Person;
  subTeams: SubTeam[];
  onSave: (p: Person) => void;
  onCancel: () => void;
  onPickMap: () => void;
}) {
  const [v, setV] = useState(initial);

  useEffect(() => {
    setV(initial);
  }, [initial]);

  useEffect(() => {
    const ok = subTeams.some((s) => s.id === v.subTeamId && s.travelTeam === v.travelTeam);
    if (ok) return;
    const first = subTeams.find((s) => s.travelTeam === v.travelTeam);
    if (first) setV((prev) => ({ ...prev, subTeamId: first.id }));
  }, [v.travelTeam, v.subTeamId, subTeams]);

  const subChoices = subTeams.filter((s) => s.travelTeam === v.travelTeam);
  const st = subTeamById(subTeams, v.subTeamId);

  return (
    <div className="panel" style={{ padding: 12, marginBottom: 12, background: "var(--bg-panel-2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Travel cohort">
          <select
            className="select"
            value={v.travelTeam}
            onChange={(e) => setV({ ...v, travelTeam: e.target.value as TravelTeam })}
          >
            {TRAVEL_TEAMS.map((t) => (
              <option key={t} value={t}>
                {TRAVEL_TEAM_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sub-team">
          <select
            className="select"
            value={v.subTeamId}
            onChange={(e) => {
              const id = e.target.value;
              const s = subTeamById(subTeams, id);
              setV((prev) => ({
                ...prev,
                subTeamId: id,
                locationLabel: s?.locationLabel ?? prev.locationLabel,
                coordinates: s
                  ? { lat: s.coordinates.lat, lng: s.coordinates.lng }
                  : prev.coordinates,
              }));
            }}
          >
            {subChoices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.id} — {s.locationLabel}
              </option>
            ))}
          </select>
        </Field>
        {st?.missionSummary && (
          <Field label="Sub-team mission">
            <div style={{ fontSize: 12, color: "var(--text-dim)", paddingTop: 6 }}>{st.missionSummary}</div>
          </Field>
        )}
        <Field label="Name">
          <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Rank / AFSC">
          <input
            className="input"
            value={v.rankRole}
            onChange={(e) => setV({ ...v, rankRole: e.target.value })}
          />
        </Field>
        <Field label="Unit / duty title (short)">
          <input className="input" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} />
        </Field>
        <Field label="Status">
          <select
            className="select"
            value={v.status}
            onChange={(e) => setV({ ...v, status: e.target.value as PersonStatus })}
          >
            {personStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location label">
          <input
            className="input"
            value={v.locationLabel}
            onChange={(e) => setV({ ...v, locationLabel: e.target.value })}
          />
        </Field>
        <Field label="Last verified (ISO)">
          <input
            className="input"
            value={v.lastVerifiedAt}
            onChange={(e) => setV({ ...v, lastVerifiedAt: e.target.value })}
          />
        </Field>
        <Field label="Lat">
          <input
            type="number"
            className="input"
            value={v.coordinates.lat}
            onChange={(e) =>
              setV({
                ...v,
                coordinates: { ...v.coordinates, lat: Number(e.target.value) },
              })
            }
          />
        </Field>
        <Field label="Lng">
          <input
            type="number"
            className="input"
            value={v.coordinates.lng}
            onChange={(e) =>
              setV({
                ...v,
                coordinates: { ...v.coordinates, lng: Number(e.target.value) },
              })
            }
          />
        </Field>
        <Field label="Orders / remarks">
          <input
            className="input"
            value={v.ordersRemarks ?? ""}
            onChange={(e) => setV({ ...v, ordersRemarks: e.target.value || undefined })}
          />
        </Field>
        <Field label="Home label (replay)">
          <input
            className="input"
            value={v.homeLocationLabel ?? ""}
            onChange={(e) => setV({ ...v, homeLocationLabel: e.target.value || undefined })}
          />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={() => onSave(v)}>
          Save
        </button>
        <button type="button" className="btn" onClick={onPickMap}>
          <MapPin size={14} /> Pick on map
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function EquipmentForm({
  dataset,
  initial,
  onSave,
  onCancel,
  onPickMap,
}: {
  dataset: OpsDataset;
  initial: Equipment;
  onSave: (e: Equipment) => void;
  onCancel: () => void;
  onPickMap: () => void;
}) {
  const [v, setV] = useState(initial);
  const subOpts = dataset.subTeams.slice().sort((a, b) => a.name.localeCompare(b.name));
  const peopleOpts = dataset.people.slice().sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="panel" style={{ padding: 12, marginBottom: 12, background: "var(--bg-panel-2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nomenclature">
          <input
            className="input"
            value={v.nomenclature}
            onChange={(e) => setV({ ...v, nomenclature: e.target.value })}
          />
        </Field>
        <Field label="Serial / ID">
          <input
            className="input"
            value={v.serialOrId ?? ""}
            onChange={(e) => setV({ ...v, serialOrId: e.target.value || undefined })}
          />
        </Field>
        <Field label="Category (capability group)">
          <input
            className="input"
            value={v.category ?? ""}
            onChange={(e) => setV({ ...v, category: e.target.value || undefined })}
            placeholder="e.g. Transport Layer (SATCOM)"
          />
        </Field>
        <Field label="Placeholder catalog row">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={Boolean(v.isPlaceholder)}
              onChange={(e) => setV({ ...v, isPlaceholder: e.target.checked || undefined })}
            />
            Not fully serialized to a real asset yet
          </label>
        </Field>
        <Field label="Deployed with sub-team">
          <select
            className="select"
            value={v.subTeamId ?? ""}
            onChange={(e) => setV({ ...v, subTeamId: e.target.value || undefined })}
          >
            <option value="">— None —</option>
            {subOpts.map((s) => (
              <option key={s.id} value={s.id}>
                {TRAVEL_TEAM_SHORT[s.travelTeam]} · {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Accountable person (optional)">
          <select
            className="select"
            value={v.personId ?? ""}
            onChange={(e) => setV({ ...v, personId: e.target.value || undefined })}
          >
            <option value="">— None —</option>
            {peopleOpts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {subTeamById(dataset.subTeams, p.subTeamId)?.name ?? p.subTeamId}
              </option>
            ))}
          </select>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Description / role">
            <textarea
              className="input"
              rows={3}
              value={v.description ?? ""}
              onChange={(e) => setV({ ...v, description: e.target.value || undefined })}
              placeholder="Plain-language description for operators and knowledge search."
            />
          </Field>
        </div>
        <Field label="Custodian (display)">
          <input
            className="input"
            value={v.custodian}
            onChange={(e) => setV({ ...v, custodian: e.target.value })}
          />
        </Field>
        <Field label="Home station">
          <input
            className="input"
            value={v.homeStation}
            onChange={(e) => setV({ ...v, homeStation: e.target.value })}
          />
        </Field>
        <Field label="Location label">
          <input
            className="input"
            value={v.locationLabel}
            onChange={(e) => setV({ ...v, locationLabel: e.target.value })}
          />
        </Field>
        <Field label="Condition">
          <select
            className="select"
            value={v.condition}
            onChange={(e) => setV({ ...v, condition: e.target.value as EquipmentCondition })}
          >
            {equipConditions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cal due (ISO)">
          <input
            className="input"
            value={v.calibrationDueAt ?? ""}
            onChange={(e) => setV({ ...v, calibrationDueAt: e.target.value || undefined })}
          />
        </Field>
        <Field label="Lat">
          <input
            type="number"
            className="input"
            value={v.coordinates.lat}
            onChange={(e) =>
              setV({
                ...v,
                coordinates: { ...v.coordinates, lat: Number(e.target.value) },
              })
            }
          />
        </Field>
        <Field label="Lng">
          <input
            type="number"
            className="input"
            value={v.coordinates.lng}
            onChange={(e) =>
              setV({
                ...v,
                coordinates: { ...v.coordinates, lng: Number(e.target.value) },
              })
            }
          />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={() => onSave(v)}>
          Save
        </button>
        <button type="button" className="btn" onClick={onPickMap}>
          <MapPin size={14} /> Pick on map
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      {children}
    </div>
  );
}
