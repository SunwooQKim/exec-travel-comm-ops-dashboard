import {
  TRAVEL_TEAM_LABELS,
  TRAVEL_TEAM_SHORT,
  TRAVEL_TEAMS,
  subTeamById,
} from "@comm-ops/core";
import { motion } from "framer-motion";
import { AlertTriangle, Package, Users } from "lucide-react";
import { useMemo } from "react";
import { useOps } from "../store/OpsContext";
import { useOpsStats } from "../hooks/useOpsStats";

export function LeaderKpiStrip() {
  const stats = useOpsStats();
  const { effectivePeople, effectiveEquipment } = useOps();

  const kpis = [
    { label: "Personnel", value: String(effectivePeople.length), icon: Users, tone: "accent" as const },
    { label: "Equipment", value: String(effectiveEquipment.length), icon: Package, tone: "neutral" as const },
    {
      label: "Open alerts",
      value: String(stats.alerts),
      icon: AlertTriangle,
      tone: stats.alerts > 0 ? ("warn" as const) : ("ok" as const),
    },
    { label: "FMC rate", value: `${stats.rollup.fmc}/${stats.rollup.total}`, icon: Package, tone: "ok" as const },
    { label: "Home station", value: String(stats.homeCount), icon: Users, tone: "neutral" as const },
    { label: "Forward", value: String(stats.forwardCount), icon: Users, tone: "accent" as const },
  ];

  return (
    <motion.div
      className="leader-kpi-strip"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {kpis.map((k) => (
        <motion.div key={k.label} className={`leader-kpi leader-kpi-${k.tone}`}>
          <k.icon size={18} strokeWidth={1.75} />
          <motion.div>
            <motion.div className="leader-kpi-value">{k.value}</motion.div>
            <motion.div className="leader-kpi-label">{k.label}</motion.div>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function LeaderMissionDigest() {
  const { dataset, effectivePeople, setSelection } = useOps();
  const stats = useOpsStats();

  const byTeam = useMemo(() => {
    return TRAVEL_TEAMS.map((t) => {
      const people = effectivePeople.filter((p) => p.travelTeam === t);
      const subMap = new Map<string, typeof people>();
      for (const p of people) {
        const arr = subMap.get(p.subTeamId) ?? [];
        arr.push(p);
        subMap.set(p.subTeamId, arr);
      }
      return { team: t, people, subMap };
    });
  }, [effectivePeople]);

  const topIssues = dataset.equipmentIssueLog.slice(0, 4);

  return (
    <motion.div
      className="leader-digest"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 }}
    >
      <section className="panel leader-digest-section">
        <motion.div className="panel-header">Travel cohorts</motion.div>
        <motion.div className="leader-digest-body">
          {byTeam.map(({ team, people, subMap }) => (
            <details key={team} className="leader-detail-block" open={team === "secaf"}>
              <summary>
                <span className="leader-detail-title">{TRAVEL_TEAM_SHORT[team]}</span>
                <span className="leader-detail-meta">{people.length} members</span>
              </summary>
              <p className="leader-detail-sub">{TRAVEL_TEAM_LABELS[team]}</p>
              {[...subMap.entries()].map(([subId, members]) => {
                const st = subTeamById(dataset.subTeams, subId);
                const kit = dataset.equipment.filter((e) => e.subTeamId === subId).length;
                return (
                  <button
                    key={subId}
                    type="button"
                    className="leader-mission-row"
                    onClick={() =>
                      setSelection({
                        kind: "personGroup",
                        memberIds: members.map((m) => m.id),
                        locationLabel: st?.locationLabel ?? st?.name ?? subId,
                      })
                    }
                  >
                    <motion.div>
                      <motion.div className="leader-mission-name">{st?.name ?? subId}</motion.div>
                      <motion.div className="leader-mission-loc">{st?.locationLabel}</motion.div>
                    </motion.div>
                    <motion.div className="leader-mission-counts">
                      <span>{members.length} pax</span>
                      {kit > 0 && <span>{kit} kit</span>}
                    </motion.div>
                  </button>
                );
              })}
            </details>
          ))}
        </motion.div>
      </section>

      <section className="panel leader-digest-section">
        <motion.div className="panel-header">Priority exceptions</motion.div>
        <motion.div className="leader-digest-body">
          {stats.alertItems.length === 0 ? (
            <p className="leader-empty">No derived alerts at this time.</p>
          ) : (
            stats.alertItems.slice(0, 6).map((a) => (
              <button
                key={a.id}
                type="button"
                className={`leader-alert-row leader-alert-${a.severity}`}
                onClick={() => setSelection({ kind: a.entityType, id: a.entityId })}
              >
                <strong>{a.title}</strong>
                <span>{a.detail}</span>
              </button>
            ))
          )}
        </motion.div>
      </section>

      {topIssues.length > 0 && (
        <section className="panel leader-digest-section">
          <motion.div className="panel-header">Field knowledge (sample)</motion.div>
          <motion.div className="leader-digest-body">
            {topIssues.map((iss) => (
              <motion.div key={iss.id} className="leader-issue-card">
                <motion.div className="leader-issue-symptom">{iss.symptom}</motion.div>
                {iss.resolution && <motion.div className="leader-issue-fix">{iss.resolution}</motion.div>}
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}
    </motion.div>
  );
}
