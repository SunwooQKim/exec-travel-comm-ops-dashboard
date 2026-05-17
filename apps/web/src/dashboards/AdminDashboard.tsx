import { motion } from "framer-motion";
import { useState } from "react";
import { CommandMap } from "../components/CommandMap";
import { Timeline } from "../components/Timeline";
import { Boards } from "../components/Boards";
import { AdminPanel } from "../components/AdminPanel";
import { ApiControls, DashboardHeader, LayerToggles } from "../components/shared/DashboardChrome";
import { useApiDatasetSync } from "../hooks/useApiDatasetSync";
import { useOpsStats } from "../hooks/useOpsStats";
import { useOps } from "../store/OpsContext";

export function AdminDashboard() {
  const { effectivePeople, effectiveEquipment, dataset } = useOps();
  const stats = useOpsStats();
  const [apiStatus, setApiStatus] = useState("API: not connected (optional)");
  useApiDatasetSync(setApiStatus);

  return (
    <div className="dashboard-shell">
      <DashboardHeader
        title="COMM WING"
        subtitle="Command post — full edit access to personnel, equipment, and data"
        trailing={
          <>
            <LayerToggles />
            <div className="dashboard-stat-row">
              <span className="chip">Alerts: {stats.alerts}</span>
              <span className="chip">
                FMC {stats.rollup.fmc}/{stats.rollup.total}
              </span>
              <span className="chip">
                Home {stats.homeCount} · Forward {stats.forwardCount}
              </span>
              <ApiControls apiStatus={apiStatus} setApiStatus={setApiStatus} />
            </div>
          </>
        }
      />

      <div className="dashboard-grid-admin">
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="dashboard-col"
        >
          <Timeline />
          <div className="panel" style={{ padding: 12, flex: 1, minHeight: 0 }}>
            <div className="panel-header" style={{ border: "none", padding: "0 0 8px" }}>
              Summary
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)", margin: 0 }}>
              Worldwide picture for {effectivePeople.length} personnel and {effectiveEquipment.length} major
              items. Toggle layers to declutter; scrub the timeline to replay movement patches.
            </p>
            <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-dim)" }}>
              Status mix:{" "}
              {Object.entries(stats.pc)
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ")}
            </p>
          </div>
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="panel dashboard-map-panel"
        >
          <div className="panel-header">Battlespace</div>
          <div className="dashboard-map-inner">
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
          className="dashboard-col"
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
