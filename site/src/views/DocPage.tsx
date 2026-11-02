import { useMemo } from "react";
import { marked } from "marked";
import { pagePaths, type Page } from "../lib/content";
import { parseFrontmatter } from "../lib/parse";
import { BRANCH, REPO_URL, rewriteLinks } from "../lib/links";

marked.setOptions({ gfm: true });

export function DocPage({ page }: { page: Page }) {
  const html = useMemo(() => {
    const { body } = parseFrontmatter(page.md);
    const raw = marked.parse(body, { async: false }) as string;
    return rewriteLinks(raw, page.path, pagePaths).replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, "</table></div>");
  }, [page]);

  return (
    <section className="view doc">
      <div className="doc-meta">
        <span className="label">{page.path}</span>
        <a className="mono small" href={`${REPO_URL}/blob/${BRANCH}/${page.path}`} target="_blank" rel="noopener">View on GitHub ↗</a>
      </div>
      <article className="md" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
