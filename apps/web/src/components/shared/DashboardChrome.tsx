import { normalizeCommOpsDataset } from "@comm-ops/core";
import { motion } from "framer-motion";
import { ArrowLeftRight, Layers, LogOut } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { createApiClient } from "../../api/client";
import { useOps } from "../../store/OpsContext";
import { useSession } from "../../store/SessionContext";

export function LayerToggles() {
  const { layers, setLayers } = useOps();
  return (
    <motion.div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
    </motion.div>
  );
}

export function SwitchModeButton() {
  const { setMode } = useSession();
  return (
    <button type="button" className="btn" onClick={() => setMode(null)} title="Return to workspace picker">
      <ArrowLeftRight size={14} /> Switch workspace
    </button>
  );
}

export function ReadOnlyBadge() {
  return (
    <span className="chip chip-readonly" title="This workspace cannot modify data">
      Read-only
    </span>
  );
}

export function DashboardHeader({
  title,
  subtitle,
  badge,
  trailing,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <header className="dashboard-header panel">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap", width: "100%" }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <motion.div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="dashboard-title">{title}</h1>
            {badge}
          </motion.div>
          <p className="dashboard-subtitle">{subtitle}</p>
        </div>
        <motion.div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginLeft: "auto",
          }}
        >
          <SwitchModeButton />
          {trailing}
        </motion.div>
      </motion.div>
    </header>
  );
}

export function ApiControls({
  apiStatus,
  setApiStatus,
  defaultEmail,
}: {
  apiStatus: string;
  setApiStatus: (s: string) => void;
  defaultEmail?: string;
}) {
  const { apiToken, apiEmail, apiRole, setApiSession, clearApiSession, canPushToApi } = useSession();
  const { dataset, loadDatasetSnapshot } = useOps();
  const [email, setEmail] = useState(apiEmail ?? defaultEmail ?? "admin@local.test");
  const [password, setPassword] = useState("changeme");

  const api = useMemo(() => createApiClient({ getToken: () => apiToken }), [apiToken]);

  if (apiToken) {
    return (
      <>
        <span className="chip" title={apiEmail ?? undefined}>
          API · {apiRole ?? "user"}
        </span>
        <span className="chip">{apiStatus}</span>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              const remote = await api.getDataset();
              if (!remote) return;
              loadDatasetSnapshot(normalizeCommOpsDataset(remote));
              setApiStatus("API: refreshed");
            } catch {
              setApiStatus("API: refresh failed");
            }
          }}
        >
          Refresh
        </button>
        {canPushToApi && (
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
        <button type="button" className="btn" onClick={() => clearApiSession()}>
          <LogOut size={14} /> Log out
        </button>
      </>
    );
  }

  return (
    <>
      <span className="chip">{apiStatus}</span>
      <form
        style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const session = await api.login(email, password);
            setApiSession(session);
            setApiStatus("API: connected");
          } catch {
            setApiStatus("API: login failed");
          }
        }}
      >
        <input className="input" style={{ width: 140 }} value={email} onChange={(e) => setEmail(e.target.value)} />
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
    </>
  );
}
