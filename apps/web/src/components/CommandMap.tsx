import { Loader } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useState } from "react";
import type { Equipment, EquipmentIssueLogEntry, Person, Site, SubTeam } from "@comm-ops/core";
import {
  PENTAGON_REAR_POOL_MAP_ANCHOR,
  TRAVEL_TEAM_MARKER_COLORS,
  TRAVEL_TEAM_LABELS,
  TRAVEL_TEAM_SHORT,
  isHomeStationPerson,
  subTeamById,
} from "@comm-ops/core";
import { useOps, type Selection } from "../store/OpsContext";

const defaultCenter = { lat: 20, lng: 0 };
const defaultZoom = 2;

/** Merge co-located members (e.g. multiple rear teams at the Pentagon) into one count bubble. */
const LOC_GROUP_DECIMALS = 4;

function locationGroupKey(lat: number, lng: number) {
  return `${lat.toFixed(LOC_GROUP_DECIMALS)},${lng.toFixed(LOC_GROUP_DECIMALS)}`;
}

function titleForPersonGroup(members: Person[]): string {
  const labels = [...new Set(members.map((m) => m.locationLabel))];
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 0) return "Personnel";
  return `${labels[0]} (+${labels.length - 1} more)`;
}

function colorForPersonGroup(members: Person[]): string {
  const teams = new Set(members.map((m) => m.travelTeam));
  if (teams.size === 1) {
    const t = [...teams][0]!;
    return TRAVEL_TEAM_MARKER_COLORS[t];
  }
  return "#94a3b8";
}

function personGroupMarkerIcon(count: number, fill: string): google.maps.Symbol {
  const scale = Math.min(24, Math.max(14, 10 + Math.sqrt(count) * 1.75));
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: fill,
    fillOpacity: 0.95,
    strokeColor: "#0a1628",
    strokeWeight: 2,
  };
}

/** Distinct from forward-deployed count bubbles: rear pool / garrison / awaiting mission / admin. */
function homeStationMarkerIcon(count: number): google.maps.Symbol {
  const scale = Math.min(26, Math.max(16, 12 + Math.sqrt(count) * 1.75));
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale,
    fillColor: "#dce6f2",
    fillOpacity: 0.98,
    strokeColor: "#5eeaff",
    strokeWeight: 3,
  };
}

function personGroupMarkerLabel(count: number): google.maps.MarkerLabel {
  const n = count > 999 ? "999+" : String(count);
  return {
    text: n,
    color: "#070b10",
    fontSize: count > 99 ? "9px" : count > 9 ? "11px" : "12px",
    fontWeight: "700",
  };
}

/**
 * Arlington, VA map point for the rear pool ring only. Site table coordinates are intentionally ignored so
 * the ring cannot drift to another base (e.g. if `site-pentagon` was edited to Tinker AFB by mistake).
 */
function rearPoolMapPosition(): { lat: number; lng: number } {
  return { ...PENTAGON_REAR_POOL_MAP_ANCHOR };
}

function homeStationUiLabel(sites: Site[]): string {
  return sites.find((s) => s.id === "site-pentagon")?.name ?? "The Pentagon (Arlington, VA)";
}

type CommandMapProps = {
  people: Person[];
  equipment: Equipment[];
  sites: Site[];
};

export function CommandMap({ people, equipment, sites }: CommandMapProps) {
  const {
    dataset,
    layers,
    selection,
    setSelection,
    pickMode,
    mapPickTarget,
    setMapPickTarget,
    setPickMode,
    upsertPerson,
    upsertEquipment,
    addEvent,
    canWrite,
  } = useOps();
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const siteMarkersRef = useRef<google.maps.Marker[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  /** Bumps when the Google Map instance is ready (async). Ref updates alone do not re-run effects. */
  const [mapEpoch, setMapEpoch] = useState(0);

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key || !mapDivRef.current) return;

    let cancelled = false;
    const loader = new Loader({
      apiKey: key,
      version: "weekly",
      libraries: ["geometry"],
    });

    void loader.load().then(() => {
      if (cancelled || !mapDivRef.current) return;
      const map = new google.maps.Map(mapDivRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        ...(import.meta.env.VITE_GOOGLE_MAP_ID
          ? { mapId: import.meta.env.VITE_GOOGLE_MAP_ID }
          : {}),
        backgroundColor: "#070b10",
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "greedy",
        styles: [
          { elementType: "geometry", stylers: [{ color: "#172033" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#070b10" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#8fa3c4" }] },
          {
            featureType: "administrative",
            elementType: "geometry.stroke",
            stylers: [{ color: "#2c3f55" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0b1018" }],
          },
        ],
      });
      mapRef.current = map;
      setMapEpoch((n) => n + 1);
    });

    return () => {
      cancelled = true;
      mapRef.current = null;
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }

    if (canWrite && pickMode && mapPickTarget) {
      clickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
        const ll = e.latLng;
        if (!ll || !mapPickTarget) return;
        const lat = ll.lat();
        const lng = ll.lng();
        const patch = { lat, lng, locationLabel: `${lat.toFixed(3)}, ${lng.toFixed(3)}` };
        if (mapPickTarget.kind === "person") {
          const p = people.find((x) => x.id === mapPickTarget.id);
          if (p) {
            upsertPerson({
              ...p,
              coordinates: { lat, lng },
              locationLabel: patch.locationLabel,
              lastVerifiedAt: new Date().toISOString(),
            });
            addEvent({
              at: new Date().toISOString(),
              kind: "movement",
              summary: `Manual map update — ${p.name}`,
              entityType: "person",
              entityId: p.id,
              actor: "Map pick",
              meta: { patch },
            });
          }
        } else {
          const eq = equipment.find((x) => x.id === mapPickTarget.id);
          if (eq) {
            upsertEquipment({
              ...eq,
              coordinates: { lat, lng },
              locationLabel: patch.locationLabel,
            });
            addEvent({
              at: new Date().toISOString(),
              kind: "movement",
              summary: `Manual map update — ${eq.nomenclature}`,
              entityType: "equipment",
              entityId: eq.id,
              actor: "Map pick",
              meta: { patch },
            });
          }
        }
        setPickMode(false);
        setMapPickTarget(null);
      });
    }

    return () => {
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
    };
  }, [
    canWrite,
    pickMode,
    mapPickTarget,
    people,
    equipment,
    addEvent,
    upsertEquipment,
    upsertPerson,
    setMapPickTarget,
    setPickMode,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    siteMarkersRef.current.forEach((m) => m.setMap(null));
    siteMarkersRef.current = [];
    clustererRef.current?.clearMarkers();
    clustererRef.current = null;

    if (layers.sites) {
      for (const s of sites) {
        const m = new google.maps.Marker({
          map,
          position: s.coordinates,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: "#5eeaff",
            fillOpacity: 0.9,
            strokeWeight: 1,
            strokeColor: "#070b10",
          },
          zIndex: 1,
        });
        m.addListener("click", () => setSelection({ kind: "site", id: s.id }));
        siteMarkersRef.current.push(m);
      }
    }

    const allMarkers: google.maps.Marker[] = [];
    const equipClusterMarkers: google.maps.Marker[] = [];

    if (layers.people) {
      const subTeams = dataset.subTeams;
      const homeStation = people.filter((p) => isHomeStationPerson(p, subTeams));
      const forward = people.filter((p) => !isHomeStationPerson(p, subTeams));

      if (homeStation.length > 0) {
        const pos = rearPoolMapPosition();
        const count = homeStation.length;
        const placeName = homeStationUiLabel(sites);
        const summary = `${count} at ${placeName} — garrison / awaiting mission / admin`;
        const m = new google.maps.Marker({
          map,
          position: pos,
          icon: homeStationMarkerIcon(count),
          label: personGroupMarkerLabel(count),
          zIndex: 120 + Math.min(count, 40),
          title: summary,
        });
        m.addListener("click", () =>
          setSelection({
            kind: "personGroup",
            memberIds: homeStation.map((x) => x.id),
            locationLabel: `${placeName} — home station (rear pool)`,
          }),
        );
        allMarkers.push(m);
      }

      const groups = new Map<string, Person[]>();
      for (const p of forward) {
        const k = locationGroupKey(p.coordinates.lat, p.coordinates.lng);
        const arr = groups.get(k) ?? [];
        arr.push(p);
        groups.set(k, arr);
      }
      for (const members of groups.values()) {
        const lat = members.reduce((s, m) => s + m.coordinates.lat, 0) / members.length;
        const lng = members.reduce((s, m) => s + m.coordinates.lng, 0) / members.length;
        const count = members.length;
        const fill = colorForPersonGroup(members);
        const m = new google.maps.Marker({
          map,
          position: { lat, lng },
          icon: personGroupMarkerIcon(count, fill),
          label: personGroupMarkerLabel(count),
          zIndex: 80 + Math.min(count, 40),
          title: `${count} forward-deployed — ${titleForPersonGroup(members)}`,
        });
        m.addListener("click", () =>
          setSelection({
            kind: "personGroup",
            memberIds: members.map((x) => x.id),
            locationLabel: titleForPersonGroup(members),
          }),
        );
        allMarkers.push(m);
      }
    }

    if (layers.equipment) {
      for (const e of equipment) {
        const m = new google.maps.Marker({
          position: e.coordinates,
          label: { text: "E", color: "#070b10", fontSize: "10px", fontWeight: "700" },
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            fillColor: "#ffc857",
            fillOpacity: 0.95,
            strokeWeight: 2,
            strokeColor: "#070b10",
            rotation: 90,
          },
          zIndex: 40,
        });
        m.addListener("click", () => setSelection({ kind: "equipment", id: e.id }));
        allMarkers.push(m);
        equipClusterMarkers.push(m);
      }
    }

    markersRef.current = allMarkers;

    if (equipClusterMarkers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers: equipClusterMarkers,
      });
    }

    const bounds = new google.maps.LatLngBounds();
    let has = false;
    for (const s of sites) {
      bounds.extend(s.coordinates);
      has = true;
    }
    for (const p of people) {
      bounds.extend(p.coordinates);
      has = true;
    }
    for (const e of equipment) {
      bounds.extend(e.coordinates);
      has = true;
    }
    if (has) {
      map.fitBounds(bounds, 48);
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      siteMarkersRef.current.forEach((m) => m.setMap(null));
      siteMarkersRef.current = [];
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, [
    mapEpoch,
    layers.equipment,
    layers.people,
    layers.sites,
    people,
    equipment,
    sites,
    setSelection,
    dataset.subTeams,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selection?.kind === "personGroup") {
      const ms = selection.memberIds
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is Person => Boolean(p));
      if (ms.length === 0) return;
      const subTeams = dataset.subTeams;
      const allHome = ms.every((p) => isHomeStationPerson(p, subTeams));
      if (allHome) {
        const pos = rearPoolMapPosition();
        map.panTo(pos);
      } else {
        const lat = ms.reduce((s, p) => s + p.coordinates.lat, 0) / ms.length;
        const lng = ms.reduce((s, p) => s + p.coordinates.lng, 0) / ms.length;
        map.panTo({ lat, lng });
      }
      map.setZoom(Math.max(map.getZoom() ?? 3, 6));
      return;
    }

    const targetId = selection?.kind === "person" || selection?.kind === "equipment" ? selection.id : null;
    if (!targetId) return;
    const pos =
      selection?.kind === "person"
        ? people.find((p) => p.id === selection.id)?.coordinates
        : selection?.kind === "equipment"
          ? equipment.find((e) => e.id === selection.id)?.coordinates
          : undefined;
    if (pos) {
      map.panTo(pos);
      map.setZoom(Math.max(map.getZoom() ?? 3, 5));
    }
  }, [selection, people, equipment, sites, dataset.subTeams]);

  const keyMissing = !import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: 360 }}>
      {keyMissing && (
        <div className="panel" style={{ position: "absolute", inset: 16, zIndex: 2, padding: 16 }}>
          <div className="panel-header">Maps</div>
          <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5 }}>
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> to enable the live map. The rest
            of the command center works without it; this panel will stay offline until configured.
          </p>
        </div>
      )}
      <div
        ref={mapDivRef}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "var(--radius)",
          overflow: "hidden",
          opacity: keyMissing ? 0.25 : 1,
        }}
      />
      {canWrite && pickMode && (
        <div
          className="chip chip-active"
          style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 3 }}
        >
          Map pick active — click the map to drop coordinates
        </div>
      )}
      <SelectionCard
        selection={selection}
        people={people}
        equipment={equipment}
        sites={sites}
        subTeams={dataset.subTeams}
        equipmentIssueLog={dataset.equipmentIssueLog}
        onSelectPerson={(id) => setSelection({ kind: "person", id })}
      />
    </div>
  );
}

function SelectionCard({
  selection,
  people,
  equipment,
  sites,
  subTeams,
  equipmentIssueLog,
  onSelectPerson,
}: {
  selection: Selection;
  people: Person[];
  equipment: Equipment[];
  sites: Site[];
  subTeams: SubTeam[];
  equipmentIssueLog: EquipmentIssueLogEntry[];
  onSelectPerson: (id: string) => void;
}) {
  if (!selection) return null;
  if (selection.kind === "personGroup") {
    const members = selection.memberIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p): p is Person => Boolean(p));
    if (members.length === 0) return null;
    const bySub = new Map<string, Person[]>();
    for (const m of members) {
      const arr = bySub.get(m.subTeamId) ?? [];
      arr.push(m);
      bySub.set(m.subTeamId, arr);
    }
    return (
      <div
        className="panel"
        style={{ position: "absolute", bottom: 16, left: 16, right: 16, maxWidth: 440, zIndex: 2 }}
      >
        <div className="panel-header">
          {members.length} at {selection.locationLabel}
        </div>
        <div className="scroll-y" style={{ padding: 12, maxHeight: 280 }}>
          {[...bySub.entries()].map(([sid, grp]) => {
            const st = subTeamById(subTeams, sid);
            return (
              <div key={sid} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>
                  {st?.name ?? sid} ({grp.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {grp.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="btn"
                      style={{
                        width: "100%",
                        justifyContent: "space-between",
                        fontSize: 12,
                        padding: "6px 10px",
                      }}
                      onClick={() => onSelectPerson(p.id)}
                    >
                      <span>
                        {TRAVEL_TEAM_SHORT[p.travelTeam]} · {p.rankRole.split("—")[0]?.trim()} {p.name}
                      </span>
                      <span style={{ color: "var(--text-dim)", fontSize: 11 }}>{p.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (selection.kind === "site") {
    const s = sites.find((x) => x.id === selection.id);
    if (!s) return null;
    return (
      <div
        className="panel"
        style={{ position: "absolute", bottom: 16, left: 16, right: 16, maxWidth: 420, zIndex: 2 }}
      >
        <div className="panel-header">Site</div>
        <div style={{ padding: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>{s.name}</div>
          <div style={{ color: "var(--text-dim)", marginTop: 6 }}>
            {s.country}
            {s.icao ? ` · ${s.icao}` : ""}
          </div>
        </div>
      </div>
    );
  }
  if (selection.kind === "person") {
    const p = people.find((x) => x.id === selection.id);
    if (!p) return null;
    const st = subTeamById(subTeams, p.subTeamId);
    return (
      <div
        className="panel"
        style={{ position: "absolute", bottom: 16, left: 16, right: 16, maxWidth: 420, zIndex: 2 }}
      >
        <div className="panel-header">Personnel</div>
        <div style={{ padding: 12, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>{p.name}</div>
          <div style={{ color: "var(--text-dim)", marginTop: 6 }}>
            {p.rankRole} · {p.unit}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.45 }}>
            <div style={{ color: "var(--accent)" }}>{TRAVEL_TEAM_LABELS[p.travelTeam]}</div>
            {st && (
              <div style={{ marginTop: 4, color: "var(--text-dim)" }}>
                Sub-team: {st.name}
                {st.missionSummary ? ` — ${st.missionSummary}` : ""}
              </div>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className="chip">{p.status}</span>
            <span className="chip" style={{ marginLeft: 8 }}>
              {p.locationLabel}
            </span>
          </div>
          {p.ordersRemarks && (
            <div style={{ marginTop: 10, color: "var(--text-dim)" }}>{p.ordersRemarks}</div>
          )}
          {(() => {
            const accountable = equipment.filter((x) => x.personId === p.id);
            const cellKit = equipment.filter(
              (x) => x.subTeamId === p.subTeamId && x.personId !== p.id,
            );
            if (accountable.length === 0 && cellKit.length === 0) return null;
            return (
              <div style={{ marginTop: 12, fontSize: 11, lineHeight: 1.45 }}>
                <div style={{ fontWeight: 700, color: "var(--text-dim)", marginBottom: 6 }}>Equipment</div>
                {accountable.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ color: "var(--accent)", fontSize: 10, marginBottom: 4 }}>Accountable</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {accountable.map((e) => (
                        <li key={e.id}>
                          {e.nomenclature}
                          {e.isPlaceholder ? " (placeholder)" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {cellKit.length > 0 && (
                  <div>
                    <div style={{ color: "var(--accent)", fontSize: 10, marginBottom: 4 }}>
                      With this detail ({cellKit.length})
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {cellKit.slice(0, 6).map((e) => (
                        <li key={e.id}>
                          {e.nomenclature}
                          {e.isPlaceholder ? " (placeholder)" : ""}
                        </li>
                      ))}
                      {cellKit.length > 6 && <li>…and {cellKit.length - 6} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }
  const e = equipment.find((x) => x.id === selection.id);
  if (!e) return null;
  const stEq = e.subTeamId ? subTeamById(subTeams, e.subTeamId) : undefined;
  const relatedIssues = equipmentIssueLog.filter((iss) => iss.equipmentId === e.id);
  return (
    <div
      className="panel"
      style={{ position: "absolute", bottom: 16, left: 16, right: 16, maxWidth: 420, zIndex: 2 }}
    >
      <div className="panel-header">Equipment</div>
      <div style={{ padding: 12, fontSize: 13 }}>
        <div style={{ fontWeight: 700 }}>{e.nomenclature}</div>
        {e.isPlaceholder && (
          <span className="chip" style={{ marginTop: 8, fontSize: 10 }}>
            Placeholder catalog row
          </span>
        )}
        <div style={{ color: "var(--text-dim)", marginTop: 6 }}>
          {e.serialOrId ?? "No serial"} · {e.custodian}
        </div>
        {e.category && (
          <div style={{ marginTop: 10, color: "var(--accent)", fontSize: 12 }}>{e.category}</div>
        )}
        {e.description && (
          <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45, color: "var(--text-dim)" }}>
            {e.description}
          </div>
        )}
        {stEq && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)" }}>
            Deployed with: {stEq.name}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <span className="chip">{e.condition}</span>
          <span className="chip" style={{ marginLeft: 8 }}>
            {e.locationLabel}
          </span>
        </div>
        {relatedIssues.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: "var(--text-dim)", marginBottom: 6 }}>
              Past issues (knowledge log)
            </div>
            {relatedIssues.map((iss) => (
              <div
                key={iss.id}
                style={{
                  marginTop: 8,
                  padding: 8,
                  borderRadius: "var(--radius)",
                  background: "var(--bg-panel-2)",
                  fontSize: 11,
                  lineHeight: 1.4,
                }}
              >
                <div style={{ fontWeight: 600 }}>{iss.symptom}</div>
                {iss.resolution && (
                  <div style={{ marginTop: 4, color: "var(--text-dim)" }}>{iss.resolution}</div>
                )}
                {(iss.tags ?? []).length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(iss.tags ?? []).map((t) => (
                      <span key={t} className="chip" style={{ fontSize: 9 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
