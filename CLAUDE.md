# CLAUDE.md — Router

This file routes to the right rules, docs and decisions for the task. **It contains no rules.** Rules live in `.claude/rules/`, decisions in `.claude/choices/`, lessons in `.claude/learning/`.

If you want to add a rule here: don't. Add it to the matching file in `.claude/rules/` and update `.claude/rules/00-INDEX.md`.

## Reading order at the start of every task

1. This file.
2. `.claude/STATE.md`: where the project stands, current task, known defects.
3. The task file in `docs/tasks/`. Read its `Out of scope` and `Definition of done` sections.
4. The plugin's `docs/SPEC.md` (in a plugin project) or `docs/00_SUMMARY.md` (in this playbook).
5. `GLOSSARY.md`: use these terms in code, tests and messages.
6. The rules in `.claude/rules/` that match the task (table below). Not all of them.
7. `.claude/choices/INDEX.md` for decisions that touch the area.
8. `.claude/learning/INDEX.md` for post-mortems of similar tasks.

## Routing table

| If the task touches… | Rules | Skills | Review agent |
| --- | --- | --- | --- |
| Pure DSP (`dsp/`) | `realtime-audio.md`, `cpp.md`, `dsp.md`, `testing.md` | `tdd` | `rt-safety-reviewer` |
| JUCE plugin layer (`plugin/`): parameters, state, processBlock | `realtime-audio.md`, `cpp.md`, `juce.md`, `testing.md` | `tdd` | `rt-safety-reviewer` |
| UI (`ui/`) | `cpp.md`, `juce.md`, `ui.md` | — | — |
| CMake, CI, packaging | `build.md` | — | — |
| New feature or scope change | `scope.md` | `grill-with-docs`, `to-spec`, `to-tickets` | — |
| Bug | `testing.md` | `diagnosing-bugs` | — |
| Any task, at the end | `workflow.md` | `code-review` | `task-verifier` (**mandatory**) |

## Mandatory end of task

Every task ends with the `task-verifier` agent before it is declared finished. It reads the task, the relevant rules and the deliverables, runs the verification commands, and returns pass or fail.

* **Pass**: it writes a post-mortem in `.claude/learning/NNNN-slug.md` and updates `.claude/STATE.md`.
* **Fail**: fix the returned list and run it again. The task is not finished.

The minimal verification commands are in `.claude/rules/workflow.md`.

## Hard constraints (the only ones that live here)

* **Nothing that allocates, locks, does I/O or can throw an exception on the audio thread.** Details: `.claude/rules/realtime-audio.md`.
* **No DSP code without a test that comes before it.** Details: `.claude/rules/testing.md`.
* **No silent scope extension.** Whatever is not in the task goes into `FUTURE.md`. Details: `.claude/rules/scope.md`.
* **No parameter ID renamed or removed after a release**: it breaks users' sessions. Details: `.claude/rules/juce.md`.
* **No code copied from an AGPL/GPL project** without an explicit decision recorded in an ADR.

## Repo map

```
CLAUDE.md               ← you are here (router)
GLOSSARY.md             shared vocabulary (Matt Pocock convention)
FUTURE.md               requested, deliberately not built
site/                   index website (Bun + React + Vite), deployed to GitHub Pages
docs/
  00_SUMMARY.md         the base decisions
  01_REFERENCES.md      open source projects analysed
  02_TOOLCHAIN.md       JUCE, CMake, compilers, licences
  03_ARCHITECTURE.md    layers and tree
  04_TESTS.md           test strategy and CI
  05_AGENTIC_WORKFLOW.md
  06_START_PLAN.md
  07_REUSE.md           what we take instead of coding it (read before writing a component)
  MILESTONES.md         project milestones, newest first
  tasks/TEMPLATE.md     atomic task template
  plugins/moodzfilter/  SPEC.md, ROADMAP.md, choices/ (plugin ADRs)
.claude/
  STATE.md              current state, maintained by hand
  rules/                rules by domain (00-INDEX.md first)
  agents/               task-verifier, rt-safety-reviewer, index-writer
  choices/              ADRs, append only
  learning/             post-mortems, append only
```
