# Reference projects

Analysed on 2026-11-02, first from their READMEs, then by reading the code. The table below was corrected after reading the code; the detailed study is in [`references/drum-foundry.md`](references/drum-foundry.md) and [`references/tetradrive.md`](references/tetradrive.md). Key point: **only TetraDrive tests its DSP without JUCE.** That is the first thing to copy.

## The two starting projects

| | [Drum Foundry](https://github.com/donjmilligan/drum-foundary) | [TetraDrive](https://github.com/dadda123/TetraDrive) |
| --- | --- | --- |
| Type | Instrument: layered kick and snare synth, curves drawn on the waveform | Effect: 4-band multiband distortion, emulation of a 2000s unit |
| JUCE | 8.0.15 in `libs/JUCE`, downloaded by CMake if the folder is empty | 9.0.4 vendored in `external/JUCE`, with a VST3 patch |
| Build | CMake + Ninja, `DRUMFOUNDRY_BUILD_TOOLS` option | CMake, Visual Studio or Xcode generators |
| Formats | VST3, AU, Standalone (macOS); VST3, Standalone (Windows) | VST3 (Windows); VST3, AU (macOS) |
| DSP separated from JUCE | No: 33 of the 37 files in `src/dsp` use JUCE | Yes: `src/` compiles without JUCE |
| Tests | `DrumFoundryTools check` binary (NaN, state round trip, block size, undo, clipper), no ctest | Headless `tests/`, enabled by `-DTD_BUILD_TESTS=ON`, no JUCE dependency |
| Validation | pluginval strictness 10 and `auval` as **manual** commands (README), not in CI | None |
| Versioning | Version in `CMakeLists.txt`; CI fails if the README does not match | Version read from the first heading of `CHANGELOG.md` |
| CI / release | GitHub Actions: a `vX.Y.Z` tag builds installers and the release; no tests, no pluginval, no `tools check`, no Linux | **No CI** |
| Licence | AGPL v3 + NOTICE | AGPL v3 |

### To take from Drum Foundry

1. **A dev tools binary that runs the real engine without a DAW.** Subcommands `render` (WAV + spectrogram PNG per preset), `check` (battery of checks), `bench` (real-time CPU cost), `snapshot` (screenshot of the editor). This is exactly what an agent needs to verify its work.
2. **A parameter snapshot per block.** `DrumParams` is a plain copy the DSP reads at each block; the DSP never reads the JUCE parameter tree directly.
3. **Zero blocking on the audio thread.** Envelope edits go through a `try_lock` (audio never waits); samples are decoded in the background then delivered without blocking; the "Natural" reverb rebuilds its impulse response on a background thread then crossfades.
4. **Fixed and declared latency**, identical whatever the order of the effects chain or the output mode.
5. **Processing in fixed packets of 32 samples**, but only in the Cloud reverb (internal FIFO). The LFOs start at the beginning of each host block and therefore still depend on the block size; their test routes no LFO.
6. **Click-free chain reordering**: 10 ms fade out, silence, module reset, 10 ms fade in.
7. **Undo by user gesture**: automation and session recall by the host do not create an undo step, they move the baseline.
8. **A code map in the README**: a path → role table. Very useful for an agent discovering the repo.
9. **DSP sources cited** (Giannoulis, Massberg and Reiss, JAES 2012 for the compressors; RBJ cookbook; Vicanek filters) and a statement that no third-party code was copied.
10. **Documented vendored code**: `libs/CloudSeedCore/PATCHES.md` lists the applied patches (deterministic modulation, no allocation on parameter change).

### To take from TetraDrive

1. **Physical separation of `src/` (pure DSP) and `Source/` (JUCE + UI).** The engine compiles and is tested without JUCE.
2. **The JUCE patch for sample-accurate automation in VST3**: by default JUCE's VST3 wrapper only passes the last automation value per block. The patch is versioned in `patches/` and reapplied at each JUCE update.
3. **Oversampling only around the non-linearities** (the waveshapers), with cascaded polyphase half-band filters; the crossover filters stay at the host rate. Latency computed (47, 55, 58 samples for 2x, 4x, 8x) and reported to the host.
4. **Parameter invariants**: the crossovers stay ordered with at least 1/12 octave between them, automation cannot swap the bands.
5. **Explicit session compatibility**: sessions from before 1.1.0 reload in Classic mode, oversampling off. Each new parameter has a fallback value for old states.
6. **What is not in presets is listed** (Solo, Bypass, Oversampling).
7. **CHANGELOG as the single source of the version**, shown in the binary, the VST3/AU metadata and the About page.

## Recommended template

[**Pamplejuce**](https://github.com/sudara/pamplejuce) (MIT, about 750 stars). As of 2026-11-02 it provides:

* C++23, JUCE 9.x as a submodule (develop branch), CPM, CMake ≥ 3.25;
* Catch2 v3.8.1, a `Tests` target and a `Benchmarks` target;
* GitHub Actions: build and tests on Linux, macOS, Windows, pluginval 1.x, macOS signing and notarisation, Windows signing via Azure Trusted Signing;
* `.clang-format`, a cross-platform `.gitignore`, a `VERSION` file propagated into JUCE;
* melatonin_inspector to debug the UI;
* a `CLAUDE.md` / `AGENTS.md` with an initial setup assistant.

Documentation: [melatonin.dev/manuals/pamplejuce](https://melatonin.dev/manuals/pamplejuce).

## Other projects to read

All studied in the code on 2026-11-02; licences checked in the files. Details are in the linked note.

| Project | What | Licence checked | Verdict | Note |
| --- | --- | --- | --- | --- |
| [Surge XT](https://github.com/surge-synthesizer/surge) and the sst libraries | Hybrid synth, very active | Surge GPL v3; sst-cpputils, sst-plugininfra, sst-jucegui MIT; sst-filters, waveshapers, effects GPL v3 | The sst libraries are the best source of plug-in-ready DSP. Surge itself locks a mutex in `process()` | [surge-and-sst](references/surge-and-sst.md) |
| [Vital](https://github.com/mtytel/vital) | Wavetable synth | GPL v3 or later, protected names | Frozen since April 2022 (JUCE 6, Projucer, no CI). About fifteen ideas, little reusable code | [vital](references/vital.md) |
| [chowdsp_utils](https://github.com/Chowdhury-DSP/chowdsp_utils) | JUCE modules | BSD 3 or GPL v3 depending on the module | Useful state and preset modules, but two of them pull in a GPL file | [chowdsp-utils](references/chowdsp-utils.md) |
| [Gin](https://github.com/FigBug/Gin) | JUCE modules (plugin, DSP, UI) | BSD 3 | Modulation matrix to make real-time safe before use | [gin](references/gin.md) |
| [BYOD](https://github.com/Chowdhury-DSP/BYOD) | Modular distortion, 69 processors | GPL v3; dependencies chowdsp_wdf, RTNeural, math_approx under BSD 3 | Its BSD dependencies and its forwarding parameters are worth more than the plugin | [byod-and-valentine](references/byod-and-valentine.md) |
| [valentine](https://github.com/tote-bag-labs/valentine) | Compressor | GPL v3 | Good CI (pluginval 10 on 3 OSes), DSP tied to JUCE, tests nearly empty | same |
| [Dexed](https://github.com/asb2m10/dexed) | DX7 emulation | GPL v3, **`msfa/` engine under Apache 2.0** | The FM engine is reusable even in a closed plugin | [dexed-obxd-odin2](references/dexed-obxd-odin2.md) |
| [OB-Xf](https://github.com/surge-synthesizer/OB-Xf) (fork of OB-Xd) | Virtual analogue | GPL v3+ | **OB-Xd is no longer open source** (source removed in February 2026). OB-Xf is active, 131 Catch2 tests in CI | same |
| [Odin 2](https://github.com/TheWaveWarden/odin2) | Semi-modular synth | GPL v3 | JUCE 6, no tests, allocates on the audio thread: ideas only | same |
| [mda-plugins-juce](https://github.com/hollance/mda-plugins-juce) | 24 MDA plugins rewritten | **MIT** | DSP almost free of JUCE, easy to extract. No smoothing and no declared latency | [mda-and-frequalizer](references/mda-and-frequalizer.md) |
| [Frequalizer](https://github.com/ffAudio/Frequalizer) | EQ with analyser | BSD 3 (logos excluded) | Does not compile on JUCE 9, abandoned in 2022. Take the foleys_gui_magic analyser instead | same |

Full list, kept up to date: [awesome-juce](https://github.com/sudara/awesome-juce).

## Tools and modules

| Tool | Role |
| --- | --- |
| [pluginval](https://github.com/Tracktion/pluginval) | Validates the binary like a host: loading, states, automation, block sizes. Level 10 = the strictest |
| [melatonin_inspector](https://github.com/sudara/melatonin_inspector) | Inspects and edits the JUCE UI live |
| [melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) | Shows an audio buffer as ASCII in the console and in tests; depends on `juce_dsp`, so only in the `plugin/` tests |
| [melatonin_perfetto](https://github.com/sudara/melatonin_perfetto) | Profiling the audio thread with Perfetto |
| [DSP-Testbench](https://github.com/AndrewJJ/DSP-Testbench) | DSP test bench: sources, routing, analysis |
| [juce-plugin-ci](https://github.com/maxwellpollack/juce-plugin-ci) | GitHub Actions CI lighter than Pamplejuce |

## Reading

* [How to use CMake with JUCE](https://melatonin.dev/blog/how-to-use-cmake-with-juce/), Sudara.
* [Real-time audio programming 101: time waits for nothing](http://www.rossbencina.com/code/real-time-audio-programming-101-time-waits-for-nothing), Ross Bencina. The reference on audio thread rules.
* [Wait-free programming from scratch](https://jatinchowdhury18.medium.com/wait-free-programming-from-scratch-5ac6a65c23c4), Jatin Chowdhury.
* Timur Doumler, CppCon/ADC talks on real-time C++ and the Read Copy Update pattern.
* [Audio EQ Cookbook](https://www.w3.org/TR/audio-eq-cookbook/), Robert Bristow Johnson.
