// Loads the repo's Markdown at build time and derives the index data from it.
// The repo is the single source: nothing here is written by hand.

import { parseAdr, parsePostmortem, parseMilestones, parseRoadmap, sortEntries, plain, type Entry, type Roadmap } from "./parse";
import projectsJson from "../../../docs/references/projects.json";

const RAW = import.meta.glob(["../../../*.md", "../../../docs/**/*.md", "../../../.claude/**/*.md"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface Page {
  path: string;
  title: string;
  group: string;
  md: string;
  /** Lower-cased text used by the search box. */
  text: string;
}

export interface Project {
  name: string;
  sub: string;
  fiche: string;
  cat: string;
  lic: string;
  reuse: "closed" | "partial" | "agpl" | "ideas";
  juce: string;
  nojuce: string;
  tests: string;
  pv: string;
  date: string;
  build: string;
  rt: string;
  take: string;
  avoid: string;
  tags: string;
}

const files: Record<string, string> = {};
for (const [k, v] of Object.entries(RAW)) files[k.replace(/^(\.\.\/)+/, "")] = v;

function titleOf(path: string, md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? plain(m[1]) : path.split("/").pop()!.replace(/\.md$/, "");
}

const GROUPS: [RegExp, string][] = [
  [/^docs\/plugins\/[^/]+\/(SPEC|ROADMAP)\.md$/, "Plugins"],
  [/^docs\/0\d_.*\.md$/, "Playbook"],
  [/^docs\/references\/.*\.md$/, "Study notes"],
  [/^\.claude\/rules\/.*\.md$/, "Rules"],
  [/^\.claude\/agents\/.*\.md$/, "Agents"],
  [/^(GLOSSARY|FUTURE|README|CLAUDE)\.md$|^docs\/MILESTONES\.md$|^\.claude\/STATE\.md$|^docs\/tasks\/TEMPLATE\.md$/, "Reference"],
];

function groupOf(path: string): string {
  for (const [re, g] of GROUPS) if (re.test(path)) return g;
  return "Hidden";
}

export const pages: Page[] = Object.entries(files)
  .map(([path, md]) => ({ path, md, title: titleOf(path, md), group: groupOf(path), text: (titleOf(path, md) + " " + md).toLowerCase() }))
  .sort((a, b) => a.path.localeCompare(b.path));

export const pageByPath = new Map(pages.map((p) => [p.path, p]));
export const pagePaths = new Set(pages.map((p) => p.path));

export const GROUP_ORDER = ["Plugins", "Playbook", "Study notes", "Rules", "Agents", "Reference"];

/** Plugin display names, from each plugin's ROADMAP frontmatter (falls back to the folder name). */
const pluginNames = new Map<string, string>();
for (const [path, md] of Object.entries(files)) {
  const m = path.match(/^docs\/plugins\/([^/]+)\/ROADMAP\.md$/);
  if (m) pluginNames.set(m[1], parseRoadmap(md).state.plugin || m[1]);
}

function scopeOf(path: string): string {
  const m = path.match(/^docs\/plugins\/([^/]+)\//);
  return m ? pluginNames.get(m[1]) ?? m[1] : "Playbook";
}

const entries: Entry[] = [];
for (const [path, md] of Object.entries(files)) {
  const file = path.split("/").pop()!;
  if (!/^\d{3,4}-/.test(file)) continue;
  if (/(^|\/)choices\//.test(path)) {
    const e = parseAdr(md, path, scopeOf(path));
    if (e) entries.push(e);
  } else if (/(^|\/)learning\//.test(path)) {
    const e = parsePostmortem(md, path, scopeOf(path));
    if (e) entries.push(e);
  }
}
if (files["docs/MILESTONES.md"]) entries.push(...parseMilestones(files["docs/MILESTONES.md"]));

export const journal: Entry[] = sortEntries(entries);

export const roadmaps: { path: string; roadmap: Roadmap }[] = Object.entries(files)
  .filter(([p]) => /^docs\/plugins\/[^/]+\/ROADMAP\.md$/.test(p))
  .map(([path, md]) => ({ path, roadmap: parseRoadmap(md) }));

export const projects = projectsJson as Project[];
