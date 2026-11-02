import type { RunDetail } from "@veriqa/contracts";

export async function request<T>(path: string, schema: { parse(value: unknown): T }, body?: unknown): Promise<T> {
  const response = await fetch(`/api/qa${path}`, body === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json", "X-VeriQA-Action": "dashboard" },
    body: JSON.stringify(body),
  });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error(value && typeof value === "object" && "error" in value ? String(value.error) : `HTTP ${response.status}`);
  return schema.parse(value);
}

export const artifactUrl = (runId: string, path: string) =>
  `/api/qa/runs/${encodeURIComponent(runId)}/artifacts?path=${encodeURIComponent(path)}`;
export const display = (value: unknown) => value === undefined ? "Not observed" : JSON.stringify(value, null, 2);
export const date = (value: string | null) => value ? new Date(value).toLocaleString() : "Unknown time";
export const short = (value: string | null) => value ? value.slice(0, 8) : "—";
// Terminal color codes are presentation only. Original artifact downloads remain byte-for-byte intact.
export const cleanLog = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, "");
export const comparable = (left: RunDetail | null, right: RunDetail | null) => !!left?.record && !!right?.record
  && left.record.metadata.planId === right.record.metadata.planId
  && left.record.metadata.revision === right.record.metadata.revision
  && left.record.metadata.contentHash === right.record.metadata.contentHash;
