import { TeamView } from "@/views/MatchViews";
import { buildApiGet } from "@/lib/server-api";
import type { MatchSummary } from "@/lib/types";

// One static page per club or national team, generated at build time.
export async function generateStaticParams() {
  const matches = await buildApiGet<MatchSummary[]>("/matches");
  const teams = new Set<string>();
  for (const m of matches) {
    teams.add(m.home);
    teams.add(m.away);
  }
  return [...teams].map((name) => ({ name }));
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <TeamView name={decodeURIComponent(name)} />;
}
