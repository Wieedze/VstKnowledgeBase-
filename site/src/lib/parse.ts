// Pure parsers: turn the repo's Markdown files into data for the index.
// No browser dependency; tested with `bun test`.

export type EntryType = "adr" | "postmortem" | "milestone";

export interface Entry {
  type: EntryType;
  ref: string;
  title: string;
  date: string;
  status: string;
  summary: string;
  scope: string;
  /** Repo path of the file, a full URL, or an empty string. */
  path: string;
}

export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  title: string;
  note: string;
  status: TaskStatus;
}

export interface Lane {
  id: string;
  title: string;
  tasks: Task[];
}

export interface RoadmapState {
  plugin: string;
  phase: number | null;
  phaseTitle: string;
  gate: string;
  updated: string;
}

export interface Roadmap {
  state: RoadmapState;
  lanes: Lane[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Strips inline Markdown to get readable text. */
export function plain(md: string): string {
  return md
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function field(md: string, name: string): string {
  const m = md.match(new RegExp(`^\\*\\*${name}\\*\\*\\s*:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : "";
}

/** First paragraph (consecutive non-empty lines) of a `## heading` section. */
function firstParagraph(md: string, heading: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start === -1) return "";
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("#")) break;
    if (l.trim() === "") {
      if (out.length) break;
      continue;
    }
    out.push(l.trim());
  }
  return plain(out.join(" "));
}

function heading(md: string): { ref: string; title: string } | null {
  const m = md.match(/^#\s+(\d{3,4})\s+[—–-]\s+(.+)$/m);
  return m ? { ref: m[1], title: m[2].trim() } : null;
}

export function parseAdr(md: string, path: string, scope: string): Entry | null {
  const h = heading(md);
  const date = field(md, "Date");
  if (!h || !DATE.test(date)) return null;
  return {
    type: "adr",
    ref: h.ref,
    title: h.title,
    date,
    status: plain(field(md, "Status")),
    summary: firstParagraph(md, "Decision"),
    scope,
    path,
  };
}

export function parsePostmortem(md: string, path: string, scope: string): Entry | null {
  const h = heading(md);
  const date = field(md, "Date");
  if (!h || !DATE.test(date)) return null;
  return {
    type: "postmortem",
    ref: h.ref,
    title: h.title,
    date,
    status: plain(field(md, "Verdict")),
    summary: firstParagraph(md, "What was delivered"),
    scope,
    path,
  };
}

export function parseMilestones(md: string): Entry[] {
  const out: Entry[] = [];
  const sections = md.split(/^## /m).slice(1);
  for (const sec of sections) {
    const [head, ...rest] = sec.split("\n");
    const m = head.match(/^(\d{4}-\d{2}-\d{2})\s*·\s*(.+)$/);
    if (!m) continue;
    let scope = "Playbook";
    let path = "";
    const text: string[] = [];
    for (const l of rest) {
      const p = l.match(/^Project\s*:\s*(.+)$/);
      const k = l.match(/^Link\s*:\s*(.+)$/);
      if (p) scope = p[1].trim();
      else if (k) path = k[1].trim();
      else if (l.trim()) text.push(l.trim());
    }
    out.push({ type: "milestone", ref: "", title: m[2].trim(), date: m[1], status: "", summary: plain(text.join(" ")), scope, path });
  }
  return out;
}

/** Minimal YAML frontmatter: `key: value` per line, numbers converted. */
export function parseFrontmatter(md: string): { data: Record<string, string | number>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: md };
  const data: Record<string, string | number> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!k) continue;
    data[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  }
  return { data, body: md.slice(m[0].length) };
}

const STATUS: Record<string, TaskStatus> = { " ": "todo", "~": "doing", x: "done", X: "done" };

export function parseRoadmap(md: string): Roadmap {
  const { data, body } = parseFrontmatter(md);
  const state: RoadmapState = {
    plugin: String(data.plugin ?? ""),
    phase: typeof data.phase === "number" ? data.phase : null,
    phaseTitle: String(data.phase_title ?? ""),
    gate: String(data.gate ?? ""),
    updated: String(data.updated ?? ""),
  };
  const lanes: Lane[] = [];
  let lane: Lane | null = null;
  for (const line of body.split("\n")) {
    const h = line.match(/^##\s+([\w-]+)\s*·\s*(.+)$/);
    if (h) {
      lane = { id: h[1], title: h[2].trim(), tasks: [] };
      lanes.push(lane);
      continue;
    }
    const t = line.match(/^\s*-\s+\[([ xX~])\]\s+(.+)$/);
    if (t && lane) {
      const raw = t[2].trim();
      const i = raw.indexOf(" · ");
      lane.tasks.push({
        title: plain(i === -1 ? raw : raw.slice(0, i)),
        note: i === -1 ? "" : plain(raw.slice(i + 3)),
        status: STATUS[t[1]],
      });
    }
  }
  return { state, lanes };
}

/** Newest first; same date, higher number first. */
export function sortEntries(es: Entry[]): Entry[] {
  return [...es].sort((a, b) => (a.date === b.date ? b.ref.localeCompare(a.ref) : a.date < b.date ? 1 : -1));
}
