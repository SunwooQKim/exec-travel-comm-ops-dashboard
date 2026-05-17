import { motion } from "framer-motion";
import { Eye, Shield, ChevronRight } from "lucide-react";
import type { DashboardMode } from "../store/SessionContext";

type ModeSelectProps = {
  onSelect: (mode: DashboardMode) => void;
};

export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mode-select-screen"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mode-select-hero"
      >
        <p className="mode-select-eyebrow">Comm Wing · Demo</p>
        <h1>Operations command center</h1>
        <p className="mode-select-lead">
          Choose how you want to use the dashboard. Admin staff maintain the live picture; leadership
          gets a read-only brief optimized for review and exploration.
        </p>
      </motion.div>

      <motion.div
        className="mode-select-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <button type="button" className="mode-card mode-card-admin" onClick={() => onSelect("admin")}>
          <motion.div className="mode-card-icon" aria-hidden>
            <Shield size={28} />
          </motion.div>
          <h2>Command post</h2>
          <p className="mode-card-tag">Admin · full access</p>
          <p>
            Edit personnel, equipment, and sub-teams. Import data, use map pick, push snapshots to the
            API, and run the command post panel.
          </p>
          <span className="mode-card-cta">
            Enter admin workspace <ChevronRight size={16} />
          </span>
        </button>

        <button type="button" className="mode-card mode-card-leader" onClick={() => onSelect("leader")}>
          <motion.div className="mode-card-icon" aria-hidden>
            <Eye size={28} />
          </motion.div>
          <h2>Leadership brief</h2>
          <p className="mode-card-tag">Read-only · executive view</p>
          <p>
            Explore the worldwide map, timeline replay, readiness roll-ups, and mission details. No
            edits, imports, or backend writes — safe to click through during a brief.
          </p>
          <span className="mode-card-cta">
            Open leadership brief <ChevronRight size={16} />
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
}
