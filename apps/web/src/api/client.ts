import { OpsDatasetSchema, type OpsDataset } from "@comm-ops/core";

const base = () => {
  const fromEnv = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "";
};

export function createApiClient(opts: { getToken: () => string }) {
  const prefix = base() || "";

  async function req(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    const t = opts.getToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
    const url = `${prefix || ""}${path}`;
    const res = await fetch(url, { ...init, headers });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res;
  }

  return {
    async login(email: string, password: string) {
      const res = await req("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      return (await res.json()) as { token: string; role: string; email: string };
    },
    async getDataset(): Promise<OpsDataset | null> {
      const res = await req("/api/ops");
      const data = await res.json();
      if (!data?.dataset) return null;
      return OpsDatasetSchema.parse(data.dataset);
    },
    async putDataset(dataset: OpsDataset) {
      const body = OpsDatasetSchema.parse(dataset);
      await req("/api/ops", { method: "PUT", body: JSON.stringify(body) });
    },
  };
}
