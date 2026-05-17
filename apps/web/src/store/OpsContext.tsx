import {
  type OpsDataset,
  type Person,
  type Equipment,
  type Site,
  type SubTeam,
  createSeedDataset,
  loadDatasetFromLocalStorage,
  saveDatasetToLocalStorage,
  earliestEventTime,
  latestEventTime,
  buildStateAtTime,
  normalizeCommOpsDataset,
  OpsEventSchema,
  OpsDatasetSchema,
  type OpsEvent,
} from "@comm-ops/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "./SessionContext";

export type MapLayers = {
  people: boolean;
  equipment: boolean;
  sites: boolean;
};

export type Selection =
  | { kind: "person"; id: string }
  | { kind: "personGroup"; memberIds: string[]; locationLabel: string }
  | { kind: "equipment"; id: string }
  | { kind: "site"; id: string }
  | null;

type SetDatasetInput = OpsDataset | ((prev: OpsDataset) => OpsDataset);

type OpsCtx = {
  dataset: OpsDataset;
  setDataset: (d: SetDatasetInput) => void;
  replayTimeMs: number | null;
  setReplayTimeMs: (t: number | null) => void;
  replayBounds: { min: number; max: number };
  effectivePeople: Person[];
  effectiveEquipment: Equipment[];
  layers: MapLayers;
  setLayers: React.Dispatch<React.SetStateAction<MapLayers>>;
  selection: Selection;
  setSelection: (s: Selection) => void;
  importJson: (raw: string) => void;
  exportJson: () => string;
  resetToSeed: () => void;
  pickMode: boolean;
  setPickMode: (v: boolean) => void;
  mapPickTarget: { kind: "person" | "equipment"; id: string } | null;
  setMapPickTarget: (v: { kind: "person" | "equipment"; id: string } | null) => void;
  addEvent: (e: Omit<OpsEvent, "id"> & { id?: string }) => void;
  upsertPerson: (p: Person) => void;
  upsertEquipment: (e: Equipment) => void;
  upsertSubTeam: (st: SubTeam) => void;
  deleteSubTeam: (id: string) => void;
  deletePerson: (id: string) => void;
  deleteEquipment: (id: string) => void;
  canWrite: boolean;
  /** Load remote snapshot without persisting writes (leaders + admins refreshing from API). */
  loadDatasetSnapshot: (snapshot: OpsDataset) => void;
};

const Ctx = createContext<OpsCtx | null>(null);

function bumpUpdated(ds: OpsDataset): OpsDataset {
  return { ...ds, updatedAt: new Date().toISOString() };
}

export function OpsProvider({ children }: { children: ReactNode }) {
  const { canWrite } = useSession();
  const [dataset, setDatasetState] = useState<OpsDataset>(() => {
    const stored = typeof localStorage !== "undefined" ? loadDatasetFromLocalStorage() : null;
    return stored ?? createSeedDataset();
  });
  const [replayTimeMs, setReplayTimeMs] = useState<number | null>(null);
  const [layers, setLayers] = useState<MapLayers>({ people: true, equipment: true, sites: true });
  const [selection, setSelection] = useState<Selection>(null);
  const [pickMode, setPickMode] = useState(false);
  const [mapPickTarget, setMapPickTarget] = useState<{ kind: "person" | "equipment"; id: string } | null>(
    null,
  );

  const replayBounds = useMemo(() => {
    const min = earliestEventTime(dataset);
    const max = Math.max(latestEventTime(dataset), Date.now());
    return { min, max };
  }, [dataset]);

  const replayIso = replayTimeMs != null ? new Date(replayTimeMs).toISOString() : null;
  const replayFrame = useMemo(() => {
    if (!replayIso) return null;
    return buildStateAtTime(dataset, replayIso);
  }, [dataset, replayIso]);

  const effectivePeople = replayFrame?.people ?? dataset.people;
  const effectiveEquipment = replayFrame?.equipment ?? dataset.equipment;

  const setDataset = useCallback(
    (input: SetDatasetInput) => {
      if (!canWrite) return;
      setDatasetState((prev) => {
        const next = typeof input === "function" ? input(prev) : input;
        return bumpUpdated(next);
      });
    },
    [canWrite],
  );

  useEffect(() => {
    if (!canWrite) return;
    saveDatasetToLocalStorage(dataset);
  }, [dataset, canWrite]);

  const importJson = useCallback(
    (raw: string) => {
      if (!canWrite) return;
      const parsed = normalizeCommOpsDataset(OpsDatasetSchema.parse(JSON.parse(raw) as unknown));
      setDataset(parsed);
      setReplayTimeMs(null);
    },
    [setDataset, canWrite],
  );

  const exportJson = useCallback(() => JSON.stringify(dataset, null, 2), [dataset]);

  const loadDatasetSnapshot = useCallback((snapshot: OpsDataset) => {
    setDatasetState(normalizeCommOpsDataset(snapshot));
    setReplayTimeMs(null);
  }, []);

  const resetToSeed = useCallback(() => {
    if (!canWrite) return;
    setDataset(createSeedDataset());
    setReplayTimeMs(null);
    setSelection(null);
  }, [setDataset, canWrite]);

  const addEvent = useCallback(
    (e: Omit<OpsEvent, "id"> & { id?: string }) => {
      if (!canWrite) return;
      const id = e.id ?? `ev-${crypto.randomUUID()}`;
      const full = OpsEventSchema.parse({ ...e, id });
      setDataset((prev) => ({ ...prev, events: [...prev.events, full] }));
    },
    [setDataset, canWrite],
  );

  const upsertPerson = useCallback(
    (p: Person) => {
      if (!canWrite) return;
      setDataset((prev) => {
        const idx = prev.people.findIndex((x) => x.id === p.id);
        const people =
          idx === -1 ? [...prev.people, p] : prev.people.map((x) => (x.id === p.id ? p : x));
        return { ...prev, people };
      });
    },
    [setDataset, canWrite],
  );

  const upsertEquipment = useCallback(
    (eq: Equipment) => {
      if (!canWrite) return;
      setDataset((prev) => {
        const idx = prev.equipment.findIndex((x) => x.id === eq.id);
        const equipment =
          idx === -1
            ? [...prev.equipment, eq]
            : prev.equipment.map((x) => (x.id === eq.id ? eq : x));
        return { ...prev, equipment };
      });
    },
    [setDataset, canWrite],
  );

  const deletePerson = useCallback(
    (id: string) => {
      if (!canWrite) return;
      setDataset((prev) => ({ ...prev, people: prev.people.filter((p) => p.id !== id) }));
      setSelection((s) => {
        if (s?.kind === "person" && s.id === id) return null;
        if (s?.kind === "personGroup") {
          const next = s.memberIds.filter((x) => x !== id);
          if (next.length === 0) return null;
          if (next.length === s.memberIds.length) return s;
          return { ...s, memberIds: next };
        }
        return s;
      });
    },
    [setDataset, canWrite],
  );

  const deleteEquipment = useCallback(
    (id: string) => {
      if (!canWrite) return;
      setDataset((prev) => ({ ...prev, equipment: prev.equipment.filter((e) => e.id !== id) }));
      setSelection((s) => (s?.kind === "equipment" && s.id === id ? null : s));
    },
    [setDataset, canWrite],
  );

  const upsertSubTeam = useCallback(
    (st: SubTeam) => {
      if (!canWrite) return;
      setDataset((prev) => {
        const idx = prev.subTeams.findIndex((x) => x.id === st.id);
        const subTeams =
          idx === -1 ? [...prev.subTeams, st] : prev.subTeams.map((x) => (x.id === st.id ? st : x));
        return { ...prev, subTeams };
      });
    },
    [setDataset, canWrite],
  );

  const deleteSubTeam = useCallback(
    (id: string) => {
      if (!canWrite) return;
      setDataset((prev) => {
        const target = prev.subTeams.find((s) => s.id === id);
        if (!target) return prev;
        const remaining = prev.subTeams.filter((s) => s.travelTeam === target.travelTeam && s.id !== id);
        const rear = remaining.find((s) => s.id === `st-${target.travelTeam}-rear`);
        const fallback = rear?.id ?? remaining[0]?.id;
        if (!fallback) return prev;
        const people = prev.people.map((p) => (p.subTeamId === id ? { ...p, subTeamId: fallback } : p));
        return {
          ...prev,
          subTeams: prev.subTeams.filter((s) => s.id !== id),
          people,
        };
      });
    },
    [setDataset],
  );

  const value: OpsCtx = {
    dataset,
    setDataset,
    replayTimeMs,
    setReplayTimeMs,
    replayBounds,
    effectivePeople,
    effectiveEquipment,
    layers,
    setLayers,
    selection,
    setSelection,
    importJson,
    exportJson,
    resetToSeed,
    pickMode,
    setPickMode,
    mapPickTarget,
    setMapPickTarget,
    addEvent,
    upsertPerson,
    upsertEquipment,
    upsertSubTeam,
    deleteSubTeam,
    deletePerson,
    deleteEquipment,
    canWrite,
    loadDatasetSnapshot,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOps() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOps requires OpsProvider");
  return v;
}

export function siteById(sites: Site[], id?: string) {
  if (!id) return undefined;
  return sites.find((s) => s.id === id);
}
