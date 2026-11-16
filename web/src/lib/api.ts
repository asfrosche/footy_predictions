// Data access for the browser. Every page loads its data from the FastAPI backend.
// In production FastAPI serves this site, so the API is on the same origin ("").
// In `next dev`, set NEXT_PUBLIC_API_BASE=http://127.0.0.1:8765 to use the running backend.

import useSWR, { type SWRConfiguration } from "swr";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new ApiError(res.status, res.status === 404 ? "Not found." : "Could not load data.");
  }
  return (await res.json()) as T;
}

const fetcher = <T,>(path: string) => apiGet<T>(path);

// Live data: refresh every `seconds` while the page is open, and when the tab regains focus.
export function useApi<T>(path: string | null, seconds = 60, options: SWRConfiguration<T> = {}) {
  return useSWR<T, ApiError>(path, fetcher as (key: string) => Promise<T>, {
    refreshInterval: seconds * 1000,
    revalidateOnFocus: true,
    ...options,
  });
}
