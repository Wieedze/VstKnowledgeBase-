import { describe, expect, test } from "bun:test";
import { parseAdr, parsePostmortem, parseMilestones, parseRoadmap, parseFrontmatter, sortEntries } from "./parse";

const ADR = `# 0003 — VST3 only

**Date**: 2026-11-02
**Status**: accepted

## Context

Pamplejuce builds every format.

## Decision

Option 3, asked for explicitly: \`FORMATS VST3\`.
The other formats are removed.

## Consequences

One format.
`;

describe("parseAdr", () => {
  test("reads number, title, date, status and the first Decision paragraph", () => {
    const e = parseAdr(ADR, ".claude/choices/0003-vst3-only.md", "Playbook");
    expect(e).toEqual({
      type: "adr",
      ref: "0003",
      title: "VST3 only",
      date: "2026-11-02",
      status: "accepted",
      summary: "Option 3, asked for explicitly: FORMATS VST3. The other formats are removed.",
      scope: "Playbook",
      path: ".claude/choices/0003-vst3-only.md",
    });
  });

  test("ignores a template whose date is not filled in", () => {
    const tpl = "# NNNN — Decision title\n\n**Date**: YYYY-MM-DD\n";
    expect(parseAdr(tpl, ".claude/choices/TEMPLATE.md", "Playbook")).toBeNull();
  });

  test("accepts a plain hyphen instead of an em dash in the title", () => {
    const e = parseAdr("# 0007 - Short title\n\n**Date**: 2026-12-01\n", "x.md", "P");
    expect(e?.ref).toBe("0007");
    expect(e?.title).toBe("Short title");
  });

  test("still reads the French field layout with a space before the colon", () => {
    const e = parseAdr("# 0008 — T\n\n**Date** : 2026-12-02\n**Status** : proposed\n", "x.md", "P");
    expect(e?.date).toBe("2026-12-02");
    expect(e?.status).toBe("proposed");
  });
});

describe("parsePostmortem", () => {
  test("reads the verdict and what was delivered", () => {
    const md = `# 0001 — Smoothed gain

**Date**: 2026-11-10
**Verdict**: pass (after 2 rounds)

## What was delivered

A plugin that only applies a smoothed gain.

## What got stuck

Nothing.
`;
    const e = parsePostmortem(md, ".claude/learning/0001-gain.md", "MoodzFilter");
    expect(e?.type).toBe("postmortem");
    expect(e?.status).toBe("pass (after 2 rounds)");
    expect(e?.summary).toBe("A plugin that only applies a smoothed gain.");
  });
});

describe("parseMilestones", () => {
  test("reads each section, project, link and summary", () => {
    const md = `# Milestones

Ignored intro.

## 2026-11-02 · Scope frozen

Project: MoodzFilter
Link: docs/plugins/moodzfilter/SPEC.md

Multi-model filter.
On two lines.

## 2026-11-01 · Start

First milestone.
`;
    const ms = parseMilestones(md);
    expect(ms).toHaveLength(2);
    expect(ms[0]).toEqual({
      type: "milestone",
      ref: "",
      title: "Scope frozen",
      date: "2026-11-02",
      status: "",
      summary: "Multi-model filter. On two lines.",
      scope: "MoodzFilter",
      path: "docs/plugins/moodzfilter/SPEC.md",
    });
    expect(ms[1].scope).toBe("Playbook");
    expect(ms[1].path).toBe("");
  });
});

describe("parseFrontmatter", () => {
  test("splits simple YAML frontmatter from the body and converts numbers", () => {
    const { data, body } = parseFrontmatter("---\nphase: 1\ngate: A gate: with a colon\n---\n# Title\n");
    expect(data).toEqual({ phase: 1, gate: "A gate: with a colon" });
    expect(body).toBe("# Title\n");
  });

  test("returns empty data without frontmatter", () => {
    expect(parseFrontmatter("# Nothing").data).toEqual({});
  });
});

describe("parseRoadmap", () => {
  const md = `---
plugin: MoodzFilter
phase: 1
phase_title: Skeleton
gate: Green CI
---

# Roadmap

## p0 · Phase 0 · Decide

- [x] Write the SPEC · docs/SPEC.md
- [~] ADR 0002: identity

## p1 · Phase 1 · Skeleton

- [ ] Create the repo · from Pamplejuce · with the SPEC
`;

  test("reads state, lanes and tasks with their status", () => {
    const r = parseRoadmap(md);
    expect(r.state).toEqual({ plugin: "MoodzFilter", phase: 1, phaseTitle: "Skeleton", gate: "Green CI", updated: "" });
    expect(r.lanes.map((l) => l.id)).toEqual(["p0", "p1"]);
    expect(r.lanes[0].title).toBe("Phase 0 · Decide");
    expect(r.lanes[0].tasks).toEqual([
      { title: "Write the SPEC", note: "docs/SPEC.md", status: "done" },
      { title: "ADR 0002: identity", note: "", status: "doing" },
    ]);
  });

  test("splits the note only at the first ' · '", () => {
    const t = parseRoadmap(md).lanes[1].tasks[0];
    expect(t).toEqual({ title: "Create the repo", note: "from Pamplejuce · with the SPEC", status: "todo" });
  });
});

describe("sortEntries", () => {
  test("puts the newest first, and the higher number first on the same date", () => {
    const e = (date: string, ref: string) => ({ type: "adr" as const, ref, title: "", date, status: "", summary: "", scope: "", path: "" });
    const out = sortEntries([e("2026-11-01", "0001"), e("2026-11-02", "0002"), e("2026-11-02", "0003")]);
    expect(out.map((x) => x.ref)).toEqual(["0003", "0002", "0001"]);
  });
});
