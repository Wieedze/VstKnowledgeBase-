# melatonin modules and clap-juce-extensions

Study done on 2026-11-02. Each licence was read in the file of the cloned repository, not on the GitHub page.

| Repository | Commit studied | Date |
| --- | --- | --- |
| [sudara/melatonin_inspector](https://github.com/sudara/melatonin_inspector/tree/9c483f865854d83fe9873e1c20e3fd772f695f80) | `9c483f8` (the one Pamplejuce pins) | 2026-08-16 |
| [sudara/melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) | `379b719` | 2026-05-14 |
| [sudara/melatonin_perfetto](https://github.com/sudara/melatonin_perfetto) | `c8a2bd4` | 2026-10-11 |
| [sudara/melatonin_blur](https://github.com/sudara/melatonin_blur) | `fcc1857` | 2026-05-26 |
| [free-audio/clap-juce-extensions](https://github.com/free-audio/clap-juce-extensions) | `7adee3a` (Pamplejuce pins `c1a5ad0`) | 2026-10-06 |

## Summary

| Module | Verified licence | Role | Integration | Verdict |
| --- | --- | --- | --- | --- |
| melatonin_inspector | **MIT**, `LICENSE`, "Copyright (c) 2021 Sudara Williams" | Live UI inspector: hierarchy, sizes, colours, properties, FPS, `paint` time | Already in Pamplejuce (submodule `modules/melatonin_inspector`, `add_subdirectory`, linked to `SharedCode`) | **Keep**, in Debug only |
| melatonin_audio_sparklines | **MIT**, `LICENSE`, "Copyright (c) 2021 Sudara Williams" | Summary and ASCII waveform of an audio buffer, in the console or in lldb | Submodule + `juce_add_module`, header only; depends on `juce_dsp` | **Keep for `tests/plugin/` and `tools`**, unusable in `tests/dsp/` |
| melatonin_perfetto | **No LICENSE file.** The module header declares `license: MIT` (`melatonin_perfetto/melatonin_perfetto.h:9`). Perfetto SDK v53.0 dependency: **Apache 2.0** (`LICENSE` of the `v53.0` tag of google/perfetto) | Profiling traces (`TRACE_DSP`, `TRACE_COMPONENT`) viewed in ui.perfetto.dev | Submodule + `add_subdirectory`, link `Melatonin::Perfetto`, CMake option `PERFETTO` | **Later**, behind an option of our own, in the performance phase |
| melatonin_blur | **MIT**, `LICENSE`, "Copyright (c) 2023 Sudara Williams", **plus one BSD 3-clause file** (`melatonin/implementations/gin.h`, "Copyright (c) 2018, Roland Rabien") | Drop shadows and inner shadows, fast blurs in the style of Figma/CSS | Submodule + `add_subdirectory` or `juce_add_module` | **Not now** (UI, late phase), to be re-evaluated with the design document |
| clap-juce-extensions | **MIT**, `LICENSE.md`, "Copyright 2019-2020, Paul Walker" (MIT text without the "MIT License" title). Submodules `clap` and `clap-helpers`: **MIT**, "Copyright (c) 2021 Alexandre BIQUE" | Builds a CLAP binary from a JUCE plugin | Already in Pamplejuce (`add_subdirectory(... EXCLUDE_FROM_ALL)` then `clap_juce_extensions_plugin`) | **Out of v1**: remove from the build, note in `FUTURE.md` |

All these licences are compatible with a closed-source plugin as well as with an AGPL v3 plugin (MIT, BSD 3 and Apache 2.0 are compatible with GPL v3). Obligations: keep the copyright notices in the distribution (the installer's third-party licences file), plus the Apache 2.0 NOTICE file if Perfetto ships in a binary.

## melatonin_inspector

**What it does.** A separate window that inspects the editor's `juce::Component` tree: mouse selection, filterable hierarchy, position and margins editable on the fly (non-destructive, nothing is written to the code), JUCE colours by `enum ColourIds` name, colour picker, FPS counter, histogram of `paint` time per component (JUCE 8.0.13 minimum), inspection of an `UndoManager`. Module version 1.4.0 (`melatonin_inspector.h:6`), depends on `juce_gui_basics` and `juce_gui_extra`.

**Integration.** Nothing to do, Pamplejuce provides it: `add_subdirectory (modules/melatonin_inspector)` before `juce_add_plugin` (`pamplejuce/CMakeLists.txt:67`), link `melatonin_inspector` on `SharedCode` (`:152`), and in the editor a `std::unique_ptr<melatonin::Inspector>` created on click with an `onClose` that resets it (`pamplejuce/source/PluginEditor.cpp:8-19`). Shortcut `cmd/ctrl i` when the inspector is a member of the editor.

**For us.** Useful to the human during the UI phase, not to the agent (it is an interactive tool). It does not replace the `tools snapshot` required by `.claude/rules/ui.md`. Wrap the member, the button and the include in `#if JUCE_DEBUG` so it is not shipped.

## melatonin_audio_sparklines

**What it does.** A 279-line header (`melatonin_audio_sparklines.h`, version 1.0.0) that turns a `juce::dsp::AudioBlock` or a `juce::AudioBuffer` into a text summary and a "sparkline":

```
Block is 1 channel, 441 samples, min -0.999994, max 0.999994, 100% filled
[0—⎻⎺‾⎺⎻—x—⎼⎽_⎽⎼—]
```

Symbols: `0` true zero, `x` zero crossing, `E` outside [-1, 1], `I` infinity, `N` NaN, `S` subnormal. Main functions: `melatonin::sparkline(block, collapse, normalize)`, which returns a `juce::String` (line 145), `printSparkline(...)`, which goes through `DBG` (lines 164-178), `printSamples(...)`, `blockToString` and `vectorToString` (lines 243-277), which produce a `0.1f, 0.2f, …` list that can be pasted into a test. The `sparklines.py` file adds a hover summary in lldb (Xcode, CLion).

**Integration.** `git submodule add -b main … modules/melatonin_audio_sparklines`, then `juce_add_module(modules/melatonin_audio_sparklines)` and a link on `SharedCode` (or only on `PluginTests` and `MyPluginTools`).

**For us.**

* The module includes `<juce_dsp/juce_dsp.h>` (line 16) and handles `juce::String`. **It cannot be used in `tests/dsp/`**, which must compile without JUCE (`.claude/rules/testing.md`, `docs/03_ARCHITECTURE.md`). This contradicts `docs/04_TESTS.md:27`.
* In `tests/plugin/`, use `sparkline()` inside a Catch2 `INFO(...)` or `CAPTURE`, not `printSparkline`: `DBG` writes nothing in Release, whereas the `INFO` message is shown on failure whatever the mode.
* In `tools check`, show the sparkline of a faulty render: this is exactly the "an agent cannot listen" case.
* For `tests/dsp/`, three options to decide between: (a) settle for the values (`blockToString` does not exist without JUCE, but Catch2 already shows the compared values); (b) a small `DspTestDiagnostics` target linked to `juce_dsp`, only for display, which relaxes the "DSP tests without JUCE" rule; (c) a few dozen lines of our own that produce the same sparkline from a `std::span<const float>`. Option (a) is the only one that requires neither code nor an exception to a rule.
* Never call it on the audio thread: the README says so (string allocations and `DBG`).

## melatonin_perfetto

**What it does.** Integrates the [Perfetto](https://perfetto.dev) tracing SDK into JUCE. You add `TRACE_DSP()` at the top of `processBlock` and `TRACE_COMPONENT()` at the top of `paint`, a `MelatoninPerfetto tracingSession` member in the processor, and when the application closes cleanly a `.pftrace` file is written (Desktop on Windows, Downloads on macOS, `/tmp` on Linux), to be opened in ui.perfetto.dev. Module version 1.4.0, C++17 minimum, macOS 10.14 minimum (the reason cmake-includes moved to 10.14, CHANGELOG of 2026-01-03).

**Licence, in detail.** The repository has **no LICENSE file** (full file list checked). The only declaration is the `license: MIT` field of the JUCE module declaration (`melatonin_perfetto/melatonin_perfetto.h:9`). The CMake downloads Perfetto through `CPMAddPackage(gh:google/perfetto@53.0)` (`CMakeLists.txt:30`) and compiles `sdk/perfetto.cc` as a static library (`:33-44`); Perfetto is under Apache 2.0.

**Integration.**

```cmake
add_subdirectory (modules/melatonin_perfetto)
target_link_libraries (SharedCode INTERFACE Melatonin::Perfetto)
```

then `cmake -B Builds -D PERFETTO=ON` to enable it; with `PERFETTO=0` (the default, `melatonin_perfetto.h:21`) the macros disappear at compile time.

**For us.**

* Even with `PERFETTO=OFF`, the `add_subdirectory` downloads Perfetto and the `perfetto` library is linked unconditionally (`CMakeLists.txt:98`): configure and build time for nothing. Add it only behind an option of our own (`if (MYPLUGIN_PERFETTO)`), not in the skeleton.
* It is a tool for humans (you look at a trace) and for one-off diagnosis. The measurement that counts in CI remains `tools bench` and the budget (`docs/04_TESTS.md`).
* Never combine `PERFETTO=ON` with the RealtimeSanitizer job: tracing on the audio thread is not guaranteed to be free of system calls and locks, and RTSan would report it. Also disable Perfetto in every shipped build.
* Useful in phase 4 (performance) to see where a block's time goes, especially if the UI and the audio compete for the CPU.

## melatonin_blur

**What it does.** Drop shadows and inner shadows on `juce::Path` objects (filled or stroked) and on text, ARGB image blurs, with a multi-layer cache and awareness of the display scale (Retina). Rendering faithful to Figma and CSS. Acceleration through Accelerate (vImage) on macOS, optional IPP or Direct2D on Windows (option `MELATONIN_BLUR_USE_DIRECT2D`, on by default on Windows, `CMakeLists.txt:10-16`), fallback to `FloatVectorOperations` and to Gin's Stack Blur. Module version 1.4.0, depends on `juce_graphics`, `juce_gui_basics`, `juce_audio_basics`.

**Licence, in detail.** MIT for the module, but `melatonin/implementations/gin.h` is a file taken from Gin under **BSD 3-clause** (Copyright 2018 Roland Rabien): its notice must appear in the documentation shipped with the binary, in addition to the MIT notice.

**Integration.** Submodule in `modules/`, `add_subdirectory` before `juce_add_plugin`, link `melatonin_blur` on `SharedCode`. Usage documentation on melatonin.dev (the README points there).

**For us.** Purely visual comfort. The "sound comes before UI" rule (`.claude/rules/scope.md`, rule 7) pushes it past the DSP gate, and only if the design document asks for shadows or blurs. To be noted in `FUTURE.md` rather than integrated.

## clap-juce-extensions

**What it does.** An unofficial wrapper that produces a CLAP plugin from a JUCE `AudioProcessor`, without changing the plugin code. CMake function `clap_juce_extensions_plugin(TARGET … CLAP_ID … CLAP_FEATURES …)` (`cmake/ClapTargetHelpers.cmake:192`), which creates the `<Project>_CLAP` target. Notable options: `CLAP_PROCESS_EVENTS_RESOLUTION_SAMPLES` (sample-accurate automation by splitting the block, 0 by default), `CLAP_ALWAYS_SPLIT_BLOCK`, `CLAP_USE_JUCE_PARAMETER_RANGES`, `CLAP_CHECKING_LEVEL`. CLAP parameter IDs are derived with the same hash as JUCE's VST3 wrapper, and the state passes as is through `getStateInformation` / `setStateInformation` (README, "Risks" section).

**Native JUCE?** The JUCE pinned by Pamplejuce (develop, `project(JUCE VERSION 9.0.1)`) contains no occurrence of CLAP in `extras/Build/CMake/JUCEUtils.cmake`: no native CLAP format at that commit. The wrapper is therefore still needed for anyone who wants CLAP.

**Integration.** Already done by Pamplejuce: `add_subdirectory(modules/clap-juce-extensions EXCLUDE_FROM_ALL)` (`pamplejuce/CMakeLists.txt:61`) and the call to `clap_juce_extensions_plugin` (`:102-104`). The workflow signs and packages the `.clap`, and the Windows installer installs it into `Common Files\CLAP`.

**For us.**

* Our format decision is VST3 only (ADR 0003). Keeping CLAP would be a silent scope extension, and a format shipped **without validation**: pluginval only tests the VST3 in Pamplejuce's CI. Remove it for v1 (list of lines in `pamplejuce.md`, step 2), and record it in `FUTURE.md`.
* A point to keep in mind for later: `CLAP_PROCESS_EVENTS_RESOLUTION_SAMPLES` gives in CLAP the sample-accurate automation that JUCE's VST3 wrapper does not give (the TetraDrive patch question, `docs/02_TOOLCHAIN.md:49`).
* If it comes back, add a CLAP validator in CI alongside pluginval.

## Gaps with our documents

* `docs/07_REUSE.md:86, 87, 96, 98` mark inspector, blur, clap-juce-extensions and perfetto as "MIT *to be checked*". Checked: MIT for all four, with two caveats. melatonin_perfetto has no LICENSE file (MIT declared in the header only) and bundles Perfetto under Apache 2.0; melatonin_blur contains a BSD 3-clause file from Gin.
* `docs/04_TESTS.md:27` recommends melatonin_audio_sparklines for DSP test failures, whereas the module requires `juce_dsp` and those tests must run without JUCE.
* `docs/07_REUSE.md:96` presents clap-juce-extensions as "already in Pamplejuce" as if settled; that is true, but CLAP is not among our decided formats and is not validated in CI.
