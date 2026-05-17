import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardMode = "admin" | "leader";

export type ApiRole = "admin" | "leader" | "viewer" | string;

const MODE_KEY = "comm-ops-dashboard-mode";
const TOKEN_KEY = "comm-ops-token";
const ROLE_KEY = "comm-ops-api-role";
const EMAIL_KEY = "comm-ops-api-email";

type SessionCtx = {
  mode: DashboardMode | null;
  setMode: (mode: DashboardMode | null) => void;
  canWrite: boolean;
  isLeaderView: boolean;
  apiToken: string;
  apiRole: ApiRole | null;
  apiEmail: string | null;
  setApiSession: (session: { token: string; role: ApiRole; email: string } | null) => void;
  clearApiSession: () => void;
  canPushToApi: boolean;
};

const Ctx = createContext<SessionCtx | null>(null);

function readStoredMode(): DashboardMode | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(MODE_KEY);
  return v === "admin" || v === "leader" ? v : null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode | null>(readStoredMode);
  const [apiToken, setApiToken] = useState(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) ?? "" : "",
  );
  const [apiRole, setApiRole] = useState<ApiRole | null>(() =>
    typeof localStorage !== "undefined" ? (localStorage.getItem(ROLE_KEY) as ApiRole | null) : null,
  );
  const [apiEmail, setApiEmail] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(EMAIL_KEY) : null,
  );

  const setMode = useCallback((next: DashboardMode | null) => {
    setModeState(next);
    if (typeof localStorage === "undefined") return;
    if (next) localStorage.setItem(MODE_KEY, next);
    else localStorage.removeItem(MODE_KEY);
  }, []);

  const setApiSession = useCallback(
    (session: { token: string; role: ApiRole; email: string } | null) => {
      if (!session) {
        setApiToken("");
        setApiRole(null);
        setApiEmail(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(EMAIL_KEY);
        return;
      }
      setApiToken(session.token);
      setApiRole(session.role);
      setApiEmail(session.email);
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(ROLE_KEY, String(session.role));
      localStorage.setItem(EMAIL_KEY, session.email);
    },
    [],
  );

  const clearApiSession = useCallback(() => setApiSession(null), [setApiSession]);

  const isLeaderView = mode === "leader";
  const canWrite = mode === "admin";
  const canPushToApi = canWrite && apiToken !== "" && apiRole === "admin";

  const value = useMemo(
    () => ({
      mode,
      setMode,
      canWrite,
      isLeaderView,
      apiToken,
      apiRole,
      apiEmail,
      setApiSession,
      clearApiSession,
      canPushToApi,
    }),
    [mode, setMode, canWrite, isLeaderView, apiToken, apiRole, apiEmail, setApiSession, clearApiSession, canPushToApi],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession requires SessionProvider");
  return v;
}
