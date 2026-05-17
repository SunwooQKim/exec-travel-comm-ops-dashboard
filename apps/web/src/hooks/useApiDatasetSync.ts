import { normalizeCommOpsDataset } from "@comm-ops/core";
import { useEffect, useMemo } from "react";
import { createApiClient } from "../api/client";
import { useOps } from "../store/OpsContext";
import { useSession } from "../store/SessionContext";

export function useApiDatasetSync(setApiStatus: (s: string) => void) {
  const { apiToken } = useSession();
  const { loadDatasetSnapshot } = useOps();
  const api = useMemo(() => createApiClient({ getToken: () => apiToken }), [apiToken]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!apiToken) {
        setApiStatus("API: not connected (optional)");
        return;
      }
      try {
        const remote = await api.getDataset();
        if (cancelled || !remote) return;
        loadDatasetSnapshot(normalizeCommOpsDataset(remote));
        setApiStatus("API: loaded remote snapshot");
      } catch {
        if (!cancelled) setApiStatus("API: error loading");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiToken, api, loadDatasetSnapshot, setApiStatus]);
}
