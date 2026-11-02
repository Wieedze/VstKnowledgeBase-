# chowdsp_utils

**Verdict: we take `chowdsp_plugin_state`, `chowdsp_parameters`, `chowdsp_presets_v2` and `chowdsp_version` for the `plugin/` layer instead of the APVTS, and `chowdsp_math`, `chowdsp_simd`, `chowdsp_buffers`, `chowdsp_data_structures` for `dsp/`, knowing that two GPL files are pulled in by the BSD modules, that everything UI and `PluginBase` is GPL, and that JUCE 9 is not yet tested by the author.**

Study done on 2026-11-02 on `master` at commit [`e97b826`](https://github.com/Chowdhury-DSP/chowdsp_utils/tree/e97b826ef3de0b0fd92b15cb2e286076f678d8b9) (version 2.4.0 of 2025-11-29, tag `v2.4.0`). The `next` branch (unreleased 2.5.0, last commit 2026-10-22) was compared. The `file:line` paths below are relative to the repository root (or to the module folder when the table says so) and apply to that commit.

## 1. Licences, module by module

The licence is not global. [`LICENSE.md:1-7`][C-lic] says: each module has its own licence (declared in the `BEGIN_JUCE_MODULE_DECLARATION` header of `<module>.h`, line 14), and **everything that is not a module (tests, examples, benchmarks) is GPLv3**. No module folder contains its own LICENSE file; no module source file carries a licence header, except the JUCE copies and the third-party dependencies.

[C-lic]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/LICENSE.md#L1-L7

| Module | Category | Licence (header, line 14) | Declared dependencies | JUCE required |
| --- | --- | --- | --- | --- |
| `chowdsp_core` | common | BSD 3-Clause | none | No |
| `chowdsp_data_structures` | common | BSD 3-Clause | core | No |
| `chowdsp_json` | common | BSD 3-Clause | juce_core | Yes |
| `chowdsp_listeners` | common | BSD 3-Clause | core | No |
| `chowdsp_logging` | common | BSD 3-Clause | core, data_structures, listeners | No |
| `chowdsp_reflection` | common | BSD 3-Clause | core | No |
| `chowdsp_serialization` | common | BSD 3-Clause | juce_core, core, json, reflection, data_structures | Yes |
| `chowdsp_units` | common | BSD 3-Clause | none | No |
| `chowdsp_buffers` | dsp | BSD 3-Clause | simd | No |
| `chowdsp_math` | dsp | BSD 3-clause | data_structures, simd | No |
| `chowdsp_simd` | dsp | BSD 3-clause | core | No |
| `chowdsp_compressor` | dsp | **GPLv3** | dsp_data_structures | No |
| `chowdsp_dsp_data_structures` | dsp | **GPLv3** | simd, buffers, math | No |
| `chowdsp_dsp_utils` | dsp | **GPLv3** | filters | No |
| `chowdsp_eq` | dsp | **GPLv3** | reflection, dsp_utils | No |
| `chowdsp_filters` | dsp | **GPLv3** | data_structures, dsp_data_structures, math | No |
| `chowdsp_modal_dsp` | dsp | **GPLv3** | dsp_data_structures | No |
| `chowdsp_reverb` | dsp | **GPLv3** | dsp_utils | No |
| `chowdsp_sources` | dsp | **GPLv3** | dsp_data_structures | No |
| `chowdsp_waveshapers` | dsp | **GPLv3** | math, dsp_data_structures, filters | No |
| `chowdsp_rhythm` | music | BSD 3-clause | core | No |
| `chowdsp_clap_extensions` | plugin | BSD 3-clause | juce_core, juce_audio_processors | Yes |
| `chowdsp_fuzzy_search` | plugin | BSD 3-Clause | core, data_structures | No |
| `chowdsp_parameters` | plugin | BSD 3-clause | data_structures, reflection, juce_audio_processors | Yes |
| `chowdsp_plugin_state` | plugin | BSD 3-Clause | core, serialization, listeners, version, parameters | Yes |
| `chowdsp_presets` (v1) | plugin | BSD 3-clause | juce_core, juce_audio_utils, version | Yes |
| `chowdsp_presets_v2` | plugin | BSD 3-clause | core, json, version, plugin_state | Yes |
| `chowdsp_version` | plugin | BSD 3-clause | juce_core | Yes |
| `chowdsp_plugin_base` | plugin | **GPLv3** | core, parameters | Yes |
| `chowdsp_plugin_utils` | plugin | **GPLv3** | juce_events, juce_audio_basics, juce_audio_formats, juce_gui_basics, … | Yes |
| `chowdsp_gui` | gui | **GPLv3** | juce_gui_basics, juce_audio_processors, core, data_structures | Yes |
| `chowdsp_visualizers` | gui | **GPLv3** | juce_gui_basics, juce_audio_basics, filters | Yes |
| `chowdsp_foleys` | gui | **GPLv3** | foleys_gui_magic, chowdsp_gui | Yes |

"JUCE required: No" means the module compiles outside JUCE with `setup_chowdsp_lib` ([`cmake/SetupChowdspLib.cmake`][C-setup]): this is what CI does for the DSP tests ([`tests/dsp_tests/CMakeLists.txt:1-13`][C-dsptests]).

[C-setup]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/cmake/SetupChowdspLib.cmake
[C-dsptests]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/tests/dsp_tests/CMakeLists.txt#L1-L13

### Bundled third-party dependencies

| Dependency | In module | Licence (file read) |
| --- | --- | --- |
| span-lite | core | BSL 1.0 |
| types_list | core | MIT |
| JUCE copies (`juce_MathsFunctions`, `juce_SmoothedValue`, `juce_FloatVectorOperations`, `juce_Decibels`…) | core, JUCE-less mode | ISC (file headers) |
| JUCE copies `dsp/juce_LookupTable.*`, `dsp/juce_FastMathApproximations.h` | core, mode without JUCE and without `juce_dsp` | **JUCE 7 EULA or GPLv3** (file headers) |
| short_alloc (Howard Hinnant) | data_structures | MIT |
| nlohmann::json | json | MIT |
| rocket (signals) | listeners | public domain |
| spdlog + fmt | logging | MIT |
| boost::pfr, nameof, magic_enum | reflection | BSL 1.0, MIT, MIT |
| xsimd **10.0** | simd | BSD 3 |
| gcem | math | Apache 2.0 |
| moodycamel readerwriterqueue / concurrentqueue | dsp_data_structures (GPL), but also pulled in by plugin_state | Simplified BSD (+ zlib for the semaphore) |

### Licence pitfalls found in the code

1. **`chowdsp_plugin_state` (BSD) includes a file from the GPL module `chowdsp_plugin_utils`** when that module is not linked: [`modules/plugin/chowdsp_plugin_state/Backend/chowdsp_PluginState.h:3-7`][C-ps-gpl] includes `../../chowdsp_plugin_utils/Threads/chowdsp_DeferredMainThreadAction.h` (92 lines, class `DeferredAction`). This file has no header: its licence is its module's, GPLv3.
2. **`chowdsp_presets_v2` (BSD) includes a file from the GPL module `chowdsp_plugin_base`**: [`modules/plugin/chowdsp_presets_v2/Frontend/chowdsp_PresetsProgramAdapter.h:3`][C-pa-gpl] includes `chowdsp_plugin_base/PluginBase/chowdsp_ProgramAdapter.h`, and [`chowdsp_presets_v2.h:47`][C-pv2-h] includes it unconditionally.
3. The preset browser component (`chowdsp::presets::PresetsComponent`) is in `chowdsp_gui`, GPL. The manager is BSD, its widget is not. `frontend::SettingsInterface` and part of `frontend::FileInterface` are only compiled if `chowdsp_plugin_utils` (GPL) is present.
4. `chowdsp::PluginBase` (the one that wires up `getStateInformation`, the preset manager and the audio listeners) is GPL. With a closed-source plugin, we write those twenty lines ourselves (see section 2.1).
5. The `examples/StatefulPlugin` example is GPLv3 like the whole `examples/` folder: we read it, we do not copy it into a closed-source plugin.

Consequence: for an **AGPL** plugin none of this is blocking. For a **closed-source** plugin, points 1 and 2 must be resolved before use, either by writing our own `DeferredAction` and our own `BaseProgramAdapter` and patching the two `#include`s (versioned patch in `patches/`), or by getting written confirmation from the author (chowdsp@gmail.com) that these two files are under BSD. The decision goes into an ADR.

[C-ps-gpl]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_PluginState.h#L3-L7
[C-pa-gpl]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Frontend/chowdsp_PresetsProgramAdapter.h#L3
[C-pv2-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/chowdsp_presets_v2.h#L47

## 2. The BSD modules that replace code we would otherwise write

### JUCE compatibility and maturity, overview

| Item | Finding |
| --- | --- |
| Tested JUCE version | 8.0.10 in CI ([`.github/workflows/run-tests.yml:111`][C-ci]) and in the examples ([`examples/CMakeLists.txt:7`][C-ex-cmake]) |
| JUCE 9 | No commit, no `JUCE_VERSION` guard and no CI for JUCE 9 on `master` or `next`. **Untested, to be checked** with a build and `ctest` on our JUCE tag before adoption |
| Older versions | Guards for JUCE 6 and 7 still present (`JUCE_VERSION < 0x070000`) |
| C++ standard | C++17 minimum; compiles as C++20/23 on our side |
| CI | Linux, Windows, macOS, 32-bit, Codecov coverage, clang-tidy |
| Activity | 2.4.0 released on 2025-11-29; `next` active until 2026-10-22 (fixes, API break on `CrossoverFilter`, GPL); a pace of a few commits per month |

[C-ci]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/.github/workflows/run-tests.yml#L111
[C-ex-cmake]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/examples/CMakeLists.txt#L7

| Module | Tests (files / `TEST_CASE`+`SECTION`) | JUCE | Usable in `dsp/` without JUCE |
| --- | --- | --- | --- |
| `chowdsp_plugin_state` | 7 / 56 | Yes | No |
| `chowdsp_presets_v2` | 12 / 71 | Yes | No |
| `chowdsp_parameters` | 7 / 36 | Yes | No |
| `chowdsp_version` | 1 / 5 | Yes (`juce::String`) | No |
| `chowdsp_data_structures` | 25 / 186 | No | Yes |
| `chowdsp_buffers` | 7 / 51 | No (optional `juce::AudioBuffer` bridge) | Yes |
| `chowdsp_math` | 15 / 85 | No | Yes |
| `chowdsp_simd` | 3 / 12 | No | Yes |

### 2.1 `chowdsp_plugin_state`: a replacement for the APVTS

**Principle.** Parameters are typed members of a struct that inherits from `chowdsp::ParamHolder`, non-parameter state is `chowdsp::StateValue<T>` in a struct that inherits from `chowdsp::NonParamState`, and `chowdsp::PluginStateImpl<Params, NonParams>` brings the two together ([`Backend/chowdsp_PluginStateImpl.h:12`][C-psi-h]). No repeated ID string to access a parameter: you write `state.params.gain->getCurrentValue()`.

| Topic | Behaviour | Reference |
| --- | --- | --- |
| Declaration | `ParamHolder::add (…)` takes `OptionalPointer`s; `ParamHolder`s nest (groups) | [`Backend/chowdsp_ParamHolder.h:24-61`][C-ph-h] |
| Limit | 128 parameters by default (arena), `CHOWDSP_PLUGIN_STATE_MAX_PARAM_COUNT` to increase it | [`chowdsp_plugin_state.h:23-25`][C-ps-h] |
| Adding to the processor | The `PluginStateImpl (juce::AudioProcessor&)` constructor calls `addParameter` for each parameter | [`Backend/chowdsp_PluginState.h:19-29`][C-ps-gpl] |
| Listeners | `addParameterListener (param, ParameterListenerThread::MessageThread or AudioThread, callback)` returns a `ScopedCallback` to keep | [`Backend/chowdsp_PluginState.h:42-48`][C-ps-gpl] |
| Audio-side listener | Changes are put into a `moodycamel::ReaderWriterQueue` of `FixedSizeFunction<16>`; **`getParameterListeners().callAudioThreadBroadcasters()` must be called at the top of `processBlock`** (done by `PluginBase`, GPL, otherwise by hand) | [`Backend/chowdsp_ParameterListeners.cpp:68-73`][C-pl-cpp] |
| Changes coming from the audio thread | Ignored in the callback, caught up by a 20 ms timer on the message thread | [`Backend/chowdsp_ParameterListeners.cpp:30-41`][C-pl-cpp-30], [`.h:30`][C-pl-h] |
| Non-parameter state | `StateValue<T>::set` is not atomic and notifies synchronously; keep it to the message thread | [`Backend/chowdsp_StateValue.h:53`][C-sv] |
| Serialisation | JSON `{ "version", "params": { id: value }, "non-params": { name: value } }` | [`Backend/chowdsp_PluginStateImpl.cpp:57-70`][C-psi-57] |
| Parameter missing from an old state | Takes its default value | [`Backend/chowdsp_ParamHolder.cpp:307-315`][C-ph-307] |
| Migration | `versionStreamingCallback` on each `ParamHolder` and on `NonParamState`, called with the version of the plugin that saved the state | [`Backend/chowdsp_ParamHolder.cpp:360-371`][C-ph-360] |
| Deserialisation | **Deferred to the message thread** through `DeferredAction` (the GPL file from point 1); corrupted state: exception caught, full reset, log | [`Backend/chowdsp_PluginStateImpl.cpp:28-54`][C-psi-28] |
| UI attachments | `SliderAttachment`, `SliderChoiceAttachment`, `ComboBoxAttachment`, `ButtonAttachment`, and a generic `ParameterAttachment<Param, Callback>` for a custom component; host gestures and `UndoManager` handled | [`Frontend/`][C-front] |

[C-psi-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_PluginStateImpl.h#L12
[C-ph-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_ParamHolder.h#L24-L61
[C-ps-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/chowdsp_plugin_state.h#L23-L25
[C-pl-cpp]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_ParameterListeners.cpp#L68-L73
[C-pl-cpp-30]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_ParameterListeners.cpp#L30-L41
[C-pl-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_ParameterListeners.h#L30
[C-sv]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_StateValue.h#L53
[C-psi-57]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_PluginStateImpl.cpp#L57-L70
[C-ph-307]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_ParamHolder.cpp#L307-L315
[C-ph-360]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_ParamHolder.cpp#L360-L371
[C-psi-28]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_PluginStateImpl.cpp#L28-L54
[C-front]: https://github.com/Chowdhury-DSP/chowdsp_utils/tree/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Frontend

**Minimal example without `PluginBase` (written for this document, from the BSD API).**

```cpp
#include <chowdsp_plugin_state/chowdsp_plugin_state.h>
using namespace chowdsp::version_literals;

namespace ParamIDs { constexpr auto gain = "gain"; constexpr auto mode = "mode"; }

struct Params : chowdsp::ParamHolder
{
    Params()
    {
        add (gain, mode);
        versionStreamingCallback = [this] (const chowdsp::Version& v)
        {
            // "mode" is missing from states older than 1.1.0 and would take its default (Clean) there.
            // Those versions sounded like Drive: documented fallback so the sound does not change.
            if (v < "1.1.0"_v)
                mode->setValueNotifyingHost (1.0f);
        };
    }
    chowdsp::GainDBParameter::Ptr gain { juce::ParameterID { ParamIDs::gain, 1 }, "Gain",
                                         juce::NormalisableRange { -30.0f, 6.0f }, 0.0f };
    chowdsp::ChoiceParameter::Ptr mode { juce::ParameterID { ParamIDs::mode, 2 }, "Mode",
                                         juce::StringArray { "Clean", "Drive" }, 0 };
};

struct NonParams : chowdsp::NonParamState
{
    NonParams() { addStateValues ({ &editorWidth }); }
    chowdsp::StateValue<int> editorWidth { "editor_width", 600 };
};

using State = chowdsp::PluginStateImpl<Params, NonParams>;

class Processor : public juce::AudioProcessor
{
public:
    State state { *this }; // registers the parameters with the host

    void getStateInformation (juce::MemoryBlock& d) override { state.serialize (d); }
    void setStateInformation (const void* p, int n) override { state.deserialize ({ p, (size_t) n }); }

    void processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals nd;
        state.getParameterListeners().callAudioThreadBroadcasters();
        snapshot.gainDb = state.params.gain->getCurrentValue(); // copy into the DSP's Params snapshot
        snapshot.mode   = state.params.mode->getIndex();
        engine.process (snapshot, /* … */);
    }
    // …
};

// In the editor:
chowdsp::SliderAttachment gainAttachment { *proc.state.params.gain, proc.state, gainSlider };
```

**Points to remember for our rules.**

1. `deserialize` called off the message thread is **asynchronous** (a queue emptied by a 10 ms timer). A state round trip test must therefore run on the message thread (with `juce::ScopedJuceInitialiser_GUI`), otherwise it reads the old state. Our `tools/` binary is affected in the same way.
2. The stored version is the plugin's (`JucePlugin_VersionString`, [`modules/plugin/chowdsp_version/Version/chowdsp_Version.h:116`][C-ver-116]), not a schema number. This satisfies the "the saved state carries a version number" rule of `.claude/rules/juce.md`, provided the `VERSION` file is propagated.
3. The `Broadcaster`s are `rocket::signal`s, which are not thread safe ([`modules/common/chowdsp_listeners/chowdsp_listeners.h:54`][C-rocket]): connect the audio listeners in the constructor, never during playback.
4. `FloatParameter::getCurrentValue()` reads the JUCE value (atomic) plus `modulationAmount`, a non-atomic `float` ([`modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParameterTypes.h:88`][C-pt-88]) written only by CLAP modulation.

[C-ver-116]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_version/Version/chowdsp_Version.h#L116
[C-rocket]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/common/chowdsp_listeners/chowdsp_listeners.h#L54
[C-pt-88]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParameterTypes.h#L88

### 2.2 `chowdsp_presets_v2`: presets

| Topic | Behaviour | Reference |
| --- | --- | --- |
| Manager | `presets::PresetManager (PluginState&, AudioProcessor*, extension, parameters excluded from presets)` | [`Backend/chowdsp_PresetManager.h:10-14`][C-pm-h] |
| File format | JSON: `name`, `plugin` (`JucePlugin_Name`, checked on load), `vendor`, `category`, `version`, `preset_file`, `preset_state` (`{ id: value }`) | [`Backend/chowdsp_Preset.cpp:55-96`][C-preset-cpp] |
| Factory presets | `addPresets (std::vector<Preset>&&, true)`; a `Preset` is built from a file, from JSON or from BinaryData | [`Backend/chowdsp_Preset.h`][C-preset-h] |
| User presets | `setUserPresetPath`, `saveUserPreset`, `loadUserPresetsFromFolder` | [`Backend/chowdsp_PresetManager.h:43-82`][C-pm-h-43] |
| Tree | `PresetTree` with `flat`, `vendor`, `category`, `vendorCategory` inserters (no free tags) | [`Backend/chowdsp_PresetTree.h:41-60`][C-tree] |
| Modified preset | `dirty` flag computed by a listener on each parameter | [`Backend/chowdsp_PresetSaverLoader.cpp:16-46`][C-psl-16] |
| Link with the state | The current preset and `dirty` are added as `StateValue`s to the plugin state, so they are saved in the session | [`Backend/chowdsp_PresetSaverLoader.cpp:12`][C-psl-12] |
| Loading | Always on the message thread, undoable through `UndoManager`; a parameter missing from the preset is reset to its default value | [`Backend/chowdsp_PresetSaverLoader.cpp:118-129`][C-psl-118], [`:160-184`][C-psl-160] |
| Migration | `PresetSaverLoader::loadPresetState` is a replaceable `std::function`; `PresetManager::loadUserPresetFromFile` is virtual for old user presets; each preset keeps its `version` | [`Backend/chowdsp_PresetSaverLoader.h:33`][C-psl-h], [`Backend/chowdsp_PresetManager.h:92`][C-pm-h-92] |
| BSD UI provided | `frontend::NextPreviousInterface`, `MenuInterface`, `TextInterface`, `ClipboardInterface`, `FileInterface` (partial): logic, not components | [`Frontend/`][C-pv2-front] |

[C-pm-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetManager.h#L10-L14
[C-preset-cpp]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_Preset.cpp#L55-L96
[C-preset-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_Preset.h
[C-pm-h-43]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetManager.h#L43-L82
[C-tree]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetTree.h#L41-L60
[C-psl-16]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetSaverLoader.cpp#L16-L46
[C-psl-12]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetSaverLoader.cpp#L12
[C-psl-118]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetSaverLoader.cpp#L118-L129
[C-psl-160]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetSaverLoader.cpp#L160-L184
[C-psl-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetSaverLoader.h#L33
[C-pm-h-92]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Backend/chowdsp_PresetManager.h#L92
[C-pv2-front]: https://github.com/Chowdhury-DSP/chowdsp_utils/tree/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Frontend

```cpp
// Processor member, declared after `state`.
chowdsp::presets::PresetManager presets { state, this, ".tdpreset" };

// Constructor:
presets.getPresetTree().treeInserter = &chowdsp::presets::PresetTreeInserters::categoryInserter;
presets.addPresets ({ chowdsp::presets::Preset { BinaryData::Init_tdpreset, BinaryData::Init_tdpresetSize } });
presets.setUserPresetPath (userPresetDir);

// Host programs API, written by hand so as not to pull in ProgramAdapter (GPL):
int getNumPrograms() override { return juce::jmax (1, (int) presets.getFactoryPresets().size()); }
```

The browser widget has to be written in `ui/` (or taken from Gin for a plugin that adopts `gin_plugin`, see [gin.md](gin.md)).

### 2.3 `chowdsp_parameters`

| Type | Role |
| --- | --- |
| `FloatParameter`, `ChoiceParameter`, `EnumChoiceParameter<E>`, `BoolParameter` | Wrappers around `juce::AudioParameter*` with `Ptr = OptionalPointer<…>` and CLAP modulation support ([`ParamUtils/chowdsp_ParameterTypes.h:46-200`][C-pt]) |
| `PercentParameter`, `GainDBParameter`, `FreqHzParameter`, `TimeMsParameter`, `RatioParameter`, `SemitonesParameter`, `MetricParameter`, `RhythmParameter` | Ranges, defaults and texts already done for common cases |
| `ParamUtils::createNormalisableRange (start, end, centre)` | Range with a midpoint, no skew calculation by hand ([`ParamUtils/chowdsp_ParamUtils.h:50`][C-pu]) |
| `ForwardingParameter`, `ForwardingParametersManager` | Forwarding parameters (plugin hosting sub-processors) |

`EnumChoiceParameter` requires an enum declared as flags (`static_assert` line 136) so that serialisation stays stable if the order changes. The module depends on `juce_audio_processors`; it lives in `plugin/`.

[C-pt]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParameterTypes.h#L46-L200
[C-pu]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParamUtils.h#L50

### 2.4 `chowdsp_version`

`chowdsp::Version` is `constexpr`, built from a `"1.2.3"` or `"1.2"` string (no patch needed since 2.4.0), with the six comparisons, a `"1.0.0"_v` literal and the `currentPluginVersion` constant ([`Version/chowdsp_Version.h:109-116`][C-ver]). It depends on `juce_core` for `getVersionString()`. Five test sections. It is all you need to write `if (savedVersion < "1.1.0"_v)`.

[C-ver]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_version/Version/chowdsp_Version.h#L109-L116

### 2.5 `chowdsp_data_structures`

| Class | Real-time use |
| --- | --- |
| `ArenaAllocator`, `ChainedArenaAllocator`, `STLArenaAllocator` | Working memory allocated in `prepare`, carved up without `malloc` in `process`; `create_frame()` releases at the end of scope ([`Allocators/chowdsp_ArenaAllocator.h:13`][C-arena]) |
| `PoolAllocator`, `ObjectPool`, `FlatMemoryPool` | Reusable fixed-size objects |
| `FixedSizeFunction<N, Sig>` | Allocation-free callback (replaces `std::function` on the audio thread) |
| `SmallVector`, `SmallMap`, `EnumMap`, `OptionalArray`, `ChunkList`, `BucketArray` | Containers with local capacity |
| `DoubleBuffer` | Circular buffer that is always contiguous |
| `LocalPointer`, `OptionalPointer`, `PackedPointer`, `StringLiteral` | Utility pointers |
| `AbstractTree` | Generic tree (base of `PresetTree`) |

Without JUCE, 186 test sections. Not to be confused with `chowdsp_dsp_data_structures`, which is **GPL** and contains `RealtimeLatestObject`, `SmoothedBufferValue`, `LookupTableTransform`, `RebufferedProcessor`, `COLAProcessor`, `UIToAudioPipeline` and the moodycamel wrappers.

[C-arena]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/common/chowdsp_data_structures/Allocators/chowdsp_ArenaAllocator.h#L13

```cpp
chowdsp::ArenaAllocator<> arena;
void prepare (double, int maxBlock) { arena.reset (4 * (size_t) maxBlock * sizeof (float)); }
void process (std::span<float> x)
{
    auto frame = arena.create_frame();               // everything is given back at end of scope
    float* tmp = arena.allocate<float> (x.size(), 16); // no malloc
    // …
}
```

### 2.6 `chowdsp_buffers`

`chowdsp::Buffer<T>` (heap, `setMaxSize` in `prepare` then `setCurrentSize` without allocation), `StaticBuffer<T, Ch, N>` (local memory), `BufferView<T>` (non-owning view, built from `T* const*`, a `Buffer` or a `juce::AudioBuffer`), and the iterators `buffer_iters::channels`, `samples`, `zip_channels`. `T` can be `float`, `double` or `xsimd::batch<float>`. 32 channels maximum by default ([`chowdsp_buffers.h:38`][C-buf-38]). No JUCE except `SIMDAudioBlock` and the `juce::AudioBuffer` bridge.

Gap with `.claude/rules/cpp.md`: the API takes `BufferView`s and pointers with a size, not `std::span`s. We keep `std::span` on our public `dsp/` interfaces and build a `BufferView` inside.

[C-buf-38]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/dsp/chowdsp_buffers/chowdsp_buffers.h#L38

### 2.7 `chowdsp_math`

`BufferMath` (smoothed gain, mono sum, copy, `applyFunction`, and `sanitizeBuffer`, which replaces NaN and Inf, [`Math/chowdsp_BufferMath.h:77`][C-bm-77]), fast approximations (`LogApprox`, `PowApprox`, `DecibelsApprox`, `TrigApprox`), `Polynomials` (Horner, Estrin), `ChebyshevPolynomials`, `Polylogarithm`, `TanhIntegrals` (the integrals useful for ADAA), `JacobiElliptic`, `RandomFloat`, `MatrixOps`, `Power`, `Ratio`, and `gcem` for `constexpr`. 85 test sections, without JUCE.

`sanitizeBuffer` at the output of `processBlock` gives the "finite output" guarantee of `docs/03_ARCHITECTURE.md` without home-grown code; it does not replace the test that sweeps the extremes.

[C-bm-77]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/dsp/chowdsp_math/Math/chowdsp_BufferMath.h#L77

### 2.8 `chowdsp_simd`

A wrapper around **xsimd 10.0** (bundled; the current xsimd version is newer, so do not mix it with another copy in the same binary), plus `SIMDSmoothedValue`, SIMD decibels, logic and special functions, SIMD complex numbers. `CHOWDSP_NO_XSIMD=1` turns xsimd off. 12 test sections, without JUCE.

## 3. GPL modules useful to an AGPL plugin

All compile without JUCE except the last two groups.

| Module | What it offers |
| --- | --- |
| `chowdsp_filters` | 1st and 2nd order filters (LPF, HPF, BPF, shelf, peak, notch), Nth-order Butterworth, Chebyshev II and elliptic, `SOSFilter`, `StateVariableFilter` (more types than JUCE), `OnePoleSVF`, `ModFilterWrapper`, `LinkwitzRileyFilter`, 2- and 3-way crossovers, SIMD `FIRFilter`, polyphase FIR interpolator and decimator, `HilbertFilter`, `WernerFilter`, `ARPFilter` (ARP 1047), fractional-order filter, conformal transforms (bilinear, alpha) |
| `chowdsp_waveshapers` | `ADAAHardClipper`, `ADAATanhClipper`, `ADAASoftClipper`, `ADAASineClipper`, `ADAAFullWaveRectifier`, generic `ADAAWaveshaper`, `SoftClipper`, `WestCoastWavefolder` (Buchla 259), `WaveMultiplier` (Serge) |
| `chowdsp_sources` | `SineWave` (magic circle), anti-aliased `SawtoothWave`, `SquareWave`, `TriangleWave`, `PolygonalOscillator`, `AdditiveOscillator`, `Noise` (uniform, Gaussian, pink), `NoiseSynth`, `RepitchedSource` |
| `chowdsp_eq` | `EQBand`, `EQProcessor`, `LinearPhaseEQ`, `StandardEQParameters` |
| `chowdsp_reverb` | FDN building blocks, `Diffuser`, Dattorro input and tank networks, `ConvolutionDiffuser` |
| `chowdsp_compressor` | Level detectors, gain computers, `MonoCompressor` |
| `chowdsp_dsp_utils` | `DelayLine` (several interpolations), BBD (line, filter bank), `PitchShift`, upsampler and downsampler, `LanczosResampler`, `VariableOversampling`, `SRCResampler` (optional libsamplerate), convolution engine and IR tools, `OvershootLimiter`, `LinearPhase3WayCrossover`, `BypassProcessor`, `Panner`, `WidthPanner`, `TunerProcessor` |
| `chowdsp_dsp_data_structures` | `RealtimeLatestObject`, `SmoothedBufferValue`, lookup and cache tables, `RebufferedProcessor`, `COLAProcessor`, `UIToAudioPipeline` |
| `chowdsp_modal_dsp` | `ModalFilter`, vectorised `ModalFilterBank` |
| `chowdsp_plugin_base`, `chowdsp_plugin_utils` (JUCE) | `PluginBase<State>`, `SynthBase`, global settings, `DeferredAction`, `AudioUIBackgroundTask`, `FileListener` |
| `chowdsp_gui`, `chowdsp_visualizers`, `chowdsp_foleys` (JUCE) | `PresetsComponent`, `ParametersView`, LookAndFeel, CPU meter, oversampling menu, EQ, waveshaper and gain reduction plots, spectrum |

## 4. Examples in the repository

`examples/` contains nine plugins (GPLv3): `SimpleEQ`, `SimpleReverb`, `SignalGenerator`, `ModalSpringReverb`, `AutoWah`, `AccessiblePlugin`, `ForwardingTestPlugin`, `StatefulPlugin`, `ExampleCompressor`. They build with `-DCHOWDSP_ENABLE_EXAMPLES=ON`, with JUCE 8.0.10 downloaded by CPM.

**`StatefulPlugin`** ([`examples/StatefulPlugin/`][C-stateful]) is the one that shows plugin_state and presets_v2 together:

1. `StatefulPlugin.h` declares a nested `ParamHolder` (`LevelParams` inside `PluginParameterState`: a `PercentParameter`, a `GainDBParameter`, a `ChoiceParameter`, a `BoolParameter`, all at `ParameterID` version 100), a `NonParamState` with `StateValue<std::pair<int,int>> editorBounds`, and `State = PluginStateImpl<…>`.
2. The processor inherits from `chowdsp::PluginBase<State>` (GPL), which provides `getStateInformation`, `setStateInformation`, the call to `callAudioThreadBroadcasters` and the `presetManager` member.
3. The constructor creates `presets::PresetManager (state, this, ".chowpreset")`, picks `vendorInserter`, and wires up `frontend::SettingsInterface` (GPL through plugin_utils) to remember the user folder.
4. `processAudioBlock` reads `state.params.levelParams.percent->getCurrentValue()` directly.
5. The editor shows `ParametersViewEditor` and `PresetsComponent` (GPL), undo and redo buttons on the `UndoManager` passed to the state, and resizes when `editorBounds` changes through `addNonParameterListener`.

For us, it is a good read of the API, but three of the five building blocks used (`PluginBase`, `SettingsInterface`, `PresetsComponent`) are GPL.

[C-stateful]: https://github.com/Chowdhury-DSP/chowdsp_utils/tree/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/examples/StatefulPlugin

## 5. How we would use it in our plugins

### CMake integration

```cmake
# Submodule pinned to the v2.4.0 tag (not to next).
add_subdirectory(JUCE)                       # defines JUCE_MODULES_DIR: chowdsp adds its JUCE modules
add_subdirectory(third_party/chowdsp_utils)  # chowdsp::chowdsp_<module> targets

# dsp/: static library without JUCE, built by the provided function
setup_chowdsp_lib(chowdsp_dsp_bsd MODULES chowdsp_math chowdsp_buffers chowdsp_simd chowdsp_data_structures)
target_link_libraries(dsp PRIVATE chowdsp_dsp_bsd)

# plugin/ and ui/: JUCE modules
target_link_libraries(SharedCode INTERFACE
    chowdsp::chowdsp_plugin_state chowdsp::chowdsp_parameters
    chowdsp::chowdsp_presets_v2 chowdsp::chowdsp_version)
```

`AddJUCEModules.cmake` is only used if `JUCE_MODULES_DIR` is defined, hence the order. `setup_chowdsp_lib` is included in the other branch of chowdsp's root `CMakeLists.txt`; if both modes are wanted in the same project, `cmake/SetupChowdspLib.cmake` must be included by hand (to be checked during the integration task).

### By layer

| Layer | What we take | What we still write |
| --- | --- | --- |
| `dsp/` | `chowdsp_math` (approximations, `sanitizeBuffer`, integrals for ADAA), `chowdsp_simd`, `chowdsp_buffers` (`BufferView`, `StaticBuffer`), `chowdsp_data_structures` (arena, `FixedSizeFunction`, `SmallVector`). AGPL plugin: also `chowdsp_filters`, `chowdsp_waveshapers`, `chowdsp_sources`, `chowdsp_dsp_utils` | The `prepare`/`reset`/`process(std::span)` interfaces and the engine that defines the sonic identity |
| `plugin/` | `PluginStateImpl` instead of the APVTS, the `chowdsp_parameters` types, `versionStreamingCallback` for migration, `presets::PresetManager` | `Parameters.h` (a single file, constant IDs, as `juce.md` requires), filling the `Params` snapshot, the call to `callAudioThreadBroadcasters`, the two state methods, the programs API |
| `ui/` | `SliderAttachment`, `ComboBoxAttachment`, `ButtonAttachment`, generic `ParameterAttachment`; `presets::frontend` interfaces | The preset browser component (or Gin's), the LookAndFeel |
| `tests/plugin/` | Nothing to take (GPL tests) | State round trip on the message thread, loading the states in `tests/plugin/states/`, a test that freezes the list of IDs |

### Precautions to include in the integration task

1. **`dsp/` layer and the `juce` namespace.** In JUCE-less mode, `chowdsp_core` itself defines `juce::SmoothedValue`, `juce::jlimit`, `juce::Decibels`… from JUCE copies ([`modules/common/chowdsp_core/chowdsp_core.h:53-86`][C-core]). The "`dsp/` without `#include <juce_`" test passes, but if a public `dsp/` header includes chowdsp and is included by `plugin/`, the same chowdsp class is compiled in JUCE mode on one side and without JUCE on the other: ODR risk. Proposed rule: chowdsp only appears in the `.cpp` files of `dsp/`, never in its public headers.
2. The `juce_LookupTable` and `juce_FastMathApproximations` copies pulled in by JUCE-less mode are under the JUCE 7 EULA or GPLv3, not ISC. No consequence if the plugin is AGPL or under a commercial JUCE licence, but note it in the licence ADR.
3. **Closed-source plugin**: resolve the two GPL inclusions from section 1 before the first commit that links `chowdsp_plugin_state`.
4. **JUCE 9**: compile chowdsp and run its tests (`-DCHOWDSP_ENABLE_TESTING=ON`) against our JUCE tag in a dedicated task; do not adopt it until that is green.
5. pluginval strictness 10 on the first plugin that uses it, since deserialisation is deferred.

[C-core]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/common/chowdsp_core/chowdsp_core.h#L53-L86
