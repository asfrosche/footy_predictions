# Phase 3: data provider assessment

Checked 2026-11-17. Scope: the data gaps listed in `docs/research/phase1-audit.md` (section 3, "Data", and section 5, item 7) and the table "Data we'd need" in `docs/research/football-prediction-papers.md`.

**Important limit:** these are search-result summaries, not the providers' own terms. For most providers the primary terms page did not come back. Nothing below is a licence opinion. Before any provider is used in a way that is stored, redistributed or published, read the primary terms and record the date.

No personal data is involved. No account, key or credential was used, and no data was downloaded.

## Summary

| Gap | Candidate provider | Licence status found | Recommendation |
|---|---|---|---|
| Multi-season results with dates | openfootball (football.json, England) | **CC0 public domain**, per secondary listings. The repo's own LICENSE file was not opened. | Already used. Confirm the LICENSE file, then keep. |
| Multi-season results and odds, PL | football-data.co.uk | Terms **not retrieved**. Search returned Football DataCo pages, which are a different organisation. | Read the site's own terms before use. |
| Closing odds (licensed) | The Odds API (already in the repo) | Pricing and terms **not retrieved**. Third-party sources disagree on plan prices and whether historical data is limited on lower tiers. | Check the official pricing and terms. Historical calls reportedly cost 10× live credits. |
| Team Elo ratings, historic | ClubElo (api.clubelo.com) | Terms **not retrieved**. Third-party packages cite robots.txt as permission, which does not establish a licence. | Read clubelo.com's API page before use. |
| Shot-level data with xG | StatsBomb open data | Free competitions are public on GitHub. Governed by the StatsBomb Public Data User Agreement, **not retrieved**. Attribution required. | Usable for the tournaments it covers (for example World Cup 2018 and 2022). Read the User Agreement first. Coverage is not Premier League. |
| Shot-level xG, PL | Understat | Terms **not retrieved**. Scraper vendors defer to the terms. | Do not scrape without written permission. |
| Player ratings, injuries, lineups | Transfermarkt | Operator's 2018 email (quoted secondhand) says data is copyrighted and no licence is granted. | Do not scrape. Ask for permission, or drop it. |
| Player and team stats | FBref / Sports Reference | Secondary sources say scraping is limited to certain uses. Terms **not retrieved**. | Do not scrape until the terms are read. |
| Sourced player ratings with a dated history | None found in this check | — | Remains an open gap. |
| Historic lineups | Official PL lineups | Not checked in this phase. | Open. |

## Provider notes

**openfootball (football.json).** The README describes it as free, public-domain football data, and the England repo's listing gives cc0-1.0. The JSON is generated from plain-text sources, which should be edited instead. No API key is needed. Only results and fixtures are in scope; odds, shots and lineups are not in the data. This is the only source in the table with a clear public-domain licence on the evidence found.

**football-data.co.uk.** The search returned Football DataCo's pages, which cover fixture lists and matchday data rights for English and Scottish leagues. That organisation is not the same site. The Football DataCo FAQ says fixture lists carry no protection under UK or EU law. It does not cover the football-data.co.uk results and odds files, so their terms are still unknown.

**The Odds API.** The third-party sources disagree on starting prices, and one says historical odds snapshots go back to 2020 on the same credit model. The historical-call multiplier and the tier limits need checking on the official site. Redistribution rights are the main question for any published page, and they were not found.

**ClubElo.** Usable as a data source by reading the API page. It is the most direct source for dated team Elo history, which would close the gap that Elo values are hand-entered for PL and WC. Its terms need checking before any stored copy is used.

**StatsBomb open data.** Free to read through its GitHub repos and the statsbombpy package. Coverage is selected competitions and tournaments, not the Premier League, so it can test xG on World Cup matches but not on the PL walk-forward set. Attribution is required when publishing results.

**Understat, Transfermarkt and FBref.** The evidence is that automated collection is restricted or unlicensed. Writing a collector for any of them without checking terms would create the risk the organisation's instructions ask us to avoid. Treat them as off-limits until their terms are read and, where needed, permission is obtained.

## What this means for the audit's priorities

1. **Dated team Elo (ClubElo):** could fix the hand-entered Elo values. Check its terms first. This is the most useful low-cost step.
2. **Closing odds:** needed for the bookmaker comparison in the audit's item 2. The Odds API is the candidate already in the repo. Check historical coverage and licence before buying a plan.
3. **Shot xG:** StatsBomb open data can support a small xG test on tournament matches. It cannot test the PL models directly.
4. **Dated player ratings and historic lineups:** no provider with a clear licence was found. These gaps stay open. The audit's item 7 should say so, rather than fill them with scraped data.

## GitHub repositories (filtered)

Search: GitHub repository search, run 2026-11-17 on ten topics (football data, soccer data, premier league, football odds, expected goals, football Elo, player ratings, lineups, match prediction, betting odds). Filter: at least 100 stars and last push on or after 2026-05-01. Unauthenticated, so results are the top 30 per query by stars. That is a relevance cap, not a complete census. 21 repos passed.

| Repo | Stars | Last push | Licence (repo) | Relevant to | Upstream source (from its README) | Use? |
|---|---|---|---|---|---|---|
| openfootball/football.json | 1,068 | 2026-09 | CC0-1.0 | Results (already used) | Public domain | Keep |
| openfootball/england | 501 | 2026-10 | CC0-1.0 | PL results | Public domain | Keep |
| openfootball/worldcup.json | 485 | 2026-08 | CC0-1.0 | World Cup results | Public domain | Usable for WC results |
| withqwerty/reep | 246 | 2026-08 | CC0-1.0 | ID mapping across Transfermarkt, FBref, ClubElo | Identity register, no ratings | Useful for joining sources; contains no match or rating data |
| xgabora/Club-Football-Match-Data | 223 | 2026-09 | MIT | Results, odds, Elo | Results and odds from Football-Data.co.uk; Elo from ClubElo through 1 June 2025, then a **provisional continuation generated by the author** | Strong candidate for odds and Elo, but the Elo rows after June 2025 must not be used as real history. Confirm the licence chain for FD and ClubElo first. |
| penaltyblog (martineastwood) | 250 | 2026-10 | MIT | Ratings, odds, scrapers | Library, not data. Includes Elo, Pi, Massey, Colley, and implied-probability removal of bookmaker margin | Good reference implementation to cross-check our margin removal and Elo. Its scrapers inherit each source's terms. |
| hudl/open-data (StatsBomb) | 3,822 | 2026-11 | NOASSERTION (StatsBomb terms) | Shot and event data | StatsBomb Open Data, free to use with attribution | Usable for tournament xG tests, as in Phase 3 |
| probberechts/soccerdata | 2,142 | 2026-11 | NOASSERTION | Scraper library | Wraps ClubElo, Football-Data.co.uk, FBref, and others | Code only. It does not grant rights to the data it fetches. |
| dcaribou/transfermarkt-datasets | 529 | 2026-09 | CC0-1.0 | Player values, transfers, appearances | Built from Transfermarkt. Snapshot to 6 July 2026, **not refreshed** | **Do not use yet.** A CC0 label on the repo cannot grant rights that Transfermarkt does not. Transfermarkt's operator has said no licence is granted. |
| olbauday/FPL-Core-Insights | 230 | 2026-11 | none | Player stats, Elo | FPL API and ClubElo | **Do not use.** No licence. The author asks for a link back, which is not a licence. FPL API terms are not checked. |
| felipeall/transfermarkt-api | 474 | 2026-10 | MIT | Transfermarkt scraper | Transfermarkt | Same Transfermarkt concern as above |
| FantasyFootballAnalytics/FantasyFootballAnalyticsR | 514 | 2026-05 | none | FPL | Mixed | Do not use without a licence |

Not counted: repos for other sports or for fantasy games (CartolaFC, dynastyprocess, cfbfastR), and the ClipMaker highlight tool, which is not a data source.

**What the filter does and does not show.** Stars and recency show activity and interest. They say nothing about whether the data is correct, licensed or complete. Every row above that uses upstream data inherits that upstream's terms, and most of those terms are still unread. The repo licence covers the code, and in the CC0 cases the data the repo itself produces, not the data it copied.

**Shortlist for the audit's gaps:**

1. **Closing odds and Elo history:** xgabora/Club-Football-Match-Data is the most complete single source found. Use only its pre-June-2025 Elo rows and confirm the upstream licences of Football-Data.co.uk and ClubElo.
2. **Margin removal cross-check:** penaltyblog's implied-probability code, to check our own method against an independent implementation.
3. **Tournament xG:** hudl/open-data, under StatsBomb's terms and with attribution.
4. **Dated player ratings:** nothing with a clear licence was found. Transfermarkt-based repos stay excluded.

## Not done in this phase

- No primary terms were read. Each "terms not retrieved" line above needs a direct check.
- No provider was tested for data quality, coverage or access rate.
- No data was downloaded or stored.
- The provider list is what the earlier documents named, plus the sources that came up in searches. A wider market scan was not part of this phase.
