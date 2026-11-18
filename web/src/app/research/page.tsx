import Link from "next/link";
import type { Metadata } from "next";
import { DATA_SOURCES, EVALUATION, PAPERS } from "@/lib/research";

export const metadata: Metadata = {
  title: "Research · Footy Predictions",
  description: "The papers, evaluation results and data sources behind the football prediction models.",
};

const STATUS_CLASS: Record<string, string> = {
  Confirmed: "pill",
  "Partly confirmed": "pill muted-pill",
  Preprint: "pill muted-pill",
  Usable: "pill",
  "Check terms": "pill muted-pill",
  "Not used": "pill muted-pill",
};

export default function Page() {
  const wf = EVALUATION.walkForward;
  return (
    <>
      <div className="section-head">
        <h1>Research</h1>
        <span className="muted small">Sources, evaluation and data behind the models</span>
      </div>

      <nav className="research-toc small" aria-label="On this page">
        <a href="#evaluation">Evaluation</a>
        <a href="#odds">Odds and margin</a>
        <a href="#papers">Papers ({PAPERS.length})</a>
        <a href="#data">Data sources</a>
      </nav>

      <section className="card" id="evaluation">
        <div className="card-head">
          <h2>How the models are evaluated</h2>
          <span className="muted small">Walk-forward, out of sample</span>
        </div>
        <p className="small">
          The only out-of-sample result so far is a results-only Poisson benchmark, fitted walk-forward over{" "}
          {wf.matches.toLocaleString("en-GB")} matches ({wf.seasons}). Its log loss is{" "}
          <span className="mono">{wf.logLoss.toFixed(3)}</span> against{" "}
          <span className="mono">{wf.leagueAverageLogLoss.toFixed(3)}</span> for the league average. The difference is{" "}
          <span className="mono">{wf.diff.toFixed(3)}</span> (95% interval {wf.ci}).
        </p>
        <h3 className="research-sub">Limits of these results</h3>
        <ul className="research-list small">
          {EVALUATION.caveats.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="faint small">
          Log loss and the Brier score are proper scoring rules. The Rank Probability Score is also reported, with its
          disputed status noted in the references below.
        </p>
      </section>

      <section className="card" id="odds" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h2>Odds and margin</h2>
          <span className="muted small">Margin removed</span>
        </div>
        <p className="small">
          Bookmaker prices include a margin, so their implied probabilities add up to more than 100%. The site
          removes that margin to show the probabilities. Odds are shown as bookmaker prices; the probabilities are a
          derived view, not a betting recommendation.
        </p>
        <p className="faint small">
          Closing odds are the market benchmark used in the papers below (Dixon &amp; Coles, Koopman &amp; Lit,
          Hvattum &amp; Arntzen). Several of those papers report betting profits. Profit from a strategy is not
          evidence of a better probability model.
        </p>
      </section>

      <div className="section-head" id="papers" style={{ marginTop: 24 }}>
        <h2>Papers</h2>
        <span className="muted small">Citations checked against the publisher or repository record</span>
      </div>
      <p className="faint small" style={{ margin: "0 0 12px" }}>
        Status shows what was confirmed. <strong>Confirmed</strong> means the citation and main claim match the record.{" "}
        <strong>Partly confirmed</strong> means the citation is right but at least one claim is not supported or is
        disputed. <strong>Preprint</strong> means the paper is not peer-reviewed. Full texts were not all read, so
        numbers quoted from abstracts should be checked before reuse.
      </p>
      <div className="research-papers">
        {PAPERS.map((p) => (
          <article className="card research-paper" id={p.id} key={p.id}>
            <div className="research-paper-top">
              <span className={STATUS_CLASS[p.status] ?? "pill"}>{p.status}</span>
              <span className="faint small mono">{p.year}</span>
            </div>
            <h3>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a> : p.title}</h3>
            <p className="muted small" style={{ margin: "0 0 8px" }}>
              {p.authors} · {p.venue}
            </p>
            <p className="small" style={{ margin: "0 0 8px" }}>
              <strong>Finding.</strong> {p.finding}
            </p>
            <p className="small" style={{ margin: "0 0 8px" }}>
              <strong>Use here.</strong> {p.use}
            </p>
            {p.note && <p className="faint small" style={{ margin: 0 }}>{p.note}</p>}
          </article>
        ))}
      </div>

      <section className="card" id="data" style={{ marginTop: 24 }}>
        <div className="card-head">
          <h2>Data sources</h2>
          <span className="muted small">Licence checked before use</span>
        </div>
        <p className="faint small" style={{ marginTop: 0 }}>
          Nothing here is a licence opinion. Where terms were not read, the status says so. Repository licences cover
          the code, not the data that code copies from elsewhere.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Status</th>
                <th>Licence</th>
                <th>Use</th>
              </tr>
            </thead>
            <tbody>
              {DATA_SOURCES.map((d) => (
                <tr key={d.name}>
                  <td>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        {d.name}
                      </a>
                    ) : (
                      d.name
                    )}
                  </td>
                  <td>
                    <span className={STATUS_CLASS[d.status] ?? "pill"}>{d.status}</span>
                  </td>
                  <td className="small">{d.licence}</td>
                  <td className="small">{d.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="faint small" style={{ marginTop: 20 }}>
        Back to <Link prefetch={false} href="/">overview</Link> or see the{" "}
        <Link prefetch={false} href="/premier-league/">Premier League</Link> table.
      </p>
    </>
  );
}
