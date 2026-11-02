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
| Last task closed | 0003 "Smoothed gain alone, with TDD" (smoothed output gain `Gain out`, versioned state, frozen ID list), verifier pass on 2026-11-02 (2 rounds), post-mortem `docs/plugins/moodzfilter/learning/0003-smoothed-gain.md`. PR https://github.com/Wieedze/MoodzFilter/pull/4. Previous: 0002 "Separate the dsp, plugin, ui, tools targets" (PR #2) and 0001 "Initialise the repo from Pamplejuce" (PR #1), both merged into MoodzFilter main (also via PR #3) |
| Open PRs | MoodzFilter PR #4 (task 0003), awaiting Maxime's merge |
| Current task | 0004 "tools render and compare, first golden reference" (in progress) |
| Pinned JUCE version | 9.0.5 (git submodule tag, no branch in `.gitmodules`) |
| CPU budget per block | — |
| Known defects (sound, perf, hosts) | — |
| Gate 1 progress | CI Linux and Windows green on run 41461476342 (commit `aaab18e`, task 0001), runs 41477871641 and 41480714455 (task 0002) and run 41490179737 (task 0003, commit `6682553`). pluginval 10 green locally and in CI. Still missing: VST3 loaded in Ableton Live on Windows |
| Deferred to the Green CI task | `[[clang::nonblocking]]` on `processBlock` and the DSP `process` functions, and the Linux RealtimeSanitizer job. Both need clang ≥ 20; the dev container has clang 18. Moved out of task 0003 by its Out of scope |
| Development environment (not decided) | Maxime is considering moving development to his own Windows machine with VS Code + Claude Code, for faster builds and direct testing in Ableton Live. No decision yet |
| Recommended order of next tasks | Phase 1 lane of `docs/plugins/moodzfilter/ROADMAP.md` (tasks 0001 to 0003 done): 0. Merge MoodzFilter PR #4. 1. Task 0004, `tools render` and `compare`, first golden reference. 2. Green CI (Windows, Linux RealtimeSanitizer job with clang ≥ 20, `[[clang::nonblocking]]`, pluginval 10). 3. Load the VST3 in Ableton Live. Playbook lane still open: independent agent check of the repo, remaining licences |

## Open questions of the playbook

* Whether to adopt TetraDrive's sample accurate automation patch (to be tested on JUCE 9). MoodzFilter now reads parameters once per block (task 0003), so under continuous automation the gain curve depends on the host block size; sample-accurate automation is recorded in the MoodzFilter repo's `FUTURE.md` and depends on this question.
* ~~Choice of allocation counter for real-time tests~~: settled, RealtimeSanitizer (ADR 0002).
* Licenses still to check: MTS-ESP, OB-Xf assets, AKWF waveforms (CC0?), provenance of BYOD's IRs and neural models.
* Study the 3 suspected bugs in valentine and those in Frequalizer only if we reuse their code (found by reading, not compiled).
* Exact format of `tests/golden/manifest.json`.
* MoodzFilter repo: `.claude/rules/build.md` still requires CI on Linux, Windows and macOS, while plugin ADR 0002 sets Windows only for v1 (plus a Linux test job). Raised by the task 0001 verifier. To fix in a later task through the rule change procedure of `.claude/rules/00-INDEX.md` (ADR, then edit), either a pointer to ADR 0002 or per-plugin platform lists in the playbook rule.
* MoodzFilter repo: `CXX_EXTENSIONS` does not propagate through `target_compile_features`, so every new non-JUCE target must set `CXX_EXTENSIONS OFF` itself, or `CMAKE_CXX_EXTENSIONS OFF` is set once project-wide. The project-wide option also touches the JUCE targets, so it belongs in a dedicated build task, not a feature task. Raised by the task 0002 verifier.
* MoodzFilter repo: the files inherited from the Pamplejuce template (`source/plugin/PluginProcessor.cpp`, `source/ui/PluginEditor.h`, `tests/plugin/PluginBasics.cpp`) carry pre-existing clang-format violations. Candidate for a formatting-only task (one commit, no behaviour change). The CI clang-format check does not exist yet. Raised by the task 0002 verifier.
