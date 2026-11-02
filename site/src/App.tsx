import { useEffect, useMemo, useState } from "react";
import { GROUP_ORDER, journal, pageByPath, pages } from "./lib/content";
import { REPO_URL } from "./lib/links";
import { Home } from "./views/Home";
import { RoadmapView } from "./views/Roadmap";
import { Decisions } from "./views/Decisions";
import { Compare } from "./views/Compare";
import { DocPage } from "./views/DocPage";

/** Routes are hashes: #/, #/roadmap, #/decisions, #/compare, #/<repo path>.md */
function useRoute(): string {
  const read = () => decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const VIEWS: Record<string, string> = { "": "Home", roadmap: "Roadmap", decisions: "Decisions", compare: "Compare projects" };

export function App() {
  const route = useRoute();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [route]);

  const page = pageByPath.get(route);
  const title = VIEWS[route] ?? page?.title ?? "Not found";
  useEffect(() => {
    document.title = route === "" ? "VstKnowledgeBase" : `${title} · VstKnowledgeBase`;
  }, [route, title]);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return null;
    return pages
      .filter((p) => p.group !== "Hidden" || /\/(choices|learning)\/\d/.test(p.path))
      .map((p) => ({ p, n: p.text.split(s).length - 1 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 30);
  }, [q]);

  const link = (href: string, label: string, extra?: React.ReactNode) => (
    <a href={href} aria-current={("#/" + route === href || (href === "#/" && route === "")) ? "page" : undefined}>
      <span>{label}</span>
      {extra}
    </a>
  );

  return (
    <div className="app">
      <aside className="side" aria-label="Index">
        <a className="brand" href="#/">
          <span className="label">VST3 playbook</span>
          <b>VstKnowledgeBase</b>
        </a>
        <button type="button" className="menu-btn" aria-expanded={open} aria-controls="nav" onClick={() => setOpen(!open)}>
          Index
        </button>
        <nav id="nav" className={open ? "open" : ""}>
          <input className="search" type="search" placeholder="Search the repo" aria-label="Search the repo" value={q} onChange={(e) => setQ(e.target.value)} />
          {hits ? (
            <div className="grp">
              <span className="label">{hits.length ? `${hits.length} results` : "No results"}</span>
              {hits.map(({ p, n }) => link("#/" + p.path, p.title, <span className="badge">{n}</span>))}
            </div>
          ) : (
            <>
              <div className="grp">
                <span className="label">Tracking</span>
                {link("#/", "Home")}
                {link("#/roadmap", "Roadmap")}
                {link("#/decisions", "Decisions", <span className="badge">{journal.length}</span>)}
              </div>
              <div className="grp">
                <span className="label">Compare</span>
                {link("#/compare", "Compare projects")}
              </div>
              {GROUP_ORDER.map((g) => (
                <div className="grp" key={g}>
                  <span className="label">{g}</span>
                  {pages.filter((p) => p.group === g).map((p) => link("#/" + p.path, shortTitle(p.title)))}
                </div>
              ))}
              <div className="grp ext">
                <a href={REPO_URL} target="_blank" rel="noopener">GitHub repo ↗</a>
              </div>
            </>
          )}
        </nav>
      </aside>
      <main className="main">
        {route === "" && <Home />}
        {route === "roadmap" && <RoadmapView />}
        {route === "decisions" && <Decisions />}
        {route === "compare" && <Compare />}
        {page && <DocPage page={page} />}
        {!(route in VIEWS) && !page && (
          <section className="view">
            <h2>Page not found</h2>
            <p>
              Nothing at <code>{route}</code>. <a href="#/">Back to the home page</a>.
            </p>
          </section>
        )}
        <footer>Built from the repo on every push to main.</footer>
      </main>
    </div>
  );
}

function shortTitle(t: string): string {
  return t.replace(/\s*[—:]\s*(Router|SPEC v\d+)$/, "").replace(/^Rules index$/, "Index");
}
