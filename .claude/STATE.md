# STATE

Maintained by hand. A task does not close without updating this file.

## This repo

Playbook (knowledge base), not a plugin. Initial version of 2026-11-02. PR #1 and PR #2 merged into main; the index website is published on GitHub Pages (https://wieedze.github.io/VstKnowledgeBase-/) by GitHub Actions on every push to main.

## In a plugin project, this file contains

| Field | Value |
| --- | --- |
| Current plugin | MoodzFilter (`docs/plugins/moodzfilter/`) |
| Current phase | 2 (DSP core). Phase 1 (skeleton) closed on 2026-11-02 by gate 1; phase 0 closed on 2026-11-02 (SPEC frozen, ADR 0001 AGPL, ADR 0002 identity) |
| Gate to pass | Gate 2: DSP tests and golden references green, CPU budget set in `benchmarks/budget.json` and met, listening approved |
| Plugin identity (ADR 0002) | `COMPANY_NAME` Radikal Moodz, `PLUGIN_MANUFACTURER_CODE` `Rdkm`, `PLUGIN_CODE` `Mzf1`, VST3 only, Windows only for v1. Final: a Live session was saved with the plugin on 2026-11-02 |
| Plugin repo | https://github.com/Wieedze/MoodzFilter (code, task files in `docs/tasks/`, its own `.claude/STATE.md`). SPEC, ROADMAP, plugin ADRs and post-mortems stay in this playbook under `docs/plugins/moodzfilter/` (decided 2026-11-02) |
| Last task closed | 0010 "Per-model settings: Slope, K35 saturation, Vintage variant" (MoodzFilter ADR 0008: three separate parameters; Slope 6 to 24 dB/oct, OB-Xd 4-pole continuous through Morph, Diode Ladder at the nearest 6 dB step; K35 saturation 0 to 100 %, 25 % = Mild; Vintage variant, 6 sub-models; 17 prepared filter variants, `dsp::chooseFilter` picks one per block; defaults give back the task 0009 sound, no golden change), verifier pass on 2026-11-03 (1 round), Maxime's Live test approved 2026-11-03 16:32 CET, post-mortem `docs/plugins/moodzfilter/learning/0010-per-model-settings.md`. PR https://github.com/Wieedze/MoodzFilter/pull/13. Previous: 0009 (PR #12, ADRs 0006 and 0007, Model list of 9 entries), 0008 (PR #11, audition build), 0007 (PRs #9 and #10), 0006 (PR #7), 0005 (PR #6), 0004 (PR #5), 0003 (PR #4), 0002 (PR #2), 0001 (PR #1) |
| Open PRs | None. MoodzFilter PRs #1 to #13 merged; task 0011 (crossfade) in progress on `task/0011-model-crossfade` |
| Current task | None in progress. Next: the crossfade on a Model change (no task file yet) |
| Pinned JUCE version | 9.0.5 (git submodule tag, no branch in `.gitmodules`) |
| CPU budget per block | — |
| Known defects (sound, perf, hosts) | — |
| Gate 1 | Passed on 2026-11-02. CI run 41524747297 green on Linux, Linux RealtimeSanitizer and Windows; pluginval 10 green; golden references approved by ear. Maxime installed the VST3 from that run's installer, loaded it in Ableton Live on Windows, saw the generic editor and Gain out from -inf to +6.0 dB, saved a session and reloaded it with the value kept. MoodzFilter `.claude/STATE.md` updated to phase 2 |
| Recurring verifier failure | Tasks 0004 and 0005 both failed round 1 on a missing `GLOSSARY.md` entry for a new name of a target, test or tool (`Render case`, `Golden manifest`, `Canary`). Check `GLOSSARY.md` for every new name before handing over to the task-verifier (post-mortem 0005) |
| Unmeasured figure caught (task 0007) | Round 1 of the 0007 verifier failed partly because a test bound (peak 4 raised to 16) was justified by a figure adopted from the rt-safety reviewer's own probe, never measured on the test signal; the verifier's probe with the test's inputs disagreed, and the bound went back to 4 with the test now printing its largest peak (post-mortem 0007). Lesson for the playbook: every figure in a test or a task row is measured by our own command on the test's own signal, never copied from a reviewer |
| Development environment | Decided: from 2026-11-03 Maxime continues on his own Windows machine with VS Code and Claude Code (local builds with clang-cl and Ninja, VST3 tested directly in Ableton Live). The RealtimeSanitizer job stays Linux-only, in CI. Keep this playbook cloned next to the MoodzFilter repo |
| Recommended order of next tasks | 1. Maxime merges MoodzFilter PR #13. 2. Write the task file for, then do, the crossfade on a Model change (SPEC success criterion 3; also covers a Diode Ladder slope step, a Vintage variant change and the slope hysteresis recorded in MoodzFilter `FUTURE.md`). 3. The rest of the p2 lane in order: input drive with 2x and 4x oversampling (latency reported, dry path delayed); BPM-synced LFO on the cutoff (block size test with the LFO active); dry/wet mix, in/out gains, smoothing everywhere (Gain in −∞ to +12 dB, ADR 0004); CPU budget and listening in Live (gate 2). Playbook lane still open: independent agent check of the repo, remaining licences |

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
