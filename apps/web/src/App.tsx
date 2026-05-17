import { AnimatePresence, motion } from "framer-motion";
import { ModeSelect } from "./components/ModeSelect";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { LeaderDashboard } from "./dashboards/LeaderDashboard";
import { useSession } from "./store/SessionContext";

export function App() {
  const { mode, setMode } = useSession();

  return (
    <AnimatePresence mode="wait">
      {!mode ? (
        <motion.div
          key="select"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ModeSelect onSelect={setMode} />
        </motion.div>
      ) : mode === "admin" ? (
        <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AdminDashboard />
        </motion.div>
      ) : (
        <motion.div key="leader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LeaderDashboard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
