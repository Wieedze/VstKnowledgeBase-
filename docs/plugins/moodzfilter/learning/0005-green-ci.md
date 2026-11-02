# 0005 — Green CI: RealtimeSanitizer, nonblocking annotations, strict C++23

**Date**: 2026-11-02
**Verdict**: pass (after 2 rounds)

## What was delivered

`processBlock` (now also `noexcept`) and `dsp::SmoothedGain::process` carry `MOODZ_NONBLOCKING` (`source/dsp/Realtime.h`). The macro becomes `[[clang::nonblocking]]` only in the RealtimeSanitizer build and expands to nothing elsewhere. A new CI job, "Linux RealtimeSanitizer" (clang 20), builds the test and tool executables with `-DWITH_REALTIME_SANITIZER=ON`. It runs `ctest` and `MoodzFilterTools check` under the sanitizer. A canary (`RtsanCanary`) proves that the sanitizer fires: its test passes only if the output matches `RealtimeSanitizer: unsafe-library-call`. `CMAKE_CXX_EXTENSIONS OFF` applies everywhere, so no target compiles with `gnu++` any more. This closes the PluginTests gap noted in 0004. Commits `4874a8b`, `fa21551` and `528ad1f` on `task/0005-green-ci`.

## What got stuck

Round 1 failed on one item:

* **New term without a glossary entry**: `Canary` (the `RtsanCanary` target and the `rtsan-canary` test). It was added to `GLOSSARY.md` in `528ad1f`. This is the same failure as in 0004 (`Render case`, `Golden manifest`).

Noted in round 1 and resolved without a code change: `processBlock` also became `noexcept`, but the Goal did not say so. That fits `cpp.md`, and the Goal now mentions it.

Judged acceptable:

* JUCE pins its own VST3 wrapper objects (8) and the binary-data object (1) to `-std=c++17`. That is still no GNU extension, and the task row says so.
* The VST3 module is not built in the RTSan job, because it cannot link the sanitizer runtime. `processBlock` is still covered because PluginTests and the tools drive the real processor.
* `PluginProcessor.cpp` keeps its 33 template clang-format violations from main. No new ones were added, and the formatting task is out of scope.

## What we change next

* Trap, seen twice now: a new name for a target, test or tool (canary, render case, manifest) is also a new term. Check `GLOSSARY.md` before handing over to the task-verifier, not only for class names.
* A sanitizer job needs a canary that fails without the sanitizer. Otherwise a missing define makes the checker silently inert. Match the sanitizer's message (`PASS_REGULAR_EXPRESSION`), not just a nonzero exit (`WILL_FAIL`), which would also accept a crash or a loader error.
* The rt-safety-reviewer's two suggestions are in `FUTURE.md`: annotate `Snapshotter::snapshot` and `SmoothedGain::setTargetDb`, and bound the template clear loop by `buffer.getNumChannels()`.

## Evidence

* `cmake --build Builds --clean-first` (Debug, clang 18): 0 warnings. `ctest --test-dir Builds --output-on-failure`: 22/22 passed.
* `./Builds/MoodzFilterTools check`: 12 × `ok`, `check: all passed`, exit 0. `render Builds/renders` exit 0. `compare Builds/renders tests/golden`: 12 × `ok`, `compare: all files within tolerance`, exit 0.
* `cmake --build Builds-release` (Release, clang 18, incremental on top of the 4874a8b build): 0 warnings. `ctest --test-dir Builds-release`: 22/22 passed.
* `xvfb-run -a pluginval --strictness-level 10 --validate` on the Debug and Release `MoodzFilter.vst3` (pluginval 1.0.4): `SUCCESS` for both.
* `cmake --build Builds-rtsan --target DspTests PluginTests ToolsTests MoodzFilterTools RtsanCanary Benchmarks` (clang 20.1.2, `-DWITH_REALTIME_SANITIZER=ON`): 0 warnings. `ctest --test-dir Builds-rtsan --output-on-failure`: 23/23 passed, including `rtsan-canary`. `./Builds-rtsan/MoodzFilterTools check`: exit 0, no report.
* Canary red and green, rebuilt by hand: `clang++-20 -std=c++23 -fsanitize=realtime -Isource tests/rtsan/RtsanCanary.cpp`. Without `-DMOODZ_REALTIME_SANITIZER=1` it exits 0 with no report, so the regex test fails. With the define it prints `RealtimeSanitizer: unsafe-library-call` (malloc in `allocateOnTheAudioThread`).
* processBlock is watched. In a scratch copy, `new int[16]` was added to `processBlock` and an RTSan Debug `PluginTests` was built. It stopped with exit 43: `unsafe-library-call ... malloc` in `PluginProcessor::processBlock` (PluginProcessor.cpp:126), called from `GainOutTests.cpp:63`. The scratch copy was deleted, and the branch diff has no allocation in `processBlock`.
* `ninja -C <dir> -t commands` in `Builds`, `Builds-release` and `Builds-rtsan`: 0 `-std=gnu`. All objects are at `-std=c++23` except 9 at `-std=c++17` (8 JUCE `juce_audio_plugin_client` VST3 wrapper objects and 1 Assets binary-data object).
* `clang-format --dry-run`: 0 violations in `Realtime.h`, `RtsanCanary.cpp`, `SmoothedGain.h` and `SmoothedGain.cpp`. `PluginProcessor.cpp` has 33, the same count as on main. `PluginProcessor.h` has 0.
* `git diff main...HEAD -- tests/golden/`: empty.
* CI run 41517663478 on `fa21551`: Linux, Linux RealtimeSanitizer and Windows passed. The RTSan job log shows 23/23 including `rtsan-canary`, and `check: all passed`. `528ad1f` changes only `GLOSSARY.md` and the task file.
* TDD red, as reported by the coordinator and reproduced above: before `MOODZ_REALTIME_SANITIZER` was defined, the canary exited 0 and its `WILL_FAIL` test failed.
* `rt-safety-reviewer`, run by the coordinator: no blocking finding. It confirmed that RTSan's real-time context covers every callee of `processBlock` at run time. Its suggestions were applied in `fa21551` or noted in `FUTURE.md`.
