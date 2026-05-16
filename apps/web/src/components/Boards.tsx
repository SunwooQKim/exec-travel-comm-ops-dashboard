import {
  deriveAlerts,
  readinessRollup,
  personnelByStatus,
  personnelByTravelTeam,
  TRAVEL_TEAM_LABELS,
  TRAVEL_TEAM_SHORT,
  TRAVEL_TEAMS,
  subTeamById,
  type TravelTeam,
} from "@comm-ops/core";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useOps } from "../store/OpsContext";

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (c: string) => `"${c.replaceAll('"', '""')}"`;
  const body = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type TeamFilter = TravelTeam | "all";

export function Boards() {
  const { dataset, effectivePeople, effectiveEquipment, setSelection } = useOps();
  const alerts = useMemo(() => deriveAlerts(dataset), [dataset]);
  const rollup = useMemo(() => readinessRollup(effectiveEquipment), [effectiveEquipment]);
  const statusCounts = useMemo(() => personnelByStatus(effectivePeople), [effectivePeople]);
  const travelCounts = useMemo(() => personnelByTravelTeam(effectivePeople), [effectivePeople]);

  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [subTeamFilter, setSubTeamFilter] = useState<string>("");
  const [personFilter, setPersonFilter] = useState("");
  const [equipFilter, setEquipFilter] = useState("");

  const subTeamOptions = useMemo(() => {
    const list =
      teamFilter === "all" ? dataset.subTeams : dataset.subTeams.filter((s) => s.travelTeam === teamFilter);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [dataset.subTeams, teamFilter]);

  const peopleRows = useMemo(() => {
    return effectivePeople.filter((p) => {
      if (teamFilter !== "all" && p.travelTeam !== teamFilter) return false;
      if (subTeamFilter && p.subTeamId !== subTeamFilter) return false;
      if (!personFilter) return true;
      const st = subTeamById(dataset.subTeams, p.subTeamId);
      const q = personFilter.toLowerCase();
      return `${p.name} ${p.rankRole} ${p.unit} ${p.status} ${p.locationLabel} ${st?.name ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [dataset.subTeams, effectivePeople, personFilter, subTeamFilter, teamFilter]);

  const groupedForPanel = useMemo(() => {
    const byTeam = new Map<TravelTeam, Map<string, typeof effectivePeople>>();
    for (const t of TRAVEL_TEAMS) {
      byTeam.set(t, new Map());
    }
    for (const p of peopleRows) {
      const m = byTeam.get(p.travelTeam)!;
      const arr = m.get(p.subTeamId) ?? [];
      arr.push(p);
      m.set(p.subTeamId, arr);
    }
    return byTeam;
  }, [peopleRows]);

  const equipRows = effectiveEquipment.filter(
    (e) =>
      !equipFilter ||
      `${e.nomenclature} ${e.custodian} ${e.condition} ${e.locationLabel} ${e.category ?? ""} ${e.description ?? ""} ${subTeamById(dataset.subTeams, e.subTeamId ?? "")?.name ?? ""}`
        .toLowerCase()
        .includes(equipFilter.toLowerCase()),
  );

  const kitForSubTeam = (subId: string) =>
    effectiveEquipment.filter((e) => e.subTeamId === subId);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="panel">
        <div className="panel-header">Readiness roll-up</div>
        <div style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <Stat label="Equipment" value={String(rollup.total)} />
          <Stat label="FMC" value={String(rollup.fmc)} tone="ok" />
          <Stat label="PMC" value={String(rollup.pmc)} tone="warn" />
          <Stat label="NMC" value={String(rollup.nmc)} tone="bad" />
        </div>
        <div style={{ padding: "0 12px 12px", fontSize: 12, color: "var(--text-dim)" }}>
          Personnel by status:{" "}
          {Object.entries(statusCounts)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        </div>
        <div style={{ padding: "0 12px 12px", fontSize: 12, color: "var(--text-dim)" }}>
          By travel team:{" "}
          {TRAVEL_TEAMS.map((t) => (
            <span key={t} style={{ marginRight: 12 }}>
              {TRAVEL_TEAM_SHORT[t]}: {travelCounts[t]}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">Exceptions</div>
        <div className="scroll-y" style={{ maxHeight: 160, padding: 8 }}>
          {alerts.length === 0 && (
            <div style={{ padding: 8, fontSize: 13, color: "var(--text-dim)" }}>No derived alerts.</div>
          )}
          {alerts.map((a) => (
            <button
              key={a.id}
              type="button"
              className="btn"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                marginBottom: 6,
                borderColor: a.severity === "critical" ? "var(--danger)" : "var(--warn)",
              }}
              onClick={() => setSelection({ kind: a.entityType, id: a.entityId })}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{a.detail}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header" style={{ gap: 8, flexWrap: "wrap" }}>
          <span>Roster</span>
          <button
            type="button"
            className="btn"
            style={{ marginLeft: "auto" }}
            onClick={() =>
              downloadCsv("roster.csv", [
                [
                  "travelTeam",
                  "subTeam",
                  "name",
                  "rankRole",
                  "unit",
                  "status",
                  "location",
                  "lastVerified",
                ],
                ...peopleRows.map((p) => {
                  const st = subTeamById(dataset.subTeams, p.subTeamId);
                  return [
                    p.travelTeam,
                    st?.name ?? p.subTeamId,
                    p.name,
                    p.rankRole,
                    p.unit,
                    p.status,
                    p.locationLabel,
                    p.lastVerifiedAt,
                  ];
                }),
              ])
            }
          >
            <Download size={14} /> CSV
          </button>
        </div>
        <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <button
              type="button"
              className={`chip ${teamFilter === "all" ? "chip-active" : ""}`}
              onClick={() => {
                setTeamFilter("all");
                setSubTeamFilter("");
              }}
            >
              All ({effectivePeople.length})
            </button>
            {TRAVEL_TEAMS.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${teamFilter === t ? "chip-active" : ""}`}
                title={TRAVEL_TEAM_LABELS[t]}
                onClick={() => {
                  setTeamFilter(t);
                  setSubTeamFilter("");
                }}
              >
                {TRAVEL_TEAM_SHORT[t]} ({travelCounts[t]})
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select
              className="select"
              value={subTeamFilter}
              onChange={(e) => setSubTeamFilter(e.target.value)}
            >
              <option value="">All sub-teams in view</option>
              {subTeamOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.locationLabel}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Search name, rank, location…"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="scroll-y" style={{ maxHeight: 260, padding: 8, paddingTop: 0 }}>
          {teamFilter === "all" ? (
            TRAVEL_TEAMS.map((t) => {
              const subMap = groupedForPanel.get(t)!;
              const count = [...subMap.values()].reduce((s, arr) => s + arr.length, 0);
              if (count === 0) return null;
              return (
                <details key={t} open style={{ marginBottom: 10, border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <summary style={{ cursor: "pointer", padding: "8px 10px", fontWeight: 700, fontSize: 12 }}>
                    {TRAVEL_TEAM_SHORT[t]} — {count} member{count === 1 ? "" : "s"}
                  </summary>
                  <div style={{ padding: "0 8px 8px" }}>
                    {[...subMap.entries()]
                      .filter(([, members]) => members.length > 0)
                      .sort(([a], [b]) => (subTeamById(dataset.subTeams, a)?.name ?? "").localeCompare(subTeamById(dataset.subTeams, b)?.name ?? ""))
                      .map(([subId, members]) => {
                        const st = subTeamById(dataset.subTeams, subId);
                        return (
                          <details key={subId} open style={{ marginTop: 6 }}>
                            <summary style={{ cursor: "pointer", fontSize: 11, color: "var(--text-dim)" }}>
                              {st?.name ?? subId} ({members.length}) · {st?.locationLabel}
                            </summary>
                            <MiniRoster
                              members={members}
                              onSelect={(id) => setSelection({ kind: "person", id })}
                            />
                            {kitForSubTeam(subId).length > 0 && (
                              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "var(--text-dim)",
                                    letterSpacing: "0.06em",
                                    marginBottom: 6,
                                  }}
                                >
                                  Equipment with this detail
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  {kitForSubTeam(subId).map((e) => (
                                    <button
                                      key={e.id}
                                      type="button"
                                      className="btn"
                                      style={{
                                        justifyContent: "flex-start",
                                        fontSize: 11,
                                        padding: "6px 10px",
                                        flexWrap: "wrap",
                                        gap: 6,
                                      }}
                                      onClick={() => setSelection({ kind: "equipment", id: e.id })}
                                    >
                                      {e.isPlaceholder && (
                                        <span className="chip" style={{ fontSize: 9 }}>
                                          placeholder
                                        </span>
                                      )}
                                      <span style={{ fontWeight: 600 }}>{e.nomenclature}</span>
                                      {e.category && (
                                        <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{e.category}</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </details>
                        );
                      })}
                  </div>
                </details>
              );
            })
          ) : (
            <div>
              {[...(groupedForPanel.get(teamFilter) ?? new Map()).entries()]
                .filter(([, members]) => members.length > 0)
                .sort(([a], [b]) =>
                  (subTeamById(dataset.subTeams, a)?.name ?? "").localeCompare(
                    subTeamById(dataset.subTeams, b)?.name ?? "",
                  ),
                )
                .map(([subId, members]) => {
                  const st = subTeamById(dataset.subTeams, subId);
                  return (
                    <details key={subId} open style={{ marginBottom: 10, border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                      <summary style={{ cursor: "pointer", padding: "8px 10px", fontWeight: 600, fontSize: 12 }}>
                        {st?.name ?? subId} ({members.length}) — {st?.locationLabel}
                      </summary>
                      <div style={{ padding: "0 8px 8px" }}>
                        {st?.missionSummary && (
                          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 8 }}>{st.missionSummary}</div>
                        )}
                        <MiniRoster members={members} onSelect={(id) => setSelection({ kind: "person", id })} />
                        {kitForSubTeam(subId).length > 0 && (
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "var(--text-dim)",
                                letterSpacing: "0.06em",
                                marginBottom: 6,
                              }}
                            >
                              Equipment with this detail
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {kitForSubTeam(subId).map((e) => (
                                <button
                                  key={e.id}
                                  type="button"
                                  className="btn"
                                  style={{
                                    justifyContent: "flex-start",
                                    fontSize: 11,
                                    padding: "6px 10px",
                                    flexWrap: "wrap",
                                    gap: 6,
                                  }}
                                  onClick={() => setSelection({ kind: "equipment", id: e.id })}
                                >
                                  {e.isPlaceholder && (
                                    <span className="chip" style={{ fontSize: 9 }}>
                                      placeholder
                                    </span>
                                  )}
                                  <span style={{ fontWeight: 600 }}>{e.nomenclature}</span>
                                  {e.category && (
                                    <span style={{ color: "var(--text-dim)", fontSize: 10 }}>{e.category}</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
            </div>
          )}
        </div>

        <div className="scroll-y" style={{ maxHeight: 200, padding: 8 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Rank</th>
                <th>Name</th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {peopleRows.map((p) => (
                <tr
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelection({ kind: "person", id: p.id })}
                >
                  <td>{TRAVEL_TEAM_SHORT[p.travelTeam]}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{p.rankRole.split("—")[0]?.trim()}</td>
                  <td>{p.name}</td>
                  <td>{p.status}</td>
                  <td>{p.locationLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header" style={{ gap: 8 }}>
          <span>Equipment</span>
          <button
            type="button"
            className="btn"
            style={{ marginLeft: "auto" }}
            onClick={() =>
              downloadCsv("equipment.csv", [
                [
                  "nomenclature",
                  "category",
                  "detail",
                  "custodian",
                  "homeStation",
                  "condition",
                  "location",
                  "subTeam",
                  "calDue",
                ],
                ...equipRows.map((e) => [
                  e.nomenclature,
                  e.category ?? "",
                  e.description ?? "",
                  e.custodian,
                  e.homeStation,
                  e.condition,
                  e.locationLabel,
                  subTeamById(dataset.subTeams, e.subTeamId ?? "")?.name ?? "",
                  e.calibrationDueAt ?? "",
                ]),
              ])
            }
          >
            <Download size={14} /> CSV
          </button>
        </div>
        <div style={{ padding: 8 }}>
          <input
            className="input"
            placeholder="Filter equipment…"
            value={equipFilter}
            onChange={(e) => setEquipFilter(e.target.value)}
          />
        </div>
        <div className="scroll-y" style={{ maxHeight: 280 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category / detail</th>
                <th>With detail</th>
                <th>Custodian</th>
                <th>Condition</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {equipRows.map((e) => (
                <tr
                  key={e.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelection({ kind: "equipment", id: e.id })}
                >
                  <td>
                    <span style={{ fontWeight: 600 }}>{e.nomenclature}</span>
                    {e.isPlaceholder && (
                      <span className="chip" style={{ marginLeft: 6, fontSize: 9 }}>
                        placeholder
                      </span>
                    )}
                  </td>
                  <td style={{ maxWidth: 200, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.35 }}>
                    {e.category && <div style={{ color: "var(--accent)", marginBottom: 2 }}>{e.category}</div>}
                    {e.description && <div>{e.description}</div>}
                    {!e.category && !e.description && "—"}
                  </td>
                  <td style={{ fontSize: 11 }}>
                    {e.subTeamId
                      ? subTeamById(dataset.subTeams, e.subTeamId)?.name ?? e.subTeamId
                      : "—"}
                  </td>
                  <td>{e.custodian}</td>
                  <td>{e.condition}</td>
                  <td>{e.locationLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">Field issue knowledge</div>
        <p style={{ padding: "0 12px", margin: "0 0 8px", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.45 }}>
          Symptoms and resolutions from past missions. Intended as ground truth for search and (later) assistant
          tooling so repeat faults get answered quickly on high-risk legs.
        </p>
        <div className="scroll-y" style={{ maxHeight: 240, padding: 8 }}>
          {dataset.equipmentIssueLog.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-dim)" }}>No entries yet — seed JSON includes demo rows.</div>
          ) : (
            dataset.equipmentIssueLog.map((iss) => {
              const linked = iss.equipmentId && dataset.equipment.find((x) => x.id === iss.equipmentId);
              return (
                <div
                  key={iss.id}
                  className="panel"
                  style={{
                    padding: 10,
                    marginBottom: 8,
                    background: "var(--bg-panel-2)",
                  }}
                >
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>
                    {new Date(iss.reportedAt).toLocaleString()}
                    {iss.context ? ` · ${iss.context}` : ""}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12, marginTop: 6 }}>{iss.symptom}</div>
                  {iss.resolution && (
                    <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>
                      <span style={{ color: "var(--accent)" }}>Resolution: </span>
                      {iss.resolution}
                    </div>
                  )}
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {(iss.tags ?? []).map((t) => (
                      <span key={t} className="chip" style={{ fontSize: 9 }}>
                        {t}
                      </span>
                    ))}
                    {linked && (
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 10, padding: "4px 8px" }}
                        onClick={() => setSelection({ kind: "equipment", id: linked.id })}
                      >
                        Open {linked.nomenclature}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MiniRoster({
  members,
  onSelect,
}: {
  members: { id: string; name: string; rankRole: string; status: string }[];
  onSelect: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 6,
        marginTop: 8,
      }}
    >
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          className="btn"
          style={{
            justifyContent: "flex-start",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "8px 10px",
            minHeight: 64,
          }}
          onClick={() => onSelect(m.id)}
        >
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{m.rankRole.split("—")[0]?.trim()}</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</span>
          <span className="chip" style={{ marginTop: 4, fontSize: 9 }}>
            {m.status}
          </span>
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  const color =
    tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--danger)" : "var(--text)";
  return (
    <div className="panel" style={{ padding: 10, background: "var(--bg-panel-2)" }}>
      <div style={{ fontSize: 10, color: "var(--text-dim)", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color }}>{value}</div>
    </div>
  );
}
