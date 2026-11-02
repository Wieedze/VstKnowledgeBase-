# What we take ready-made

Principle: **everything we do not need to code ourselves is a gain.** Less code to write, test and maintain, and code already proven in production. We only code ourselves what makes the sonic identity of the plugin.

State as of 2026-11-02. Licences checked in the LICENSE files and the headers, code read in the repositories. Details, with `file:line` paths, are in the notes in [`docs/references/`](references/).

Our format is **VST3 only** (ADR 0003).

## The question that decides everything: the plugin's licence

| If the plugin is… | We can take | We cannot take |
| --- | --- | --- |
| **Open source AGPL v3** (like Drum Foundry and TetraDrive) | MIT, BSD, ISC, WTFPL, **and** GPL v3 / AGPL v3 (compatible with AGPL v3) | Code without a licence |
| **Closed / commercial** (commercial JUCE licence) | MIT, BSD, ISC, WTFPL only | Anything GPL / AGPL: chowdsp GPL, Surge, Vital, Drum Foundry, TetraDrive… |

This decision is ADR 0001 of each plugin project (`docs/06_START_PLAN.md`, phase 0). Until it is made, we only use MIT/BSD: that stays valid in both cases.

## In short: what to take depending on the licence

| Need | Closed plugin (MIT/BSD/Apache only) | AGPL plugin (GPL v3 too) |
| --- | --- | --- |
| Build, CI, tests | Adapted Pamplejuce | same |
| Basic DSP | `juce_dsp`, Signalsmith DSP, HIIR, math_approx | same + sst-filters, sst-waveshapers, sst-effects, chowdsp GPL |
| Synthesis | mda JX10/DX10, Dexed's `msfa` engine | same + OB-Xf (filter, BLEP, ADSR) |
| Analogue modelling | chowdsp_wdf, RTNeural | same + BYOD's WDF cores |
| Reverb | Cloud Seed (to be patched) | same + sst-effects, chowdsp_reverb |
| Colour, saturation | Airwindows via airwin2rack | same |
| Parameters, state, presets | chowdsp_parameters, chowdsp_version; plugin_state and presets_v2 after removing the 2 GPL files | full chowdsp |
| Modulation | Gin `gin_plugin`, after a real-time fix | same, or `FixedMatrix` from sst-basic-blocks |
| Real-time | farbot, readerwriterqueue, sst-cpputils, RTSan | same |
| UI | foleys_gui_magic (analyser), sst-jucegui, gin_gui, ff_meters, melatonin | same + chowdsp_gui |

No project studied ticks all our real-time rules: even the best ones allocate, lock or read the UI on the audio thread somewhere (exact lines in the notes). So all reused code goes through `rt-safety-reviewer` and RTSan before entering `dsp/`.

## 1. The skeleton: write nothing

| Building block | Source | Licence | What we avoid coding |
| --- | --- | --- | --- |
| CMake project, plugin/Tests/Benchmarks targets, 3-OS CI, pluginval, signing, packaging, `VERSION` | [Pamplejuce](https://github.com/sudara/pamplejuce) | MIT | The whole build and CI. Its `CLAUDE.md` even contains a setup assistant for the agent |
| `SharedCode` interface that links the code to the plugin **and** to the tests without ODR violation | Pamplejuce | MIT | The CMake wiring of the tests |
| Host validation | [pluginval](https://github.com/Tracktion/pluginval) | GPL v3 (a tool, not linked to the plugin) | A host test bench |
| Tests | [Catch2 v3](https://github.com/catchorg/Catch2) | BSL 1.0 | The test framework |

## 2. DSP: first what JUCE already provides

JUCE's `juce_dsp` module covers a large share of common needs. We know it is already there, under the same licence as JUCE: no integration cost.

| Need | JUCE class |
| --- | --- |
| Biquad, SVF, ladder, FIR filters | `dsp::IIR::Filter`, `dsp::StateVariableTPTFilter`, `dsp::LadderFilter`, `dsp::FIR::Filter`, `dsp::ProcessorDuplicator` |
| Oversampling | `dsp::Oversampling` (latency provided) |
| Convolution (IR reverb, cabinet) | `dsp::Convolution` (background loading handled) |
| Interpolated delay line | `dsp::DelayLine` |
| Dynamics | `dsp::Compressor`, `dsp::Limiter`, `dsp::NoiseGate`, `dsp::BallisticsFilter` |
| Modulation | `dsp::Chorus`, `dsp::Phaser`, `dsp::Oscillator` |
| Simple reverb | `dsp::Reverb` (Freeverb) |
| Simple saturation | `dsp::WaveShaper` |
| Gain, pan, dry/wet with latency compensation | `dsp::Gain`, `dsp::Panner`, `dsp::DryWetMixer` |
| Parameter smoothing | `SmoothedValue` |
| Analysis | `dsp::FFT`, `dsp::WindowingFunction` |
| Lock-free FIFO | `AbstractFifo` |

Limit: these classes depend on JUCE, so they live in `plugin/` or in an adapter layer, not in pure `dsp/`. If we want to keep `dsp/` free of JUCE, we take the libraries below.

## 3. DSP: third-party libraries

| Library | Licence checked | What it brings | Without JUCE (`dsp/`) | Closed plugin | Note |
| --- | --- | --- | --- | --- | --- |
| [Signalsmith DSP](https://github.com/Signalsmith-Audio/dsp) | MIT | Delays, filters, resampling, FFT, envelopes. **Default DSP library of `dsp/`** | Yes, header only | Yes | [real-time and DSP](references/realtime-and-dsp-libraries.md) |
| [HIIR](http://ldesoras.free.fr/prod.html) | WTFPL v2 | Polyphase IIR half-band oversampling (cascaded 2x) around non-linearities | Yes, header only | Yes | same |
| chowdsp_utils, BSD modules: `chowdsp_math`, `chowdsp_simd`, `chowdsp_buffers`, `chowdsp_data_structures` | BSD 3 | Vector maths, SIMD (xsimd), buffers, circular buffer, allocators | Yes, but they define their own `juce` namespace: do not expose them in a public header of `dsp/` | Yes | [chowdsp_utils](references/chowdsp-utils.md) |
| chowdsp_utils, GPL modules: `filters`, `eq`, `waveshapers`, `sources`, `reverb`, `compressor`, `dsp_utils`, `modal_dsp`, **`dsp_data_structures`** | GPL v3 | High-order filters, EQ (including linear phase), ADAA clippers, wavefolder, anti-aliased oscillators, FDN, compressor, pitch shifter, `RealtimeLatestObject` | Varies | No | same |
| [Dexed](https://github.com/asb2m10/dexed) `source/msfa/` engine | Apache 2.0 (header of each file); `tuning.*` under GPL and tied to JUCE | The DX7's 6-operator FM engine. Cut three couplings: Logger, MTS-ESP, global static tables | Yes | Yes | [dexed-obxd-odin2](references/dexed-obxd-odin2.md) |
| [OB-Xf](https://github.com/surge-synthesizer/OB-Xf) | GPL v3+ | OB-X/Xpander ZDF filter, BLEP oscillators, ADSR, decimators | Yes | No | same |
| [mda-plugins-juce](https://github.com/hollance/mda-plugins-juce) | MIT | 24 plugins: JX10 (subtractive synth), DX10 (FM), Piano, EPiano, Detune, Dither, Image (M/S), Bandisto, TestTone… To complete with smoothing, latency and seed | Yes, almost all the DSP | Yes | [mda-and-frequalizer](references/mda-and-frequalizer.md) |
| [chowdsp_wdf](https://github.com/Chowdhury-DSP/chowdsp_wdf) | BSD 3 | Wave Digital Filters: modelling of analogue circuits (pedals, preamps), used by BYOD | Yes | Yes | [BYOD and valentine](references/byod-and-valentine.md) |
| [RTNeural](https://github.com/jatinchowdhury18/RTNeural) | BSD 3 | Real-time neural network inference (amp modelling by learning) | Yes | Yes | same |
| [math_approx](https://github.com/Chowdhury-DSP/math_approx) | BSD 3 | Fast approximations of tanh, exp, log, sin for saturation and filters | Yes | Yes | same |
| [ff_meters](https://github.com/ffAudio/ff_meters) | BSD 3 | Level meters for the UI | No (JUCE) | Yes | same |
| [Cloud Seed Core](https://github.com/GhostNoteAudio/CloudSeedCore) | MIT | Algorithmic reverb with 8 modulated lines | Yes | Yes | [real-time and DSP](references/realtime-and-dsp-libraries.md) |
| [Airwindows](https://github.com/airwindows/airwindows) via **airwin2rack** (`src/autogen_airwin/`) | MIT | Hundreds of algorithms (saturations, consoles, compressors, reverbs), with no VST2 SDK and no JUCE | Yes | Yes | same |
| [sst-cpputils](https://github.com/surge-synthesizer/sst-cpputils) | MIT | `rtsan_support.h` (`[[clang::nonblocking]]` macros and a disabling guard for RTSan), `ring_buffer.h` (SPSC FIFO), fixed allocator, small hash table | Yes | Yes | [Surge and sst](references/surge-and-sst.md) |
| [sst-filters](https://github.com/surge-synthesizer/sst-filters), [sst-waveshapers](https://github.com/surge-synthesizer/sst-waveshapers), [sst-effects](https://github.com/surge-synthesizer/sst-effects) | GPL v3 | 41 filters, 44 waveshapers, reverbs, delays, modulation effects; header only, C++20. For sst-effects, write our own `FXConfig` (the example one calls `rand()`) | Yes | No | same |
| [sst-basic-blocks](https://github.com/surge-synthesizer/sst-basic-blocks) | GPL v3, except `LanczosResampler.h`, `HilbertTransform.h`, `EllipticBlepOscillators.h` dual-licensed MIT/GPL | Surge's basic blocks, including `FixedMatrix` (GPL), a fixed-size lock-free modulation matrix: **the model to follow** | Yes | The 3 MIT files, **after removing their includes of GPL headers** (`simd/setup.h`, `SmoothingStrategies.h`) | same |
| [Gin](https://github.com/FigBug/Gin) `gin_dsp` | BSD 3 | Wavetable oscillators, filters, compressor, reverb, ADSR, LFO | **No** (depends on `juce_dsp`): goes into `plugin/` | Yes | [Gin](references/gin.md) |

**Caveats to know before plugging in:**

1. **Cloud Seed Core allocates on the audio thread** when Decay, Size, Mod or the seeds change (`UpdateLines` builds `std::vector`s), uses `std::rand()` and weighs about 64 MB per instance (estimate from the constants in the code, not measured). To vendor in `third_party/` with a `PATCHES.md`, completing Drum Foundry's patch, which still leaves an allocation on seed change. Seed parameters not automatable.
2. **airwindows-juce is not the right entry point**: only 4 ports, no LICENSE file, no commit since January 2024. Take the algorithm's file from airwin2rack, wrap it in a `dsp/` class with smoothing and a deterministic seed, and credit Airwindows.
3. **Gin and chowdsp are not tested the same way on JUCE 9**: Gin follows JUCE develop (JUCE 9 commits, no tag, pin a commit); chowdsp is only tested on JUCE 8.0.10.

## 4. Parameters, state, presets: do not reinvent

| Library | Licence | Replaces | Caveat |
| --- | --- | --- | --- |
| `chowdsp_parameters` | BSD 3 | Parameter creation, forwarding parameters | |
| `chowdsp_plugin_state` | BSD 3 **that includes a GPL file** (`DeferredMainThreadAction.h`) | Replacement for the APVTS, with UI attachments | Closed plugin: patch or the author's agreement. `deserialize` is deferred to the message thread: our state tests and `tools/` must run on that thread |
| `chowdsp_presets_v2` | BSD 3 **that includes a GPL file** (`ProgramAdapter.h`) | Preset manager (saving, browsing, tags) | Same caveat |
| `chowdsp_version` | BSD 3 | Version comparison for state migration | |
| `chowdsp_serialization`, `chowdsp_json` | BSD 3 | JSON/XML serialisation | |
| `gin_plugin` | BSD 3 | Extended processor, modulatable parameters, modulation matrix, patch browser, knob/ADSR/LFO/MSEG components | See below |

**Gin: a good base, not to plug in as is.** It is a complete framework adopted as a whole in place of the APVTS. Four gaps with our rules, found in the code (details in [the note](references/gin.md)):

1. The `ModMatrix` **is not real-time safe**: adding or removing a route, or loading a state, reallocates without a lock while audio is reading. To fix (for example routes published via `farbot::RealtimeObject`) before use.
2. The state has no version and only saves the values that differ from the default: incompatible with `.claude/rules/juce.md` without an extra layer.
3. A network update and news checker is active by default: to disable.
4. LFO and `WTOscillator` use non-seedable randomness: test renders are not reproducible.

## 5. Real-time: proven primitives

| Library | Licence checked | Brings |
| --- | --- | --- |
| [farbot](https://github.com/hogliux/farbot) | MIT | `RealtimeObject` (share an object between the UI and audio), lock-free `fifo`, `AsyncCaller` (move a deallocation or a log off the audio thread) |
| [readerwriterqueue](https://github.com/cameron314/readerwriterqueue) | BSD 2-clause (the semaphore in `atomicops.h` is under zlib) | Lock-free SPSC queue, for audio-to-UI streams (meters, analyser). JUCE's `AbstractFifo` remains the dependency-free alternative |
| [RealtimeSanitizer (RTSan)](https://clang.llvm.org/docs/RealtimeSanitizer.html) | LLVM | Automatic detection of non-real-time calls from a `[[clang::nonblocking]]` function |

**RTSan replaces the instrumented allocator we planned to write**, with three limits: it needs **clang 20 or later**, works **neither on Windows nor with AppleClang**, and **pluginval does not cover it**. So we run it in a Linux CI job, on our own test executables that exercise `processBlock`, including parameter changes during playback. Pamplejuce already has the `WITH_REALTIME_SANITIZER` option in `cmake/Sanitizers.cmake`; what is missing is `include(Sanitizers)` and the job (example in [the Pamplejuce note](references/pamplejuce.md)).

## 6. UI: components and tools

| Library | Licence checked | Brings | Caveat |
| --- | --- | --- | --- |
| [melatonin_inspector](https://github.com/sudara/melatonin_inspector) | MIT | Live UI inspector, already in Pamplejuce | |
| [melatonin_blur](https://github.com/sudara/melatonin_blur) | MIT, contains a BSD 3 file from Gin | Fast shadows and blurs | |
| [foleys_gui_magic](https://github.com/ffAudio/foleys_gui_magic) | BSD 3 | XML UI editor with live editing, ready-made analysers and meters | Replaces the APVTS with `MagicProcessorState`: decision by ADR, not by default |
| `gin_gui` | BSD 3 | Synth components, JSON layouts | |
| `chowdsp_gui`, `chowdsp_visualizers` | GPL v3 | LookAndFeel, parameter binding, EQ curve | |

## 7. Miscellaneous

| Library | Licence checked | Brings | Caveat |
| --- | --- | --- | --- |
| [clap-juce-extensions](https://github.com/free-audio/clap-juce-extensions) | MIT | CLAP format | **Not used** (VST3 only, ADR 0003): to remove from the template |
| [nlohmann/json](https://github.com/nlohmann/json) | MIT | JSON | |
| [melatonin_perfetto](https://github.com/sudara/melatonin_perfetto) | MIT declared in the header only (no LICENSE file); downloads the Perfetto SDK under Apache 2.0 | Profiling of the audio thread | |
| [melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) | MIT | Audio buffers as ASCII | **Depends on `juce_dsp`**: usable in the `plugin/` tests, not in the DSP tests without JUCE |

## 8. Patterns to take from the reference projects

These ideas are not code to copy (Drum Foundry and TetraDrive are AGPL) but design choices to reproduce. An idea is not protected; only code is. Checked in the code ([Drum Foundry](references/drum-foundry.md), [TetraDrive](references/tetradrive.md)).

| Pattern | Seen in | What we do |
| --- | --- | --- |
| Headless `tools` binary (render, check, bench, snapshot) that drives the real processor | Drum Foundry | `<Plugin>Tools` target from phase 1, **run in CI** (Drum Foundry does not) |
| Parameter snapshot per block, **sanitised on read** (NaN replaced by the default, values clamped) | Drum Foundry (`ParamReader`) | `Params` structure filled by `plugin/`, the DSP's only input |
| DSP compilable and tested without JUCE | TetraDrive (`src/` + `tests/`) | `dsp` target without JUCE. Drum Foundry does not do it |
| Automation split at automation points, with linear ramps | TetraDrive (VST3 patch) | Relevant since we only ship VST3; 59-line patch, specific to JUCE 9 |
| Fixed latency, completed by a **delay at the end of the chain** | Drum Foundry | Reserve the worst-case latency and compensate the rest with a delay. TetraDrive does the opposite (latency that varies with oversampling, uncompensated bypass): to avoid |
| Oversampling latency set to a whole number of samples | TetraDrive (47, 55, 58) | Choose filters whose delay is an integer |
| Clipper that only oversamples the non-linear difference | Drum Foundry (`Clipper`) | The signal stays bit-identical below the knee |
| Chain reordering: 10 ms fade out, reset, 10 ms fade in | Drum Foundry | For any reordering or audible mode change |
| Fixed-size internal packets **for the algorithms that need them** | Drum Foundry (Cloud reverb, 32 samples) | Their LFO still depends on the block size and their test does not see it: our block size test must enable modulation |
| Heavy construction in the background, replaced objects put on a **retire list** indexed by serial number | Drum Foundry (samples, Natural reverb) | IRs, wavetables, samples |
| Integer state version with chained migrations | Drum Foundry (version 10) | One migration function per version |
| Invariants between parameters (ordered crossovers, 1/12 octave min) | TetraDrive | Applied in the snapshot, tested |
| Single version, consistency checked in CI | Drum Foundry, TetraDrive | A single source of the version |
| Code map (path → role) | Drum Foundry | `docs/CODEMAP.md` |
| Vendored code with `PATCHES.md` | Drum Foundry (Cloud Seed) | Each modified dependency documents its patches |

**Not to take**, seen in their code:

1. Inserting options in the middle of a choice list: each insertion forces a migration of old sessions. We append at the end of the list.
2. Keeping `ParameterID` at version 1 despite additions (both projects).
3. Copying large tables on the audio thread (Drum Foundry copies 196 KB).
4. An unbounded render triggered by a parameter (negative Offset in Drum Foundry, up to 4 times a block's budget according to their own audit).
5. A bench that only measures the average: we measure the worst case and set a threshold.
6. No CI (TetraDrive) or a CI without tests or pluginval (Drum Foundry).

## Selection rule

1. Does JUCE already do it? If so, we use it.
2. Otherwise, does an MIT/BSD library do it? If so, we add it via CPM or as a submodule, with a pinned version.
3. Otherwise, and if the plugin is AGPL, does a GPL library do it? If so, same.
4. Only otherwise do we code it, with TDD.

Every added dependency: one line in the project's `docs/DEPENDENCIES.md` (name, version, licence, why), and an ADR if it is GPL or if it replaces existing code.
