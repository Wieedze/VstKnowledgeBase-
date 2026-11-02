# BYOD and Valentine: reading the code

Studied at commits [`1cf22b6`](https://github.com/Chowdhury-DSP/BYOD/commit/1cf22b6ac802b9dc33cfc9f8dd6af5b3c3e40bc9) of BYOD (version 1.3.1, 2025-08-13) and [`87eba9b`](https://github.com/tote-bag-labs/valentine/commit/87eba9bc332615d4de0c93c3c07cfb679c1ff25a) of Valentine (version 1.0.1, 2025-08-24). Line numbers refer to these commits; the links point to `main` and may drift. Nothing was compiled: everything comes from reading the sources. Both repositories are **GPL v3**: this document describes ideas and cites locations, it does not copy code. The study of chowdsp_utils itself is in [`chowdsp-utils.md`](chowdsp-utils.md); here we only look at what BYOD does with it.

## Verdicts

**BYOD.** The largest open source guitar effects catalogue on JUCE (69 processors, about 28,000 lines of DSP), whose value for us is threefold: circuit cores as wave digital filters (WDF) that are almost independent of JUCE, a full scale demonstration of chowdsp_wdf and RTNeural (both BSD 3), and a forwarding parameter mechanism that makes a dynamic graph automatable in VST3. The processor code is reusable only if our plugin is AGPL v3. Its graph engine must not be taken as is: it protects the audio thread with a `SpinLock` in `try_lock` that skips entire blocks, changes graphs without any crossfade, and reallocates and logs on the audio thread when the oversampling factor changes.

**Valentine.** A small compressor and saturator (about 1,300 lines of DSP) from which two ideas are worth taking: a latency compensation that keeps an integer, constant latency whatever stages are enabled, and a single ratio knob that also drives the knee and the threshold through piecewise interpolation. The rest is weak: DSP mixed with JUCE and with a meters library, a single real test (maths functions), and three bugs visible on reading. Its CI (pluginval strictness 10 on three OSes, Catch2 through `catch_discover_tests`) is the cleanest part, but Pamplejuce already does the same thing better.

## 1. Verified licences

| Item | Licence read in the file | Where | Consequence for us |
| --- | --- | --- | --- |
| BYOD (repository) | GPL v3 | `LICENSE` | AGPL only |
| BYOD, iOS distribution | BSD 3 granted **to Chowdhury DSP** by the contributors' CLA, not to us | [`docs/Licensing.md`](https://github.com/Chowdhury-DSP/BYOD/blob/main/docs/Licensing.md) | Changes nothing for a third party: we receive GPL v3 |
| BYOD, `SurgeWaveshapers.*` | GPL v3, code taken from Surge, in the file header | [`src/processors/drive/waveshaper/SurgeWaveshapers.h:1-14`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/drive/waveshaper/SurgeWaveshapers.h#L1-L14) | AGPL only |
| BYOD, IRs (`res/amp_irs`, `res/lofi_irs`) and neural models (`res/guitar_ml_models`) | No documented licence or provenance; so the repository's GPL v3 by default | `res/` | Do not ship without asking about the origin |
| chowdsp_utils (submodule, `34db5bd`) | Per module: GPL v3 or BSD 3 (`license:` field of each module) | see section 3.2 | See table 3.2 |
| chowdsp_wdf (submodule) | BSD 3 | `LICENSE` | Usable everywhere |
| RTNeural (submodule) | BSD 3 | `LICENSE` | Usable everywhere |
| math_approx (submodule) | BSD 3 | `LICENSE` | Usable everywhere |
| magic_enum (submodule) | MIT | `LICENSE` | Usable everywhere |
| sst-cpputils (submodule) | MIT | `LICENSE.md` | Usable everywhere |
| ea_variant (submodule) | Boost 1.0 | `LICENSE` | Usable everywhere |
| clap-juce-extensions, melatonin_perfetto (submodules) | Already covered by [`melatonin-and-clap.md`](melatonin-and-clap.md) | | CLAP not used on our side |
| Valentine (repository, including `libs/tote_bag/`) | GPL v3; the `tote_bag` files have no header of their own | `LICENSE` | AGPL only |
| ff_meters (Valentine submodule) | BSD 3 (Foleys Finest Audio) | `LICENSE` | Usable everywhere |
| Valentine, JUCE | `JUCE_ENABLE_GPL_MODE=1` | [`CMakeLists.txt:215`](https://github.com/tote-bag-labs/valentine/blob/main/CMakeLists.txt#L215) | Reminder: JUCE in GPL mode requires a GPL plugin |

The submodule licences were read in a shallow clone of each one (folder `/home/claude/study/_byod_deps/`), not at the commits pinned by BYOD; a licence change between the two is unlikely but not ruled out.

## 2. BYOD: chain architecture

### 2.1 Fact sheet

| Point | Finding |
| --- | --- |
| Language, build | C++20, CMake 3.15 minimum ([`CMakeLists.txt:1,11`](https://github.com/Chowdhury-DSP/BYOD/blob/main/CMakeLists.txt#L1-L11)), unity build in batches of 8 and precompiled header |
| Formats | AU, VST3, Standalone, CLAP, LV2 on Linux, AAX and VST2 if SDK available |
| JUCE | Submodule `modules/JUCE` (commit `a8ae6ed`) |
| Size | 39,400 lines in `src/`, of which 28,000 in `src/processors/` |
| Tests | Executable `BYOD_headless --unit-tests`, `juce::UnitTest` framework, 15 files |
| CI | GitHub Actions, Linux, Windows, macOS; pluginval on Windows only, strictness 7 |
| Code format | `.clang-format` and a workflow that applies it to PRs |

### 2.2 A graph, not a list

BYOD's chain is not a reorderable list: it is a **directed graph** of processors connected by cables, with multiple ports (audio, modulation, level). "Reordering" means moving connections.

1. Each processor owns its output connections (`std::vector<Array<ConnectionInfo>>`) and counts its connected inputs ([`src/processors/BaseProcessor.h:43-49`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L43-L49), [`:300-302`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L300-L302)).
2. Processing is a **recursive** depth first traversal from the input processor ([`src/processors/chain/ProcessorChain.cpp:100-185`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L100-L185)). An output connected to a single processor passes the same buffer; an output connected to several copies the buffer into a scratch buffer taken from an arena ([`:146-153`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L146-L153)).
3. A processor with several inputs waits until all its inputs are ready (counter `numInputsReady`) before being called ([`:154-166`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L154-L166)).
4. A branch whose output is connected to nothing is not computed ([`:129-135`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L129-L135)).
5. Modulation sources without inputs (LFO, MIDI) are processed first ([`:217-229`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L217-L229)).
6. All intermediate buffers come from an arena (`chowdsp::ArenaAllocator`, BSD module) cleared at the end of the block ([`:259`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L259)). Its size is computed from the number of connections and the oversampled block ([`:273-287`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L273-L287)).

Oversampling is **global** to the chain (1x to 16x, minimum or linear phase, `chowdsp::VariableOversampling`, GPL module): all processors run at the oversampled rate ([`src/processors/chain/ChainIOProcessor.cpp:21-26`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ChainIOProcessor.cpp#L21-L26)). The global dry/wet delays the dry signal by the oversampling latency ([`src/processors/chain/DryWetProcessor.cpp:20-25`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/DryWetProcessor.cpp#L20-L25)), and the host bypass goes through a delay line of the same latency ([`src/BYOD.cpp:92-109`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/BYOD.cpp#L92-L109)).

### 2.3 Adding, removing, reconnecting without blocking the audio thread (almost)

All changes go through `juce::UndoableAction` objects (`AddOrRemoveProcessor`, `AddOrRemoveConnection`) executed on the message thread ([`src/processors/chain/ProcessorChainActionHelper.cpp`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActionHelper.cpp)). The pattern is the same everywhere:

| Step | Where | Thread |
| --- | --- | --- |
| Create and `prepare` the new processor | [`ProcessorChainActions.cpp:28-30`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L28-L30) | Message, outside the lock |
| Allocate the new arena if the number of connections changes too much | [`:74-79`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L74-L79) | Message, outside the lock |
| Insert the processor or the connection, swap the arena | [`:33-36`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L33-L36), [`:81-86`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L81-L86) | Message, **under `SpinLock`** |
| Free the old arena | [`:87`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L87) | Message, outside the lock |
| Keep the removed processor in the undo action, free its internal memory | [`:61-65`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L61-L65) | Message |

On the audio side, `processAudio` tries the lock and, if it is taken, **returns without doing anything** ([`ProcessorChain.cpp:189-191`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L189-L191)): the block goes out unprocessed, without the oversampling latency that the host nonetheless compensates. This is an audible jump. Loading a state or a preset rebuilds the whole graph through a sequence of actions on the message thread ([`ProcessorChainStateHelper.cpp:41-84`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainStateHelper.cpp#L41-L84)), each one taking the lock.

**Crossfade: there is none at chain level.** Not on adding, not on removing, not on changing a connection. Each processor's bypass is a hard switch between `processAudio` and `processAudioBypassed` ([`BaseProcessor.cpp:109-112`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.cpp#L109-L112)). The only fades are internal to two processors: Centaur between neural models ([`drive/centaur/GainStageML.cpp:64-72`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/drive/centaur/GainStageML.cpp#L64-L72)) and Solo-Vibe when the number of stages changes ([`modulation/uni_vibe/UniVibe.cpp:186-211`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/modulation/uni_vibe/UniVibe.cpp#L186-L211)), both with `addFromWithRamp` over one block.

**Violations of our realtime rules, read in the code:**

1. When the oversampling factor changes, `processAudio` calls `initializeProcessors()` **on the audio thread** ([`ProcessorChain.cpp:194-197`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L194-L197)), which redoes the `prepare` of all processors and reallocates the arena with `aligned_alloc` and a `Logger::writeToLog` ([`:60-77`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L60-L77), [`:304-311`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L304-L311)).
2. The `SpinLock` is still a lock shared between UI and audio, contrary to `.claude/rules/realtime-audio.md` even with `try_lock`, because a failure loses a block instead of keeping the old graph.
3. Recursion on the audio thread, bounded by the graph size but not by a constant.

### 2.4 Declaring a processor

1. A class derived from `BaseProcessor`, itself a lightweight `juce::AudioProcessor` (`JuceProcWrapper`) that carries **its own APVTS** ([`src/processors/BaseProcessor.h:83-111`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L83-L111), [`JuceProcWrapper.h`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/JuceProcWrapper.h)).
2. The ports are described by two `enum class` (inputs, outputs) and a function that gives the type of each port; `magic_enum` counts them ([`BaseProcessor.h:51-68`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L51-L68)).
3. Three methods to write: `prepare`, `processAudio`, and `processAudioBypassed` for multi port modules ([`BaseProcessor.h:227-232`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L227-L232)). Each processor receives a common `on_off` parameter ([`ParameterHelpers.h:10-13`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/ParameterHelpers.h#L10-L13)).
4. One line in the static table `ProcessorStore::store`: display name, factory, category, number of inputs and outputs ([`src/processors/ProcessorStore.cpp:90-168`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/ProcessorStore.cpp#L90-L168)). The add menu, compatible replacement (same number of ports) and the tests are generated from this table.
5. The UI metadata (colour, description, authors, link) are fields of `uiOptions` filled in the constructor. A script creates the files ([`scripts/new_proc.sh`](https://github.com/Chowdhury-DSP/BYOD/blob/main/scripts/new_proc.sh)) and a guide explains it ([`docs/CreatingANewProcessor.md`](https://github.com/Chowdhury-DSP/BYOD/blob/main/docs/CreatingANewProcessor.md)).

The display name is used as the identifier in saved states: renaming a processor breaks sessions, exactly the case covered by our rule on parameter IDs.

### 2.5 Exposing the parameters of a dynamic graph to the host

VST3 requires a fixed parameter list. BYOD declares **500 generic parameters** `forward_param_N` (40 slots of 12 parameters) and, when a processor is added, redirects a free slot to its internal parameters, with a name "Processor : Parameter" ([`src/state/ParamForwardManager.cpp:26-80`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/state/ParamForwardManager.cpp#L26-L80), [`ParamForwardManager.h:11-12`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/state/ParamForwardManager.h#L11-L12)). The slot index is saved with the processor so that automation finds its target on reload. The mechanism comes from `chowdsp::ForwardingParametersManager`, in the **BSD 3** `chowdsp_parameters` module. A test freezes this behaviour and keeps old states (`src/headless/tests/OldParamForwardStates/`).

### 2.6 List of processors

69 entries in `ProcessorStore` (counted with `grep -c 'processorFactory<' src/processors/ProcessorStore.cpp`). Licence: **GPL v3 for all of them**. The dependencies column lists only what goes beyond JUCE and the `BaseProcessor` base; "chowdsp filters" means classes from the GPL modules (`chowdsp_filters` through `chowdsp_dsp_utils`, `chowdsp_eq`). Paths relative to `src/processors/`.

#### Drive (23)

| Name | Technique | File | Dependencies |
| --- | --- | --- | --- |
| Bass Face | Trained RNN, internal JUCE oversampling | `drive/BassFace.cpp` | RTNeural, chowdsp filters |
| Blonde Drive | Analytic waveshaper and filters (Joyo American Sound) | `drive/BlondeDrive.cpp` | chowdsp filters |
| Centaur | Klon: WDF stages, or neural mode with fade between models | `drive/centaur/` | chowdsp_wdf, RTNeural |
| Diode Clipper | Diode pair WDF, approximated Wright omega | `drive/diode_circuits/` | chowdsp_wdf, math_approx |
| Diode Rectifier | Rectifier WDF | `drive/diode_circuits/` | chowdsp_wdf, math_approx |
| Dirty Tube | Triode model in WDF | `drive/tube_amp/` | chowdsp_wdf |
| Distortion Plus | WDF (MXR), derived from S. Schachter's thesis, scattering matrix via R-Solver | `drive/mxr_distortion/` | chowdsp_wdf |
| Flapjack | WDF with op amp as an R adaptor (Crowther Hot Cake) | `drive/flapjack/` | chowdsp_wdf |
| Fuzz Machine | DK nodal method (Fuzz Face), elliptic oversampling | `drive/fuzz_machine/` | chowdsp resamplers |
| GuitarML | LSTM, JSON models loadable by the user | `drive/GuitarMLAmp.cpp` | RTNeural |
| Hysteresis | Jiles Atherton hysteresis (ChowTape tape model, DAFx), SIMD | `drive/hysteresis/` | chowdsp SIMD |
| Junior B | WDF and neural triode, modified R adaptor | `drive/junior_b/` | chowdsp_wdf, RTNeural |
| Tone King | WDF (Analogman King of Tone) | `drive/king_of_tone/` | chowdsp_wdf |
| Metal Face | Trained RNN | `drive/MetalFace.cpp` | RTNeural |
| Mouse Drive | WDF (RAT clipping stage) | `drive/mouse_drive/` | chowdsp_wdf |
| Muff Clipper | Big Muff clipping stage with hyperbolic functions | `drive/muff_clipper/` | None |
| Muff Drive | Big Muff stages and first order filters | `drive/big_muff/` | chowdsp filters |
| Range Booster | PNP transistor solved by Newton Raphson (Rangemaster) | `drive/RangeBooster.cpp` | chowdsp filters |
| RONN | Random recurrent convolutional network (C. Steinmetz's idea) | `drive/RONN.cpp` | RTNeural |
| Tube Screamer | WDF (clipping stage) | `drive/tube_screamer/` | chowdsp_wdf |
| Waveshaper | Surge waveshapers (ADAA, Buchla 259 wavefolder from DAFx 17) | `drive/waveshaper/` | Copied GPL Surge code |
| Warp | Non linear tanh feedback filter solved by Newton Raphson | `drive/Warp.cpp` | chowdsp conformal maps |
| Yen Drive | WDF (ZenDrive) | `drive/zen_drive/` | chowdsp_wdf |

#### Tone (13)

| Name | Technique | File | Dependencies |
| --- | --- | --- | --- |
| Amp IRs | Cabinet IR convolution, user loading | `tone/amp_irs/` | `juce::dsp::Convolution` |
| Bass Cleaner | Analogue filter discretised by bilinear transform | `tone/BassCleaner.cpp` | chowdsp filters |
| Bassman Tone | Fender tone stack in WDF | `tone/bassman/` | chowdsp_wdf |
| Baxandall EQ | WDF after Werner et al. (IEEE, 2018) | `tone/baxandall/` | chowdsp_wdf |
| Blonde Tone | Band EQ (SVF bell, low pass) | `tone/BlondeTone.cpp` | chowdsp_eq |
| Graphic EQ | 5 bands with adaptive Q | `tone/GraphicEQ.cpp` | chowdsp filters |
| High Cut | Discretised analogue low pass | `tone/HighCut.cpp` | chowdsp filters |
| LoFi IRs | Convolution with IRs of toys and keyboards | `tone/LofiIrs.cpp` | `juce::dsp::Convolution` |
| Muff Tone | Big Muff tone stack, several variants | `tone/BigMuffTone.cpp` | chowdsp filters |
| SVF | Multimode state variable filter | `tone/StateVariableFilter.cpp` | chowdsp filters |
| Treble Booster | Klon tone filter | `tone/TrebleBooster.cpp` | chowdsp filters |
| TS-Tone | Tube Screamer tone circuit in WDF | `tone/tube_screamer_tone/` | chowdsp_wdf |
| Ladder Filter | 4-pole high pass and low pass ladder, non linear drive (B. Warns) | `tone/ladder_filter/` | None |

#### Modulation (12)

| Name | Technique | File | Dependencies |
| --- | --- | --- | --- |
| Chorus | Multi phase, optional BBD line for lo fi | `modulation/Chorus.cpp` | chowdsp BBD and Hilbert |
| Flanger | Modulated delay, optional BBD | `modulation/Flanger.cpp` | chowdsp BBD |
| MIDI Modulator | Modulation source from a MIDI CC | `modulation/MIDIModulator.cpp` | None |
| Panner | Modulatable panner | `modulation/Panner.cpp` | None |
| Param Modulator | Parameter used as a modulation source | `modulation/ParamModulator.cpp` | None |
| Phaser4 | 4-stage phaser (Schulte filters) | `modulation/phaser/` | chowdsp filters |
| Phaser8 | 8-stage Phase 90 style phaser, two outputs | `modulation/phaser/` | chowdsp filters |
| Rotary | Rotating speaker (modulated Lagrange delay) | `modulation/Rotary.cpp` | chowdsp delay |
| Scanner Vibrato | Hammond scanner vibrato in WDF | `modulation/scanner_vibrato/` | chowdsp_wdf |
| Solo-Vibe | Uni-Vibe: allpass stages driven by an LDR table | `modulation/uni_vibe/` | None |
| Tremolo | Tremolo with smoothed LFO | `modulation/Tremolo.cpp` | chowdsp filters |
| Laser Trem | Frequency shifting with a Hilbert filter | `modulation/FrequencyShifter.cpp` | chowdsp Hilbert |

#### Utility (9)

| Name | Technique | File | Dependencies |
| --- | --- | --- | --- |
| Clean Gain | Linear gain | `utility/CleanGain.cpp` | None |
| DC Bias | Adds a constant | `utility/DCBias.h` | None |
| DC Blocker | Adjustable high pass | `utility/DCBlocker.h` | chowdsp filters |
| Frequency Splitter | Three-way crossover | `utility/FreqBandSplitter.cpp` | chowdsp crossover |
| Mixer | Sum of four inputs | `utility/Mixer.cpp` | None |
| Oscilloscope | Visualisation | `utility/Oscilloscope.cpp` | chowdsp_visualizers |
| Stereo Merger | Two mono to stereo | `utility/StereoMerger.cpp` | None |
| Stereo Splitter | Stereo to two mono | `utility/StereoSplitter.cpp` | None |
| Tuner | A440 tuner | `utility/Tuner.cpp` | chowdsp tuner |

#### Other (12)

| Name | Technique | File | Dependencies |
| --- | --- | --- | --- |
| Compressor | Compressor with level detector | `other/Compressor.cpp` | chowdsp detector |
| Crying Child | Cry Baby wah, DK nodal method, oversampling | `other/cry_baby/` | chowdsp resamplers |
| Delay | Feedback delay, lo fi BBD or ping pong, tempo sync | `other/Delay.cpp` | chowdsp delay, BBD and rhythm |
| Envelope Filter | Envelope driven SVF | `other/EnvelopeFilter.cpp` | chowdsp filters |
| Level Detective | Envelope follower | `other/LevelDetective.cpp` | chowdsp detector |
| Gate | Noise gate | `other/Gate.cpp` | chowdsp detector |
| Octaver | Sub octave by frequency divider (U-Boat style) | `other/Octaver.cpp` | chowdsp filters |
| Poly Octave | Polyphonic octave generator by filter bank (Aalto thesis) | `other/poly_octave/` | None |
| Shimmer Reverb | FDN and pitch shifter | `other/ShimmerReverb.cpp` | chowdsp reverb and pitch shifter |
| Smooth Reverb | Diffusers and FDN | `other/SmoothReverb.cpp` | chowdsp reverb |
| Spring Reverb | Reflection network and Schroeder allpass, resampling | `other/spring_reverb/` | chowdsp resamplers |
| Krusher | Sample rate and bit reduction; Jai implementation with C++ fallback | `other/krusher/` | Optional Jai compiler |

The WDF cores (`*WDF.h`) include only `pch.h` and `OmegaProvider.h` and use JUCE only marginally (zero to two occurrences per file, measured with `grep -c 'juce::\|jassert\|SmoothedValue\|AudioBuffer\|dsp::'`): they are the only parts of BYOD that would move into our `dsp/` without a rewrite. The circuit schematics are provided as SVG in [`res/schematics/`](https://github.com/Chowdhury-DSP/BYOD/tree/main/res/schematics) and Python derivation scripts in [`sim/`](https://github.com/Chowdhury-DSP/BYOD/tree/main/sim).

## 3. BYOD: foundation

### 3.1 Build

A static library `juce_plugin_modules` groups JUCE and all third party modules, linked to the plugin and the test executable ([`modules/CMakeLists.txt`](https://github.com/Chowdhury-DSP/BYOD/blob/main/modules/CMakeLists.txt)). The neural networks are compiled twice (SSE or ARM, and AVX) with selection at run time ([`src/CMakeLists.txt`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/CMakeLists.txt), function `make_lib_simd_runtime`). The version is hard coded in `project()` and differs between iOS and desktop ([`CMakeLists.txt:6-10`](https://github.com/Chowdhury-DSP/BYOD/blob/main/CMakeLists.txt#L6-L10)). Paid add-on modules come from a private repository (`BYOD_BUILD_ADD_ON_MODULES`).

### 3.2 chowdsp_utils modules used

| Module | Licence (`license:` field) | Use in BYOD |
| --- | --- | --- |
| `chowdsp_plugin_base` | GPL v3 | `chowdsp::PluginBase`: plugin base class |
| `chowdsp_plugin_utils` | GPL v3 | Global settings, `DeferredAction`, utilities |
| `chowdsp_dsp_utils` | GPL v3 | `VariableOversampling`, delays, BBD, filters, resamplers |
| `chowdsp_eq`, `chowdsp_compressor`, `chowdsp_reverb`, `chowdsp_sources` | GPL v3 | EQ, level detectors, FDN, oscillators |
| `chowdsp_gui`, `chowdsp_visualizers` | GPL v3 | LookAndFeel, oscilloscope |
| `chowdsp_presets` (v1, not `presets_v2`) | BSD 3 | Preset manager |
| `chowdsp_serialization`, `chowdsp_logging`, `chowdsp_units`, `chowdsp_rhythm`, `chowdsp_fuzzy_search`, `chowdsp_clap_extensions` | BSD 3 | Serialisation, crash log, units, tempo sync, preset search |
| `chowdsp_parameters`, `chowdsp_data_structures` (transitive dependencies) | BSD 3 | Forwarding parameters, arena, `SmallVector` |

### 3.3 Presets and state

1. The state is XML: the chain (each processor serialises its APVTS, its screen position and its forwarding slot), the preset state and the plugin version ([`src/state/StateManager.cpp:29-37`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/state/StateManager.cpp#L29-L37), [`BaseProcessor.cpp`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.cpp) function `toXML`).
2. Missing version: fallback to `1.0.1`; migration branches test the version (`stateVersion <= "1.2.1"_v`) ([`ProcessorChainStateHelper.cpp:63-78`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainStateHelper.cpp#L63-L78)). This is the pattern of our rules, applied with `chowdsp::Version` (BSD).
3. 41 factory presets `.chowpreset` in [`res/presets/`](https://github.com/Chowdhury-DSP/BYOD/tree/main/res/presets), plus an optional online preset server and CLAP preset discovery, useless for us.

### 3.4 Tests

`juce::UnitTest` framework in a console application, launched with `BYOD --unit-tests --all`. Most tests run **automatically on every processor** in the table thanks to `runTestForAllProcessors` ([`src/headless/tests/UnitTests.h:3-24`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/headless/tests/UnitTests.h#L3-L24)).

| Test | What it checks | Remark |
| --- | --- | --- |
| `SilenceTest` | Noise at the input does not give a silent output (> 1e-6) | The name is misleading: it is a "no silence" test |
| `NaNResetTest` | A block of NaN resets the chain, then the sound comes back | Relies on `sanitizeBuffer` at the end of `processBlock` ([`BYOD.cpp:88-89`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/BYOD.cpp#L88-L89)) |
| `ParameterSmoothTest` | Parameter jump without a discontinuity > 0.1 | All processors |
| `PreBufferTest` | No DC or transient at startup | All processors |
| `StereoTest` | Mono, stereo, left, right routing | DC signals of known sign |
| `BadModulationTest` | Modulation outputs stay finite and bounded | |
| `ForwardingParamStabilityTest` | Names and targets of forwarding parameters stable, old states reloaded | State files kept |
| `ProcessorStoreInfoTest` | The table tells the truth (name, category, ports) | |
| `UndoRedoTest` | 100 random operations undone then redone | |
| `PresetsTest`, `PresetSearchTest`, `AmpIRsSaveLoadTest`, `RAMUsageTest`, `WaveshaperTest` | Presets, search, user IRs, memory, waveshaper NaN | |

No audio reference, no frequency response test against a formula, no block size independence test.

### 3.5 CI

[`.github/workflows/cmake.yml`](https://github.com/Chowdhury-DSP/BYOD/blob/main/.github/workflows/cmake.yml): Linux (g++ 11), Windows (clang-cl), macOS 13. Unit tests on Linux and Windows; `auval` on macOS; pluginval **only on Windows**, version `v1.0.0-beta5`, **strictness 7** ([`scripts/validate.sh:5,47`](https://github.com/Chowdhury-DSP/BYOD/blob/main/scripts/validate.sh#L47)). No pluginval on Linux (disabled in the script). A separate workflow applies clang-format 14 to PRs.

## 4. Valentine

### 4.1 Fact sheet

| Point | Finding |
| --- | --- |
| Language, build | C++20, CMake 3.24.1, Ninja in CI |
| JUCE | Submodule `libs/JUCE` on the `juce8` branch |
| Formats | AU, VST3, Standalone |
| Version | `VERSION` file read by CMake, git hash injected through `version.h.in` ([`CMakeLists.txt:17-41`](https://github.com/tote-bag-labs/valentine/blob/main/CMakeLists.txt#L17-L41)) |
| DSP | `libs/tote_bag/dsp/`, about 1,300 lines, **depends on JUCE** and, for the compressor, on ff_meters |
| Tests | Catch2 v3.4.0 through `FetchContent`, `catch_discover_tests`, 3 files |
| CI | Linux, macOS, Windows; `ctest`; pluginval 1.0.3 strictness 10; signing, notarisation and installers |

### 4.2 Architecture

There is no DSP separation without JUCE: the `tote_bag/dsp` classes take `juce::dsp::AudioBlock`, use `juce::Atomic`, `juce::SmoothedValue`, `juce::AudioBuffer`, and the compressor writes directly into an `FFAU::LevelMeterSource` **on every sample** ([`libs/tote_bag/dsp/Compressor.cpp:144`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Compressor.cpp#L144)). Parameters arrive through `parameterChanged`, which pushes into atomics or calls setters ([`src/PluginProcessor.cpp:490-571`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L490-L571)); no per block snapshot. The parameter table is made of parallel arrays indexed by an `enum class` ([`src/ValentineParameters.h`](https://github.com/tote-bag-labs/valentine/blob/main/src/ValentineParameters.h)), with `ParameterID` at version 1.

Processing order ([`src/PluginProcessor.cpp:305-436`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L305-L436)):

1. Copy of the input, then the dry signal is delayed by the total latency.
2. Optional crush at the base rate: sample hold (ZOH) with fractional interpolation, then bit quantisation ([`libs/tote_bag/dsp/DigiDegraders.cpp`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/DigiDegraders.cpp)). The aliasing is intended.
3. Ramped input gain (`Compress`, from -21 to +48 dB): it is what pushes into a fixed threshold, in the manner of an 1176.
4. **4x** oversampling: `juce::dsp::Oversampling` with two polyphase IIR half band stages ([`:631-634`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L631-L634); `kOversampleFactor = 2` is the exponent, [`:21`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L21) and [`:240-241`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L240-L241)).
5. Compressor, then optional saturation, then optional clipper, at the oversampled rate.
6. Downsampling, fractional delay of the processed signal, ramped output gain, mix.

### 4.3 Algorithms

| Block | Algorithm | Where |
| --- | --- | --- |
| Detection | Mono sidechain (average of the channels), conversion to dB, one pole attack/release smoothing **in the log domain** ("decoupled branched") | [`EnvelopeDetector.cpp:81-91`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/EnvelopeDetector.cpp#L81-L91), [`Compressor.cpp:127-156`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Compressor.cpp#L127-L156) |
| Curve | Classic quadratic soft knee from Giannoulis, Massberg and Reiss (JAES 2012); the source is not cited in the code | [`Compressor.cpp:83-120`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Compressor.cpp#L83-L120) |
| Coupling | A single ratio knob (1 to 20, then "infinite" = 1000); knee (7 to 0 dB) and threshold (-15 to -10 dB) are derived from it by piecewise linear interpolation over 6 points | [`ValentineParameters.h:50-90`](https://github.com/tote-bag-labs/valentine/blob/main/src/ValentineParameters.h#L50-L90), [`tbl_math.hpp:56-68`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/utils/tbl_math.hpp#L56-L68) |
| Saturation | `asinh` with **first order ADAA** (antiderivative `x·asinh(x) − √(x²+1)`), asymmetry through a different gain depending on the sign, compensation gain `1/asinh(g)` | [`Saturation.cpp:49-75`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Saturation.cpp#L49-L75), [`Saturation.h:89-117`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Saturation.h#L89-L117) |
| Clipper | Plain `tanh` with a fixed gain of -6 dB (the ADAA type exists but is not the one chosen) | [`PluginProcessor.cpp:628-629`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L628-L629) |
| Latency | Reported latency = ceiling of (oversampling + 0.5 + 0.5); the processed path is delayed by the difference with the real latency through a Lagrange 3 line whose delay glides over 1 s when a stage is enabled | [`PluginProcessor.cpp:649-695`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L649-L695) |

**Defects visible on reading** (not verified by running):

1. The mix applies the unsmoothed `mix` to the processed signal and the smoothed `currentMix` to the dry signal ([`PluginProcessor.cpp:431`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L431)): the sum is no longer constant during a ramp.
2. At the maximum ratio, the branch that sets 1000:1 has no `else`, and `setRatio (newValue)` immediately overwrites it with 21 ([`:521-529`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L521-L529)).
3. `Saturation::processBlock` calls `getNextValue()` once per channel and per sample ([`Saturation.cpp:161-170`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Saturation.cpp#L161-L170)): the ramp advances twice as fast in stereo and the two channels receive different gains.
4. The compensation counts 0.5 sample for each ADAA stage, whereas the ADAA runs at the 4x rate (so 0.125 sample at the base rate) and the clipper is not ADAA ([`:651-653`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L651-L653)). The principle remains good; the calculation must be redone by measurement.
5. The `EnvelopeDetector` automatic release is computed but never used: `getReleaseCoefficient` is called nowhere ([`EnvelopeDetector.cpp:73-79`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/EnvelopeDetector.cpp#L73-L79)).
6. `getTailLengthSeconds` returns 0 although the release goes up to 1.1 s; the saved state carries no version number ([`:574-617`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L574-L617)).

### 4.4 Tests

Three files ([`tests/`](https://github.com/tote-bag-labs/valentine/tree/main/tests)): `MathTests.cpp` (index search and piecewise interpolation), `AudioHelpersTests.cpp` (next power of two, bounded `cosh` that does not overflow) and `PluginBasics.cpp`, which contains only `REQUIRE (1 == 1)`; the processor test is commented out because of memory leaks ([`tests/PluginBasics.cpp:5-21`](https://github.com/tote-bag-labs/valentine/blob/main/tests/PluginBasics.cpp#L5-L21)). No test of the compressor, the saturation or the latency. The `Tests` target is linked to the plugin target and borrows its definitions and includes, to avoid an ODR violation ([`CMakeLists.txt:261-288`](https://github.com/tote-bag-labs/valentine/blob/main/CMakeLists.txt#L261-L288)): this is the Pamplejuce setup in an older version.

### 4.5 CI

[`.github/workflows/cmake_ctest.yml`](https://github.com/tote-bag-labs/valentine/blob/main/.github/workflows/cmake_ctest.yml): Linux, macOS, Windows matrix; clang, Ninja, ccache; `ctest --output-on-failure`; **pluginval 1.0.3 strictness 10 on the VST3 on all three OSes**, with Xvfb on Linux; macOS signing and notarisation, Inno Setup installer on Windows, GitHub release on tag `v*`. This is the Pamplejuce model, already chosen in the playbook.

## 5. To reuse

Licence "GPL v3" means: only if our plugin is AGPL v3, with an ADR (`CLAUDE.md`, hard constraints). An idea is not protected; only code is.

### 5.1 Code to plug in or extract

| What | Source | Licence | Layer on our side | Remark |
| --- | --- | --- | --- | --- |
| chowdsp_wdf | BYOD submodule | BSD 3 | `dsp/` | Header only WDF library, without JUCE; it is the tool behind all of BYOD's circuits |
| RTNeural | BYOD submodule | BSD 3 | `dsp/` | Realtime network inference (LSTM, GRU, convolutions); take it only if a trained model is part of the SPEC |
| math_approx | BYOD submodule | BSD 3 | `dsp/` | Fast approximations (including Wright omega for diodes in WDF) |
| `chowdsp::ForwardingParametersManager` | `chowdsp_parameters` | BSD 3 | `plugin/` | If we ever have a dynamic chain: the only clean way to expose its parameters to the VST3 host |
| `chowdsp::ArenaAllocator` | `chowdsp_data_structures` | BSD 3 | `dsp/` | Scratch buffers without allocation on the audio thread |
| Circuit WDF cores (`TubeScreamerWDF.h`, `ZenDriveWDF.h`, `MXRDistWDF.h`, `BaxandallWDF.h`, `BassmanToneStack.*`, `DiodeClipperWDF.h`…) | BYOD `src/processors/**/` | GPL v3 | `dsp/` | Almost without JUCE; light adaptation (remove `pch.h`) |
| Jiles Atherton hysteresis | BYOD `drive/hysteresis/` | GPL v3 | `dsp/` | Tape or transformer saturation; uses chowdsp SIMD |
| Range Booster, Warp | BYOD `drive/` | GPL v3 | `dsp/` | Small self contained files with Newton Raphson solving |
| Preset files, SVG schematics, `sim/` scripts | BYOD `res/`, `sim/` | GPL v3 | None (reference) | The schematics help us rebuild a circuit ourselves with chowdsp_wdf |
| `Saturation` (asinh ADAA) and `Compressor` | Valentine `libs/tote_bag/dsp/` | GPL v3 | `dsp/` | Better rewritten: coupled to JUCE and ff_meters, with defects 1 to 5 above |
| ff_meters | Valentine submodule | BSD 3 | `ui/` | Ready made level and gain reduction meters; compare with `foleys_gui_magic` |

### 5.2 Design ideas

| Idea | Seen in | Licence of the original code | Layer on our side |
| --- | --- | --- | --- |
| Single table of modules (name, factory, category, ports) that generates the menu and the tests | BYOD `ProcessorStore.cpp:90-168` | GPL v3 | `plugin/` |
| Parameterised tests that run on **all** table entries (NaN, DC at startup, smoothing, stereo) | BYOD `UnitTests.h:3-24` | GPL v3 | `tests/dsp/`, `tests/plugin/` |
| Prepare and allocate outside the lock, then only swap under the lock; free afterwards | BYOD `ProcessorChainActions.cpp:68-89` | GPL v3 | `plugin/` (to be done with an atomic pointer swap, not a lock) |
| Keep the removed object in the undo action, so it is destroyed off the audio thread | BYOD `ProcessorChainActions.cpp:61-65` | GPL v3 | `plugin/` |
| Sanitised output: if NaN or Inf, reset the DSP | BYOD `BYOD.cpp:88-89` | GPL v3 | `plugin/` |
| Host bypass delayed by the latency | BYOD `BYOD.cpp:92-109`; Valentine `processBlockBypassed` | GPL v3 | `plugin/` |
| Reported latency = worst case rounded to an integer; processed path delayed by the difference, gliding delay | Valentine `PluginProcessor.cpp:649-695` | GPL v3 | `plugin/` and `dsp/` |
| A ratio knob that drives knee and threshold through a table of points | Valentine `ValentineParameters.h:50-90` | GPL v3 | `dsp/` (table in `Params`) |
| Input gain that pushes into a fixed threshold rather than an adjustable threshold | Valentine | GPL v3 | `dsp/` |
| dB detector smoothed in the log domain (Giannoulis 2012) | Valentine `EnvelopeDetector.cpp:81-91` | GPL v3; the method is published | `dsp/` |
| Lo fi at the base rate, non linearities at the oversampled rate | Valentine `PluginProcessor.cpp:347-393` | GPL v3 | `dsp/` |
| Fade over one block on a change of model or structure | BYOD Centaur, Solo-Vibe | GPL v3 | `dsp/` (our 20 ms crossfade remains the rule) |
| Script that creates the files of a new module | BYOD `scripts/new_proc.sh` | GPL v3 | tooling |

### 5.3 To avoid

| Practice | Seen in | Why | Layer concerned |
| --- | --- | --- | --- |
| `SpinLock` shared between UI and audio, block skipped if the lock is taken | BYOD `ProcessorChain.cpp:189-191` | Audible block loss; contrary to `realtime-audio.md` | `plugin/` |
| Module `prepare` and arena allocation on the audio thread when oversampling changes, with logging | BYOD `ProcessorChain.cpp:194-197`, `:304-311` | Allocation and I/O on the audio thread | `plugin/` |
| Graph change and module bypass without crossfade | BYOD `BaseProcessor.cpp:109-112` | Clicks | `dsp/`, `plugin/` |
| One `juce::AudioProcessor` and one APVTS per module | BYOD `BaseProcessor.h:83` | DSP tied to JUCE, impossible to test without JUCE | `dsp/` |
| Display name used as the saved identifier | BYOD `ProcessorStore.cpp:90-168` | Renaming breaks sessions | `plugin/` |
| pluginval on a single OS at strictness 7 | BYOD `scripts/validate.sh` | Our rule is strictness 10 everywhere | CI |
| Resources (IRs, models) without provenance or licence | BYOD `res/` | Legal risk | resources |
| DSP that writes into a UI meter on every sample | Valentine `Compressor.cpp:144` | `dsp/` to `ui/` coupling, per sample cost | `dsp/`, `ui/` |
| Parameters as parallel arrays indexed by an enum | Valentine `ValentineParameters.h` | Easy to desynchronise; prefer one specification per parameter | `plugin/` |
| Dummy test that keeps CI green | Valentine `tests/PluginBasics.cpp:5-8` | Gives false assurance | `tests/` |
| Saved state without a version, `getTailLengthSeconds` at 0 for an effect with a long release | Valentine `PluginProcessor.cpp:206-209`, `:574-617` | Contrary to `juce.md` | `plugin/` |
| AU, AUv3, LV2, AAX, CLAP formats, iOS, preset server | Both | Out of scope: VST3 only (ADR 0003) | build |
