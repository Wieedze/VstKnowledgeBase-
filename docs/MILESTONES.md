# Milestones

Source of the "Milestone" entries in the index's decision log. One milestone per section, newest first.
Format: a heading `## YYYY-MM-DD · Title`, then the lines `Project:` and `Link:` (optional), then one summary paragraph.
ADRs and post-mortems do not need to be copied here: the index reads them directly in `.claude/choices/`, `.claude/learning/` and `docs/plugins/*/choices/`.

## 2026-11-02 · MoodzFilter scope frozen

Project: MoodzFilter
Link: docs/plugins/moodzfilter/SPEC.md

Multi-model filter with drive and a tempo-synced LFO, for productions in Ableton Live. VST3, Windows, AGPL, JUCE generic editor. Four models in v1, oversampling, mix, gains, presets. The rest is in FUTURE.md.

## 2026-11-02 · Code study of 14 projects and libraries

Project: Playbook
Link: docs/references/README.md

Notes in docs/references/: licences checked in the files, file:line references, what we take and what we avoid. Several claims taken from the READMEs corrected (Drum Foundry, Gin, chowdsp, Cloud Seed). Nothing was compiled: the defects come from reading the code.

## 2026-11-02 · Creation of the VstKnowledgeBase playbook

Project: Playbook
Link: https://github.com/Wieedze/VstKnowledgeBase-/pull/1

Docs (references, toolchain, architecture, tests, agentic workflow, plan) and the Claude Code layer (CLAUDE.md router, rules by domain, task-verifier and rt-safety-reviewer agents, ADR and post-mortem templates).
