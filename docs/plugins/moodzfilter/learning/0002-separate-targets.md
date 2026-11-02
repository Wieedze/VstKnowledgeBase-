# 0002 — Separate the dsp, plugin, ui and tools targets

**Date**: 2026-11-02
**Verdict**: pass (after 2 rounds)

## What was delivered

The single Pamplejuce source tree became the playbook layers: a JUCE-free `dsp` static library (C++23, no extensions, PIC, `-Wall -Wextra -Werror`) with a configure-time guard against `#include <juce` under `source/dsp/`, the processor in `source/plugin/`, the editor and `createEditor` in `source/ui/`, a `MoodzFilterTools` command line behind `MOODZ_BUILD_TOOLS` (ON by default, OFF in Release), and two test targets, `DspTests` (no JUCE) and `PluginTests`. Commits `2aa90b6` and `93cec1a` on `task/0002-separate-targets`.

## What got stuck

Round 1 failed on two rule items, both outside the "Expected behaviour" table:

* `DspTests` and `MoodzFilterTools` compiled with `-std=gnu++23`. `cxx_std_23` declared PUBLIC on `dsp` propagates the standard to consumers but not `CXX_EXTENSIONS OFF`, which is a per-target property (`cpp.md`: no compiler extensions). Fixed by setting the property on both targets.
* The rewritten include in `benchmarks/Catch2Main.cpp` broke clang-format include ordering (`cpp.md`). Moved files keep the template's pre-existing format violations (`source/plugin/PluginProcessor.cpp`, `source/ui/PluginEditor.h`, `tests/plugin/PluginBasics.cpp`), which were not counted against this task.

## What we change next

* Trap: `CXX_EXTENSIONS` does not propagate through `target_compile_features`. Every new non-JUCE target needs it set explicitly, or set `CMAKE_CXX_EXTENSIONS OFF` once in a dedicated build task (it would also touch the JUCE targets, so not in a feature task).
* Run `clang-format --dry-run --Werror` on every file the diff touches before handing over; the CI clang-format check does not exist yet.
* The template's pre-existing clang-format violations deserve a dedicated formatting task (one commit, no behaviour change).
* `[[clang::nonblocking]]` on `processBlock` is still missing (pre-existing, noted by `rt-safety-reviewer`), planned for task 0003.

## Evidence

* `cmake --build Builds --target clean && cmake --build Builds` (Debug, clang, Ninja): 271/271 steps, `grep -ci warning` on the log = 0. Rebuilt after `93cec1a`: 0 warnings.
* `cmake --build Builds-release` with the changed translation units touched (9 recompiled): exit 0, 0 warnings.
* `ninja -t commands dsp|DspTests|MoodzFilterTools` (in `Builds`): `-std=c++23` for all three after `93cec1a`; `dsp` has `-fPIC -Wall -Wextra -Werror`.
* `ctest --test-dir Builds --output-on-failure`: 3/3 passed (`Plugin instance`, `dsp layer`, `Boot performance`).
* `./Builds/DspTests "[layer]"`: 1 assertion passed.
* Red reproduced: a probe `#if __has_include(<juce_core/juce_core.h>) #error` fails with `-I JUCE/modules` (PluginTests include path) and compiles with the DspTests include path.
* A file under `source/dsp/` with `#include <juce_core/juce_core.h>` (and a second one with `  #  include "juce_audio_basics/..."`): `cmake -B Builds` fails with `dsp layer must not include JUCE: <file>`. Files removed, tree reconfigured clean.
* `./Builds/MoodzFilterTools --help`: exit 0 and usage printed; unknown command: exit 2; no argument: exit 2.
* `grep MOODZ_BUILD_TOOLS Builds*/CMakeCache.txt`: ON in `Builds` (Debug), OFF in `Builds-release`.
* `xvfb-run -a pluginval --strictness-level 10 --validate Builds-release/MoodzFilter_artefacts/Release/VST3/MoodzFilter.vst3` (pluginval 1.0.4): `SUCCESS`.
* `clang-format --dry-run --Werror benchmarks/Catch2Main.cpp`: clean after `93cec1a`.
* CI run 41477871641 (`2aa90b6`) and run 41480714455 (`93cec1a`): Linux success, Windows success, release skipped.
* No change under `tests/golden/` (none exists yet); `tools check` and `tools compare` are task 0004. `rt-safety-reviewer` run by the coordinator: no finding.
