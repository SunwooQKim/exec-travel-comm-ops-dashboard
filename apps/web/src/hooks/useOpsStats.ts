import {
  deriveAlerts,
  personnelAtHomeStation,
  personnelByStatus,
  personnelByTravelTeam,
  personnelDeployedForward,
  readinessRollup,
} from "@comm-ops/core";
import { useMemo } from "react";
import { useOps } from "../store/OpsContext";

export function useOpsStats() {
  const { dataset, effectivePeople, effectiveEquipment } = useOps();

  return useMemo(() => {
    const alerts = deriveAlerts(dataset);
    const rollup = readinessRollup(effectiveEquipment);
    const pc = personnelByStatus(effectivePeople);
    const teams = personnelByTravelTeam(effectivePeople);
    const homeCount = personnelAtHomeStation(effectivePeople, dataset.subTeams).length;
    const forwardCount = personnelDeployedForward(effectivePeople, dataset.subTeams).length;
    return { alerts: alerts.length, rollup, pc, teams, homeCount, forwardCount, alertItems: alerts };
  }, [dataset, effectivePeople, effectiveEquipment]);
}
