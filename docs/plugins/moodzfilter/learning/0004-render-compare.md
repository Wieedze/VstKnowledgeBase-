# 0004 — tools render, compare and check, first golden references

**Date**: 2026-11-02
**Verdict**: pass (after 2 rounds)

## What was delivered

`MoodzFilterTools` drives the real `PluginProcessor` headless. `render` writes 3 render cases × 4 test signals as stereo 48 kHz 32-bit float WAV files. `compare` checks them against `tests/golden/` using the golden manifest (plugin ADR 0003). `check` verifies finite output and block size independence (1, 64 and 480 against 512) through the whole plugin. The test signals and error metrics live in a JUCE-free `moodz_tools_core`, tested by `ToolsTests`. CI runs the three commands on Linux and Windows and uploads the renders. The first references are in their own `golden:` commit and were approved by Maxime after listening. Commits `f8abae5`, `4a54fcf` (`golden:`), `d544ed9` and `fbc518f` on `task/0004-render-compare`.

## What got stuck

Round 1 failed on five items:

* **Metric test tolerance looser than the table.** The table said ± 1e-9, but the test used `margin (1e-7)`. With a 0.1f reference, 1e-9 cannot be reached anyway: the float spacing near 0.1 is about 7.5e-9. Fixed by using a silent reference, so the differences are exactly the float values 0.001f and 0.01f, checked at 1e-9.
* **New terms without a glossary entry**: `Render case` and `Golden manifest`. Both were added to `GLOSSARY.md`.
* **`CXX_EXTENSIONS OFF` dropped from `MoodzFilterTools`** when the target was switched to link `SharedCode`. The tools compiled with `-std=gnu++23`. The property is restored and all tools sources now build with `-std=c++23`. PluginTests still builds with `gnu++23`, which predates this task (Pamplejuce defaults) and is noted below.
* **Task file named a location that does not exist** (`tools/RenderCases`). The task now points to `renderCases()` in `tools/Rendering.cpp`.
* **`check` printed `ok` after `FAIL` for the same file.** It now prints `ok` only for a file with no failure.

Judged acceptable:

* `check` sends no 0-sample block. That case is covered by PluginTests (rt-safety-reviewer note).
* `Rendering.cpp` throws if `gainOut` is missing. This is tools code on the main thread, not the audio thread.
* The manifest carries an extra `about` key and a `sampleRate` that `compare` does not read. ADR 0003 neither requires nor forbids either; `compare` checks each file's sample rate against its reference.

## What we change next

* Trap: a tolerance tighter than the float spacing of the test input cannot be met. Choose inputs whose differences are exact in float (silent reference), or state the spacing in the table.
* When a target switches to linking JUCE (`SharedCode`), check `ninja -t commands <target>` for `-std=`: the Pamplejuce setup brings `gnu++23` unless `CXX_EXTENSIONS OFF` is set on the target. PluginTests has the same gap; a candidate for the Green CI task or `FUTURE.md`.
* A tool that prints a per-item verdict needs a per-item pass flag, not only the global one.

## Evidence

* `cmake --build Builds` (clang 18, Ninja, Debug, tools ON) after touching every `tools/` and `tests/tools/` source, on `fbc518f`: 0 warnings. `ninja -t commands MoodzFilterTools` shows `-std=c++23` for `Commands.cpp`, `Rendering.cpp` and `ToolsMain.cpp`.
* `ctest --test-dir Builds --output-on-failure`: 22/22 passed (DspTests, PluginTests, ToolsTests).
* `./Builds/MoodzFilterTools check`: 12 × `ok`, `check: all passed`, exit 0.
* `./Builds/MoodzFilterTools render <scratch>/r`: 12 files, exit 0. WAV header of `unity__sine-1k.wav`: format 3 (float), 2 channels, 48000 Hz, 32 bits.
* `./Builds/MoodzFilterTools compare <scratch>/r tests/golden`: 12 × `ok` with max error 0 and RMS error −300 dBFS, exit 0.
* Failure modes, run on `d544ed9`; the only tools change since then is the `check` output:
  * one sample raised by 0.01: `FAIL unity__sine-1k.wav: max error 0.010000005`, exit 1;
  * render missing: `FAIL gain-plus6__sweep.wav: render missing or unreadable`, exit 1;
  * unlisted render: `FAIL extra__impulse.wav: render not listed in manifest.json`, exit 1;
  * no manifest: exit 2;
  * unknown command: exit 2;
  * no argument: exit 2;
  * `--help`: exit 0.
* `clang-format --dry-run --Werror tools/*.cpp tools/*.h tools/core/* tests/tools/*.cpp`: clean.
* `xvfb-run -a pluginval --strictness-level 10 --validate Builds/MoodzFilter_artefacts/Debug/VST3/MoodzFilter.vst3` (pluginval 1.0.4): `SUCCESS`. `source/` is unchanged (`git diff main -- source/` is empty).
* `git log main..HEAD -- tests/golden/`: only `4a54fcf golden: first references for the gain cases`.
* Golden approval: Maxime listened to the renders artefact of CI run 41507926670 and approved them in the session (2026-11-02 20:23), also posted on PR #5 (2026-11-02T19:23:39Z).
* CI run 41507926670 on `d544ed9` and CI run 41510268681 on `fbc518f`: Linux success and Windows success. Tools check, Render and Compare succeeded on both; renders were uploaded on Linux and the Windows installer was uploaded; release was skipped.
* TDD red, as reported by the coordinator: ToolsTests against stubs returning empty vectors, 5 of 5 test cases failing.
* `rt-safety-reviewer`, run by the coordinator: no finding (`source/` untouched; the tools drive the processor like a host).
