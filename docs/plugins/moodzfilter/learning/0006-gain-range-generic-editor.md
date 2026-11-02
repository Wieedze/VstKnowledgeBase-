# 0006 — Gain out from −∞ to +6 dB, JUCE generic editor

**Date**: 2026-11-02
**Verdict**: pass (after 1 round)

## What was delivered

Gain out follows the amended SPEC (ADR 0004): range −60 to +6 dB with the same ID `gainOut`, where −60 dB is the silence floor, displayed `-inf` and giving a gain of exactly 0. The template "Hello" editor is replaced by `juce::GenericAudioProcessorEditor` (`source/ui/Editor.cpp`), and `MoodzFilterTools snapshot <png>` writes a PNG of the editor, also taken in CI and attached to the renders artefact. The `gain-automation` render case now tops at +6 dB and a new `gain-mute` case fades to silence; their references are in the separate commit `ff69806 golden:`. Commits `050821d`, `ff69806`, `106603d` and `ae7f615` on `task/0006-gain-range-generic-editor`.

## What got stuck

No task-verifier failure.

* The fade-to-silence test exposed float accumulation in the ramp: adding `step` 960 times gave a last step of 0.001046, above 1/960 + 1e-6. The code was changed to compute the gain from the start of the ramp (`rampStartGain + step * stepsDone`), not the test.

Judged acceptable:

* Files outside the announced layers: `.github/workflows/build_and_test.yml` (required by the snapshot row, "run in CI"), `benchmarks/Catch2Main.cpp` (it included the deleted `ui/PluginEditor.h`) and `CMakeLists.txt` (the `MOODZ_WITH_INSPECTOR` define lost its only user). The melatonin_inspector module itself is still linked in Debug, as the Out of scope asks.
* Task 0004's task file still lists `gain-automation` at +12 dB in its render-cases table. It is the record of a closed task and stays as written; this task and ADR 0004 document the change.
* `PluginProcessor.cpp` keeps its 33 template clang-format violations from main; the diff added none.
* ±Inf input multiplied by the silence gain 0 gives NaN (rt-safety-reviewer). The output is non-finite only when the input already is; the guard is in `FUTURE.md`.

## What we change next

* Trap: a ramp built by repeated addition drifts in float. Compute each sample from the ramp start and the number of steps done, and test the maximum step, not only the end value.
* A gain that must reach silence needs an explicit floor mapped to exactly 0; `10^(dB/20)` never gets there. Test the floor, a value below it and a value just above it.
* Nothing else.

## Evidence

* `cmake --build Builds` (Debug, clang 18) after touching every changed source: 0 warnings. `ctest --test-dir Builds --output-on-failure`: 25/25 passed.
* `./Builds/MoodzFilterTools check`: 16 × `ok`, `check: all passed`, exit 0. `render Builds/renders` exit 0. `compare Builds/renders tests/golden`: 16 × `ok`, max error 0.000000000, `compare: all files within tolerance`, exit 0.
* `compare Builds/renders <main's tests/golden>`: only `gain-automation` sine, sweep and pink noise differ, max error 0.496452391 (= 0.25 × (10^(12/20) − 10^(6/20))); the four `gain-mute` renders are not listed there; `unity`, `gain-plus6` and `gain-automation__impulse` are bit identical.
* `cmake --build Builds-release` (Release, clang 18) after touching the changed sources: 0 warnings. `ctest --test-dir Builds-release`: 25/25 passed.
* `cmake --build Builds-rtsan --target DspTests PluginTests ToolsTests MoodzFilterTools RtsanCanary Benchmarks` (clang 20): `ctest --test-dir Builds-rtsan`: 26/26 passed, including `rtsan-canary`. `./Builds-rtsan/MoodzFilterTools check`: `check: all passed`, exit 0.
* `xvfb-run -a pluginval --strictness-level 10 --validate Builds/MoodzFilter_artefacts/Debug/VST3/MoodzFilter.vst3` (pluginval 1.0.4): `SUCCESS`, exit 0. The coordinator reports `SUCCESS` on the Release build too.
* `xvfb-run -a ./Builds/MoodzFilterTools snapshot <png>`: exit 0, PNG 856 × 250, one "Gain out" slider showing `0.0 dB`; looked at.
* `clang-format --dry-run` (18): 0 violations in every new or changed source and test file; `PluginProcessor.cpp` 33, as on main.
* `git log main..HEAD -- tests/golden`: only `ff69806 golden: Gain out tops at +6 dB, new fade-to-silence case`.
* `gh run view 41524747297`: Linux, Windows and Linux RealtimeSanitizer passed on `ae7f615`.
* Every row of the Expected behaviour table has a test with the stated tolerance (`tests/dsp/SmoothedGainTests.cpp`, `tests/plugin/GainOutTests.cpp`), except the snapshot row, which CI runs, and the render row, covered by `compare`.
* TDD red as reported by the coordinator: DSP 2 of 9 test cases failing, plugin 3 of 4, before the code.
* `rt-safety-reviewer`, run by the coordinator: no finding; the non-finite input guard is in `FUTURE.md`.
* Maxime, 2026-11-02 22:16: references approved by listening (CI artefact of run 41524747297); in Ableton Live on Windows with that run's installer, generic editor shown, Gain out from `-inf` to `+6.0 dB`, saved session reloaded with the value kept.
