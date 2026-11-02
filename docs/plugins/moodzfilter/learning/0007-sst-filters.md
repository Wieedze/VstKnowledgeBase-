# 0007 — Integrate sst-filters in the dsp layer

**Date**: 2026-11-02
**Verdict**: pass (after 2 rounds)

## What was delivered

sst-basic-blocks and sst-filters (GPL v3, MoodzFilter ADR 0005) are pulled by CPM at pinned commits (`38cf04a`, `87a171b`), linked to `dsp` only, with their headers as system includes. `dsp::MultimodeFilter` runs one sst-filters model on linked stereo through the `filters++` API, in internal packets of 16 samples kept across host blocks. `dsp/FilterCandidates.h` lists the 7 low pass candidates for the listening in task 0008. No plugin change. Commits `5f96c75`, `23f29b0`, `ec4ae0a`, `1bfb59a` and `0c743a5` on `task/0007-sst-filters`.

## What got stuck

Round 1 of the task-verifier failed on two items:

1. After the rt-safety review, the peak bound of the "finite at the bounds" test went from 4 to 16. The reason given was a "6.4 measured" for the Cytomic SVF at 44.1 kHz with resonance 1. That figure came from the reviewer's own probe, and nobody measured it on the test signal. A verifier probe using the test's own inputs found a largest peak of 2.59 (1.63 at 44.1 kHz). Fixed in `0c743a5`: the bound is back to 4, and the test prints the largest peak.
2. `makeCoefficients` runs at every packet start, even when the parameters have not changed, and nothing explained why (`.claude/rules/dsp.md`, "only when a parameter changes"). It turned out to be deliberate. Each call moves sst-filters' target coefficients 20 % of the way to the new ones (`tC = 0.8 tC + 0.2 N`, `FilterCoefficientMaker_Impl.h:865`, `smooth = 0.2f` line 28), and the API requires the call every block (`filters++/api.h:205`). The code now has a comment citing both.

Found by the rt-safety review and fixed before the verifier ran. OB-Xd returned NaN after `prepare` at a lower rate because the cutoff was above Nyquist; the cutoff is now clamped where it is used. Reads went past short spans. The pitch table was initialised lazily on the audio thread and is now warmed up in `prepare`. The other two items, ThreadSanitizer suppressions and denormal flushing inside the dsp layer, are in `FUTURE.md`.

Judged acceptable:

* Exact equality in the reset, 0-sample, stereo and span tests. The task table declares those rows "exact", and the same practice exists in `SmoothedGainTests` and `ToolsCoreTests`. These tests check that outputs are bit-identical, not float values.
* Two CMake warnings at configure time from sst-basic-blocks: no simde, and no sst-cpputils. They are not compiler warnings. The simde limit (x86_64 only) is in the Consequences section of ADR 0005.

## What we change next

* Trap: a reviewer's figure does not justify a tolerance. Before you loosen a bound, measure on the test's own signal and have the test print the value, with the command written in the task row.
* Wrapping a library whose API smooths per call: say so in a comment where the call is made, with the file and line at the pinned commit. Otherwise it reads as a breach of "recompute only on change".
* Nothing else.

## Evidence

* `cmake --build Builds` (Debug, clang 18) on `0c743a5`: 0 warnings. `ctest --test-dir Builds --output-on-failure`: 36/36 passed.
* `./Builds/MoodzFilterTools check`: `check: all passed`. `render Builds/renders`, then `compare Builds/renders tests/golden`: `compare: all files within tolerance`, with max error 0 on the existing cases (no plugin change).
* `./Builds/DspTests "[filter]" -s | grep gain`: Cytomic LP at 1 kHz, `10 kHz gain -42.8012 dB`. HP, `100 Hz gain -40.1108 dB`. Both are inside the 34 to 46 dB band.
* `./Builds/DspTests "Every filter candidate stays finite at the bounds" -s | grep "largest peak"`: `largest peak 2.59226`, bound 4.
* `cmake --build Builds-release` (Release): 0 warnings. `ctest --test-dir Builds-release`: 36/36.
* `cmake --build Builds-rtsan --target DspTests PluginTests ToolsTests MoodzFilterTools RtsanCanary Benchmarks` (clang 20): 0 warnings. `ctest --test-dir Builds-rtsan`: 37/37, canary included. `./Builds-rtsan/MoodzFilterTools check`: `check: all passed`.
* `xvfb-run -a pluginval --strictness-level 10 --validate Builds-release/MoodzFilter_artefacts/Release/VST3/MoodzFilter.vst3` (1.0.4): `SUCCESS`.
* `clang-format --dry-run --Werror` (18): 0 violations in `FilterCandidates.h`, `MultimodeFilter.h`, `MultimodeFilter.cpp` and `MultimodeFilterTests.cpp`.
* The fetched sources are at the pinned commits (`git rev-parse HEAD` in `Builds/_deps/*-src`). A verifier probe found all 7 candidate configurations in `Filter::availableModelConfigurations(model)`, and `configure` rejects an invalid one (CytomicSVF 24 dB).
* `git diff --name-only main...HEAD -- tests/golden`: empty.
* CI run 41533430686 on `23f29b0`: Linux, Linux RealtimeSanitizer and Windows passed. Run 41537528868 on `0c743a5` was still in progress when the verifier finished.
* TDD red, as reported by the coordinator: 8 of 8 filter test cases failed against a stub. The sample-rate-drop and short-span tests failed before `23f29b0`.
* `rt-safety-reviewer`, run by the coordinator: 1 HIGH finding, fixed with a test. MEDIUM and LOW items were fixed or logged in `FUTURE.md`.
