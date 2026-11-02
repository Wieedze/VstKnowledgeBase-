import { Fragment, useMemo, useState } from "react";
import { projects, type Project } from "../lib/content";
import { pageRoute } from "../lib/links";

const REUSE: Record<Project["reuse"], [string, string]> = {
  closed: ["Code, even closed", "ok"],
  partial: ["Part of it closed", "mid"],
  agpl: ["Code if AGPL", "mid"],
  ideas: ["Ideas only", "no"],
};
const ORDER: Record<Project["reuse"], number> = { closed: 0, partial: 1, agpl: 2, ideas: 3 };
const reuseOf = (p: Project): [string, string] => REUSE[p.reuse] ?? [String(p.reuse), ""];

type SortKey = "name" | "cat" | "lic" | "reuse" | "juce" | "nojuce" | "tests" | "pv" | "date";
const COLS: [SortKey, string][] = [
  ["name", "Project"],
  ["cat", "Type"],
  ["lic", "Licence"],
  ["reuse", "Reuse"],
  ["juce", "JUCE"],
  ["nojuce", "DSP without JUCE"],
  ["tests", "Tests"],
  ["pv", "pluginval in CI"],
  ["date", "Last commit"],
];
const ROWS: [keyof Project | "", string][] = [
  ["lic", "Licence"],
  ["reuse", "Reuse"],
  ["juce", "JUCE"],
  ["build", "Build"],
  ["nojuce", "DSP without JUCE"],
  ["tests", "Tests"],
  ["pv", "pluginval in CI"],
  ["date", "Last commit"],
  ["rt", "Real-time defect found"],
  ["take", "What we take"],
  ["avoid", "What we avoid"],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function Compare() {
  const cats = useMemo(() => ["All", ...Array.from(new Set(projects.map((p) => p.cat)))], []);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [closedOnly, setClosedOnly] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "name", dir: 1 });
  const [picked, setPicked] = useState<string[]>(["Pamplejuce", "Vital"]);

  const rows = projects
    .filter((p) => cat === "All" || p.cat === cat)
    .filter((p) => !closedOnly || p.reuse === "closed" || p.reuse === "partial")
    .filter((p) => !q || norm([p.name, p.sub, p.lic, p.take, p.avoid, p.rt, p.tags, p.cat].join(" ")).includes(norm(q)))
    .sort((a, b) => {
      const x = sort.k === "reuse" ? ORDER[a.reuse] ?? 9 : a[sort.k];
      const y = sort.k === "reuse" ? ORDER[b.reuse] ?? 9 : b[sort.k];
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });

  const toggle = (name: string) =>
    setPicked((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name].slice(-3)));
  const cmp = picked.map((n) => projects.find((p) => p.name === n)).filter(Boolean) as Project[];

  return (
    <section className="view">
      <header>
        <span className="label">docs/references/projects.json · read in their code</span>
        <h2>Compare projects</h2>
        <p>Filter, sort by clicking a header, tick up to three projects to compare them side by side. Each name opens its study note.</p>
      </header>
      <div className="controls">
        <input className="search" type="search" placeholder="Search (filter, reverb, modulation, Catch2…)" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips" role="group" aria-label="Project type">
          {cats.map((c) => (
            <button type="button" key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={closedOnly} onChange={(e) => setClosedOnly(e.target.checked)} /> Reusable in a closed plugin
        </label>
      </div>
      <div className="tbl">
        <table className="matrix">
          <thead>
            <tr>
              <th><span className="sr">Compare</span></th>
              {COLS.map(([k, label]) => (
                <th key={k}>
                  <button type="button" data-dir={sort.k === k ? (sort.dir === 1 ? "asc" : "desc") : undefined} onClick={() => setSort({ k, dir: sort.k === k ? (-sort.dir as 1 | -1) : 1 })}>
                    {label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.name} className={picked.includes(p.name) ? "picked" : ""}>
                <td><input type="checkbox" aria-label={`Compare ${p.name}`} checked={picked.includes(p.name)} onChange={() => toggle(p.name)} /></td>
                <td className="name">
                  <a href={pageRoute("docs/references/" + p.fiche)}>{p.name}</a>
                  <small>{p.sub}</small>
                </td>
                <td>{p.cat}</td>
                <td>{p.lic}</td>
                <td><span className={`pill ${reuseOf(p)[1]}`}>{reuseOf(p)[0]}</span></td>
                <td>{p.juce}</td>
                <td>{p.nojuce}</td>
                <td>{p.tests}</td>
                <td>{p.pv}</td>
                <td className={`date${p.date < "2025-01-01" ? " stale" : ""}`}>{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mono small">{rows.length} of {projects.length} shown. Dates before 2025 in red: frozen projects.</p>
      {cmp.length > 0 && (
        <div className="compare">
          <div className="compare-head">
            <h3>Side by side</h3>
            <button type="button" className="ghost" onClick={() => setPicked([])}>Clear</button>
          </div>
          <div className="cmp-grid" style={{ ["--n" as string]: cmp.length }}>
            <div className="k" />
            {cmp.map((p) => <div className="h" key={p.name}>{p.name}</div>)}
            {ROWS.map(([k, label]) => (
              <Fragment key={label}>
                <div className="k">{label}</div>
                {cmp.map((p) => (
                  <div key={p.name + label}>
                    {k === "reuse" ? <span className={`pill ${reuseOf(p)[1]}`}>{reuseOf(p)[0]}</span> : (k && p[k]) || "—"}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
