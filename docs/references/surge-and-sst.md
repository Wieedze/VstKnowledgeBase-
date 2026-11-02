# Surge XT and the sst libraries

**Verdict: Surge's DSP libraries (sst-basic-blocks, sst-filters, sst-waveshapers, sst-effects) are GPL v3, header only, without JUCE and can be plugged as is into `dsp/` if the plugin is AGPL; in a commercial context only sst-cpputils (MIT), sst-plugininfra (MIT, except its `patch_base.h`, which pulls in GPL), sst-jucegui (MIT, UI) and three dual licensed files from sst-basic-blocks remain, two of which need a small include cleanup.**

Study done on 2026-11-02 on shallow clones of the default branch. The `file:line` paths are relative to the root of each repository and are valid for the commits below.

| Repository | Commit | Date |
| --- | --- | --- |
| [surge](https://github.com/surge-synthesizer/surge/tree/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14) | `0852de8` (tag `Nightly`) | 2026-10-31 |
| [sst-basic-blocks](https://github.com/surge-synthesizer/sst-basic-blocks/tree/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d) | `38cf04a` | 2026-10-25 |
| [sst-filters](https://github.com/surge-synthesizer/sst-filters/tree/87a171bcba52c014850848a29174a54f0adc6606) | `87a171b` | 2026-10-13 |
| [sst-waveshapers](https://github.com/surge-synthesizer/sst-waveshapers/tree/dd12f31a5a9016c9895e52d1a00eee0e1eebe6ce) | `dd12f31` | 2026-02-25 |
| [sst-effects](https://github.com/surge-synthesizer/sst-effects/tree/987b39dcb2e2e61e6225c3bc390fd00da824d226) | `987b39d` | 2026-10-16 |
| [sst-cpputils](https://github.com/surge-synthesizer/sst-cpputils/tree/67601c8d3cc7405569229b9618da55b6420633d7) | `67601c8` | 2026-06-20 |
| [sst-plugininfra](https://github.com/surge-synthesizer/sst-plugininfra/tree/8e4271ce94039652c1cad3d89444c92325e0ce3e) | `8e4271c` | 2026-09-15 |
| [sst-jucegui](https://github.com/surge-synthesizer/sst-jucegui/tree/22a89ca4e54179cbda0b8164e54e06dae5f30490) | `22a89ca` | 2026-10-14 |

None of the sst libraries has a version tag: we pin a commit (`build.md` rule). All of them require C++20 (`static_assert(__cplusplus >= 202002L)` in `sst-filters/include/sst/filters.h:18`) and therefore compile in C++23.

## 1. The sst libraries

| Name | Verified licence | Content | Without JUCE | Last commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| sst-basic-blocks | GPL v3 (`LICENSE.md`, header of each file). Three files dual licensed MIT/GPL3 | Lags and smoothing, one poles, DC blocker, clippers, interpolators, pink and correlated noise, RNG, panners, Hilbert, Lanczos resampler, elliptic BLEP and DPW oscillators, envelopes (ADSR, AHDSR, DAHD...), LFOs, modulation matrix, parameter metadata, tables (dB, 2^x, sine, tempo sync), SIMD operations | Yes | 2026-10-25 | Plug in if AGPL. If commercial: the 3 MIT files only |
| sst-filters | GPL v3 (`LICENSE.md`, `README.md:59`, headers) | 41 four-voice SIMD filter types (section 1.2), Biquad, Butterworth, Linkwitz Riley, half band, tilt | Yes | 2026-10-13 | Plug in if AGPL |
| sst-waveshapers | GPL v3 (`LICENSE.md`, headers) | 44 SIMD waveshapers: saturators, Chebyshev, rectifiers, wavefolders, fuzz, additive harmonics, ZamSat, OJD | Yes | 2026-02-25 | Plug in if AGPL |
| sst-effects | GPL v3 (`LICENSE.md`, headers) | 11 bus effects (reverbs 1 and 2, delay, Nimbus, Bonsai, phaser, flanger, chorus, rotary, TreeMonster, FloatyDelay) and about sixty voice effects (EQ, compressor, modulations, generators) | Yes | 2026-10-16 | Plug in if AGPL, through a config we write |
| sst-cpputils | MIT (`LICENSE.md`, headers) | Lock free ring buffer, fixed allocator, fixed size hash map, LRU, scope guard, `dyn_array`, RTSan macros | Yes | 2026-06-20 | Plug in in every case |
| sst-plugininfra | MIT (`LICENSE_MIT.md`), tinyxml and strnatcmp under zlib, ASIO SDK dual licensed Steinberg/GPL3 | Per OS user paths, user preferences, key bindings, CPU detection, git version, `patch_base.h` (generic patch with migration) | Yes | 2026-09-15 | Useful pieces if commercial, but `patch_base.h` pulls in GPL |
| sst-jucegui | MIT (`LICENSE.md`, headers) | 45 components (Knob, sliders, VU, menus, tabs...), style sheet, JSON layout, `Continuous`/`Discrete` data model | No (juce_gui_basics) | 2026-10-14 | Option for `ui/` in every case, to evaluate on JUCE 9 |

### 1.1 sst-basic-blocks

1. **Licence.** GPL v3. `README.md:10-17` lists three files also usable under MIT, and each one says so in its header: [`include/sst/basic-blocks/dsp/LanczosResampler.h:29-34`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/dsp/LanczosResampler.h#L29-L34), [`HilbertTransform.h:31`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/dsp/HilbertTransform.h#L31), [`EllipticBlepOscillators.h:31-34`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/dsp/EllipticBlepOscillators.h#L31-L34). A search over all of `include/` finds no other dual licensed file; the sentence "A very small number of explicitly chosen header files..." present in every header is generic text, not a dual licence.
2. **Pitfall in the three MIT files.** They include GPL headers:
   1. `LanczosResampler.h:53-54` includes `simd/setup.h` and `mechanics/simd-ops.h` (GPL). The file itself says to remove the include and to replace the `sum_ps_to_float` call with a homemade SSE3 reduction.
   2. `HilbertTransform.h:62` includes `simd/setup.h` (GPL). The mono float version `HilbertTransformMonoFloat` (line 66) does not need SIMD; only `HilbertTransformStereoSSE` (line 168) does.
   3. `EllipticBlepOscillators.h:37-38` includes Signalsmith's `elliptic-blep` (MIT, `libs/elliptic-blep/LICENSE`) and `SmoothingStrategies.h` (GPL, which includes `Lag.h` and `BlockInterpolators.h`, also GPL). In a commercial context we must supply our own smoothing strategy to the `SmoothingStrategy` template parameter (line 72) and not include `SmoothingStrategies.h`.
3. **Notable content.**
   1. Generic modulation matrix [`mod-matrix/ModMatrix.h`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/mod-matrix/ModMatrix.h): `FixedMatrix` (line 238), size fixed at compile time, routes `source * sourceVia * depth`, per route lag, curves, `prepare` (line 303) that binds pointers, `process` (line 428) that only reads pointers. Used by Six Sines and Shortcircuit XT. 11 tests (`tests/mod_matrix_tests.cpp`).
   2. Parameter metadata [`params/ParamMetadata.h:105`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/params/ParamMetadata.h#L105) (2383 lines): range, default, units, `valueToString`/`valueFromString` (lines 420, 432), fluent builders `asPercent()`, `asDecibelWithRange()`, `asAudibleFrequency()`... 26 tests.
   3. Modulators templated on block size: `modulators/SimpleLFO.h:42`, `modulators/ADSREnvelope.h:50`, `DAHDSREnvelope.h`, `StepLFO.h`.
   4. Smoothing: `dsp/Lag.h` (`OnePoleLag` line 42, `LinearLag` line 111).
4. **CMake integration.** `INTERFACE` target (`CMakeLists.txt:7-9`); it pulls in `sst-cpputils` if present (`:117`) and `simde` on ARM. A `CPMAddPackage("gh:surge-synthesizer/sst-basic-blocks#38cf04a")` followed by `target_link_libraries(dsp PUBLIC sst-basic-blocks)` is enough.
5. **Quality.** 12 Catch2 test files (about a hundred `TEST_CASE`, 32 of them DSP), GitHub CI (`build-tests.yml`, `code-checks.yml`).

### 1.2 sst-filters

1. **Licence.** GPL v3 everywhere, including `filters++/` (header "released under the Gnu General Public Licens version 3", for example `include/sst/filters++/api.h:8`).
2. **Content.** Enumeration [`include/sst/filters/FilterConfiguration.h:25-66`](https://github.com/surge-synthesizer/sst-filters/blob/87a171bcba52c014850848a29174a54f0adc6606/include/sst/filters/FilterConfiguration.h#L25-L66):
   1. Low pass: 12 and 24 dB, legacy ladder, Vintage Ladder (Huovilainen, RK), OB-Xd 12 and 24 dB, K35, Diode Ladder, Cutoff Warp, Resonance Warp, Cascade SVF.
   2. High pass, band pass, notch: 12 and 24 dB, K35, OB-Xd, Cutoff Warp, Resonance Warp, Cascade SVF.
   3. Multi: Tri pole, Cytomic SVF, OB-Xd Xpander.
   4. Effects: comb + and comb −, allpass, Cascade SVF peak and allpass, sample and hold.
   5. Outside the enumeration: `BiquadFilter.h`, `ButterworthLPHP.h`, `LinkwitzRiley.h` (crossovers), `HalfRateFilter.h` (polyphase half band for 2x oversampling), `CytomicTilt.h`, `FastTiltNoiseFilter.h`, and `CytomicSVF.h`, usable on its own in mono.
3. **Two APIs.** The old `QuadFilterUnit` (4 voices in SSE, coefficients computed by `FilterCoefficientMaker`) and the new `filters++` ([`include/sst/filters++/api.h:83`](https://github.com/surge-synthesizer/sst-filters/blob/87a171bcba52c014850848a29174a54f0adc6606/include/sst/filters++/api.h#L83)): `setFilterModel`, `setPassband`, `setSlope`, `setDriveMode`, and delay line memory supplied by the caller (`requiredDelayLinesSizes` line 116, `provideDelayLine` line 125). That last point fits our rule: we allocate in `prepare`, the filter only uses the memory.
4. **Integration.** Header only `INTERFACE` target, with a mandatory dependency on sst-basic-blocks (`CMakeLists.txt:58-61`, fatal error otherwise). `sst-filters-extras` target for `FilterPlotter.h` (non realtime response plotting).
5. **Quality.** 17 test files, CI on Linux, macOS, Windows (`.github/workflows/build-pr.yml:16-48`).

### 1.3 sst-waveshapers

1. **Licence.** GPL v3. The headers `include/sst/waveshapers.h:8` and `utilities/globals.h:8` mistakenly say "sst-jucegui is released under the GNU General Public License 3", which is still GPL.
2. **Content.** [`include/sst/waveshapers/WaveshaperConfiguration.h:27-85`](https://github.com/surge-synthesizer/sst-waveshapers/blob/dd12f31a5a9016c9895e52d1a00eee0e1eebe6ce/include/sst/waveshapers/WaveshaperConfiguration.h#L27-L85): soft, hard, asym, sine, digital, Chebyshev 2 to 5, rectifiers, single/dual/west fold, additive, five fuzzes, sine+x, bounded cycles, ZamSat, OJD, soft fold, linear fold, sine fold. 4-channel processing in SSE (`QuadWaveshaper.h`), static tables (`WaveshaperLUT.h:126`).
3. **No oversampling included.** Combine with `HalfRateFilter` from sst-filters or `juce::dsp::Oversampling`, as `dsp.md` requires.
4. **Integration.** `INTERFACE`, depends on sst-basic-blocks (`CMakeLists.txt:47`).
5. **Quality.** 9 test files, including `ShapesAreBounded.cpp`. The least active (February 2026), which reflects its stability.

### 1.4 sst-effects

1. **Licence.** GPL v3. The presets (`presets/voice-effects`) are in the same repository.
2. **Content.** Bus effects in [`include/sst/effects/`](https://github.com/surge-synthesizer/sst-effects/tree/987b39dcb2e2e61e6225c3bc390fd00da824d226/include/sst/effects): `Reverb1.h`, `Reverb2.h`, `Delay.h`, `FloatyDelay.h`, `Nimbus.h` (Mutable Instruments granular, hence an MIT eurorack dependency), `Bonsai.h` (tape saturation), `Phaser.h`, `Flanger.h`, `Chorus.h`, `RotarySpeaker.h`, `TreeMonster.h`. Voice effects in `include/sst/voice-effects/`: 6-band graphic EQ, N-band parametric EQ, MorphEQ, TiltEQ, compressor, autowah, bitcrusher, ring mod, frequency shifter, tremolo, Shepard phaser, string resonators, widener, microgate...
3. **Architecture.** Each effect is a template over an `FXConfig` that supplies parameter storage, block size, sample rate, dB and pitch conversions ([`effects/EffectCore.h:26-60`](https://github.com/surge-synthesizer/sst-effects/blob/987b39dcb2e2e61e6225c3bc390fd00da824d226/include/sst/effects/EffectCore.h#L26-L60), concept `ValidEffectConfiguration` lines 92-145). Voice effects require the config to also supply memory (`preReservePool`, `checkoutBlock`, `returnBlock`, `voice-effects/VoiceEffectCore.h:80-82`). Each effect exposes `remapParametersForStreamingVersion` (for example `Delay.h:455`) and a `streamingVersion` (`EffectCore.h:273`).
4. **What we have to write.** An `FXConfig`: the example config `effects/ConcreteConfig.h` is not usable as is, because its `rand01` function calls `rand()` (line 85), which `dsp.md` forbids.
5. **Integration.** `INTERFACE`, uses sst-basic-blocks, sst-filters, sst-waveshapers. The `SST_EFFECTS_PRESETS` option adds a static library and tinyxml (`CMakeLists.txt:130-143`).
6. **Quality.** Thin tests: 5 files, including `tests/concrete-runs.cpp:78-84`, which runs each effect for 1000 blocks and only checks `|x| < 2`. The real tests for these effects are in Surge (`UnitTestsFX.cpp`). We will need our own finite output and block size independence tests.

### 1.5 sst-cpputils

1. **Licence.** MIT, verified in each header (17 files out of 17).
2. **Content useful for realtime work.**
   1. [`ring_buffer.h:40,134`](https://github.com/surge-synthesizer/sst-cpputils/blob/67601c8d3cc7405569229b9618da55b6420633d7/include/sst/cpputils/ring_buffer.h#L40): SPSC ring buffer based on atomics, fixed size as a template parameter.
   2. `fixed_allocater.h`: STL allocator over preallocated memory (the default constructor is deleted to force allocation elsewhere).
   3. `small_hash_map.h`: fixed capacity hash table, no allocation after construction (this is the one `ModMatrix` uses).
   4. [`rtsan_support.h:20-27`](https://github.com/surge-synthesizer/sst-cpputils/blob/67601c8d3cc7405569229b9618da55b6420633d7/include/sst/cpputils/rtsan_support.h#L20-L27): macros `SST_CPPUTILS_NONBLOCKING` (applies `[[clang::nonblocking]]`), `SST_CPPUTILS_RTSAN_DISABLE`/`ENABLE` (RAII guard), all neutral without RTSan. Exactly what `realtime-audio.md` asks for.
   5. `scope_guard.h`, `lru_cache.h`, `dyn_array.h`, `active_set_overlay.h` (allocation free active set, useful for active voices).
3. **Quality.** 3 test files (157 `TEST_CASE`, mostly `scope_guard`), CI on 3 OSes.

### 1.6 sst-plugininfra

1. **Licence.** MIT ([`LICENSE.md`](https://github.com/surge-synthesizer/sst-plugininfra/blob/8e4271ce94039652c1cad3d89444c92325e0ce3e/LICENSE.md)), except `libs/tinyxml` and `libs/strnatcmp` (zlib). `libs/asiosdk` (not mentioned in `LICENSE.md`) is the ASIO SDK 2.3.4 under a dual Steinberg proprietary or GPL3 licence (`libs/asiosdk/LICENSE.txt`); no CMake target links it, it is only used by standalone applications.
2. **Content.** `paths.h` (documents and data folders per OS), `userdefaults.h`, `keybindings.h`, `cpufeatures.h`, `version_information.h` (version and git hash generated by CMake, `CMakeLists.txt:60-70`), and [`patch-support/patch_base.h`](https://github.com/surge-synthesizer/sst-plugininfra/blob/8e4271ce94039652c1cad3d89444c92325e0ce3e/include/sst/plugininfra/patch-support/patch_base.h).
3. **`patch_base.h` in detail.** Generic CRTP patch. A concept requires `patchVersion > 0`, an `id`, `migratePatchFromVersion(uint32_t)` and `migrateParamValueFromVersion(par, float, uint32_t)` (lines 42-49). `toState` (line 168) writes XML `<patch id version><params><p id value/>`; `fromState` (line 211) checks the `id`, reads the version, ignores unknown IDs ("vestigal param", line 62 of the body), applies per parameter migration (line 277) and then global migration (line 301). **Licence pitfall**: on line 27, it includes `sst/basic-blocks/params/ParamMetadata.h`, which is GPL. The file is MIT but cannot be used as is in a commercial context; the idea, however, can be reproduced.
4. **Integration.** Static target `sst-plugininfra` (EXCLUDE_FROM_ALL) and optional `patchbase` target (`SST_PLUGININFRA_PROVIDE_PATCHBASE`, `CMakeLists.txt:53-57`) that links tinyxml, sst-basic-blocks and clap. 6 test files.

### 1.7 sst-jucegui

1. **Licence.** MIT (`LICENSE.md`, and in the header of each file: "you may use this in commercial software if you are a JUCE Licensee", for example `include/sst/jucegui/components/Knob.h:8-12`). The only file without this header is `md4c.h` (Markdown parser, MIT).
2. **Content.** 45 components in `include/sst/jucegui/components/`, a data model independent of the APVTS ([`data/Continuous.h:34`](https://github.com/surge-synthesizer/sst-jucegui/blob/22a89ca4e54179cbda0b8164e54e06dae5f30490/include/sst/jucegui/data/Continuous.h#L34): `getValue`, `setValueFromGUI`, `setValueFromModel`, `getValueAsString`...), a hierarchical style sheet (`style/StyleSheet.h`), a JSON layout engine (`layouts/JsonLayoutEngine.h`), modal screens and a key binding editor.
3. **Limits.** No tests (0 files), no APVTS adapter provided (we must write a `Continuous` that wraps a `RangedAudioParameter`). The examples download JUCE 8.0.4 (`CMakeLists.txt:30`): JUCE 9 compatibility not verified.

## 2. Surge XT

### 2.1 Architecture

1. **Engine without JUCE.** `src/common/` is the `surge-common` target: `SurgeSynthesizer`, `SurgeStorage`, `SurgePatch`, `SurgeVoice`, oscillators, effects, modulators. No JUCE `#include` in `src/common` (verified by search); the target links a `surge-juce` interface that only carries `#define`s (`src/CMakeLists.txt:86-110`). The CI compiles this engine on its own ("Windows MSVC surge-common only", `.github/workflows/build-pr.yml:16`).
2. **Thin JUCE layer.** `src/surge-xt/SurgeSynthProcessor.*` adapts the engine: each Surge `Parameter` becomes a `juce::RangedAudioParameter` through `SurgeParamToJuceParamAdapter` (`SurgeSynthProcessor.h:108`), and the UI (`src/surge-xt/gui/`) talks to the engine directly.
3. **Fixed internal block.** `BLOCK_SIZE` is a compile time constant, 32 by default ([`src/common/globals.h:45-57`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/globals.h#L45-L57), `src/CMakeLists.txt:17-18`), oscillators oversampled 2x. `processBlock` ([`SurgeSynthProcessor.cpp:566`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/surge-xt/SurgeSynthProcessor.cpp#L566)) consumes the host's samples one by one, calls `surge->process()` every 32 samples (line 737) and reads the output with a circular index `blockPos` (line 778). Same choice as Drum Foundry.
4. **Forked JUCE.** The `libs/JUCE` submodule points to `github.com/surge-synthesizer/JUCE`, not to official JUCE.
5. **Formats.** VST3, AU, AUv3, LV2, Standalone, CLAP through clap-juce-extensions (`src/CMakeLists.txt:121-148`). C++20, CMake 3.22.

### 2.2 Modulation

1. **Sources.** Enumeration `modsources` ([`src/common/ModulationSource.h:40-82`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/ModulationSource.h#L40)): velocity, keytrack, poly and mono aftertouch, pitch bend, mod wheel, 8 macros, 2 envelopes, 6 voice LFOs, 6 scene LFOs, timbre (MPE), release velocity, random and alternating, breath, expression, sustain, lowest, highest and latest note. The LFOs have MSEG and Lua formula shapes (`dsp/modulators/`).
2. **Routing.** A route is a plain structure `ModulationRouting { source_id, destination_id, depth, muted, source_index, source_scene }` ([`ModulationSource.h:273`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/ModulationSource.h#L273)) stored in three `std::vector`: `modulation_voice`, `modulation_scene` (`SurgeStorage.h:892`) and `modulation_global` (`SurgeStorage.h:1388`).
3. **Application.** Per block of 32, each voice copies the parameter values into a local array (`memcpy(localcopy, paramptr, ...)`, `dsp/SurgeVoice.cpp:177`), then `applyModulationToLocalcopy` ([`SurgeVoice.cpp:1271`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/dsp/SurgeVoice.cpp#L1271)) adds `depth * source->get_output() * (1 - muted)` to each destination (line 1286). The DSP then only reads `localcopy`. It is the same principle as our `Params` snapshot, applied per voice.
4. **How it is made "realtime": with a mutex.** The routing is protected by a `std::recursive_mutex modRoutingMutex` (`SurgeStorage.h:1838`) that **`process()` locks on the audio thread** ([`SurgeSynthesizer.cpp:5051`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/SurgeSynthesizer.cpp#L5051), then 5117, 5189, 5199), and that the UI locks in `setModDepth01` (line 4288). This model violates `realtime-audio.md` (blocking lock); it works in practice because the UI holds the lock for a very short time. Do not reproduce it: prefer the `FixedMatrix` from sst-basic-blocks (pointers bound in `prepare`, no lock in `process`) with a route table swapped through an atomic pointer.

### 2.3 Presets

1. **Format.** `.fxp` file: a VST2 `fxChunkSetCustom` binary header ('CcnK', 'FPCh') followed by a `patch_header` (tag, XML size, sizes of the embedded wavetables), then the patch as XML and the wavetables as binary ([`src/common/PatchFileHeaderStructs.h`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/PatchFileHeaderStructs.h)). The XML is read with tinyxml (`SurgePatch.cpp:1794`). The DAW state goes through the same path (`SurgeSynthProcessor.cpp:1546`, `getStateInformation`).
2. **Patch streaming revision.** A single integer constant, `ff_revision = 31` ([`src/common/SurgeStorage.h:156`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/SurgeStorage.h#L156)), preceded by a log in a comment that describes each increment since revision 0 (lines 94-154). On save, the `revision` attribute is written (`SurgePatch.cpp:4094`). On load, it is read (lines 1849-1850), a patch newer than the binary triggers a warning (line 1854), then a sequence of `if (revision < N)` blocks applies the migrations in order: 25 blocks in `SurgePatch.cpp` (for example line 2464 for `< 1`, 2548 for the resonance rescaled in `< 6`, 3330 for `< 23`). The sst effects carry their own version and their own `remapParametersForStreamingVersion` (section 1.4).
3. **Loading off the audio thread, but started from it.** `process()` detects a queued patch (`patchid_queue`, atomic), sets `halt_engine` (the engine outputs silence) and **creates a `std::thread`** to load it (`SurgeSynthesizer.cpp:4996`, function `loadPatchInBackgroundThread` line 4542). Creating a thread from the audio thread is forbidden for us; the idea "silence during loading, then resume" remains good with a permanent background thread.

### 2.4 Tests

1. **Framework.** Catch2 v3, `surge-testrunner` binary (`src/surge-testrunner/CMakeLists.txt`), linked to `surge-common` and `juce_audio_basics` only. The tests drive the engine without a host (`HeadlessUtils.h`, `Player.h`).
2. **Coverage.** About 180 `TEST_CASE` split by area: `UnitTestsIO.cpp` 34 (reading patches, corrupted WAVs rejected, line 387), `UnitTestsTUN.cpp` 29 (tuning), `UnitTestsDSP.cpp` 23, `UnitTestsLUA.cpp` 20, `UnitTestsMIDI.cpp` 16, `UnitTestsMOD.cpp` 14 (envelopes, MPE pitch bend, controller smoothing), `UnitTestsFX.cpp` 11 (each effect created and processed, reverb at high sample rate, poisoned state cleared on stop).
3. **Golden audio tests.** [`UnitTestsGOLDEN.cpp`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/surge-testrunner/UnitTestsGOLDEN.cpp): the expected samples are hard coded in the source, tolerance `GOLDEN_TOL = 1e-5f` (line 60). `goldenCheckOrPrint` (line 77) compares with `Catch::Approx(...).margin` (line 95) or, in print mode, regenerates the C++ array to paste. Performance tests are hidden by the `[.]` tag (line 327).
4. **UI tests.** `src/surge-xt/xt-tests/` only tests OSC.

### 2.5 CI

1. **GitHub Actions** ([`.github/workflows/build-pr.yml`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/.github/workflows/build-pr.yml)): Windows MSVC (x64, ARM64, ARM64EC, JUCE 7), Ubuntu gcc13, Ubuntu ARM, macOS, Docker Ubuntu 22, and `surge-testrunner` run by `ctest` on macOS, Linux and Windows (lines 87-107, 140). `code-checks.yml` checks clang-format. `build-release.yml` builds the installers.
2. **No pluginval.** No occurrence in `.github`, `azure-pipelines.yml`, `cmake/` or the `CMakeLists.txt` files. Surge does not validate its binaries against a host in CI; our `testing.md` rule (pluginval strictness 10) goes further.

## 3. Realtime counterexamples found

| Location | What happens | Rule concerned |
| --- | --- | --- |
| `surge/src/common/SurgeSynthesizer.cpp:5051` | `recursive_mutex::lock()` in `process()` | Blocking lock forbidden |
| `surge/src/common/SurgeSynthesizer.cpp:4996` | `std::make_unique<std::thread>` in `process()` | Allocation and thread creation forbidden |
| `sst-effects/include/sst/effects/ConcreteConfig.h:85` | `rand()` | Deterministic generator mandatory (`dsp.md`) |
| `sst-basic-blocks/.../mod-matrix/ModMatrix.h:254` | `std::function` called per route in `process` | Acceptable (assigned in `prepare`, the call does not allocate), but an indirect cost per control sample |
| `sst-basic-blocks/.../mod-matrix/ModMatrix.h:436` | `unordered_map::at` in `process` | Lookup without allocation, near constant time; watch it with RTSan |

## 4. To reuse

Each row gives the verified licence and the layer on our side. "AGPL only" means usable only if ADR 0001 chooses AGPL v3.

### (a) Libraries to plug in as is

| # | Library | Licence | Layer | Use |
| --- | --- | --- | --- | --- |
| 1 | sst-cpputils | MIT | `dsp/`, `plugin/` | `ring_buffer.h` (SPSC FIFO), `fixed_allocater.h`, `small_hash_map.h`, and above all `rtsan_support.h` to mark `process` as `[[clang::nonblocking]]` |
| 2 | sst-basic-blocks | GPL v3, AGPL only | `dsp/` | Lags, LFOs, envelopes, clippers, DC blocker, `FixedMatrix` as the modulation matrix, `ParamMetaData` to describe parameters |
| 3 | sst-filters | GPL v3, AGPL only | `dsp/` | 41 modelled analogue filter types, Linkwitz Riley for crossovers, `HalfRateFilter` for 2x oversampling |
| 4 | sst-waveshapers | GPL v3, AGPL only | `dsp/` | 44 saturations and wavefolders, to be wrapped in oversampling |
| 5 | sst-effects | GPL v3, AGPL only | `dsp/` | Reverbs, delays, chorus, phaser, flanger, rotary, EQ, compressor; requires writing a deterministic `FXConfig` |
| 6 | sst-jucegui | MIT (JUCE commercial licence or GPL3 for the whole) | `ui/` | Knobs, sliders, VU, style sheet; write the APVTS adapter to `data::Continuous`, check JUCE 9 |
| 7 | sst-plugininfra (`sst-plugininfra` target without `patchbase`) | MIT, tinyxml zlib | `plugin/` | User paths for presets, preferences, git version |

### (b) Extractable code

| # | File or class | Licence | Layer | Extraction work |
| --- | --- | --- | --- | --- |
| 1 | `sst-basic-blocks/include/sst/basic-blocks/dsp/LanczosResampler.h` | MIT or GPL3 | `dsp/` | Remove the includes on lines 53-54 and replace `sum_ps_to_float` with an SSE3 reduction, as the file says |
| 2 | `sst-basic-blocks/include/sst/basic-blocks/dsp/HilbertTransform.h`, class `HilbertTransformMonoFloat` (line 66) | MIT or GPL3 | `dsp/` | Take the mono float version without `simd/setup.h`; useful for frequency shifter and pitch shift |
| 3 | `sst-basic-blocks/include/sst/basic-blocks/dsp/EllipticBlepOscillators.h` + `libs/elliptic-blep` (Signalsmith) | MIT or GPL3, Signalsmith MIT | `dsp/` | Supply our own `SmoothingStrategy` (line 72) instead of including `SmoothingStrategies.h` (GPL) |
| 4 | `sst-cpputils/include/sst/cpputils/rtsan_support.h` | MIT | `dsp/` | Can be copied alone (81 lines, no dependency) if we do not want the whole library |
| 5 | `sst-filters/include/sst/filters/CytomicSVF.h`, `LinkwitzRiley.h`, `HalfRateFilter.h` | GPL v3, AGPL only | `dsp/` | Usable alone if we do not want all of sst-filters, but they depend on sst-basic-blocks |
| 6 | `surge/src/surge-testrunner/UnitTestsGOLDEN.cpp:60-100` (`goldenCheckOrPrint`) | GPL v3, AGPL only | tests | Short function; simpler to rewrite from the idea (category c, row 4) |

### (c) Design ideas to reproduce

| # | Idea | Seen in | Layer | What we do |
| --- | --- | --- | --- | --- |
| 1 | Engine compilable without JUCE, CI that compiles it alone | Surge `surge-common`, `build-pr.yml:16` | `dsp/` | CI job that builds the `dsp` target without JUCE (already planned in `03_ARCHITECTURE.md`) |
| 2 | Fixed internal block of 32 with a circular index on the host side | `SurgeSynthProcessor.cpp:566-778` | `plugin/` | Confirms Drum Foundry's choice of 32-sample chunks |
| 3 | Local copy of parameters per block, additive modulation on top | `SurgeVoice.cpp:177`, `:1271` | `dsp/` | Our per block `Params`, extended per voice with a modulation array |
| 4 | Golden hard coded in the test with a "print" mode to regenerate | `UnitTestsGOLDEN.cpp:77` | tests | Option for small golden references; regeneration remains a `golden:` commit validated by the human (`testing.md`) |
| 5 | Single revision number + log of increments in a comment + ordered `if (rev < N)` migrations | `SurgeStorage.h:94-156`, `SurgePatch.cpp:2464-3330` | `plugin/` | Single state version in `State`, log in `CHANGELOG.md`, one migration function per increment, one state file per version in `tests/plugin/states/` |
| 6 | Unknown parameters ignored, per parameter then global migration, patch ID checked | `sst-plugininfra/.../patch_base.h:211-301` | `plugin/` | Same order in `setStateInformation` |
| 7 | Per effect streaming version, per effect parameter remap | `sst-effects`, `EffectCore.h:273`, `Delay.h:455` | `dsp/` + `plugin/` | For a multi effect: each module carries its own version |
| 8 | Effect templated on a config that supplies parameters, memory and sample rate | `sst-effects/EffectCore.h:26-145`, `VoiceEffectCore.h:80-82` | `dsp/` | Processors receive their memory from the caller, never internal allocation |
| 9 | Filter that declares the memory size it needs, then receives the memory | `sst-filters/filters++/api.h:116-130` | `dsp/` | Same contract for our delay lines: `requiredSize()` then `provide(memory)` in `prepare` |
| 10 | Fixed size modulation matrix, pointers bound in `prepare`, `process` without allocation or lock | `sst-basic-blocks/ModMatrix.h:238-470` | `dsp/` | If commercial plugin: rewrite on this model; route table swapped through an atomic pointer, never Surge's mutex |
| 11 | Silence during a heavy load, then resume | `SurgeSynthesizer.cpp` (`halt_engine`) | `plugin/` | With a permanent background thread and a 20 ms crossfade, not a thread created from `process` |
