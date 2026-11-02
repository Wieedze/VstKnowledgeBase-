# 0001 — Initialise the repo from Pamplejuce

**Date**: 2026-11-02
**Verdict**: pass (after 1 round)

## What was delivered

The Pamplejuce template became MoodzFilter: identity from plugin ADR 0002 (`MoodzFilter`, `Radikal Moodz`, `Rdkm`, `Mzf1`, no MIDI), VST3 only (playbook ADR 0003), JUCE pinned to tag `9.0.5`, CLAP, IPP, macOS and the template's nightly and Docker image workflows removed, Windows signing conditional on the Azure secrets, AGPLv3 licence with the Pamplejuce MIT notice kept, and the playbook layer (`.claude/`, router `CLAUDE.md`, `GLOSSARY.md`, task template) copied in. Commit `aaab18e` on `task/0001-init-from-pamplejuce`.

## What got stuck

Nothing failed verification. One deviation was judged: `.claude/rules/build.md` asks for CI on Linux, Windows and macOS, while plugin ADR 0002 (accepted before the task) sets Windows only for v1 with a Linux job for tests and RealtimeSanitizer. The ADR is the recorded decision and macOS/AU is in `FUTURE.md`, so it is not a blocker. The generic rule file still says macOS, which can mislead a later verifier.

## What we change next

* Add one line to the plugin repo's `.claude/rules/build.md` (or allow per-plugin platform lists in the playbook rule) that points to plugin ADR 0002 for the CI platform list, following the "changing a rule" procedure in `00-INDEX.md`.
* Trap noted: a full clean Release build takes over 10 minutes on the verification machine; run it in the background.
* The playbook ROADMAP lines "Create the MoodzFilter repo from Pamplejuce" and "Pin JUCE 9 to a tag, remove AU, AUv3, CLAP, Standalone" are covered by this task; `index-writer` should tick them.

## Evidence

* `cmake --build Builds-release --clean-first`: 260/260 steps, `grep -c warning` on the log = 0.
* `cmake --build Builds` (Debug, project sources touched and rebuilt): no warning, no error.
* `ctest --test-dir Builds --output-on-failure` and the same with `Builds-release`: 2/2 passed (`Plugin instance`, `Boot performance`).
* `./Builds-release/Tests -s`: name equals `"MoodzFilter"`, `acceptsMidi`, `producesMidi`, `isMidiEffect` all false; 5 assertions passed.
* `xvfb-run -a pluginval --strictness-level 10 --validate Builds-release/MoodzFilter_artefacts/Release/VST3/MoodzFilter.vst3` (pluginval 1.0.4): `SUCCESS`.
* Artefacts: only `VST3/MoodzFilter.vst3` under `Builds/MoodzFilter_artefacts/Debug/` and `Builds-release/MoodzFilter_artefacts/Release/`.
* `git -C JUCE describe --tags` = `9.0.5`; `.gitmodules` has no `branch =` for JUCE; `cmake` submodule `8de22da` equals `git ls-remote` of `sudara/cmake-includes` `main`.
* `gh api repos/Wieedze/MoodzFilter/actions/runs/41461476342/jobs`: Linux success, Windows success, release skipped; run head SHA = `aaab18e`.
* No `tests/golden/` exists; `tools check` and `tools compare` not applicable before task 0002; `rt-safety-reviewer` not required (no `dsp/` or `plugin/`, only an `#if` guard in the editor).
