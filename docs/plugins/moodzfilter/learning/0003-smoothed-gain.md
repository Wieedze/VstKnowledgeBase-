# 0003 — Smoothed output gain, with TDD

**Date**: 2026-11-02
**Verdict**: pass (after 2 rounds)

## What was delivered

The first vertical slice through every layer. `Gain out` (−24 to +24 dB, default 0 dB) is declared in `plugin/Parameters.*` with a frozen ID list and copied per block into a `Params` snapshot through raw atomics. The JUCE-free `dsp::SmoothedGain` applies it with a 20 ms linear ramp of the linear gain. The saved state carries `stateVersion="1"`, and a missing attribute falls back to version 1. Commits `26a8761`, `bf04265` and `6682553` on `task/0003-smoothed-gain`.

## What got stuck

Round 1 failed on three items:

* **The block-size test was narrower than its table row.** The target was set at the start of the block that held sample 2048, so only block sizes aligned on 2048 (1, 64, 512) could be compared with a mid-signal change. Sizes 7 and 480 were only checked with a constant target, and the task file did not record the narrowing. Fixed by splitting the block that holds sample 2048, so the change lands at the same sample for every size. All five sizes are now compared against a single-block reference, plus two checks that the change really happened.
* **One new clang-format violation** (`! xml` in `setStateInformation`). The template's other 33 violations in `PluginProcessor.cpp` predate the task and were not counted.
* **`setTargetDb` ran `std::pow` on every block**, before checking whether the target had changed. This breaks `dsp.md` (coefficients recomputed only when a parameter changes). Fixed by keeping the clamped dB target and returning early.

Judged acceptable:

* The "invalid sample rate" test was added after the rt-safety review and passed at once on x86: `lround`'s out-of-range result happened to be absorbed by `max(1, …)`. This is hardening against undefined behaviour, not a fix for an observed bug. So the "a fixed bug = a test that failed on that bug" rule does not apply. The test cannot prove the guard on this platform.
* **Per-block automation.** The plugin reads parameters once per block, and each change restarts a 20 ms ramp. Under continuous automation the gain curve therefore depends on the host block size. The DSP itself is block-size independent for a given sequence of targets, which is what the test proves. Sample-accurate automation is in `FUTURE.md`.
* **Deferred by the task's Out of scope:** `[[clang::nonblocking]]` and the RealtimeSanitizer job (clang 18 here). They move to the Green CI task.

## What we change next

* Trap: a block-size independence test that changes a parameter "at the start of the block that holds sample N" only compares block sizes that divide N. Split the block at N, as a sample-accurate host would, so every size sees the change at the same sample.
* When a test covers less than its table row, either amend the row as a recorded decision or widen the test. Never narrow it quietly in a code comment.
* A setter called once per block compares its input (dB) before computing the derived coefficient, not after.

## Evidence

* `cmake --build Builds` and `cmake --build Builds-release` (clang 18, Ninja) on `6682553`: 0 warnings. The changed translation units were also recompiled into the scratchpad with each build's own flags (`-Wall -Wextra -Wconversion -Wshadow-all …`) on `bf04265`: 0 warnings in Debug and Release.
* `ctest --test-dir Builds --output-on-failure` and `ctest --test-dir Builds-release`: 17/17 passed.
* `xvfb-run -a pluginval --strictness-level 10 --validate Builds-release/MoodzFilter_artefacts/Release/VST3/MoodzFilter.vst3` (pluginval 1.0.4) on `6682553`: `SUCCESS`.
* `clang-format --dry-run --Werror` on `source/dsp/SmoothedGain.*`, `source/plugin/Parameters.*`, `tests/dsp/SmoothedGainTests.cpp` and `tests/plugin/GainOutTests.cpp`: clean. `clang-format --dry-run source/plugin/PluginProcessor.cpp`: 33 warnings, the same as on `main`.
* `MoodzFilterTools check` and `compare`: not implemented yet (exit 2, "Unknown command"). They are task 0004 and in this task's Out of scope.
* CI run 41490179737 on `6682553`: Linux success, Windows success, release skipped.
* TDD red, as reported by the coordinator: DSP tests run against a no-op stub gave 5 of 7 cases failing (the 2 passing were block-size independence and linked channels, which a no-op satisfies). Plugin tests run before `Parameters` and the APVTS existed gave 5 of 6 failing.
* Expected values in the tests come from Python `10**(dB/20)` constants, not from the implementation.
* `rt-safety-reviewer`, run by the coordinator: no finding on the audio path. Its 3 defensive suggestions were applied in `bf04265`.
* No file under `tests/golden/` (none exists yet).
