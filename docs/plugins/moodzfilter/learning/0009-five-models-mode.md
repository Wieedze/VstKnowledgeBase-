# 0009 — Filter list: five models with their passbands

**Date**: 2026-11-03
**Verdict**: pass (1 round, after a rescope during the task)

## What was delivered

The Model parameter lists 9 entries in a frozen order: each of the 5 models Maxime chose in task 0008 with each passband it has (Cytomic SVF Low-pass, High-pass, Band-pass, Notch; Vintage Ladder, OB-Xd 4-pole and Diode Ladder Low-pass; K35 Low-pass, High-pass). It follows MoodzFilter ADRs 0006 and 0007. `dsp/FilterModels.h` replaces the candidate list: `filterSetups()` is both the processor's list of prepared filters and the source of the Model choices. One `MultimodeFilter` per entry is configured in the constructor and prepared in `prepareToPlay`; `processBlock` only selects one, with a local bound on the index. No parameter was added. No golden reference changed. Maxime checked the CI installer in Live on 2026-11-03 at 14:29 CET: everything works. Commits `a4cbf41`, `8c85445`, `3232c5d`, `f9cb1d7`, `c086c78` and the closing commit on `task/0009-five-models-mode`, PR #12.

## What got stuck

The task changed shape halfway through. The first version followed ADR 0006: 5 models plus a fixed Mode parameter, with a passband the model lacks playing low-pass (`8c85445`). Maxime found it conforming in Live, then asked that a model show only the passbands it has. A VST3 choice list cannot follow another parameter, and the generic editor shows every choice. He picked the merged list (ADR 0007), so `filterMode` was removed before any release. The cost was one extra build-and-listen cycle. The underlying miss: the Mode question put "display the fallback" in an option description before checking that the generic editor could do it. The code showed it could not, and the user had already read the promise.

`8c85445` went out without its clang-format fixes. The `git apply` of the format diff failed silently inside a `&&` chain whose output was filtered, and the next command ran after a `;`. It was caught and fixed in `3232c5d`.

Found by the rt-safety review of the rescope (low, no real-time violation): removing Mode also removed the clamp on the filter index in `processBlock`, so only the snapshot, in another file, kept it in range. Restored in `f9cb1d7`.

Judged acceptable by the verifier: a removed `filterMode` value stays in states loaded from the first test build (`FUTURE.md`). The state tests build their XML by hand until the first release puts state files in `tests/plugin/states/`.

## What we change next

* Before offering the user a UI behaviour in a decision question, check that the host and the generic editor can do it. In VST3, a parameter's choice list is fixed at load.
* After a mid-task rescope, re-run the review agents on the new diff: the second review found what the removal broke.
* Never filter the output of a command that changes files; check its exit code on its own line.
* Per-model settings (task 0010) face the same question as Mode: decide with Maxime whether they join the Model list or stay separate parameters before writing the task file.

## Evidence

* `cmake --build Builds` (Debug, GCC, WSL2) on `c086c78`; `ctest --test-dir Builds --output-on-failure`: 50/50 passed.
* `./Builds/MoodzFilterTools check`: `check: all passed`. `render Builds/renders`, then `compare Builds/renders tests/golden`: `compare: all files within tolerance`, max error 0 on every file.
* `./Builds/PluginTests "Cytomic SVF high pass" -s | grep "100 Hz gain"`: `-40.1206 dB`.
* `./Builds/PluginTests "Cytomic SVF band pass and notch" -s | grep -E "band pass|notch 1"`: band pass 100 Hz −20.17, 1 kHz −6.02, 10 kHz −21.43 dB; notch 100 Hz −0.18, 1 kHz −122.52, 10 kHz −0.13 dB.
* `./Builds/PluginTests "K35 high pass" -s | grep "K35 high pass 100"`: 100 Hz −20.13 dB, 10 kHz −0.03 dB.
* `./Builds/DspTests "Every filter setup stays finite at the bounds" -s | grep "largest peak"`: `largest peak 2.59226`, bound 4.
* `git clang-format --diff main -- source tests tools`: `clang-format did not modify any files`. `git diff main...HEAD -- tests/golden`: empty.
* CI run 41643513241 on `f9cb1d7`: Linux and Windows (Release) green with pluginval `--strictness-level 10` `SUCCESS`; Linux RealtimeSanitizer green.
* TDD red: `8c85445` did not compile before the code, then 3 of 12 filter cases failed with the mapping broken on purpose; `3232c5d`: 6 of 22 plugin cases failed before the code.
