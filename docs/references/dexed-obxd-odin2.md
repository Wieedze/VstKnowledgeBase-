# Dexed, OB-Xd (OB-Xf) and Odin 2

Study done on 2026-11-02 on shallow clones (`--depth 1`, without submodules) in `/home/claude/study/`. The `file:line` paths are relative to the root of each repository and are valid for the commit given. Context: VST3 only playbook, C++23, JUCE 9, CMake; the licence of our plugins is not decided yet (see `docs/07_REUSE.md`, "The question that decides everything").

| Project | Commit studied | Link |
| --- | --- | --- |
| Dexed | `fea2f0f` | [asb2m10/dexed@fea2f0f](https://github.com/asb2m10/dexed/tree/fea2f0f0f2c397799f59b27eb11c038cd34b22c5) |
| OB-Xd (discoDSP) | `0c7c737` (README only); last source `f1fcdd5` | [reales/OB-Xd@f1fcdd5](https://github.com/reales/OB-Xd/tree/f1fcdd51eabcb7855cdd90818611cd7e357c359c) |
| OB-Xf (Surge Synth Team fork) | `102bb38` | [surge-synthesizer/OB-Xf@102bb38](https://github.com/surge-synthesizer/OB-Xf/tree/102bb389eeea25f868c656e07aaed1c135087cb7) |
| Odin 2 | `265e9e2` | [TheWaveWarden/odin2@265e9e2](https://github.com/TheWaveWarden/odin2/tree/265e9e227581357efb87ed7217381f8a40c5e2bf) |

## Summary

| Project | Licence | Engine without JUCE | Build | Tests | Last commit | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Dexed | GPL v3; `source/msfa/` folder under **Apache 2.0** (except `tuning.*`, without a header) | Almost: `msfa/` is standard C++, apart from three couplings (logger, MTS-ESP, `tuning.cc` which includes JUCE) | CMake (a `Dexed.jucer` remains), JUCE 8.0.11 | None | 2026-10-14 | **The best gain of the study**: the DX7 FM engine `msfa` is Apache 2.0, so usable with a closed plugin **and** with an AGPL plugin. DX7 SysEx reading under GPL: rewrite it, or take it only if AGPL |
| OB-Xd | GPL v3 (source 2.10 only); images CC BY-SA 2.0 | No (`Engine/` headers tied to JUCE) | Projucer, JUCE 7 | None | 2026-08-18 (README); source removed on 2026-02-18 | **Do not study**: the source was removed from `HEAD`, the product became binary only. Take OB-Xf |
| OB-Xf | GPL v3 or later, all files | Almost: header based engine, JUCE used for `Random`, `jlimit`, `String`, `FastMathApproximations`; SIMD through simde and sst-basic-blocks (GPL) | CMake, JUCE 8.0.12 (pinned `develop` commit), C++20 | 131 Catch2 `TEST_CASE`, including reference renders; run in Linux CI | 2026-11-01 | **Most active fork, best engineering of the three.** OB-X/Xpander ZDF filter, BLEP oscillators, decimator, ADSR reusable **only if AGPL**. Otherwise an excellent source of ideas |
| Odin 2 | GPL v3; Aldrich font under OFL 1.1 | No: all of `Source/audio/` includes `JuceHeader.h` through `GlobalIncludes.h` | CMake, JUCE 6.1.6 | None | 2025-05-30 | **A catalogue of ideas, no code to extract**: many filters and effects, but JUCE 6, strong coupling, allocations on the audio thread, no commit for 17 months |

Reading rule: "if AGPL" means the row is usable only if the plugin's ADR 0001 chooses AGPL v3. Apache 2.0 is compatible with GPL v3 and AGPL v3 (in that direction only) and with a closed plugin, provided the headers, the licence text and any `NOTICE` are kept, and modified files are flagged.

## 1. Dexed

**Verdict: we take the `msfa` engine (Apache 2.0) as is into `dsp/`, after cutting three dependencies; the rest of Dexed (processor, SysEx cartridges, filter, UI) is GPL v3 and serves as an example or an idea, unless the plugin is AGPL.**

### 1.1 Licences

| Folder or file | Licence read in the file | Remark |
| --- | --- | --- |
| [`LICENSE`](https://github.com/asb2m10/dexed/blob/fea2f0f0f2c397799f59b27eb11c038cd34b22c5/LICENSE) | GPL v3 | Default licence of the repository |
| `README.md:16-17` | | "The msfa component [...] stays on the Apache 2.0 license to be able to collaborate between projects" |
| `source/msfa/*.h`, `*.cc`, `porta.cpp` (24 files) | **Apache 2.0** (header of each file), Copyright Google 2012-2013, Pascal Gauthier 2016-2025, Jean Pierre Cimalando 2019 | Pascal Gauthier's recent changes keep the Apache header, for example `source/msfa/dx7note.cc:1-15` |
| `source/msfa/tuning.h`, `tuning.cc` | **no header**, so the repository's GPL v3 | `tuning.cc:11` includes `juce_gui_basics` |
| `source/engine/EngineMkI.h` | Apache 2.0 | |
| `source/engine/EngineMkI.cpp`, `EngineOpl.h`, `EngineOpl.cpp` | GPL v3 or later | `EngineOpl.cpp:22` cites "carbon14 and opl3" |
| `source/PluginFx.h`, `PluginFx.cpp` | GPL v3 or later | `PluginFx.cpp:6-7`: "Filter taken from the Obxd project" |
| `source/core/`, `parameter/`, `midi/`, `ui/`, `util/` | no header, so GPL v3 | |
| Submodules (not cloned): `tuning-library` (Surge), `MTS-ESP`, `surgesynthteam_tuningui`, `clap-juce-extensions`, `JUCE` | *to verify* in each submodule | tuning-library is announced as MIT by Surge; MTS-ESP to verify |

### 1.2 Architecture

| Item | What Dexed does | Where |
| --- | --- | --- |
| Engine / JUCE separation | `msfa/` does not include JUCE, except `tuning.cc`. But `controllers.h:21` and `env.cc:23` include `../debugger/Logger.h` (GPL, tied to JUCE), and `dx7note.h:32` includes `libMTSClient.h` | `source/msfa/` |
| Voices | 16 fixed voices (`MAX_ACTIVE_NOTES`), one `Dx7Note*` per voice | `source/PluginProcessor.h:76-77` |
| Operators and algorithms | 6 operators, table of the DX7's 32 algorithms | `source/msfa/fm_core.cc:29`, rendering `fm_core.cc:93` |
| Computing a note | `Dx7Note::init` from the patch's 156 bytes, `Dx7Note::compute` per chunk | `source/msfa/dx7note.cc:163`, `:222` |
| Arithmetic | 32-bit integers, sine and exponential tables, faithful emulation of the DX7's envelope steps and LFO | `msfa/sin.*`, `exp2.*`, `env.*`, `lfo.*`, `pitchenv.*` |
| Fixed chunks | The engine works in chunks of `N = 64` samples (`LG_N = 6`); the remainder of a chunk is kept in `extra_buf` for the next block | `source/msfa/synth.h:29-30`, `source/PluginProcessor.cpp:228-268` |
| Anti aliasing | None, on purpose: it is the DX7's character | |
| Three engines | "Modern" (msfa), "Mark I" (`EngineMkI`), "OPL" (`EngineOpl`), chosen through the `controllers.core` pointer | `source/PluginProcessor.cpp:478-493` |
| Output filter | Ported OB-Xd 4-pole filter (GPL) | `source/PluginFx.cpp:159` |
| Output | Mono, copied to the right channel | `source/PluginProcessor.cpp:291-293` |
| UI to audio commands | `CommandFifo`: type erased commands built on the UI thread, executed by the audio thread through `AbstractFifo` | `source/util/CommandFifo.h`, call `PluginProcessor.cpp:198` |

Points contrary to `.claude/rules/realtime-audio.md` and `dsp.md`, not to be reproduced:

1. Global state: `Freqlut::init`, `Lfo::init`, `Env::init_sr`, `Porta::init_sr` are static and reinitialised by `prepareToPlay` (`PluginProcessor.cpp:137-141`, `msfa/env.h:52,61`, `msfa/lfo.h:21,34-35`). Two instances at different sample rates disturb each other. In `dsp/`, these tables become members of an object with `prepare(sampleRate, maxBlockSize)`.
2. `prepareToPlay` does `new Dx7Note` for each voice without freeing the old one (`PluginProcessor.cpp:147`): a leak if the host calls `prepareToPlay` again without `releaseResources`.
3. `std::vector<MidiMessage> outputMidiMessageQueue` emptied in `processBlock` (`PluginProcessor.h:233`, `PluginProcessor.cpp:296-300`).

### 1.3 Presets

| Topic | Detail | Where |
| --- | --- | --- |
| Format | 32-voice DX7 SysEx cartridges: 4104 bytes, header `F0 43 00 09 20 00`, checksum, voice packed into 128 bytes, unpacked into 155 | `source/core/Cartridge.h:7-8`, `Cartridge.cpp:30` (`load`), `:137` (`unpackProgram`), `:194` (`packProgram`) |
| Robustness | `load` returns 1 if the checksum is wrong, 2 if no SysEx data is found; `normparm` clamps each parameter | `Cartridge.h:53-58`, `Cartridge.cpp:21` |
| Format documentation | `doc/sysex-format.txt`, `doc/TX802-SYSEX.pdf` | `doc/` |
| Library | `.syx` cartridges in a user folder, factory cartridges in `assets/builtin_pgm.zip` (BinaryData), `CartManager` browser | `source/PluginData.cpp:62-80`, `source/ui/window/CartManager.cpp` |
| Session state | Version written (`IDs::version`, `DexedApvts::MODEL_VERSION`), loader for the old 1.0 format | `source/parameter/State.cpp:6-57`, `StateLegacy.h` |
| Realtime SysEx | Receiving and sending patches to a real DX7 | `source/midi/SysexComm.cpp` |

### 1.4 Build, tests, CI

| Topic | State |
| --- | --- |
| Build | CMake 3.16 minimum, JUCE as a submodule (`libs/JUCE` pinned on tag **8.0.11**), C++ standard not set (C++17 by JUCE default). Formats VST3, AU, Standalone, CLAP |
| Tests | None |
| CI | GitHub Actions `project-pipeline.yml`: build and installers for Linux, Windows, macOS. No tests, no pluginval |
| Last commit | 2026-10-14 (`fea2f0f`); version 1.1.0 in progress |

### 1.5 What we can extract

| What | Licence | Layer on our side | Effort |
| --- | --- | --- | --- |
| `source/msfa/` except `tuning.*`: `dx7note`, `fm_core`, `fm_op_kernel`, `env`, `pitchenv`, `lfo`, `porta`, `sin`, `exp2`, `freqlut`, `controllers`, `synth.h`, `aligned_buf.h`, `module.h` | Apache 2.0 | `dsp/` | Medium, about two days: replace `Logger.h` with an empty header, replace `TuningState` with a small interface of our own, remove MTS-ESP or hide it behind that interface, turn the static tables into members, write the non regression tests (renders of a known patch) before touching the code |
| `source/engine/EngineMkI.*` ("Mark I" variant) | `.h` Apache, `.cpp` GPL v3 | `dsp/` | Low, but **only if AGPL** because of the `.cpp` |
| `source/core/Cartridge.*`, `Program.*` (SysEx reading and writing) | GPL v3 | `plugin/` | Low if AGPL. Otherwise, rewrite from `doc/sysex-format.txt` (the format is a fact, not code): about 200 lines, with TDD using real cartridges |
| `source/util/CommandFifo.h` | GPL v3 | `plugin/` | Idea only: `farbot::fifo` or `AbstractFifo` do the same thing |
| `source/PluginFx.*` | GPL v3 | `dsp/` | Do not take: the maintained version of this filter is in OB-Xf |

## 2. OB-Xd and OB-Xf

**Verdict: discoDSP's OB-Xd is no longer open source (source removed from `HEAD` on 2026-02-18, last version published as source: 2.10 from 2022). The Surge Synth Team's OB-Xf fork is the only living one and the best tooled of the three projects, but it is GPL v3 or later from end to end: its code is reusable only if the plugin is AGPL.**

### 2.1 OB-Xd (reales/OB-Xd)

| Topic | State |
| --- | --- |
| History | 7 commits. `f1fcdd5` (2022-12-19) "2.10 release"; `73cea60` (2026-02-18) "Clean up" removes all the source; since then, only `README.md` changes |
| Licence | `LICENSE` GPL v3 in `f1fcdd5`. The current README: "Versions up to 2.11 are available under GPL v3", images in `Source/Images` under CC BY-SA 2.0, other resources "All rights reserved" |
| Build | Projucer (`OB-Xd.jucer`), README: JUCE 7.0.3; contains patched JUCE files in `Modules/` |
| Engine | `Source/Engine/*.h` (`SynthEngine`, `Motherboard`, `ObxdVoice`, `Filter`, `BlepData`, `Decimator`), 8 voices |

We do not study it further: OB-Xf starts from the same base (2.11) with years of fixes.

### 2.2 OB-Xf: licences

| Folder | Licence | Where |
| --- | --- | --- |
| All of `src/` | GPL v3 or later (identical header in each file, "successor to OB-Xd version 2.11", Copyright 2013-2025 original authors and contributors) | for example `src/engine/Filter.h:1-17` |
| `LICENSE` | GPL v3 | root |
| `assets/` | not stated, so the repository's GPL v3; *to verify* for the images and the two `.ttf` fonts | `assets/installer/` |
| Submodules (not cloned) | `sst-basic-blocks` (GPL v3 except three MIT files, see `07_REUSE.md`), `sst-cpputils`, `sst-plugininfra`, `simde` (MIT), `fmt` (MIT), `melatonin_inspector`, `MTS-ESP`, `pybind11`, `clap-juce-extensions` | `.gitmodules` |

### 2.3 OB-Xf: architecture

| Item | What OB-Xf does | Where |
| --- | --- | --- |
| Engine / JUCE separation | Engine entirely in headers in `src/engine/`. JUCE remains there for a few things: `juce::Random` (`Lfo.h:52`, `Voice.h:200-204`), `jlimit` (`OscillatorBlock.h:185`), `FastMathApproximations::sin` (`Lfo.h:206`), `juce::String` (`Program.h:78`, `MidiMap.h`), constants (`core/Constants.h:82-87`) | `src/engine/` |
| Voices | 32 voices (`MAX_VOICES`), unison up to 8 (`MAX_PANNINGS`), voice queue and voice stealing by age | `src/configuration.h:26,31`, `src/engine/VoiceQueue.h:25`, `src/engine/Motherboard.h:555` |
| SIMD | Four voices per register (`OscillatorQuad`, `AdsrEnvelopeQuad`, `VoiceControlQuad`, `VoiceFinishQuad`) through simde and `sst/basic-blocks/simd/setup.h` | `src/engine/SimdMath.h:25-30`, `src/engine/VoiceFinishQuad.h:42` |
| Oscillators | Saw, pulse, triangle, white, pink and red noise; anti aliasing with a tabulated **BLEP** (16 samples, 64 phases, table transposed for sequential reading) | `src/engine/BlepData.h:22-30`, `SawOsc.h:45,107`, `Noise.h:101-118` |
| Oversampling | Optional ×2 HQ mode, decimation by `Decimator17` (17 coefficients) | `src/engine/Motherboard.h:737-758,769`, `Decimator.h:25` |
| Filter | 2-pole multimode (LP, mixed BP, HP, "push") and 4-pole with 15 Xpander modes by mixing the pole outputs. Feedback solved without delay (ZDF/TPT), diode pair non linearity approximated by Taylor, `atan` saturation in the first pole | `src/engine/Filter.h:117-216` |
| Envelopes | ADSR with adjustable attack curve, scalar version and SIMD version | `src/engine/AdsrEnvelope.h:22`, `AdsrEnvelopeQuad.h` |
| Modulation | Global LFO and vibrato syncable to tempo, 8-row matrix (MPE sources: strike, lift, press, slide, glide), sources serialised by name and not by integer | `src/configuration.h:39`, `src/engine/VoiceMatrix.h:79-120`, `src/engine/Lfo.h` |
| Analogue "slop" | Random per voice drift (level, envelopes, cutoff, portamento) | `src/engine/Voice.h:200-204` |
| MIDI | Block split at each MIDI event (sample accurate rendering) | `src/ObxfProcessor.cpp:176-195` |
| Parameters | Metadata `sst::basic_blocks::params::ParamMetaData`, FIFO of parameter changes, custom attachments | `src/parameter/` |

Points contrary to our realtime rules, not to be reproduced:

1. `ParameterUpdateHandler::updateParameters` is called at the top of `processBlock` (`src/ObxfProcessor.cpp:89`) and takes a `std::mutex`, then looks up a `std::unordered_map<juce::String, ...>` from a `char*`, which builds a `juce::String` (allocation) on the audio thread: `src/parameter/ParameterUpdateHandler.cpp:157-159`, `ParameterUpdateHandler.h:112`.
2. `juce::Random::getSystemRandom()`: global non seedable generator (`Voice.h:200-204`), contrary to the `dsp.md` rule "no `rand()`, seedable generator".
3. `tan` and `atan` evaluated on every sample in the filter (`Filter.h:146,187,198`): correct but expensive; a table or an approximation is measured with `tools bench`.

### 2.4 OB-Xf: presets

| Topic | Detail | Where |
| --- | --- | --- |
| Format | One `.fxp` file per patch (VST2 `CcnK` container) carrying XML: values by parameter ID, name, author, licence, category, project, matrix rows | `src/state/StateManager.cpp:61-81,93-107` |
| Factory | 493 `.fxp` sorted by category (Atmospheres, Basses, Bells...) | `assets/installer/Surge Synth Team/OB-Xf/Patches/` |
| OB-Xd import | OB-Xd `.fxb` banks and `.fxp` patches converted, with documented compensation of OB-Xd's octave offset | `src/state/ObxdImporter.h:37-72`, `README.md` section "Compatibility with OB-Xd", test `src/tests/obxd_import.cpp` |
| Session state | XML with `ob-xf_version`, separate `program` and `dawExtraState` elements | `src/state/StateManager.cpp:31-49,188-221` |
| Browser | Patch tree, loading by file | `src/Utils.h:244-247` |

### 2.5 OB-Xf: build, tests, CI

| Topic | State |
| --- | --- |
| Build | CMake 3.15 minimum, C++20 (`CMakeLists.txt:22`), JUCE as a submodule pinned on a `develop` commit of 2026-09-02 that declares **8.0.12**. Formats VST3, AU, LV2, CLAP, Standalone, AUv3 (iOS in progress) |
| Tests | `obxf-tests` target (Catch2, JUCE console app), 131 `TEST_CASE`: oscillators, filter (bounds, finite output, reset, reference renders), envelopes (bounds, durations), noise, MPE, tuning, whole engine, OB-Xd import. Explicit tolerances (`Approx(...).margin(...)`, `src/tests/filt.cpp:289`). Whole engine reference renders regenerable through an environment variable (`src/tests/engine.cpp:20-28`) |
| CI | GitHub Actions: Windows build (MSVC, clang-cl, ARM64, ARM64EC), macOS, Linux (gcc 12, 13, 14, ARM), tests on Linux, clang-format check. No pluginval |
| Last commit | 2026-11-01 (`102bb38`) |

Note on the tests: the filter reference values are frozen outputs of the implementation. This is non regression testing, useful, but it does not prove correctness (`testing.md` rule "no test that reproduces the implementation").

### 2.6 OB-Xf: what we can extract (if AGPL)

| What | Layer on our side | Effort |
| --- | --- | --- |
| `src/engine/Filter.h` (2-pole, 4-pole, Xpander modes) with its tests `src/tests/filt.cpp` | `dsp/` | Low: self contained header, replace the JUCE constants of `core/Constants.h` with `std::numbers` |
| `src/engine/BlepData.h`, `SawOsc.h`, `PulseOsc.h`, `TriangleOsc.h` with `src/tests/osc.cpp` | `dsp/` | Low |
| `src/engine/Decimator.h` (`Decimator17`, `Decimator9`) | `dsp/` | Very low; but JUCE `dsp::Oversampling` or HIIR are often enough |
| `src/engine/AdsrEnvelope.h` with `src/tests/env.cpp` | `dsp/` | Low |
| `src/engine/Noise.h` (white, pink, red) | `dsp/` | Very low; replace the random source with a seedable generator |
| `src/engine/DelayLine.h` | `dsp/` | Very low |
| Whole engine (`Motherboard`, `Voice`, `*Quad`) | `dsp/` | High: SIMD tied to sst-basic-blocks and simde, `juce::String` in `Program`, matrix tied to parameter IDs. Only worth considering for a complete OB-X clone |
| `src/state/ObxdImporter.*` | `plugin/` | Medium; only if we want to read OB-Xd banks |

## 3. Odin 2

**Verdict: many modules (eight oscillator types, seven filter families, seven effects), but all the DSP depends on `JuceHeader.h`, the project is on JUCE 6.1.6, has no tests and has not received a commit since 2025-05-30. We use it as a catalogue of ideas and bibliographic references, not as a source of code.**

### 3.1 Licences

| Folder or file | Licence | Remark |
| --- | --- | --- |
| [`LICENSE`](https://github.com/TheWaveWarden/odin2/blob/265e9e227581357efb87ed7217381f8a40c5e2bf/LICENSE) | GPL v3, except the font | `LICENSE:1`: the font `assets/font/Aldrich-Regular.ttf` is under SIL OFL 1.1 (`assets/font/OFL.txt`) |
| `Source/audio/**` | GPL v3 or later (TheWaveWarden 2020-2021 header) | |
| `Source/audio/Filters/LadderFilter.*`, `DiodeFilter.*`, `Korg35Filter.*`, `VAOnePoleFilter.*` | GPL v3 | "based on the diagrams and implementations in Will Pirkle's book *Designing Software Synthesizer Plug-Ins in C++*" (`LadderFilter.h:15-16`) |
| `Source/audio/FX/ZitaReverb.*` | GPL v3 | Derived from zita-rev1 (Fons Adriaensen, GPL) |
| `Source/audio/FX/SurgeReverb.*` | GPL v3 | Derived from Surge's reverb (GPL v3) |
| `Source/audio/FX/FeedbackDelayNetwork.*`, `IntegerDelayLine.*`, `Source/audio/ImpulseResponseCreator.*` | no header, so GPL v3 | `FeedbackDelayNetwork.h:9-11`: "currently not used in the synthesizer" |
| `Source/audio/Oscillators/Wavetables/Coefficients/AKWF_*.h` | marked GPL v3 | The original AKWF waveforms are announced as public domain (CC0) by their author: *to verify*; if we want them, take them from the source and not from Odin |

### 3.2 Architecture

| Item | What Odin 2 does | Where |
| --- | --- | --- |
| Engine / JUCE separation | None: `GlobalIncludes.h:17` includes `JuceHeader.h` and 26 files in `Source/audio/` use JUCE directly. The modulation matrix lives in `Source/gui/ModMatrix.h:181,258` although the audio code uses it. Constants through `#define` (`GlobalIncludes.h:67,102-115,177`) | `Source/GlobalIncludes.h` |
| Voices | 24 voices (`VOICES`), unison, Legato, Poly, Retrig modes; voice manager with a stealing order (free, in release, oldest) | `GlobalIncludes.h:67,236`, `Source/audio/Voice.h:638-735` |
| Oscillators | Analogue, 1D and 2D wavetable, multi, vector, chiptune with arpeggiator, FM, PM, noise, and three drawable tables (chip, wave, spectrum) | `Source/audio/Oscillators/` |
| Anti aliasing | Band limited wavetables: 33 subtables per table, built at load time from Fourier coefficients; sync with ×3 oversampling | `Source/audio/OdinConstants.h:18`, `WavetableContainer.cpp:59`, `WavetableOsc1D.cpp:158-169` |
| Filters | Ladder (LP, BP, HP at 12 and 24 dB), SEM 12 dB, Korg 35 LP and HP, diode, formant, comb, ring mod; Pirkle VA models (ZDF/TPT built from one pole low passes), `tanh` overdrive | `Source/audio/Filters/`, `LadderFilter.h:98-100,162-175`, `OdinFilterBase.h:43-73`, dispatch `PluginProcessorProcess.cpp:258-297` |
| Envelopes | Linear ADSR, modulatable | `Source/audio/ADSR.cpp:27-48` |
| Modulation | 9-row matrix | `GlobalIncludes.h:177`, `Source/gui/ModMatrix.h` |
| Effects | Delay, chorus, flanger, phaser, Zita reverb, oversampled distortion, parametric EQ | `Source/audio/FX/` |
| Computation | In `double` in the filters (`LadderFilter.h:162`) | |

Points contrary to our realtime rules:

1. `VoiceManager::getVoices` returns a `std::vector<int>` built with `push_back` and calls `DBG` with `std::to_string`, from MIDI processing on the audio thread: `Source/audio/Voice.h:654-719`, call `Source/PluginProcessorMidi.cpp:98`.
2. The DSP reads JUCE state directly; no parameter snapshot.

### 3.3 Presets

| Topic | Detail | Where |
| --- | --- | --- |
| Format | `.odin` = binary `juce::ValueTree` (`writeToStream`), root type `Odin`, subtrees `osc`, `fx`, `lfo`, `draw`, `misc` | `assets/init_patch.odin`, `Source/PluginProcessorReadPatch.cpp:22-104` |
| Migration | Number `patch_migration_version` (current: 5) compared with `ODIN_PATCH_MIGRATION_VERSION`, dedicated migration | `GlobalIncludes.h:45`, `Source/PluginProcessorMigratePatch.cpp`, `PluginProcessorReadPatch.cpp:35-47` |
| Factory | 266 `.odin` in banks and categories | `assets/Soundbanks/` |
| Browser | Full patch browser (banks, categories, import, export) in the UI | `Source/gui/PatchBrowser.h`, `PatchBrowserSelector.h`, `BrowserEntry.h` |

### 3.4 Build, tests, CI

| Topic | State |
| --- | --- |
| Build | CMake 3.15 minimum, version 2.4.1, JUCE as a submodule pinned on tag **6.1.6**, plus a JUCE fork for LV2. Formats VST3, AU, LV2, CLAP, Standalone |
| Tests | None |
| CI | Azure Pipelines (`azure-pipelines.yml`): Windows 2019, macOS, Ubuntu 22.04, build only |
| Last commit | 2025-05-30 (`265e9e2`) |

### 3.5 What we can extract (if AGPL)

| What | Layer on our side | Effort |
| --- | --- | --- |
| `Source/audio/Filters/` (ladder, diode, Korg 35, SEM, one pole VA) | `dsp/` | Medium: remove `GlobalIncludes.h`, switch to `float`, replace `FastMathApproximations::tanh`. Better: rewrite with TDD from Pirkle's book (an idea is not protected) or take `chowdsp_filters` (GPL) or JUCE's `dsp::LadderFilter` |
| `Source/audio/FX/ZitaReverb.*` | `dsp/` | Medium; Cloud Seed Core (MIT) is already our reference reverb |
| `Source/audio/Oscillators/WavetableContainer.*` and coefficients | `dsp/` | High: huge static arrays and macros; we prefer `gin_dsp` (BSD) for wavetables |

## 4. To reuse

### 4.1 Code to extract

| # | What | Source | Licence | Layer | Condition |
| --- | --- | --- | --- | --- | --- |
| 1 | DX7 FM engine `msfa` (operators, 32 algorithms, envelopes, LFO, pitch env, portamento) | Dexed `source/msfa/` except `tuning.*` | Apache 2.0 | `dsp/` | Always usable. Keep the headers, include the Apache licence, note changes in `PATCHES.md`, ADR not mandatory (not GPL) but a line in `DEPENDENCIES.md` |
| 2 | `EngineMkI.h` header | Dexed `source/engine/` | Apache 2.0 (the `.cpp` is GPL) | `dsp/` | Only if AGPL for the complete pair |
| 3 | Reading and writing DX7 SysEx cartridges | Dexed `source/core/Cartridge.*`, `Program.*` | GPL v3 | `plugin/` | If AGPL; otherwise rewrite from `doc/sysex-format.txt` |
| 4 | OB-X 2 and 4-pole filter, Xpander modes, with tests | OB-Xf `src/engine/Filter.h`, `src/tests/filt.cpp` | GPL v3+ | `dsp/` | If AGPL; ADR mandatory |
| 5 | BLEP oscillators and BLEP table | OB-Xf `src/engine/BlepData.h`, `SawOsc.h`, `PulseOsc.h`, `TriangleOsc.h` | GPL v3+ | `dsp/` | If AGPL; otherwise `EllipticBlepOscillators.h` from sst-basic-blocks (MIT) or `gin_dsp` (BSD) |
| 6 | ADSR with adjustable curve, coloured noise, decimators | OB-Xf `src/engine/AdsrEnvelope.h`, `Noise.h`, `Decimator.h` | GPL v3+ | `dsp/` | If AGPL |
| 7 | OB-Xd bank import | OB-Xf `src/state/ObxdImporter.*` | GPL v3+ | `plugin/` | If AGPL and if we clone an OB-X |

### 4.2 Design ideas

| # | Idea | Seen in | Licence of the original code | Layer on our side |
| --- | --- | --- | --- | --- |
| 1 | Engine working in fixed chunks, carrying the remainder of one block over to the next, with no added latency | Dexed `PluginProcessor.cpp:228-268` | GPL v3 (idea is free) | `dsp/` |
| 2 | Several engines behind a pointer chosen by parameter (Modern, Mark I, OPL) | Dexed `PluginProcessor.cpp:478-493` | GPL v3 (idea is free) | `dsp/` |
| 3 | Type erased commands built off the audio thread and delivered through a FIFO | Dexed `source/util/CommandFifo.h` | GPL v3 (idea is free); in practice `farbot::fifo` (MIT) | `plugin/` |
| 4 | Process four voices per SIMD register | OB-Xf `src/engine/*Quad.h` | GPL v3+ (idea is free) | `dsp/` |
| 5 | Split the block at each MIDI event for sample accurate rendering | OB-Xf `src/ObxfProcessor.cpp:176-195` | GPL v3+ (idea is free) | `plugin/` |
| 6 | Serialise modulation sources and targets by a stable name, never by integer | OB-Xf `src/engine/VoiceMatrix.h:79-120` | GPL v3+ (idea is free) | `plugin/` |
| 7 | Whole engine reference renders regenerable through an environment variable, separated from the fast tests by a hidden Catch2 tag | OB-Xf `src/tests/engine.cpp:20-28,435` | GPL v3+ (idea is free) | `dsp/` tests; regeneration always in a `golden:` commit validated by listening |
| 8 | Preset = metadata (author, licence, category, project) in addition to the values | OB-Xf `src/state/StateManager.cpp:61-81` | GPL v3+ (idea is free); in practice `chowdsp_presets_v2` or `gin_plugin` (BSD) | `plugin/` |
| 9 | Import the formats of an existing synth with a note on each loss of fidelity | OB-Xf `README.md`, Dexed `Cartridge.cpp` | GPL (idea is free) | `plugin/` |
| 10 | Preset migration number separate from the plugin version number | Odin 2 `GlobalIncludes.h:45`, `PluginProcessorMigratePatch.cpp` | GPL v3 (idea is free) | `plugin/` |
| 11 | Band limited wavetables generated from Fourier coefficients, one subtable per frequency range | Odin 2 `WavetableContainer.cpp:59` | GPL v3 (idea is free) | `dsp/`, built on a background thread |
| 12 | List of reference VA filters (ladder, diode, Korg 35, SEM) taken from Pirkle, *Designing Software Synthesizer Plug-Ins in C++* | Odin 2 `Source/audio/Filters/` | Book: ideas are free | `dsp/`, with TDD |

### 4.3 To avoid

| # | Defect | Seen in | Layer concerned on our side | Rule |
| --- | --- | --- | --- | --- |
| 1 | Global static tables depending on the sample rate | Dexed `msfa/freqlut.h:19`, `env.h:52,61`, `lfo.h:21,34-35` | `dsp/` | `dsp.md`: no global state. Fix this first when extracting `msfa` |
| 2 | `new` in `prepareToPlay` without freeing the previous allocation | Dexed `PluginProcessor.cpp:147` | `plugin/` | `cpp.md`: RAII, no bare `new` |
| 3 | Mutex and `juce::String` construction at the top of `processBlock` | OB-Xf `ParameterUpdateHandler.cpp:157-159` | `plugin/` | `realtime-audio.md`: no lock and no allocation |
| 4 | `std::vector::push_back` and `DBG` in voice allocation | Odin 2 `Voice.h:654-719` | `dsp/` | `realtime-audio.md` |
| 5 | Global non seedable random generator in the DSP | OB-Xf `Voice.h:200-204` | `dsp/` | `dsp.md`: deterministic and seedable generator |
| 6 | DSP that includes `JuceHeader.h`, modulation matrix stored in `gui/` | Odin 2 `GlobalIncludes.h:17`, `Source/gui/ModMatrix.h` | `dsp/`, `ui/` | `03_ARCHITECTURE.md`: `dsp/` without JUCE, the UI carries no audio logic |
| 7 | Constants and filter types as `#define` | Odin 2 `GlobalIncludes.h:67-177` | all | `cpp.md`: no macros outside build configuration |
| 8 | Files without a licence header in the middle of a folder under another licence | Dexed `source/msfa/tuning.*` | all | Every file reused or written carries its header |
| 9 | Depending on a project whose source can disappear | OB-Xd (source removed in 2026) | all | Pin a commit, keep a vendored copy of what we reuse |
| 10 | "Reference" tests whose expected values are the output of the implementation | OB-Xf `src/tests/filt.cpp:344-519` | tests | `testing.md`: the expected value cites its source; these tests remain non regression tests |
