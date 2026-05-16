import { motion } from "framer-motion";
import { Globe2, Layers } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deriveAlerts, normalizeCommOpsDataset, personnelDeployedForward, personnelAtHomeStation, readinessRollup, personnelByStatus, personnelByTravelTeam } from "@comm-ops/core";
import { CommandMap } from "./components/CommandMap";
import { Timeline } from "./components/Timeline";
import { Boards } from "./components/Boards";
import { AdminPanel } from "./components/AdminPanel";
import { useOps } from "./store/OpsContext";
import { createApiClient } from "./api/client";

export function App() {
  const {
    layers,
    setLayers,
    dataset,
    setDataset,
    effectivePeople,
    effectiveEquipment,
  } = useOps();
  const [apiStatus, setApiStatus] = useState<string>("");
  const [token, setToken] = useState(() => localStorage.getItem("comm-ops-token") ?? "");

  const stats = useMemo(() => {
    const alerts = deriveAlerts(dataset);
    const rollup = readinessRollup(effectiveEquipment);
    const pc = personnelByStatus(effectivePeople);
    const teams = personnelByTravelTeam(effectivePeople);
    const homeCount = personnelAtHomeStation(effectivePeople, dataset.subTeams).length;
    const forwardCount = personnelDeployedForward(effectivePeople, dataset.subTeams).length;
    return { alerts: alerts.length, rollup, pc, teams, homeCount, forwardCount };
  }, [dataset, effectivePeople, effectiveEquipment]);

  const api = useMemo(() => createApiClient({ getToken: () => token }), [token]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!token) {
        setApiStatus("API: not connected (optional)");
        return;
      }
      try {
        const remote = await api.getDataset();
        if (cancelled || !remote) return;
        setDataset(normalizeCommOpsDataset(remote));
        setApiStatus("API: loaded remote snapshot");
      } catch {
        if (!cancelled) setApiStatus("API: error loading");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, api, setDataset]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <header
        className="panel"
        style={{
          margin: 12,
          marginBottom: 0,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Globe2 size={22} color="var(--accent)" />
          <div>
            <div style={{ fontWeight: 800, letterSpacing: "0.06em", fontSize: 13 }}>COMM WING</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Operations command surface (demo)</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
          <Layers size={16} color="var(--text-dim)" />
          {(
            [
              ["people", "People"],
              ["equipment", "Equipment"],
              ["sites", "Sites"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`chip ${layers[k] ? "chip-active" : ""}`}
              onClick={() => setLayers((prev) => ({ ...prev, [k]: !prev[k] }))}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span className="chip">{apiStatus}</span>
          <span className="chip">Alerts: {stats.alerts}</span>
          <span className="chip">
            FMC {stats.rollup.fmc}/{stats.rollup.total}
          </span>
          <span className="chip">
            SECAF {stats.teams.secaf} · CSAF {stats.teams.csaf} · CSO {stats.teams.cso}
          </span>
          <span className="chip">
            Home {stats.homeCount} · Forward {stats.forwardCount}
          </span>
          <ApiLogin token={token} setToken={setToken} />
          {token && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await api.putDataset(dataset);
                  setApiStatus("API: saved");
                } catch {
                  setApiStatus("API: save failed");
                }
              }}
            >
              Push to API
            </button>
          )}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) minmax(0, 3fr) minmax(300px, 1.1fr)",
          gap: 12,
          padding: 12,
          minHeight: 0,
        }}
      >
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <Timeline />
          <div className="panel" style={{ padding: 12, flex: 1, minHeight: 0 }}>
            <div className="panel-header" style={{ border: "none", padding: "0 0 8px" }}>
              Summary
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)" }}>
              Worldwide picture for {effectivePeople.length} personnel and {effectiveEquipment.length} major items.
              Toggle layers to declutter; scrub the timeline to replay movement patches.
            </div>
            <div style={{ marginTop: 12, fontSize: 12 }}>
              Status mix:{" "}
              {Object.entries(stats.pc)
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ")}
            </div>
          </div>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="panel"
          style={{ minHeight: 0, padding: 8, position: "relative" }}
        >
          <div className="panel-header">Battlespace</div>
          <div style={{ position: "absolute", top: 52, left: 8, right: 8, bottom: 8 }}>
            <CommandMap
              people={effectivePeople}
              equipment={effectiveEquipment}
              sites={dataset.sites}
            />
          </div>
        </motion.main>

        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
            <Boards />
          </div>
          <div style={{ flex: 1, minHeight: 220, maxHeight: "42vh" }}>
            <AdminPanel />
          </div>
        </motion.aside>
      </div>
    </div>
  );
}

function ApiLogin({
  token,
  setToken,
}: {
  token: string;
  setToken: (t: string) => void;
}) {
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("changeme");
  const api = useMemo(() => createApiClient({ getToken: () => token }), [token]);

  if (token) {
    return (
      <button
        type="button"
        className="btn"
        onClick={() => {
          localStorage.removeItem("comm-ops-token");
          setToken("");
        }}
      >
        Log out API
      </button>
    );
  }

  return (
    <form
      style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const { token: t } = await api.login(email, password);
          localStorage.setItem("comm-ops-token", t);
          setToken(t);
        } catch {
          alert("Login failed");
        }
      }}
    >
      <input className="input" style={{ width: 140 }} value={email} onChange={(e) => setEmail(e.target.value) } />
      <input
        type="password"
        className="input"
        style={{ width: 100 }}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" className="btn btn-primary">
        API login
      </button>
    </form>
  );
}
