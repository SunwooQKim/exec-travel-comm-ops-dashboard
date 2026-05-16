import { OpsDatasetSchema, type OpsDataset } from "./schemas";
import { normalizeCommOpsDataset } from "./geo";

const STORAGE_KEY = "comm-ops-dataset-v2";

export function parseOpsDatasetJson(raw: string): OpsDataset {
  const data = JSON.parse(raw) as unknown;
  return normalizeCommOpsDataset(OpsDatasetSchema.parse(data));
}
export function serializeOpsDataset(dataset: OpsDataset): string {
  const checked = OpsDatasetSchema.parse(dataset);
  return JSON.stringify(checked, null, 2);
}

export function loadDatasetFromLocalStorage(): OpsDataset | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseOpsDatasetJson(raw);
  } catch {
    return null;
  }
}

export function saveDatasetToLocalStorage(dataset: OpsDataset): void {
  localStorage.setItem(STORAGE_KEY, serializeOpsDataset(dataset));
}

export function clearDatasetLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export { STORAGE_KEY };
