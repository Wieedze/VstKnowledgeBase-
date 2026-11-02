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
| Last task closed | 0002 "Separate the dsp, plugin, ui, tools targets", verifier pass on 2026-11-02 (2 rounds), post-mortem `docs/plugins/moodzfilter/learning/0002-separate-targets.md`. PR https://github.com/Wieedze/MoodzFilter/pull/2, stacked on PR #1. Previous: 0001 "Initialise the repo from Pamplejuce", PR https://github.com/Wieedze/MoodzFilter/pull/1 |
| Open PRs | MoodzFilter PR #1 and PR #2, both awaiting Maxime's merge. Merge #1 first, then #2 |
| Current task | 0003 "Smoothed gain alone, with TDD" (in progress; also adds the missing `[[clang::nonblocking]]` on `processBlock`, noted by `rt-safety-reviewer` in task 0002) |
| Pinned JUCE version | 9.0.5 (git submodule tag, no branch in `.gitmodules`) |
| CPU budget per block | — |
| Known defects (sound, perf, hosts) | — |
| Gate 1 progress | CI Linux and Windows green on run 41461476342 (commit `aaab18e`, task 0001) and on runs 41477871641 and 41480714455 (task 0002), pluginval 10 green locally and in CI. Still missing: VST3 loaded in Ableton Live on Windows |
| Recommended order of next tasks | Phase 1 lane of `docs/plugins/moodzfilter/ROADMAP.md` (tasks 0001 and 0002 done): 0. Merge MoodzFilter PR #1, then PR #2. 1. Task 0003, smoothed gain alone, with TDD. 2. `tools render` and `compare`, first golden reference (task 0004). 3. Green CI (Windows, Linux RealtimeSanitizer job, pluginval 10). 4. Load the VST3 in Ableton Live. Playbook lane still open: independent agent check of the repo, remaining licences |

## Open questions of the playbook

* Whether to adopt TetraDrive's sample accurate automation patch (to be tested on JUCE 9).
* ~~Choice of allocation counter for real-time tests~~: settled, RealtimeSanitizer (ADR 0002).
* Licenses still to check: MTS-ESP, OB-Xf assets, AKWF waveforms (CC0?), provenance of BYOD's IRs and neural models.
* Study the 3 suspected bugs in valentine and those in Frequalizer only if we reuse their code (found by reading, not compiled).
* Exact format of `tests/golden/manifest.json`.
* MoodzFilter repo: `.claude/rules/build.md` still requires CI on Linux, Windows and macOS, while plugin ADR 0002 sets Windows only for v1 (plus a Linux test job). Raised by the task 0001 verifier. To fix in a later task through the rule change procedure of `.claude/rules/00-INDEX.md` (ADR, then edit), either a pointer to ADR 0002 or per-plugin platform lists in the playbook rule.
* MoodzFilter repo: `CXX_EXTENSIONS` does not propagate through `target_compile_features`, so every new non-JUCE target must set `CXX_EXTENSIONS OFF` itself, or `CMAKE_CXX_EXTENSIONS OFF` is set once project-wide. The project-wide option also touches the JUCE targets, so it belongs in a dedicated build task, not a feature task. Raised by the task 0002 verifier.
* MoodzFilter repo: the files inherited from the Pamplejuce template (`source/plugin/PluginProcessor.cpp`, `source/ui/PluginEditor.h`, `tests/plugin/PluginBasics.cpp`) carry pre-existing clang-format violations. Candidate for a formatting-only task (one commit, no behaviour change). The CI clang-format check does not exist yet. Raised by the task 0002 verifier.
