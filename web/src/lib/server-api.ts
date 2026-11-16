// Used only at build time (generateStaticParams). The FastAPI server must be running.
// Set API_BUILD_URL if it is not on the default port.
const BASE = process.env.API_BUILD_URL ?? "http://127.0.0.1:8765";

export async function buildApiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) throw new Error(`Build could not reach the API at ${BASE}${path} (${res.status}).`);
  return (await res.json()) as T;
}
