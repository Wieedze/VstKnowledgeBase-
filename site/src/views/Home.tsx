import { journal, roadmaps } from "../lib/content";
import { EntryItem } from "./shared";

const CARDS: [string, string, string, string][] = [
  ["#/roadmap", "Tracking", "Roadmap", "Phases, gates and tasks, with their status."],
  ["#/decisions", "Tracking", "Decisions", "ADRs, post-mortems and milestones, newest first."],
  ["#/compare", "Compare", "Compare projects", "21 projects and libraries: filter, sort, compare side by side."],
  ["#/docs/07_REUSE.md", "Compare", "What we reuse", "What we take instead of coding it, by licence."],
  ["#/docs/plugins/moodzfilter/SPEC.md", "Plugin", "MoodzFilter SPEC", "Scope of the first plugin: what v1 does and does not do."],
  ["#/docs/00_SUMMARY.md", "Playbook", "Base decisions", "Template, JUCE 9, VST3 only, RTSan, reuse order."],
  ["#/docs/03_ARCHITECTURE.md", "Playbook", "Architecture", "dsp/ without JUCE, plugin/, ui/, tools/; tested invariants."],
  ["#/.claude/rules/realtime-audio.md", "Rules", "Audio thread rules", "What never runs in processBlock, and how we check it."],
  ["#/docs/04_TESTS.md", "Playbook", "Tests", "Eight levels, from unit tests to listening."],
  ["#/docs/05_AGENTIC_WORKFLOW.md", "Playbook", "Agentic workflow", "Task loop, review agents, skills."],
  ["#/GLOSSARY.md", "Reference", "Glossary", "Block, snapshot, ADAA, ZDF, WDF, RTSan…"],
];

export function Home() {
  const rm = roadmaps[0]?.roadmap;
  const tasks = rm ? rm.lanes.flatMap((l) => l.tasks) : [];
  const done = tasks.filter((t) => t.status === "done").length;
  return (
    <section className="view">
      <header>
        <span className="label">JUCE · VST3 only</span>
        <h1>VstKnowledgeBase</h1>
        <p className="lede">
          What we know and what we decided to build VST3 plugins with JUCE: projects studied in their code, libraries to reuse, real-time rules,
          tests, the agentic workflow, and the project's decision log. Everything here is built from the repo.
        </p>
      </header>
      {rm && (
        <div className="status">
          <div>
            <span className="label">Current plugin</span>
            <b>{rm.state.plugin}</b>
          </div>
          <div>
            <span className="label">Current phase</span>
            <b>
              Phase {rm.state.phase}
              {rm.state.phaseTitle ? ` · ${rm.state.phaseTitle}` : ""}
            </b>
          </div>
          <div>
            <span className="label">Gate to pass</span>
            <span>{rm.state.gate}</span>
          </div>
          <div>
            <span className="label">Roadmap</span>
            <span>
              {done} of {tasks.length} tasks done
            </span>
          </div>
        </div>
      )}
      <div className="cards">
        {CARDS.map(([href, k, t, d]) => (
          <a className="card" href={href} key={href}>
            <span className="label">{k}</span>
            <b>{t}</b>
            <p>{d}</p>
          </a>
        ))}
      </div>
      <h2>Latest entries</h2>
      <ol className="journal">
        {journal.slice(0, 4).map((e) => (
          <EntryItem e={e} key={e.type + e.scope + e.ref + e.title} />
        ))}
      </ol>
      <p>
        <a href="#/decisions">Full decision log →</a>
      </p>
    </section>
  );
}
