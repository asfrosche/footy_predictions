export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "TBC";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "TBC"
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export const fmtPct = (n: number | null | undefined): string =>
  n == null ? "–" : `${Number(n).toFixed(1)}%`;

// Most recent first. Undated items sort to the bottom.
export function newestFirst<T extends { date: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export const pathSegment = (value: string) => encodeURIComponent(value);
