# STATE

Maintained by hand. A task does not close without updating this file.

## This repo

Playbook (knowledge base), not a plugin. Initial version of 2026-11-02. PR #1 and PR #2 merged into main; the index website is published on GitHub Pages (https://wieedze.github.io/VstKnowledgeBase-/) by GitHub Actions on every push to main.

## In a plugin project, this file contains

| Field | Value |
| --- | --- |
| Current plugin | MoodzFilter (`docs/plugins/moodzfilter/`) |
| Current phase | 1 (skeleton). Phase 0 closed on 2026-11-02: SPEC frozen, ADR 0001 (AGPL) and ADR 0002 (identity) accepted |
| Gate to pass | Gate 1: green CI, green pluginval 10, VST3 loaded in the DAW (Ableton Live, Windows), `STATE.md` up to date |
| Plugin identity (ADR 0002) | `COMPANY_NAME` Radikal Moodz, `PLUGIN_MANUFACTURER_CODE` `Rdkm`, `PLUGIN_CODE` `Mzf1`, VST3 only, Windows only for v1. Final once a session is saved in Live |
| Plugin repo | https://github.com/Wieedze/MoodzFilter (code, task files in `docs/tasks/`, its own `.claude/STATE.md`). SPEC, ROADMAP, plugin ADRs and post-mortems stay in this playbook under `docs/plugins/moodzfilter/` (decided 2026-11-02) |
| Last task closed | 0005 "Green CI: RealtimeSanitizer, nonblocking annotations, strict C++23" (`MOODZ_NONBLOCKING` = `[[clang::nonblocking]]` on `processBlock`, now `noexcept`, and `dsp::SmoothedGain::process` in the RTSan build; "Linux RealtimeSanitizer" CI job with clang 20 and an `RtsanCanary` that proves the sanitizer fires; `CMAKE_CXX_EXTENSIONS OFF` everywhere), verifier pass on 2026-11-02 (2 rounds), post-mortem `docs/plugins/moodzfilter/learning/0005-green-ci.md`. PR https://github.com/Wieedze/MoodzFilter/pull/6. Previous: 0004 (PR #5), 0003 (PR #4), 0002 (PR #2), 0001 (PR #1), all merged |
| Open PRs | MoodzFilter PR #6 (task 0005), awaiting Maxime's merge. PR #5 (task 0004) merged |
| Current task | 0006 "Gain out −∞ to +6 dB and generic editor" (in progress): gain ranges per plugin ADR 0004 and the SPEC amendment (Gain out −∞ to +6 dB, Gain in −∞ to +12 dB, lowest value `-inf` = gain exactly 0), plus the JUCE generic editor of the SPEC interface, both asked by Maxime |
| Pinned JUCE version | 9.0.5 (git submodule tag, no branch in `.gitmodules`) |
| CPU budget per block | — |
| Known defects (sound, perf, hosts) | — |
| Gate 1 progress | Green CI done (task 0005): CI run 41517663478 green on Linux, Linux RealtimeSanitizer and Windows. pluginval 10 green locally and in CI. Golden references approved by ear. On 2026-11-02 Maxime installed the VST3 from the CI installer, loaded it in Ableton Live on Windows and moved Gain out: it works. Still missing: save a Live session and reload it with the value kept |
| Recurring verifier failure | Tasks 0004 and 0005 both failed round 1 on a missing `GLOSSARY.md` entry for a new name of a target, test or tool (`Render case`, `Golden manifest`, `Canary`). Check `GLOSSARY.md` for every new name before handing over to the task-verifier (post-mortem 0005) |
| Development environment (not decided) | Maxime is considering moving development to his own Windows machine with VS Code + Claude Code, for faster builds and direct testing in Ableton Live. No decision yet |
| Recommended order of next tasks | 0. Merge MoodzFilter PR #6. 1. Finish task 0006 (gain ranges per ADR 0004, generic editor). 2. Close gate 1: save a Live session with a non-default Gain out, reload it, check the value is kept; then the phase 1 gate milestone and phase 2 (DSP core) in the roadmap frontmatter. Follow-ups from the 0005 rt-safety-reviewer are in MoodzFilter `FUTURE.md`. Playbook lane still open: independent agent check of the repo, remaining licences |

## Open questions of the playbook

* Whether to adopt TetraDrive's sample accurate automation patch (to be tested on JUCE 9). MoodzFilter now reads parameters once per block (task 0003), so under continuous automation the gain curve depends on the host block size; sample-accurate automation is recorded in the MoodzFilter repo's `FUTURE.md` and depends on this question.
* ~~Rewriting the commit authors (history no longer verified)~~: settled, Maxime force-pushed the rewritten history of this repo (main at 7afedad).
* ~~Choice of allocation counter for real-time tests~~: settled, RealtimeSanitizer (ADR 0002).
* Licenses still to check: MTS-ESP, OB-Xf assets, AKWF waveforms (CC0?), provenance of BYOD's IRs and neural models.
* Study the 3 suspected bugs in valentine and those in Frequalizer only if we reuse their code (found by reading, not compiled).
* ~~Exact format of `tests/golden/manifest.json`~~: settled, MoodzFilter ADR 0003 (`docs/plugins/moodzfilter/choices/0003-golden-manifest-format.md`).
* MoodzFilter repo: `.claude/rules/build.md` still requires CI on Linux, Windows and macOS, while plugin ADR 0002 sets Windows only for v1 (plus a Linux test job). Raised by the task 0001 verifier. To fix in a later task through the rule change procedure of `.claude/rules/00-INDEX.md` (ADR, then edit), either a pointer to ADR 0002 or per-plugin platform lists in the playbook rule.
* ~~MoodzFilter repo: `CXX_EXTENSIONS` does not propagate through `target_compile_features`~~: settled by task 0005, `CMAKE_CXX_EXTENSIONS OFF` project-wide (JUCE pins 9 VST3 wrapper and binary-data objects to `-std=c++17`, without GNU extensions).
* MoodzFilter repo: the files inherited from the Pamplejuce template (`source/plugin/PluginProcessor.cpp`, `source/ui/PluginEditor.h`, `tests/plugin/PluginBasics.cpp`) carry pre-existing clang-format violations. Candidate for a formatting-only task (one commit, no behaviour change). The CI clang-format check does not exist yet. Raised by the task 0002 verifier.
