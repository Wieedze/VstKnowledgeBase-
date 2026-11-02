# Gin

**Verdict: Gin is entirely BSD 3 (permissive bundled dependencies), follows JUCE 9 and is very active, but `gin_plugin` is a complete framework (processor, parameters, presets, UI) that is adopted as a whole instead of the APVTS, and its modulation matrix is not real-time safe when the UI adds or removes a route during playback; `gin_dsp` depends on JUCE and therefore cannot live in `dsp/`.**

Study done on 2026-11-02 on `master` at commit [`9e9c172`](https://github.com/FigBug/Gin/tree/9e9c172de34776c7c3157b5efbdc245dc7a2755f) (2026-11-01). The repository has **no version tag**: we pin a commit. The `file:line` paths are relative to the repository root and apply to that commit.

## 1. Licences

### Gin itself

[`LICENSE`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/LICENSE): **BSD 3-Clause**, "Copyright (c) 2018, Roland Rabien". Each module declares `license: BSD` in its JUCE header (line 24, for example [`modules/gin_plugin/gin_plugin.h:24`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/gin_plugin.h#L24)). Unlike chowdsp_utils, there is no GPL module; examples and tests are under the same licence as the repository.

| Module | Licence | Dependencies (header, line 27) |
| --- | --- | --- |
| `gin` | BSD | juce_core, juce_data_structures |
| `gin_simd` | BSD | juce_core |
| `gin_dsp` | BSD | gin, gin_simd, juce_core, juce_audio_utils, juce_dsp |
| `gin_graphics` | BSD | juce_core, juce_graphics, gin |
| `gin_gui` | BSD | juce_core, juce_graphics, juce_events, juce_gui_basics, juce_gui_extra, gin, gin_graphics |
| `gin_plugin` | BSD | gin, gin_dsp, gin_gui, gin_graphics, juce_audio_utils, juce_audio_processors |
| `gin_standaloneplugin` | BSD | gin_plugin and JUCE audio modules |
| `gin_3d`, `gin_controllers`, `gin_location`, `gin_metadata`, `gin_network`, `gin_remote`, `gin_svg`, `gin_webp` | BSD | of no interest for an audio plugin |

All modules require C++20 (`minimumCppStandard: 20`).

### Bundled dependencies

| Dependency | Module | Licence (file read) | Pulled in by `gin_plugin` |
| --- | --- | --- | --- |
| muParser (Ingo Berg) | `gin/3rdparty/muParser` | MIT (header) | Yes |
| bsdiff (Colin Percival) | `gin/3rdparty/bsdiff` | BSD 2 (header) | Yes |
| MIPP | `gin_simd/mipp` | MIT (LICENSE) | Yes |
| AudioFilter | `gin_dsp/3rdparty/AudioFilter` | MIT (readme.md:131-133) | Yes |
| Secret Rabbit Code (libsamplerate) | `gin_dsp/3rdparty/SecretRabbitCode` | BSD 2 (header of `samplerate.c`) | Yes |
| PlateReverb (Mike Jarmy, Dattorro 1997 algorithm) | `gin_dsp/dsp/gin_platereverb.h` | MIT (header) | Yes |
| AirWindows (Chris Johnson) | `gin_dsp/dsp/gin_distortion.h` | MIT (header) | Yes |
| AVIR | `gin_graphics/3rdparty/avir` | MIT (LICENSE) | Yes |
| Barlow font | `gin_plugin/resources/Barlow-Regular.ttf` | SIL OFL 1.1 according to the upstream project; **no licence text in the repository** | Yes |
| NanoSVG | `gin_svg` | zlib (header) | No |
| libwebp | `gin_webp` | BSD (Google) + PATENTS | No |
| mbed TLS | `gin_network` | Apache 2.0 or GPL 2.0+ | No |

Consequence: everything `gin_plugin` pulls in is compatible with a closed-source plugin **and** an AGPL plugin. The only action: include Barlow's OFL text in the shipped licences (the "embedded fonts, licences included" rule of `.claude/rules/ui.md`), or replace the font.

## 2. `gin_plugin`

### 2.1 The extended processor

`gin::Processor` ([`modules/gin_plugin/plugin/gin_processor.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.h)) inherits from `juce::AudioProcessor` and replaces the APVTS.

| Function | How |
| --- | --- |
| Parameters | `addExtParam` (exposed to the host) and `addIntParam` (internal, not automatable) with range, default, `SmoothingType` (linear or eased, duration) and text function; then `init()` |
| Values | `getUserValue()` (displayed range), `getProcValue()` (after `conversionFunction`, for example dB to linear), `getProcValue (n)`, which advances the smoothing by n samples; `isSmoothing()` |
| Storage | `std::atomic<float> value` ([`gin_parameter.h:200`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_parameter.h#L200)); UI notification through `RealtimeAsyncUpdater`, without allocation on the audio side |
| State | XML: a free-form `ValueTree state` for everything else (`updateState()` and `stateUpdated()` to override), plus one `param` element per parameter |
| Presets | `Program`: one XML file per preset (`name`, `author`, `tags`, `state`, `param`) in the user folder, watched by `FileSystemWatcher`; read-only factory folders through `getFactoryProgramDirectories()` |
| Misc | Optional MIDI learn, persistent settings (`PropertiesFile`), parameter groups |

Minimal example (BSD, adapted from `examples/Effect`):

```cpp
class Effect : public gin::Processor
{
public:
    Effect() : gin::Processor (false, gin::ProcessorOptions().withoutUpdateChecker().withoutNewsChecker())
    {
        level = addExtParam ("level", "Level", {}, "dB", { -100.0f, 5.0f, 0.0f, 5.0f }, 0.0f, 0.05f);
        level->conversionFunction = [] (float db) { return juce::Decibels::decibelsToGain (db); };
        init();
    }
    void processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals nd;
        snapshot.gain = level->getProcValue (b.getNumSamples()); // smoothed value advanced by one block
        engine.process (snapshot, /* … */);
    }
    gin::Parameter* level = nullptr;
};
```

**Points that clash with our rules (`.claude/rules/juce.md`).**

1. **Network update and news checks enabled by default**: `useUpdateChecker = true` and `useNewsChecker = true` ([`gin_processor.h:135-136`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.h#L135-L136)); the editor then reads `<site>/updates.xml` and `<site>/feed/` ([`components/gin_plugineditor.cpp:116`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_plugineditor.cpp#L116), [`:199`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_plugineditor.cpp#L199)). Always disable them.
2. **The state carries no version.** `getStateXml` only writes the parameters **that differ from their default** ([`gin_processor.cpp:647`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.cpp#L647)) and `setStateXml` resets everything to default before reading back ([`gin_processor.cpp:676`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.cpp#L676)). Changing a default in a later version therefore silently changes the sound of existing sessions. We must write a version attribute into `state` ourselves (in `updateState`) and the migration in `stateUpdated`.
3. `versionHint` is a single integer for all parameters ([`gin_processor.h:388`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.h#L388)), read when each parameter is created: to follow "parameter version incremented on every addition", change it between two series of `addExtParam` calls.
4. `setCurrentProgram` is ignored for 2 s after a state load ([`gin_processor.cpp:364`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.cpp#L364)); worth knowing for tests.

### 2.2 The modulation matrix

Files: [`plugin/gin_imodmatrix.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_imodmatrix.h) (interface seen by the UI, `ModSrcId` line 13, `ModDstId` line 35, `ModFunction` line 73) and [`plugin/gin_modmatrix.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.h) (`ModVoice` line 8, `ModMatrix` line 93).

| Concept | How it works |
| --- | --- |
| Sources | `addMonoModSource (id, name, bipolar)` and `addPolyModSource (…)` ([`gin_modmatrix.h:320-321`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.h#L320-L321)) return a `ModSrcId`. Value written per block: `setMonoValue (src, v)` or `setPolyValue (voice, src, v)` |
| Destinations | Any `gin::Parameter` passed to `addParameter (p, poly, smoothingTime)` (line 322); the parameter receives a pointer to the matrix, which lights up the modulation ring of its `Knob` |
| Routes | Per destination, a list of `Source`s: depth, enabled, bipolar mapping, curve (`linear`, `quadratic`, `sine`, `exponential` In/Out/InOut and their inverses) |
| Computation | `getValue (param)` or `getValue (voice, param)` ([`gin_modmatrix.h:233-296`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.h#L233-L296)): normalised parameter value + sum of the shaped sources × depth, clamped to [0, 1], smoothed by a `ValueSmoother` per parameter and per voice, then converted to the user range |
| Voices | The voice inherits from `ModVoice`; `ModMatrix::addVoice` at construction; `finishBlock (n)` advances the smoothers |
| Learn | `enableLearn (src)` + `ModOverlay`: click a source, then drag on a knob |
| Persistence | `updateState` and `stateUpdated` write and read back a `MODMATRIX` node of `MODITEM`s (`srcId`, `dstId`, `depth`, `enabled`, `function`, `biPolarMapping`) in the processor's `ValueTree`, hence in sessions and presets |
| Tests | 11 `juce::UnitTest` tests in [`gin_modmatrix.test.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.test.h) |

**Thread safety on the audio side.** The audio path (`getValue`, `setMonoValue`, `setPolyValue`, `finishBlock`) neither allocates nor locks. However, the structures are unprotected `juce::Array`s:

| Call from the message thread | Effect if audio is running |
| --- | --- |
| `setModDepth` on an existing route ([`gin_modmatrix.cpp:350`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.cpp#L350)) | Write of a non-atomic `float`: a data race that is benign in practice |
| `setModDepth` that **creates** a route, `clearModDepth` ([`:416`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.cpp#L416)) | `pi.sources.add` or `remove` can reallocate while `getValue` iterates: **possible use-after-free** |
| `stateUpdated` (state or preset load, [`:66`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.cpp#L66)) | Clears and then rebuilds all the lists, with no lock and no suspension of processing |

No lock or `suspendProcessing` surrounds these calls, neither in `gin_plugin` nor in the `Synth` example. To comply with `.claude/rules/realtime-audio.md`, we must either patch `ModMatrix` to publish an immutable routing table through an atomic pointer swap (deferred release off the audio thread), or wrap these three calls. It is a patch to maintain.

### 2.3 UI components

They all take `gin::Parameter*`, not generic JUCE parameters: they assume `gin::Processor`.

| Component | File | Role |
| --- | --- | --- |
| `Knob` | [`components/gin_knob.h:55`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_knob.h#L55) | Rotary + value + live modulation ring; `Knob (param, fromCentre)` |
| `Select`, `Switch`, `Fader`, `HorizontalFader`, `PluginComboBox`, `PluginButton` | `components/` | Controls bound to a parameter |
| `ADSRComponent` | [`components/gin_adsrcomponent.h:48`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_adsrcomponent.h#L48) | Envelope editable with the mouse, `setParams (a, d, s, r)` |
| `LFOComponent` | [`components/gin_lfocomponent.h:49`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_lfocomponent.h#L49) | LFO shape with animated phase |
| `MSEGComponent`, `StepLFOComponent` | `components/` | Multi-segment envelope and step LFO editing |
| `ModMatrixBox`, `ModSrcListBox`, `ModulationSourceButton`, `ModulationDepthSlider`, `ModOverlay`, `ModulationOverview` | `components/` | Route list, draggable sources, learn |
| `PatchBrowser` | [`components/gin_patchbrowser.h:43`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_patchbrowser.h#L43) | List of `Program`s, filters by author and tags |
| `ParamBox`, `ParamArea`, `ProcessorEditor`, `ScaledPluginEditor` | `components/` | Panel layout, title bar (presets, menu), scaling |
| `CopperLookAndFeel`, `PluginLookAndFeel` | `lookandfeel/` | Complete look with the Barlow font |

## 3. `gin_dsp`

A JUCE module (depends on `juce_dsp`, `juce_audio_utils`): **not usable in our JUCE-free `dsp/`**. Its classes are simple (`setSampleRate`, `reset`, `process (juce::AudioSampleBuffer&)`), so they are easy to wrap in `plugin/`.

| Area | Classes | Reusable on our side |
| --- | --- | --- |
| Oscillators | `StereoOscillator` (VA with band-limited tables), `VoicedStereoOscillator` and `BLLTVoicedStereoOscillator` (unison), `WTOscillator`, `WTVoicedStereoOscillator`, `BandLimitedLookupTables`, `SampleOscillator` | Yes, for a synth |
| Envelopes | `ADSR` (linear), `AnalogADSR`, `MSEG` | Yes |
| LFO | `LFO` (18 shapes, delay, fade), `StepLFO` | Yes |
| Filters | `Filter` (multichannel biquad, slopes, built on AudioFilter MIT, MZTi near Nyquist), `EQ`, `GraphicEQ`, `DCBlocker` | Yes |
| Dynamics | `Dynamics` + `EnvelopeDetector`, `GateEffect`, `Maximizer`, `TransientShaper` | Yes |
| Effects | `SimpleVerb`, `PlateReverb` (Dattorro), `StereoDelay`, `DelayLine`, `AirWindowsDistortion`, `SoftClipper`, `BitCrusher`, `Exciter`, `StereoEnhancer`, `StereoProcessor` | Yes |
| Metering | `LevelTracker`, `RMSMeter`, `LoudnessMeter` (K weighting), `TruePeakMeter`, `CorrelationMeter` + display components (`components/`) | Yes, on the `ui/` side |
| Utilities | `ValueSmoother`, `EasedValueSmoother`, `AudioFifo`, `AudioMidiFifo`, `ResamplingFifo` (libsamplerate), MPE `Synthesiser` with glide, `Sample`, `SamplePlayer`, `MidiFilePlayer` | Case by case |

Three caveats:

1. **Non-deterministic randomness**: `LFO` (S&H and noise shapes) and `WTOscillator::noteOn` without an explicit phase use `juce::Random::getSystemRandom()` (see [`BREAKING_CHANGES.md`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/BREAKING_CHANGES.md), November 2026). This goes against `.claude/rules/dsp.md` and the `tests/golden/` references: pass an explicit phase and do not use these shapes in a test render.
2. **Locks**: `Synthesiser` takes a `CriticalSection` on the audio thread (like `juce::MPESynthesiser`), `SamplePlayer` and `MidiFilePlayer` a `SpinLock`, `ScratchBuffer` a `CriticalSection`. Avoid them in `processBlock` or have them validated by `rt-safety-reviewer`.
3. `Filter::setNumChannels` allocates ([`dsp/gin_filter.h:90-100`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_dsp/dsp/gin_filter.h#L90-L100)): call it in `prepareToPlay` only.

Audible behaviour sometimes changes between two commits: `BREAKING_CHANGES.md` lists those changes. Pin a commit and reread this file on every update.

## 4. JUCE 9 compatibility, activity, examples

| Item | Finding |
| --- | --- |
| JUCE 9 | CI clones JUCE's `develop` branch ([`ci/build.sh:11`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/ci/build.sh#L11)), hence the head of JUCE 9; commits "Fix building with JUCE 9" (2026-06-23) and "gin_network builds with JUCE 9" (2026-10-31). The README states JUCE 7.0+ |
| Reverse risk | Following `develop` means a Gin commit may require a newer JUCE than our pinned tag: compile before bumping Gin |
| CI | Linux, macOS, Windows, Codecov coverage |
| Tests | 93 `*.test.h` files (`juce::UnitTest`), including 45 in `gin_dsp` and 6 in `gin_plugin`, run by `examples/UnitTests` |
| Activity | Commits per month since November 2025: 149, 58, 32, 9, 4, 6, 13, 10, 10, 32, 5, 15, 10 (November 2026 in progress). Main maintainer Roland Rabien (SocaLabs), supported by reFX |
| Examples | `examples/Effect` (gain, pan, inversion with smoothing, 125 lines), `examples/Synth` (complete MPE synth: oscillators, filter, ADSR, mono and poly LFOs, delay, modulation matrix, `ParamBox` and knobs), `examples/Demo` (module showcase), `examples/UnitTests` |

## 5. How we would use it in our plugins

### Decision by plugin type

| Plugin | Recommendation |
| --- | --- |
| Simple effect or multi-effect without modulation | Do not take `gin_plugin`: chowdsp_plugin_state or the APVTS are enough and keep the state versioned. Pick from `gin_dsp` if a building block is missing from `juce_dsp` |
| Synth or effect with internal modulation (LFOs, envelopes, routing) | Take `gin_plugin` as a whole: `gin::Processor`, `ModMatrix`, knobs, ADSR, LFO, MSEG, `PatchBrowser`. The gain (matrix + its UI) outweighs the cost, provided the thread safety patch and the state version are added |

Do not mix `gin::Processor` with `chowdsp::PluginStateImpl` or the APVTS: both own the parameters and the state.

### By layer, for a synth

| Layer | What Gin provides | What we write |
| --- | --- | --- |
| `dsp/` | Nothing (Gin depends on JUCE) | The pure sound engine; or we accept that the `gin_dsp` oscillators and envelopes live in `plugin/` behind an interface |
| `plugin/` | `gin::Processor`, `gin::Parameter` (declared in a single `Parameters.cpp` with constant IDs), `ModMatrix`, `ModVoice`, `Program` | The `Params` snapshot filled by `modMatrix.getValue(...)`; a version attribute in `state` and the migration in `stateUpdated`; the `ModMatrix` patch (in `patches/`, with an ADR); `ProcessorOptions().withoutUpdateChecker().withoutNewsChecker()` |
| `ui/` | `ProcessorEditor`, `Knob`, `ADSRComponent`, `LFOComponent`, `MSEGComponent`, `ModSrcListBox`, `ModOverlay`, `PatchBrowser`, `CopperLookAndFeel` | The design document and our LookAndFeel; the font's OFL text |
| `tests/plugin/` | Nothing directly reusable | State round trip including the `MODMATRIX` node, loading states from released versions, a stress test that changes routes during `processBlock` under ThreadSanitizer |

### CMake

```cmake
add_subdirectory(JUCE)                        # pinned tag, compatible with the chosen Gin commit
add_subdirectory(third_party/Gin/modules)     # juce_add_module for each module; not the root CMakeLists (it adds juce/ and the examples)
target_link_libraries(SharedCode INTERFACE gin gin_simd gin_dsp gin_graphics gin_gui gin_plugin)
```

Gin is a submodule pinned to a commit (no tag). We link neither `gin_webp` (it forces `JUCE_USE_WEBP=0`) nor `gin_network` (mbed TLS): `gin_plugin` does not need them.
