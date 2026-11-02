import { useMemo, useState } from "react";
import { journal } from "../lib/content";
import type { EntryType } from "../lib/parse";
import { EntryItem } from "./shared";

const FILTERS: [EntryType | "all", string][] = [
  ["all", "All"],
  ["adr", "ADRs"],
  ["postmortem", "Post-mortems"],
  ["milestone", "Milestones"],
];

export function Decisions() {
  const [type, setType] = useState<EntryType | "all">("all");
  const [scope, setScope] = useState("all");
  const [q, setQ] = useState("");
  const scopes = useMemo(() => Array.from(new Set(journal.map((e) => e.scope))), []);
  const rows = journal.filter((e) => {
    if (type !== "all" && e.type !== type) return false;
    if (scope !== "all" && e.scope !== scope) return false;
    const s = q.trim().toLowerCase();
    return !s || [e.ref, e.title, e.summary, e.status, e.scope].join(" ").toLowerCase().includes(s);
  });
  const count = (t: EntryType | "all") => (t === "all" ? journal.length : journal.filter((e) => e.type === t).length);

  return (
    <section className="view">
      <header>
        <span className="label">.claude/choices · .claude/learning · docs/plugins/*/choices · docs/MILESTONES.md</span>
        <h2>Decisions</h2>
        <p>The project log, newest first. Each entry is read from a file in the repo and links to it.</p>
      </header>
      <div className="controls">
        <div className="chips" role="group" aria-label="Entry type">
          {FILTERS.map(([k, label]) => (
            <button type="button" key={k} aria-pressed={type === k} onClick={() => setType(k)}>
              {label} <span className="badge">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Project">
          {["all", ...scopes].map((s) => (
            <button type="button" key={s} aria-pressed={scope === s} onClick={() => setScope(s)}>
              {s === "all" ? "All projects" : s}
            </button>
          ))}
        </div>
        <input className="search" type="search" placeholder="Search the log" aria-label="Search the log" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {rows.length ? (
        <ol className="journal">
          {rows.map((e) => (
            <EntryItem e={e} key={e.type + e.scope + e.ref + e.title} />
          ))}
        </ol>
      ) : (
        <p className="muted">No entry matches.</p>
      )}
    </section>
  );
}
