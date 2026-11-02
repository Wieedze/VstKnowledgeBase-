// Link rewriting for rendered Markdown: links between repo files become in-app routes,
// links to other repo files go to GitHub, external links open in a new tab.

export const REPO_URL = "https://github.com/Wieedze/VstKnowledgeBase-";
export const BRANCH = "main";

/** Resolves `href` relative to the directory of `fromPath` (both repo-relative). */
export function resolvePath(fromPath: string, href: string): string {
  const base = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/") + 1) : "";
  const parts = (href.startsWith("/") ? href.slice(1) : base + href).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  const trailing = href.endsWith("/") ? "/" : "";
  return out.join("/") + trailing;
}

export function githubUrl(path: string): string {
  const kind = path.endsWith("/") || !/\.[a-z0-9]+$/i.test(path) ? "tree" : "blob";
  return `${REPO_URL}/${kind}/${BRANCH}/${path.replace(/\/$/, "")}`;
}

export function pageRoute(path: string): string {
  return "#/" + path;
}

/** Where a link written in `fromPath` should point to in the app. */
export function targetFor(fromPath: string, href: string, pages: Set<string>): { href: string; external: boolean } {
  if (/^(https?:|mailto:)/i.test(href)) return { href, external: true };
  if (href.startsWith("#")) return { href: "", external: false };
  const [pathPart] = href.split("#");
  const resolved = resolvePath(fromPath, pathPart);
  if (pages.has(resolved)) return { href: pageRoute(resolved), external: false };
  return { href: githubUrl(resolved), external: true };
}

/** Rewrites every `<a href="…">` in rendered HTML. */
export function rewriteLinks(html: string, fromPath: string, pages: Set<string>): string {
  return html.replace(/<a href="([^"]*)"([^>]*)>/g, (_m, href: string, rest: string) => {
    const t = targetFor(fromPath, decodeAmp(href), pages);
    if (!t.href) return `<a${rest}>`;
    const ext = t.external ? ' target="_blank" rel="noopener"' : "";
    return `<a href="${t.href}"${rest}${ext}>`;
  });
}

function decodeAmp(s: string): string {
  return s.replace(/&amp;/g, "&");
}
