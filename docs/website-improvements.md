# Top 10 improvements for the website

Ranked by how much they affect what the site is for: honest predictions, a usable match page, and a site that can be shared.

## 1. Commit the uncommitted work in logical pieces
Most of the recent work (crests, match page, World Cup layout, managers, run status) is not in git. Splitting it into reviewable commits makes it safe to roll back a single change.
- **Why it matters:** a single large change is hard to review and easy to lose.
- **Next step:** group changes by area (engines, data, API, web) and commit each group.

## 2. Make model runs fast from the first click
The first run after the server starts takes about 14 seconds, all of it loading the seven engines.
- **Why it matters:** the first user to click waits for the load.
- **Next step:** load the engines when the API starts, so the first click is already fast.

## 3. Show uncertainty on the model probabilities
Each model shows home, draw and away percentages with no range. With 200 simulations, the percentages can move by several points between runs.
- **Why it matters:** users may read a 3-point difference as a real edge.
- **Next step:** show a confidence band (or a note on the simulation count) next to each percentage.

## 4. Fill in the missing market odds, or say clearly where they are missing
The market-edge comparison and the odds rows have no live odds right now. The market-edge page carries a warning, but the rest of the site does not explain it.
- **Why it matters:** edges cannot be judged without a market price.
- **Next step:** use a licensed odds source, and show "no odds" consistently wherever odds are expected.

## 5. Check the layout at phone width
Desktop was checked for the World Cup groups and the match page. Phone width was not.
- **Why it matters:** the site is shared through links that people often open on a phone.
- **Next step:** check the main pages at 390px wide, and fix the group cards and match rows there.

## 6. Level the match rows
Team names of different lengths wrap onto different numbers of lines, so the score and the team sit at different heights from row to row (for example "Korea Republic" and "Bosnia and Herzegovina" on the World Cup page).
- **Why it matters:** the page looks misaligned, which makes the data harder to scan.
- **Next step:** give the team columns a fixed width and allow names to wrap within it.

## 7. Clear the console errors from the static build
Each page logs about 14 "404 Not Found" errors for prefetch files that the static export does not serve.
- **Why it matters:** real errors get lost in the noise, and the errors may slow page loads.
- **Next step:** disable prefetch for those links, or serve the prefetch files from the build.

## 8. Settle the source of the hard-coded ratings
**Status (2026-11-17): done for Elo.** Club Elo is from clubelo.com and national Elo from eloratings.net, both retrieved 2026-11-17 (record: `data/inputs/team_ratings_2026-11-17.json`). Matches already in those ratings are no longer applied again (`ratings_as_of`). PELE for the World Cup is still unsourced.
Some team ratings (the Premier League Elo values and the World Cup team metrics) are typed into the code, and their origin is not recorded.
- **Why it matters:** the predictions depend on those numbers, and nobody can check where they came from.
- **Next step:** move them into a data file with a source and date, or remove them.

## 9. Replace the third-party crests and record their licence
The club crests come from third-party logo sites and Wikipedia. They are not licensed for reuse on a public site.
- **Why it matters:** the site may be shared publicly, which could breach the image licences.
- **Next step:** confirm each crest's licence, and replace any that are not cleared.

## 10. Host the site properly, instead of through a tunnel
The site currently runs on a local API with a temporary tunnel. Each new Premier League fixture also needs a rebuild to get its match page.
- **Why it matters:** the link stops working when the computer is off, and new fixtures are missing until someone rebuilds.
- **Next step:** host the static site (for example on Cloudflare Pages), and move the API to a host that can run Python. Generate the match pages from the fixture list automatically.
