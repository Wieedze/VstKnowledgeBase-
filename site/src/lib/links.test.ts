import { describe, expect, test } from "bun:test";
import { resolvePath, targetFor, rewriteLinks, githubUrl } from "./links";

const pages = new Set(["docs/07_REUSE.md", "docs/references/gin.md", ".claude/rules/scope.md", "README.md"]);

describe("resolvePath", () => {
  test("resolves sibling, parent and nested paths", () => {
    expect(resolvePath("docs/07_REUSE.md", "references/gin.md")).toBe("docs/references/gin.md");
    expect(resolvePath("docs/references/gin.md", "../07_REUSE.md")).toBe("docs/07_REUSE.md");
    expect(resolvePath("docs/00_SUMMARY.md", "../.claude/rules/scope.md")).toBe(".claude/rules/scope.md");
    expect(resolvePath("README.md", "docs/07_REUSE.md")).toBe("docs/07_REUSE.md");
  });

  test("keeps a trailing slash for folders", () => {
    expect(resolvePath("docs/07_REUSE.md", "references/")).toBe("docs/references/");
  });
});

describe("targetFor", () => {
  test("turns a link to a known page into an in-app route, dropping the anchor", () => {
    expect(targetFor("docs/07_REUSE.md", "references/gin.md#licences", pages)).toEqual({ href: "#/docs/references/gin.md", external: false });
  });

  test("sends other repo files to GitHub", () => {
    expect(targetFor("README.md", "site/package.json", pages)).toEqual({
      href: "https://github.com/Wieedze/VstKnowledgeBase-/blob/main/site/package.json",
      external: true,
    });
  });

  test("leaves external links alone", () => {
    expect(targetFor("README.md", "https://juce.com", pages)).toEqual({ href: "https://juce.com", external: true });
  });
});

describe("githubUrl", () => {
  test("uses tree for folders and blob for files", () => {
    expect(githubUrl("docs/references/")).toBe("https://github.com/Wieedze/VstKnowledgeBase-/tree/main/docs/references");
    expect(githubUrl("docs/07_REUSE.md")).toBe("https://github.com/Wieedze/VstKnowledgeBase-/blob/main/docs/07_REUSE.md");
  });
});

describe("rewriteLinks", () => {
  test("rewrites internal and external links in rendered HTML", () => {
    const html = '<p><a href="references/gin.md">Gin</a> and <a href="https://x.dev">x</a></p>';
    expect(rewriteLinks(html, "docs/07_REUSE.md", pages)).toBe(
      '<p><a href="#/docs/references/gin.md">Gin</a> and <a href="https://x.dev" target="_blank" rel="noopener">x</a></p>',
    );
  });
});
