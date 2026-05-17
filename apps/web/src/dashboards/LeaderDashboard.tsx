import { motion } from "framer-motion";
import { useState } from "react";
import { CommandMap } from "../components/CommandMap";
import { Timeline } from "../components/Timeline";
import { LeaderKpiStrip, LeaderMissionDigest } from "../components/LeaderBrief";
import {
  ApiControls,
  DashboardHeader,
  LayerToggles,
  ReadOnlyBadge,
} from "../components/shared/DashboardChrome";
import { useApiDatasetSync } from "../hooks/useApiDatasetSync";
import { useOps } from "../store/OpsContext";

export function LeaderDashboard() {
  const { effectivePeople, effectiveEquipment, dataset } = useOps();
  const [apiStatus, setApiStatus] = useState("API: not connected (optional)");
  useApiDatasetSync(setApiStatus);

  return (
    <div className="dashboard-shell leader-shell">
      <DashboardHeader
        title="Leadership brief"
        subtitle="Worldwide comm posture — explore map, timeline, and mission details (read-only)"
        badge={<ReadOnlyBadge />}
        trailing={
          <>
            <LayerToggles />
            <ApiControls
              apiStatus={apiStatus}
              setApiStatus={setApiStatus}
              defaultEmail="leader@local.test"
            />
          </>
        }
      />

      <LeaderKpiStrip />

      <div className="dashboard-grid-leader">
        <motion.aside
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="leader-col-side"
        >
          <Timeline />
        </motion.aside>

        <motion.main
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="panel leader-map-panel"
        >
          <div className="panel-header leader-map-header">Global battlespace</div>
          <motion.div className="dashboard-map-inner leader-map-inner">
            <CommandMap
              people={effectivePeople}
              equipment={effectiveEquipment}
              sites={dataset.sites}
            />
          </motion.div>
        </motion.main>

        <motion.aside
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="leader-col-side scroll-y"
        >
          <LeaderMissionDigest />
        </motion.aside>
      </div>
    </div>
  );
}
