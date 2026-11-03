# 0008 — Audition build: filter model, cutoff and resonance in the plugin

**Date**: 2026-11-03
**Verdict**: pass (after 2 rounds)

## What was delivered

The plugin gets three SPEC parameters at `ParameterID` version 2: `filterModel` (the 7 low pass candidates of `dsp/FilterCandidates.h`, Cytomic SVF by default), `cutoff` (20 Hz to 20 kHz, logarithmic, 1 kHz) and `resonance` (0 to 100 %, 20 %). One `dsp::MultimodeFilter` per candidate is configured in the constructor and prepared in `prepareToPlay`; `processBlock` runs the selected one before Gain out and resets it when the selection changes. Render cases open the filter (20 kHz, resonance 0), so every golden reference changed in the `golden:` commit `ac02387`. Maxime tested the CI installer in Live on 2026-11-03 at 09:43 CET: all 7 models work. He kept 5 of them (Diode Ladder 24 dB, K35, Vintage Ladder, Cytomic SVF, OB-Xd 4-pole 24 dB) and approved the golden change. Commits `41d83d2`, `ac02387`, `f1fe643`, `93bf471`, `b0de2b0`, `5679f43` and `898e3f9` on `task/0008-audition-build`, PR #11.

## What got stuck

Round 1 of the task-verifier failed on four items. Three rows of the Expected behaviour table had no test: the parameter version hints, the full order of the model list (only the first entry was checked), and the resonance mapping from percent to 0..1. The fourth: the task file declared the plugin and tools layers but the diff also touched `dsp/` (candidate labels, `MOODZ_NONBLOCKING` on the setters). Fixed in `b0de2b0`, each new test seen red by breaking the code on purpose.

Found by the rt-safety review and fixed before the verifier ran: the model index taken from the parameter could fall outside the candidate list on NaN or out of range values; `toModelIndex` now clamps in float before the conversion, with a test. The DSP setters called from `processBlock` were not marked `MOODZ_NONBLOCKING`.

The listening did not land where the SPEC expected. Maxime kept 5 models instead of 4, found the low pass candidates alike on headphones, and asked for creative options: a blend of models, a random curve on the cutoff, extra parameters per model such as a user-selectable slope. "More than 4 filter models" is in the SPEC's Out of v1, so nothing was built: the ideas are in `FUTURE.md`, and task 0009 starts with the SPEC change.

Judged acceptable: under GCC, the new test helper adds one `-Woverloaded-virtual` warning, the same one `PluginProcessor` already has; clang, the project compiler, does not warn. Logged in `FUTURE.md`, with the missing clang-format step in CI.

## What we change next

* Before the verifier, walk the Expected behaviour table row by row and name the test that covers each row. A row checked only partly (the first model of seven) counts as missing.
* The Layer line of a task lists every folder the diff touches, including small annotation changes made after a review.
* A listening task can change the scope. Plan for it: the choice is recorded in the task, and anything beyond the SPEC goes to `FUTURE.md` and to a SPEC decision in the next task, not into the current one.
* Default resonance and no drive hide the character of the models. Listen at high resonance with a loud signal before choosing.

## Evidence

* `cmake --build Builds` (Debug, GCC, WSL2) on `898e3f9`: exit 0; no warning in the code this task touches beyond the GCC-only `-Woverloaded-virtual` above. `ctest --test-dir Builds --output-on-failure`: 44/44 passed.
* `./Builds/MoodzFilterTools check`: `check: all passed`. `render Builds/renders`, then `compare Builds/renders tests/golden`: `compare: all files within tolerance`, max error 0 on all 16 files.
* `git clang-format --diff main -- source tests tools`: `clang-format did not modify any files`.
* `git log main..HEAD -- tests/golden`: only `ac02387`.
* CI run 41606055766 on `898e3f9`: Linux, Windows and Linux RealtimeSanitizer green. RTSan `ctest` 45/45 with the canary; pluginval `--strictness-level 10` `SUCCESS` on Windows and Linux.
* CI run 41593592904 on `5679f43`: green; its `MoodzFilter-0.0.1-Windows.exe` is the build Maxime tested in Live.
* TDD red: plugin tests 6 of 14 failing before `41d83d2`; the model index invariant did not compile before `toModelIndex`; the three round-1 tests seen red in `b0de2b0`.
