import { MatchView } from "@/views/MatchViews";
import { buildApiGet } from "@/lib/server-api";

// One static page per Premier League fixture, generated at build time.
// The page itself loads the live data from the API in the browser.
export async function generateStaticParams() {
  const matches = await buildApiGet<{ id: string }[]>("/matches?competition=premier-league");
  return matches.map((m) => ({ id: m.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MatchView id={id} />;
}
