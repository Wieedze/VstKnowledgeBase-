import type { Entry, TaskStatus } from "../lib/parse";
import { githubUrl, pageRoute } from "../lib/links";
import { pagePaths } from "../lib/content";

export const TYPE_LABEL: Record<Entry["type"], string> = { adr: "ADR", postmortem: "Post-mortem", milestone: "Milestone" };
export const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", doing: "In progress", done: "Done" };

export function formatDate(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d.slice(8))} ${m[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
}

/** Link target for a journal entry: in-app page, external URL, or GitHub. */
export function entryHref(e: Entry): { href: string; external: boolean } | null {
  if (!e.path) return null;
  if (/^https?:/.test(e.path)) return { href: e.path, external: true };
  if (pagePaths.has(e.path)) return { href: pageRoute(e.path), external: false };
  return { href: githubUrl(e.path), external: true };
}

export function EntryItem({ e }: { e: Entry }) {
  const t = entryHref(e);
  return (
    <li data-type={e.type}>
      <div className="j-head">
        <span className="j-date">{formatDate(e.date)}</span>
        <span className={`pill ${e.type}`}>
          {TYPE_LABEL[e.type]}
          {e.ref ? ` ${e.ref}` : ""}
        </span>
        <span className="label">{e.scope}</span>
        {e.status && <span className="label">{e.status}</span>}
      </div>
      <h3>{t ? <a href={t.href} {...(t.external ? { target: "_blank", rel: "noopener" } : {})}>{e.title}</a> : e.title}</h3>
      {e.summary && <p>{e.summary}</p>}
    </li>
  );
}
