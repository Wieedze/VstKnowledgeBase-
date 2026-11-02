# chowdsp_utils

**Verdict : on prend `chowdsp_plugin_state`, `chowdsp_parameters`, `chowdsp_presets_v2` et `chowdsp_version` pour la couche `plugin/` à la place de l'APVTS, et `chowdsp_math`, `chowdsp_simd`, `chowdsp_buffers`, `chowdsp_data_structures` pour `dsp/`, en sachant que deux fichiers GPL sont tirés par les modules BSD, que tout ce qui est UI et `PluginBase` est GPL, et que JUCE 9 n'est pas encore testé par l'auteur.**

Étude faite le 2026-11-02 sur `master` au commit [`e97b826`](https://github.com/Chowdhury-DSP/chowdsp_utils/tree/e97b826ef3de0b0fd92b15cb2e286076f678d8b9) (version 2.4.0 du 2025-11-29, tag `v2.4.0`). La branche `next` (2.5.0 non publiée, dernier commit 2026-10-22) a été comparée. Les chemins `fichier:ligne` ci dessous sont relatifs à la racine du dépôt (ou au dossier du module quand le tableau le précise) et valent pour ce commit.

## 1. Licences, module par module

La licence n'est pas globale. [`LICENSE.md:1-7`][C-lic] dit : chaque module a sa propre licence (déclarée dans l'en tête `BEGIN_JUCE_MODULE_DECLARATION` de `<module>.h`, ligne 14), et **tout ce qui n'est pas un module (tests, exemples, benchmarks) est GPLv3**. Aucun dossier de module ne contient de fichier LICENSE propre ; aucun fichier source de module ne porte d'en tête de licence, sauf les copies de JUCE et les dépendances tierces.

[C-lic]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/LICENSE.md#L1-L7

| Module | Catégorie | Licence (en tête, ligne 14) | Dépendances déclarées | JUCE requis |
| --- | --- | --- | --- | --- |
| `chowdsp_core` | common | BSD 3-Clause | aucune | Non |
| `chowdsp_data_structures` | common | BSD 3-Clause | core | Non |
| `chowdsp_json` | common | BSD 3-Clause | juce_core | Oui |
| `chowdsp_listeners` | common | BSD 3-Clause | core | Non |
| `chowdsp_logging` | common | BSD 3-Clause | core, data_structures, listeners | Non |
| `chowdsp_reflection` | common | BSD 3-Clause | core | Non |
| `chowdsp_serialization` | common | BSD 3-Clause | juce_core, core, json, reflection, data_structures | Oui |
| `chowdsp_units` | common | BSD 3-Clause | aucune | Non |
| `chowdsp_buffers` | dsp | BSD 3-Clause | simd | Non |
| `chowdsp_math` | dsp | BSD 3-clause | data_structures, simd | Non |
| `chowdsp_simd` | dsp | BSD 3-clause | core | Non |
| `chowdsp_compressor` | dsp | **GPLv3** | dsp_data_structures | Non |
| `chowdsp_dsp_data_structures` | dsp | **GPLv3** | simd, buffers, math | Non |
| `chowdsp_dsp_utils` | dsp | **GPLv3** | filters | Non |
| `chowdsp_eq` | dsp | **GPLv3** | reflection, dsp_utils | Non |
| `chowdsp_filters` | dsp | **GPLv3** | data_structures, dsp_data_structures, math | Non |
| `chowdsp_modal_dsp` | dsp | **GPLv3** | dsp_data_structures | Non |
| `chowdsp_reverb` | dsp | **GPLv3** | dsp_utils | Non |
| `chowdsp_sources` | dsp | **GPLv3** | dsp_data_structures | Non |
| `chowdsp_waveshapers` | dsp | **GPLv3** | math, dsp_data_structures, filters | Non |
| `chowdsp_rhythm` | music | BSD 3-clause | core | Non |
| `chowdsp_clap_extensions` | plugin | BSD 3-clause | juce_core, juce_audio_processors | Oui |
| `chowdsp_fuzzy_search` | plugin | BSD 3-Clause | core, data_structures | Non |
| `chowdsp_parameters` | plugin | BSD 3-clause | data_structures, reflection, juce_audio_processors | Oui |
| `chowdsp_plugin_state` | plugin | BSD 3-Clause | core, serialization, listeners, version, parameters | Oui |
| `chowdsp_presets` (v1) | plugin | BSD 3-clause | juce_core, juce_audio_utils, version | Oui |
| `chowdsp_presets_v2` | plugin | BSD 3-clause | core, json, version, plugin_state | Oui |
| `chowdsp_version` | plugin | BSD 3-clause | juce_core | Oui |
| `chowdsp_plugin_base` | plugin | **GPLv3** | core, parameters | Oui |
| `chowdsp_plugin_utils` | plugin | **GPLv3** | juce_events, juce_audio_basics, juce_audio_formats, juce_gui_basics, … | Oui |
| `chowdsp_gui` | gui | **GPLv3** | juce_gui_basics, juce_audio_processors, core, data_structures | Oui |
| `chowdsp_visualizers` | gui | **GPLv3** | juce_gui_basics, juce_audio_basics, filters | Oui |
| `chowdsp_foleys` | gui | **GPLv3** | foleys_gui_magic, chowdsp_gui | Oui |

"JUCE requis : Non" veut dire que le module se compile hors JUCE avec `setup_chowdsp_lib` ([`cmake/SetupChowdspLib.cmake`][C-setup]) : c'est ce que fait la CI pour les tests DSP ([`tests/dsp_tests/CMakeLists.txt:1-13`][C-dsptests]).

[C-setup]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/cmake/SetupChowdspLib.cmake
[C-dsptests]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/tests/dsp_tests/CMakeLists.txt#L1-L13

### Dépendances tierces embarquées

| Dépendance | Dans le module | Licence (fichier lu) |
| --- | --- | --- |
| span-lite | core | BSL 1.0 |
| types_list | core | MIT |
| Copies de JUCE (`juce_MathsFunctions`, `juce_SmoothedValue`, `juce_FloatVectorOperations`, `juce_Decibels`…) | core, mode sans JUCE | ISC (en tête des fichiers) |
| Copies de JUCE `dsp/juce_LookupTable.*`, `dsp/juce_FastMathApproximations.h` | core, mode sans JUCE et sans `juce_dsp` | **JUCE 7 EULA ou GPLv3** (en tête des fichiers) |
| short_alloc (Howard Hinnant) | data_structures | MIT |
| nlohmann::json | json | MIT |
| rocket (signaux) | listeners | domaine public |
| spdlog + fmt | logging | MIT |
| boost::pfr, nameof, magic_enum | reflection | BSL 1.0, MIT, MIT |
| xsimd **10.0** | simd | BSD 3 |
| gcem | math | Apache 2.0 |
| moodycamel readerwriterqueue / concurrentqueue | dsp_data_structures (GPL), mais tiré aussi par plugin_state | BSD simplifié (+ zlib pour le sémaphore) |

### Pièges de licence trouvés dans le code

1. **`chowdsp_plugin_state` (BSD) inclut un fichier du module GPL `chowdsp_plugin_utils`** quand ce module n'est pas lié : [`modules/plugin/chowdsp_plugin_state/Backend/chowdsp_PluginState.h:3-7`][C-ps-gpl] inclut `../../chowdsp_plugin_utils/Threads/chowdsp_DeferredMainThreadAction.h` (92 lignes, classe `DeferredAction`). Ce fichier n'a pas d'en tête : sa licence est celle de son module, GPLv3.
2. **`chowdsp_presets_v2` (BSD) inclut un fichier du module GPL `chowdsp_plugin_base`** : [`modules/plugin/chowdsp_presets_v2/Frontend/chowdsp_PresetsProgramAdapter.h:3`][C-pa-gpl] inclut `chowdsp_plugin_base/PluginBase/chowdsp_ProgramAdapter.h`, et [`chowdsp_presets_v2.h:47`][C-pv2-h] l'inclut sans condition.
3. Le composant de navigation de presets (`chowdsp::presets::PresetsComponent`) est dans `chowdsp_gui`, GPL. Le gestionnaire est BSD, son widget ne l'est pas. `frontend::SettingsInterface` et une partie de `frontend::FileInterface` ne sont compilés que si `chowdsp_plugin_utils` (GPL) est présent.
4. `chowdsp::PluginBase` (celui qui branche `getStateInformation`, le preset manager et les listeners audio) est GPL. Avec un plugin fermé, on écrit ces vingt lignes nous mêmes (voir section 2.1).
5. L'exemple `examples/StatefulPlugin` est GPLv3 comme tout le dossier `examples/` : on le lit, on ne le copie pas dans un plugin fermé.

Conséquence : pour un plugin **AGPL** rien de tout cela ne bloque. Pour un plugin **fermé**, les points 1 et 2 sont à régler avant usage, soit en écrivant notre propre `DeferredAction` et notre propre `BaseProgramAdapter` et en patchant les deux `#include` (patch versionné dans `patches/`), soit en obtenant de l'auteur (chowdsp@gmail.com) une confirmation écrite que ces deux fichiers sont sous BSD. La décision va dans un ADR.

[C-ps-gpl]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_plugin_state/Backend/chowdsp_PluginState.h#L3-L7
[C-pa-gpl]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/Frontend/chowdsp_PresetsProgramAdapter.h#L3
[C-pv2-h]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_presets_v2/chowdsp_presets_v2.h#L47

## 2. Les modules BSD qui remplacent du code qu'on écrirait

### Compatibilité JUCE et maturité, vue d'ensemble

| Point | Constat |
| --- | --- |
| Version JUCE testée | 8.0.10 en CI ([`.github/workflows/run-tests.yml:111`][C-ci]) et dans les exemples ([`examples/CMakeLists.txt:7`][C-ex-cmake]) |
| JUCE 9 | Aucun commit, aucune garde `JUCE_VERSION` ni CI pour JUCE 9 sur `master` ou `next`. **Non testé, à vérifier** par une compilation et `ctest` sur notre tag JUCE avant adoption |
| Versions anciennes | Gardes pour JUCE 6 et 7 encore présentes (`JUCE_VERSION < 0x070000`) |
| Standard C++ | C++17 minimum ; compile en C++20/23 chez nous |
| CI | Linux, Windows, macOS, 32 bits, couverture Codecov, clang-tidy |
| Activité | 2.4.0 publiée le 2025-11-29 ; `next` actif jusqu'au 2026-10-22 (corrections, rupture d'API sur `CrossoverFilter`, GPL) ; rythme de quelques commits par mois |

[C-ci]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/.github/workflows/run-tests.yml#L111
[C-ex-cmake]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/examples/CMakeLists.txt#L7

| Module | Tests (fichiers / `TEST_CASE`+`SECTION`) | JUCE | Utilisable dans `dsp/` sans JUCE |
| --- | --- | --- | --- |
| `chowdsp_plugin_state` | 7 / 56 | Oui | Non |
| `chowdsp_presets_v2` | 12 / 71 | Oui | Non |
| `chowdsp_parameters` | 7 / 36 | Oui | Non |
| `chowdsp_version` | 1 / 5 | Oui (`juce::String`) | Non |
| `chowdsp_data_structures` | 25 / 186 | Non | Oui |
| `chowdsp_buffers` | 7 / 51 | Non (pont `juce::AudioBuffer` optionnel) | Oui |
| `chowdsp_math` | 15 / 85 | Non | Oui |
| `chowdsp_simd` | 3 / 12 | Non | Oui |

### 2.1 `chowdsp_plugin_state` : remplaçant de l'APVTS

**Principe.** Les paramètres sont des membres typés d'une structure qui hérite de `chowdsp::ParamHolder`, l'état hors paramètres des `chowdsp::StateValue<T>` dans une structure qui hérite de `chowdsp::NonParamState`, et `chowdsp::PluginStateImpl<Params, NonParams>` réunit les deux ([`Backend/chowdsp_PluginStateImpl.h:12`][C-psi-h]). Pas de chaîne d'ID répétée pour accéder à un paramètre : on écrit `state.params.gain->getCurrentValue()`.

| Sujet | Comportement | Référence |
| --- | --- | --- |
| Déclaration | `ParamHolder::add (…)` prend des `OptionalPointer` ; les `ParamHolder` s'imbriquent (groupes) | [`Backend/chowdsp_ParamHolder.h:24-61`][C-ph-h] |
| Limite | 128 paramètres par défaut (arena), `CHOWDSP_PLUGIN_STATE_MAX_PARAM_COUNT` pour augmenter | [`chowdsp_plugin_state.h:23-25`][C-ps-h] |
| Ajout au processeur | Le constructeur `PluginStateImpl (juce::AudioProcessor&)` appelle `addParameter` pour chaque paramètre | [`Backend/chowdsp_PluginState.h:19-29`][C-ps-gpl] |
| Listeners | `addParameterListener (param, ParameterListenerThread::MessageThread ou AudioThread, callback)` renvoie un `ScopedCallback` à garder | [`Backend/chowdsp_PluginState.h:42-48`][C-ps-gpl] |
| Listener côté audio | Les changements sont mis dans une `moodycamel::ReaderWriterQueue` de `FixedSizeFunction<16>` ; **il faut appeler `getParameterListeners().callAudioThreadBroadcasters()` en tête de `processBlock`** (fait par `PluginBase`, GPL, sinon à la main) | [`Backend/chowdsp_ParameterListeners.cpp:68-73`][C-pl-cpp] |
| Changements venant du thread audio | Ignorés dans le callback, rattrapés par un timer de 20 ms sur le message thread | [`Backend/chowdsp_ParameterListeners.cpp:30-41`][C-pl-cpp-30], [`.h:30`][C-pl-h] |
| État hors paramètres | `StateValue<T>::set` n'est pas atomique et notifie de façon synchrone ; à réserver au message thread | [`Backend/chowdsp_StateValue.h:53`][C-sv] |
| Sérialisation | JSON `{ "version", "params": { id: valeur }, "non-params": { nom: valeur } }` | [`Backend/chowdsp_PluginStateImpl.cpp:57-70`][C-psi-57] |
| Paramètre absent d'un vieil état | Prend sa valeur par défaut | [`Backend/chowdsp_ParamHolder.cpp:307-315`][C-ph-307] |
| Migration | `versionStreamingCallback` sur chaque `ParamHolder` et sur `NonParamState`, appelé avec la version du plugin qui a sauvé l'état | [`Backend/chowdsp_ParamHolder.cpp:360-371`][C-ph-360] |
| Désérialisation | **Différée sur le message thread** via `DeferredAction` (le fichier GPL du point 1) ; état corrompu : exception attrapée, reset complet, log | [`Backend/chowdsp_PluginStateImpl.cpp:28-54`][C-psi-28] |
| Attachments UI | `SliderAttachment`, `SliderChoiceAttachment`, `ComboBoxAttachment`, `ButtonAttachment`, et `ParameterAttachment<Param, Callback>` générique pour un composant maison ; gestes hôte et `UndoManager` gérés | [`Frontend/`][C-front] |

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

**Exemple minimal sans `PluginBase` (écrit pour ce document, à partir de l'API BSD).**

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
            // "mode" est absent des états d'avant 1.1.0 et y prendrait son défaut (Clean).
            // Ces versions sonnaient comme Drive : repli documenté pour ne pas changer le son.
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
    State state { *this }; // enregistre les paramètres auprès de l'hôte

    void getStateInformation (juce::MemoryBlock& d) override { state.serialize (d); }
    void setStateInformation (const void* p, int n) override { state.deserialize ({ p, (size_t) n }); }

    void processBlock (juce::AudioBuffer<float>& b, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals nd;
        state.getParameterListeners().callAudioThreadBroadcasters();
        snapshot.gainDb = state.params.gain->getCurrentValue(); // copie dans le snapshot Params du DSP
        snapshot.mode   = state.params.mode->getIndex();
        engine.process (snapshot, /* … */);
    }
    // …
};

// Dans l'éditeur :
chowdsp::SliderAttachment gainAttachment { *proc.state.params.gain, proc.state, gainSlider };
```

**Points à retenir pour nos règles.**

1. `deserialize` appelé hors message thread est **asynchrone** (file vidée par un timer de 10 ms). Un test de round trip d'état doit donc tourner sur le message thread (avec `juce::ScopedJuceInitialiser_GUI`), sinon il lit l'ancien état. Notre binaire `tools/` est concerné de la même façon.
2. La version stockée est celle du plugin (`JucePlugin_VersionString`, [`modules/plugin/chowdsp_version/Version/chowdsp_Version.h:116`][C-ver-116]), pas un numéro de schéma. Cela satisfait la règle "l'état sauvé porte un numéro de version" de `.claude/rules/juce.md`, à condition que le fichier `VERSION` soit propagé.
3. Les `Broadcaster` sont des `rocket::signal` non thread safe ([`modules/common/chowdsp_listeners/chowdsp_listeners.h:54`][C-rocket]) : on connecte les listeners audio dans le constructeur, jamais pendant la lecture.
4. `FloatParameter::getCurrentValue()` lit la valeur JUCE (atomique) plus `modulationAmount`, un `float` non atomique ([`modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParameterTypes.h:88`][C-pt-88]) écrit seulement par la modulation CLAP.

[C-ver-116]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_version/Version/chowdsp_Version.h#L116
[C-rocket]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/common/chowdsp_listeners/chowdsp_listeners.h#L54
[C-pt-88]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParameterTypes.h#L88

### 2.2 `chowdsp_presets_v2` : presets

| Sujet | Comportement | Référence |
| --- | --- | --- |
| Gestionnaire | `presets::PresetManager (PluginState&, AudioProcessor*, extension, paramètres hors presets)` | [`Backend/chowdsp_PresetManager.h:10-14`][C-pm-h] |
| Format de fichier | JSON : `name`, `plugin` (`JucePlugin_Name`, vérifié au chargement), `vendor`, `category`, `version`, `preset_file`, `preset_state` (`{ id: valeur }`) | [`Backend/chowdsp_Preset.cpp:55-96`][C-preset-cpp] |
| Factory presets | `addPresets (std::vector<Preset>&&, true)` ; `Preset` se construit depuis un fichier, du JSON ou du BinaryData | [`Backend/chowdsp_Preset.h`][C-preset-h] |
| Presets utilisateur | `setUserPresetPath`, `saveUserPreset`, `loadUserPresetsFromFolder` | [`Backend/chowdsp_PresetManager.h:43-82`][C-pm-h-43] |
| Arborescence | `PresetTree` avec inserteurs `flat`, `vendor`, `category`, `vendorCategory` (pas de tags libres) | [`Backend/chowdsp_PresetTree.h:41-60`][C-tree] |
| Preset modifié | Flag `dirty` calculé par listener sur chaque paramètre | [`Backend/chowdsp_PresetSaverLoader.cpp:16-46`][C-psl-16] |
| Lien avec l'état | Le preset courant et `dirty` sont ajoutés comme `StateValue` à l'état du plugin, donc sauvés dans la session | [`Backend/chowdsp_PresetSaverLoader.cpp:12`][C-psl-12] |
| Chargement | Toujours sur le message thread, annulable par `UndoManager` ; paramètre absent du preset : remis à sa valeur par défaut | [`Backend/chowdsp_PresetSaverLoader.cpp:118-129`][C-psl-118], [`:160-184`][C-psl-160] |
| Migration | `PresetSaverLoader::loadPresetState` est un `std::function` remplaçable ; `PresetManager::loadUserPresetFromFile` est virtuelle pour les vieux presets utilisateur ; chaque preset garde sa `version` | [`Backend/chowdsp_PresetSaverLoader.h:33`][C-psl-h], [`Backend/chowdsp_PresetManager.h:92`][C-pm-h-92] |
| UI fournie BSD | `frontend::NextPreviousInterface`, `MenuInterface`, `TextInterface`, `ClipboardInterface`, `FileInterface` (partiel) : de la logique, pas de composant | [`Frontend/`][C-pv2-front] |

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
// Membre du processeur, déclaré après `state`.
chowdsp::presets::PresetManager presets { state, this, ".tdpreset" };

// Constructeur :
presets.getPresetTree().treeInserter = &chowdsp::presets::PresetTreeInserters::categoryInserter;
presets.addPresets ({ chowdsp::presets::Preset { BinaryData::Init_tdpreset, BinaryData::Init_tdpresetSize } });
presets.setUserPresetPath (userPresetDir);

// API programmes de l'hôte, écrite à la main pour ne pas tirer ProgramAdapter (GPL) :
int getNumPrograms() override { return juce::jmax (1, (int) presets.getFactoryPresets().size()); }
```

Le widget de navigation est à écrire dans `ui/` (ou à prendre chez Gin pour un plugin qui adopte `gin_plugin`, voir [gin.md](gin.md)).

### 2.3 `chowdsp_parameters`

| Type | Rôle |
| --- | --- |
| `FloatParameter`, `ChoiceParameter`, `EnumChoiceParameter<E>`, `BoolParameter` | Enveloppes de `juce::AudioParameter*` avec `Ptr = OptionalPointer<…>` et support de modulation CLAP ([`ParamUtils/chowdsp_ParameterTypes.h:46-200`][C-pt]) |
| `PercentParameter`, `GainDBParameter`, `FreqHzParameter`, `TimeMsParameter`, `RatioParameter`, `SemitonesParameter`, `MetricParameter`, `RhythmParameter` | Plages, défauts et textes déjà faits pour les cas courants |
| `ParamUtils::createNormalisableRange (start, end, centre)` | Plage avec point milieu, sans calcul de skew à la main ([`ParamUtils/chowdsp_ParamUtils.h:50`][C-pu]) |
| `ForwardingParameter`, `ForwardingParametersManager` | Paramètres de redirection (plugin hôte de sous processeurs) |

`EnumChoiceParameter` exige un enum déclaré comme flags (`static_assert` ligne 136) pour que la sérialisation reste stable si l'ordre change. Le module dépend de `juce_audio_processors` ; il vit dans `plugin/`.

[C-pt]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParameterTypes.h#L46-L200
[C-pu]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_parameters/ParamUtils/chowdsp_ParamUtils.h#L50

### 2.4 `chowdsp_version`

`chowdsp::Version` est `constexpr`, construit depuis une chaîne `"1.2.3"` ou `"1.2"` (sans patch depuis 2.4.0), avec les six comparaisons, un littéral `"1.0.0"_v` et la constante `currentPluginVersion` ([`Version/chowdsp_Version.h:109-116`][C-ver]). Il dépend de `juce_core` pour `getVersionString()`. Cinq sections de test. C'est tout ce qu'il faut pour écrire `if (savedVersion < "1.1.0"_v)`.

[C-ver]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/plugin/chowdsp_version/Version/chowdsp_Version.h#L109-L116

### 2.5 `chowdsp_data_structures`

| Classe | Usage temps réel |
| --- | --- |
| `ArenaAllocator`, `ChainedArenaAllocator`, `STLArenaAllocator` | Mémoire de travail allouée dans `prepare`, découpée sans `malloc` dans `process` ; `create_frame()` libère en fin de portée ([`Allocators/chowdsp_ArenaAllocator.h:13`][C-arena]) |
| `PoolAllocator`, `ObjectPool`, `FlatMemoryPool` | Objets de taille fixe réutilisables |
| `FixedSizeFunction<N, Sig>` | Callback sans allocation (remplace `std::function` sur le thread audio) |
| `SmallVector`, `SmallMap`, `EnumMap`, `OptionalArray`, `ChunkList`, `BucketArray` | Conteneurs à capacité locale |
| `DoubleBuffer` | Buffer circulaire toujours contigu |
| `LocalPointer`, `OptionalPointer`, `PackedPointer`, `StringLiteral` | Pointeurs utilitaires |
| `AbstractTree` | Arbre générique (base de `PresetTree`) |

Sans JUCE, 186 sections de test. À ne pas confondre avec `chowdsp_dsp_data_structures`, qui est **GPL** et contient `RealtimeLatestObject`, `SmoothedBufferValue`, `LookupTableTransform`, `RebufferedProcessor`, `COLAProcessor`, `UIToAudioPipeline` et les enveloppes moodycamel.

[C-arena]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/common/chowdsp_data_structures/Allocators/chowdsp_ArenaAllocator.h#L13

```cpp
chowdsp::ArenaAllocator<> arena;
void prepare (double, int maxBlock) { arena.reset (4 * (size_t) maxBlock * sizeof (float)); }
void process (std::span<float> x)
{
    auto frame = arena.create_frame();               // tout est rendu à la sortie de portée
    float* tmp = arena.allocate<float> (x.size(), 16); // pas de malloc
    // …
}
```

### 2.6 `chowdsp_buffers`

`chowdsp::Buffer<T>` (tas, `setMaxSize` dans `prepare` puis `setCurrentSize` sans allocation), `StaticBuffer<T, Ch, N>` (mémoire locale), `BufferView<T>` (vue non propriétaire, construite depuis `T* const*`, un `Buffer` ou un `juce::AudioBuffer`), et les itérateurs `buffer_iters::channels`, `samples`, `zip_channels`. `T` peut être `float`, `double` ou `xsimd::batch<float>`. 32 canaux maximum par défaut ([`chowdsp_buffers.h:38`][C-buf-38]). Sans JUCE sauf `SIMDAudioBlock` et le pont `juce::AudioBuffer`.

Écart avec `.claude/rules/cpp.md` : l'API prend des `BufferView` et des pointeurs avec taille, pas des `std::span`. On garde `std::span` sur nos interfaces publiques de `dsp/` et on construit un `BufferView` à l'intérieur.

[C-buf-38]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/dsp/chowdsp_buffers/chowdsp_buffers.h#L38

### 2.7 `chowdsp_math`

`BufferMath` (gain lissé, somme mono, copie, `applyFunction`, et `sanitizeBuffer` qui remplace NaN et Inf, [`Math/chowdsp_BufferMath.h:77`][C-bm-77]), approximations rapides (`LogApprox`, `PowApprox`, `DecibelsApprox`, `TrigApprox`), `Polynomials` (Horner, Estrin), `ChebyshevPolynomials`, `Polylogarithm`, `TanhIntegrals` (les intégrales utiles pour l'ADAA), `JacobiElliptic`, `RandomFloat`, `MatrixOps`, `Power`, `Ratio`, et `gcem` pour du `constexpr`. 85 sections de test, sans JUCE.

`sanitizeBuffer` en sortie de `processBlock` donne la garantie "sortie finie" de `docs/03_ARCHITECTURE.md` sans code maison ; elle ne remplace pas le test qui balaie les extrêmes.

[C-bm-77]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/dsp/chowdsp_math/Math/chowdsp_BufferMath.h#L77

### 2.8 `chowdsp_simd`

Enveloppe de **xsimd 10.0** (embarqué ; la version courante d'xsimd est plus récente, à ne pas mélanger avec une autre copie dans le même binaire), plus `SIMDSmoothedValue`, décibels, logique et fonctions spéciales SIMD, nombres complexes SIMD. `CHOWDSP_NO_XSIMD=1` coupe xsimd. 12 sections de test, sans JUCE.

## 3. Modules GPL utiles à un plugin AGPL

Tous compilables sans JUCE sauf les deux derniers groupes.

| Module | Ce qu'il offre |
| --- | --- |
| `chowdsp_filters` | Filtres du 1er et 2e ordre (LPF, HPF, BPF, shelf, peak, notch), Butterworth, Chebyshev II et elliptique d'ordre N, `SOSFilter`, `StateVariableFilter` (plus de types que JUCE), `OnePoleSVF`, `ModFilterWrapper`, `LinkwitzRileyFilter`, crossovers 2 et 3 voies, `FIRFilter` SIMD, interpolateur et décimateur FIR polyphase, `HilbertFilter`, `WernerFilter`, `ARPFilter` (ARP 1047), filtre d'ordre fractionnaire, transformées conformes (bilinéaire, alpha) |
| `chowdsp_waveshapers` | `ADAAHardClipper`, `ADAATanhClipper`, `ADAASoftClipper`, `ADAASineClipper`, `ADAAFullWaveRectifier`, `ADAAWaveshaper` générique, `SoftClipper`, `WestCoastWavefolder` (Buchla 259), `WaveMultiplier` (Serge) |
| `chowdsp_sources` | `SineWave` (magic circle), `SawtoothWave`, `SquareWave`, `TriangleWave` anti aliasées, `PolygonalOscillator`, `AdditiveOscillator`, `Noise` (uniforme, gaussien, rose), `NoiseSynth`, `RepitchedSource` |
| `chowdsp_eq` | `EQBand`, `EQProcessor`, `LinearPhaseEQ`, `StandardEQParameters` |
| `chowdsp_reverb` | Briques FDN, `Diffuser`, réseaux d'entrée et de tank Dattorro, `ConvolutionDiffuser` |
| `chowdsp_compressor` | Détecteurs de niveau, calculateurs de gain, `MonoCompressor` |
| `chowdsp_dsp_utils` | `DelayLine` (plusieurs interpolations), BBD (ligne, banc de filtres), `PitchShift`, upsampler et downsampler, `LanczosResampler`, `VariableOversampling`, `SRCResampler` (libsamplerate optionnel), moteur de convolution et outils d'IR, `OvershootLimiter`, `LinearPhase3WayCrossover`, `BypassProcessor`, `Panner`, `WidthPanner`, `TunerProcessor` |
| `chowdsp_dsp_data_structures` | `RealtimeLatestObject`, `SmoothedBufferValue`, tables de lookup et cache, `RebufferedProcessor`, `COLAProcessor`, `UIToAudioPipeline` |
| `chowdsp_modal_dsp` | `ModalFilter`, `ModalFilterBank` vectorisé |
| `chowdsp_plugin_base`, `chowdsp_plugin_utils` (JUCE) | `PluginBase<State>`, `SynthBase`, réglages globaux, `DeferredAction`, `AudioUIBackgroundTask`, `FileListener` |
| `chowdsp_gui`, `chowdsp_visualizers`, `chowdsp_foleys` (JUCE) | `PresetsComponent`, `ParametersView`, LookAndFeel, CPU meter, menu d'oversampling, tracés d'EQ, de waveshaper, de réduction de gain, spectre |

## 4. Exemples dans le dépôt

`examples/` contient neuf plugins (GPLv3) : `SimpleEQ`, `SimpleReverb`, `SignalGenerator`, `ModalSpringReverb`, `AutoWah`, `AccessiblePlugin`, `ForwardingTestPlugin`, `StatefulPlugin`, `ExampleCompressor`. Ils se construisent avec `-DCHOWDSP_ENABLE_EXAMPLES=ON`, JUCE 8.0.10 téléchargé par CPM.

**`StatefulPlugin`** ([`examples/StatefulPlugin/`][C-stateful]) est celui qui montre plugin_state et presets_v2 ensemble :

1. `StatefulPlugin.h` déclare un `ParamHolder` imbriqué (`LevelParams` dans `PluginParameterState` : un `PercentParameter`, un `GainDBParameter`, un `ChoiceParameter`, un `BoolParameter`, tous en `ParameterID` version 100), un `NonParamState` avec `StateValue<std::pair<int,int>> editorBounds`, et `State = PluginStateImpl<…>`.
2. Le processeur hérite de `chowdsp::PluginBase<State>` (GPL), qui fournit `getStateInformation`, `setStateInformation`, l'appel à `callAudioThreadBroadcasters` et le membre `presetManager`.
3. Le constructeur crée `presets::PresetManager (state, this, ".chowpreset")`, choisit `vendorInserter`, et branche `frontend::SettingsInterface` (GPL via plugin_utils) pour mémoriser le dossier utilisateur.
4. `processAudioBlock` lit `state.params.levelParams.percent->getCurrentValue()` directement.
5. L'éditeur affiche `ParametersViewEditor` et `PresetsComponent` (GPL), des boutons undo et redo sur l'`UndoManager` passé à l'état, et se redimensionne quand `editorBounds` change via `addNonParameterListener`.

Pour nous, c'est une bonne lecture de l'API, mais trois des cinq briques utilisées (`PluginBase`, `SettingsInterface`, `PresetsComponent`) sont GPL.

[C-stateful]: https://github.com/Chowdhury-DSP/chowdsp_utils/tree/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/examples/StatefulPlugin

## 5. Comment on l'utiliserait dans nos plugins

### Intégration CMake

```cmake
# Sous module épinglé sur le tag v2.4.0 (pas sur next).
add_subdirectory(JUCE)                       # définit JUCE_MODULES_DIR : chowdsp ajoute ses modules JUCE
add_subdirectory(third_party/chowdsp_utils)  # cibles chowdsp::chowdsp_<module>

# dsp/ : bibliothèque statique sans JUCE, construite par la fonction fournie
setup_chowdsp_lib(chowdsp_dsp_bsd MODULES chowdsp_math chowdsp_buffers chowdsp_simd chowdsp_data_structures)
target_link_libraries(dsp PRIVATE chowdsp_dsp_bsd)

# plugin/ et ui/ : modules JUCE
target_link_libraries(SharedCode INTERFACE
    chowdsp::chowdsp_plugin_state chowdsp::chowdsp_parameters
    chowdsp::chowdsp_presets_v2 chowdsp::chowdsp_version)
```

`AddJUCEModules.cmake` n'est pris que si `JUCE_MODULES_DIR` est défini, d'où l'ordre. `setup_chowdsp_lib` est inclus dans l'autre branche du `CMakeLists.txt` racine de chowdsp ; si les deux modes sont voulus dans le même projet, il faut inclure `cmake/SetupChowdspLib.cmake` à la main (à vérifier lors de la tâche d'intégration).

### Par couche

| Couche | Ce qu'on prend | Ce qu'on écrit encore |
| --- | --- | --- |
| `dsp/` | `chowdsp_math` (approximations, `sanitizeBuffer`, intégrales pour ADAA), `chowdsp_simd`, `chowdsp_buffers` (`BufferView`, `StaticBuffer`), `chowdsp_data_structures` (arena, `FixedSizeFunction`, `SmallVector`). Plugin AGPL : en plus `chowdsp_filters`, `chowdsp_waveshapers`, `chowdsp_sources`, `chowdsp_dsp_utils` | Les interfaces `prepare`/`reset`/`process(std::span)` et le moteur qui fait l'identité sonore |
| `plugin/` | `PluginStateImpl` à la place de l'APVTS, les types de `chowdsp_parameters`, `versionStreamingCallback` pour la migration, `presets::PresetManager` | `Parameters.h` (un seul fichier, IDs constants, comme l'exige `juce.md`), le remplissage du snapshot `Params`, l'appel à `callAudioThreadBroadcasters`, les deux méthodes d'état, l'API programmes |
| `ui/` | `SliderAttachment`, `ComboBoxAttachment`, `ButtonAttachment`, `ParameterAttachment` générique ; interfaces `presets::frontend` | Le composant de navigation de presets (ou celui de Gin), le LookAndFeel |
| `tests/plugin/` | Rien à prendre (tests GPL) | Round trip d'état sur le message thread, chargement des états de `tests/plugin/states/`, test qui fige la liste des IDs |

### Précautions à mettre dans la tâche d'intégration

1. **Couche `dsp/` et namespace `juce`.** En mode sans JUCE, `chowdsp_core` définit lui même `juce::SmoothedValue`, `juce::jlimit`, `juce::Decibels`… à partir de copies de JUCE ([`modules/common/chowdsp_core/chowdsp_core.h:53-86`][C-core]). Le test "`dsp/` sans `#include <juce_`" passe, mais si un en tête public de `dsp/` inclut chowdsp et est inclus par `plugin/`, la même classe chowdsp est compilée en mode JUCE d'un côté et sans JUCE de l'autre : risque d'ODR. Règle proposée : chowdsp n'apparaît que dans les `.cpp` de `dsp/`, jamais dans ses en têtes publics.
2. Les copies `juce_LookupTable` et `juce_FastMathApproximations` tirées en mode sans JUCE sont sous JUCE 7 EULA ou GPLv3, pas ISC. Sans conséquence si le plugin est AGPL ou sous licence JUCE commerciale, mais à noter dans l'ADR de licence.
3. **Plugin fermé** : régler les deux inclusions GPL de la section 1 avant le premier commit qui lie `chowdsp_plugin_state`.
4. **JUCE 9** : compiler chowdsp et lancer ses tests (`-DCHOWDSP_ENABLE_TESTING=ON`) contre notre tag JUCE dans une tâche dédiée ; tant que ce n'est pas vert, ne pas l'adopter.
5. pluginval strictness 10 sur le premier plugin qui l'utilise, puisque la désérialisation est différée.

[C-core]: https://github.com/Chowdhury-DSP/chowdsp_utils/blob/e97b826ef3de0b0fd92b15cb2e286076f678d8b9/modules/common/chowdsp_core/chowdsp_core.h#L53-L86
