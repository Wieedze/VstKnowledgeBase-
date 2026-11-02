# Milestones

Source of the "Milestone" entries in the index's decision log. One milestone per section, newest first.
Format: a heading `## YYYY-MM-DD · Title`, then the lines `Project:` and `Link:` (optional), then one summary paragraph.
ADRs and post-mortems do not need to be copied here: the index reads them directly in `.claude/choices/`, `.claude/learning/` and `docs/plugins/*/choices/`.

## 2026-11-02 · MoodzFilter gate 1 passed

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/7

The skeleton is done. Task 0006 passed the task-verifier in one round: Gain out now goes from -inf to +6 dB (ADR 0004) and the plugin shows the JUCE generic editor. Maxime installed the VST3 from the CI installer of run 41524747297, loaded it in Ableton Live on Windows, set Gain out, saved the session and reloaded it with the value kept. CI is green on Linux, Linux RealtimeSanitizer and Windows, pluginval at strictness 10 passes, and the golden references were approved by ear. MoodzFilter moves to phase 2, the DSP core.

## 2026-11-02 · MoodzFilter runs in Ableton Live

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/6

For the first time the plugin runs in its target host: Maxime installed the VST3 from the CI installer, loaded it in Ableton Live on Windows and moved Gain out, which works. Task 0005 made CI green on Linux, Linux RealtimeSanitizer and Windows (run 41517663478). The phase 1 gate is not passed yet: a Live session still has to be saved and reloaded with the value kept.

## 2026-11-02 · MoodzFilter repo created, first green CI

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/1

Task 0001 passed the task-verifier: the Pamplejuce template became MoodzFilter with the ADR 0002 identity, VST3 only, JUCE pinned to tag 9.0.5, AGPLv3 licence and the playbook layer copied in. CI is green on Linux and Windows (GitHub Actions run 41461476342) and pluginval at strictness 10 passes locally and in CI. The phase 1 gate is not passed yet: the VST3 still has to be loaded in Ableton Live.

## 2026-11-02 · Index website online

Project: Playbook
Link: https://wieedze.github.io/VstKnowledgeBase-/

PR #1 (playbook) and PR #2 (index website and English translation) are merged into main. The site in site/ (Bun, React, Vite) is built by GitHub Actions and published on GitHub Pages on every push to main. It reads the roadmaps, milestones, ADRs and post-mortems directly from the repo.

## 2026-11-02 · Phase 0 gate passed: MoodzFilter identity set

Project: MoodzFilter
Link: docs/plugins/moodzfilter/choices/0002-identity-and-platform.md

ADR 0002 accepted, chosen by Maxime: company name Radikal Moodz, manufacturer code Rdkm, plugin code Mzf1, VST3 only, Windows only for v1. With the SPEC frozen and the AGPL licence ADR, phase 0 is closed and MoodzFilter moves to phase 1, the skeleton.

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
