import { useState } from "react";
import { roadmaps } from "../lib/content";
import { REPO_URL, BRANCH } from "../lib/links";
import { STATUS_LABEL, formatDate } from "./shared";

export function RoadmapView() {
  const [i, setI] = useState(0);
  const item = roadmaps[i];
  if (!item) return <section className="view"><h2>Roadmap</h2><p>No ROADMAP.md found under docs/plugins/.</p></section>;
  const { roadmap, path } = item;
  const { state, lanes } = roadmap;
  const tasks = lanes.flatMap((l) => l.tasks);
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = tasks.length ? Math.round((100 * done) / tasks.length) : 0;
  const phases = lanes.filter((l) => /^p\d+$/.test(l.id));

  return (
    <section className="view">
      <header>
        <span className="label">{path}</span>
        <h2>Roadmap · {state.plugin}</h2>
        <p>
          Phase {state.phase}
          {state.phaseTitle ? ` (${state.phaseTitle})` : ""}. Gate to pass: {state.gate}
          {state.updated ? `. Updated ${formatDate(state.updated)}.` : ""}
        </p>
      </header>
      {roadmaps.length > 1 && (
        <div className="chips">
          {roadmaps.map((r, k) => (
            <button type="button" key={r.path} aria-pressed={k === i} onClick={() => setI(k)}>
              {r.roadmap.state.plugin}
            </button>
          ))}
        </div>
      )}
      <div className="phases">
        {phases.map((l) => {
          const n = Number(l.id.slice(1));
          const cls = state.phase === null ? "" : n < state.phase ? "done" : n === state.phase ? "now" : "";
          const d = l.tasks.filter((t) => t.status === "done").length;
          return (
            <div className={`phase ${cls}`} key={l.id}>
              <span className="n">Phase {n}{cls === "done" ? " · passed" : cls === "now" ? " · current" : ""}</span>
              <h3>{l.title.replace(/^Phase \d+\s*·\s*/, "")}</h3>
              <span className="mono small">{d}/{l.tasks.length} done</span>
            </div>
          );
        })}
      </div>
      <div className="rm-bar">
        <div className="rm-track"><span style={{ width: pct + "%" }} /></div>
        <span className="mono">{done} of {tasks.length} tasks done</span>
      </div>
      <div className="board">
        {lanes.map((l) => {
          const now = state.phase !== null && l.id === `p${state.phase}`;
          return (
            <div className={`lane${now ? " now" : ""}`} key={l.id}>
              <h3>
                {l.title}
                <span>{l.tasks.filter((t) => t.status === "done").length}/{l.tasks.length}</span>
              </h3>
              {l.tasks.map((t, k) => (
                <div className={`task ${t.status}`} key={k}>
                  <b>{t.title}</b>
                  {t.note && <small>{t.note}</small>}
                  <span className={`st ${t.status}`}>{STATUS_LABEL[t.status]}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="mono small">
        The roadmap is the file <code>{path}</code>. The <code>index-writer</code> agent updates it at the end of each task and session.{" "}
        <a href={`${REPO_URL}/edit/${BRANCH}/${path}`} target="_blank" rel="noopener">Edit on GitHub ↗</a>
      </p>
    </section>
  );
}
