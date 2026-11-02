# Gin

**Verdict : Gin est entièrement BSD 3 (dépendances embarquées permissives), suit JUCE 9 et est très actif, mais `gin_plugin` est un cadre complet (processeur, paramètres, presets, UI) qu'on adopte en bloc à la place de l'APVTS, et sa matrice de modulation n'est pas sûre en temps réel quand l'UI ajoute ou retire une route pendant la lecture ; `gin_dsp` dépend de JUCE et ne peut donc pas vivre dans `dsp/`.**

Étude faite le 2026-11-02 sur `master` au commit [`9e9c172`](https://github.com/FigBug/Gin/tree/9e9c172de34776c7c3157b5efbdc245dc7a2755f) (2026-11-01). Le dépôt n'a **aucun tag de version** : on épingle un commit. Les chemins `fichier:ligne` sont relatifs à la racine du dépôt et valent pour ce commit.

## 1. Licences

### Gin lui même

[`LICENSE`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/LICENSE) : **BSD 3-Clause**, "Copyright (c) 2018, Roland Rabien". Chaque module déclare `license: BSD` dans son en tête JUCE (ligne 24, par exemple [`modules/gin_plugin/gin_plugin.h:24`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/gin_plugin.h#L24)). Contrairement à chowdsp_utils, il n'y a pas de module GPL ; exemples et tests sont sous la même licence que le dépôt.

| Module | Licence | Dépendances (en tête, ligne 27) |
| --- | --- | --- |
| `gin` | BSD | juce_core, juce_data_structures |
| `gin_simd` | BSD | juce_core |
| `gin_dsp` | BSD | gin, gin_simd, juce_core, juce_audio_utils, juce_dsp |
| `gin_graphics` | BSD | juce_core, juce_graphics, gin |
| `gin_gui` | BSD | juce_core, juce_graphics, juce_events, juce_gui_basics, juce_gui_extra, gin, gin_graphics |
| `gin_plugin` | BSD | gin, gin_dsp, gin_gui, gin_graphics, juce_audio_utils, juce_audio_processors |
| `gin_standaloneplugin` | BSD | gin_plugin et modules JUCE audio |
| `gin_3d`, `gin_controllers`, `gin_location`, `gin_metadata`, `gin_network`, `gin_remote`, `gin_svg`, `gin_webp` | BSD | sans intérêt pour un plugin audio |

Tous les modules exigent C++20 (`minimumCppStandard: 20`).

### Dépendances embarquées

| Dépendance | Module | Licence (fichier lu) | Tirée par `gin_plugin` |
| --- | --- | --- | --- |
| muParser (Ingo Berg) | `gin/3rdparty/muParser` | MIT (en tête) | Oui |
| bsdiff (Colin Percival) | `gin/3rdparty/bsdiff` | BSD 2 (en tête) | Oui |
| MIPP | `gin_simd/mipp` | MIT (LICENSE) | Oui |
| AudioFilter | `gin_dsp/3rdparty/AudioFilter` | MIT (readme.md:131-133) | Oui |
| Secret Rabbit Code (libsamplerate) | `gin_dsp/3rdparty/SecretRabbitCode` | BSD 2 (en tête de `samplerate.c`) | Oui |
| PlateReverb (Mike Jarmy, algorithme Dattorro 1997) | `gin_dsp/dsp/gin_platereverb.h` | MIT (en tête) | Oui |
| AirWindows (Chris Johnson) | `gin_dsp/dsp/gin_distortion.h` | MIT (en tête) | Oui |
| AVIR | `gin_graphics/3rdparty/avir` | MIT (LICENSE) | Oui |
| Police Barlow | `gin_plugin/resources/Barlow-Regular.ttf` | SIL OFL 1.1 d'après le projet amont ; **aucun texte de licence dans le dépôt** | Oui |
| NanoSVG | `gin_svg` | zlib (en tête) | Non |
| libwebp | `gin_webp` | BSD (Google) + PATENTS | Non |
| mbed TLS | `gin_network` | Apache 2.0 ou GPL 2.0+ | Non |

Conséquence : tout ce que tire `gin_plugin` est compatible avec un plugin fermé **et** un plugin AGPL. Seule action : joindre le texte OFL de Barlow dans les licences livrées (règle "polices embarquées, licences incluses" de `.claude/rules/ui.md`), ou remplacer la police.

## 2. `gin_plugin`

### 2.1 Le processeur étendu

`gin::Processor` ([`modules/gin_plugin/plugin/gin_processor.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.h)) hérite de `juce::AudioProcessor` et remplace l'APVTS.

| Fonction | Comment |
| --- | --- |
| Paramètres | `addExtParam` (exposé à l'hôte) et `addIntParam` (interne, non automatisable) avec plage, défaut, `SmoothingType` (linéaire ou eased, durée) et fonction de texte ; puis `init()` |
| Valeurs | `getUserValue()` (plage affichée), `getProcValue()` (après `conversionFunction`, par exemple dB vers linéaire), `getProcValue (n)` qui avance le lissage de n échantillons ; `isSmoothing()` |
| Stockage | `std::atomic<float> value` ([`gin_parameter.h:200`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_parameter.h#L200)) ; notification UI par `RealtimeAsyncUpdater`, sans allocation côté audio |
| État | XML : un `ValueTree state` libre pour le reste (`updateState()` et `stateUpdated()` à surcharger), plus un élément `param` par paramètre |
| Presets | `Program` : un fichier XML par preset (`name`, `author`, `tags`, `state`, `param`) dans le dossier utilisateur, surveillé par `FileSystemWatcher` ; dossiers factory en lecture seule via `getFactoryProgramDirectories()` |
| Divers | MIDI learn optionnel, réglages persistants (`PropertiesFile`), groupes de paramètres |

Exemple minimal (BSD, adapté de `examples/Effect`) :

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
        snapshot.gain = level->getProcValue (b.getNumSamples()); // valeur lissée avancée d'un bloc
        engine.process (snapshot, /* … */);
    }
    gin::Parameter* level = nullptr;
};
```

**Points qui heurtent nos règles (`.claude/rules/juce.md`).**

1. **Mise à jour et nouvelles en réseau activées par défaut** : `useUpdateChecker = true` et `useNewsChecker = true` ([`gin_processor.h:135-136`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.h#L135-L136)) ; l'éditeur lit alors `<site>/updates.xml` et `<site>/feed/` ([`components/gin_plugineditor.cpp:116`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_plugineditor.cpp#L116), [`:199`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_plugineditor.cpp#L199)). À désactiver systématiquement.
2. **L'état ne porte pas de version.** `getStateXml` n'écrit que les paramètres **différents de leur défaut** ([`gin_processor.cpp:647`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.cpp#L647)) et `setStateXml` remet tout au défaut avant de relire ([`gin_processor.cpp:676`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.cpp#L676)). Changer un défaut dans une version ultérieure change donc silencieusement le son des sessions existantes. Il faut écrire nous mêmes un attribut de version dans `state` (dans `updateState`) et la migration dans `stateUpdated`.
3. `versionHint` est un seul entier pour tous les paramètres ([`gin_processor.h:388`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.h#L388)), lu à la création de chaque paramètre : pour respecter "version de paramètre incrémentée à chaque ajout", on le modifie entre deux séries d'`addExtParam`.
4. `setCurrentProgram` est ignoré pendant 2 s après un chargement d'état ([`gin_processor.cpp:364`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_processor.cpp#L364)) ; à savoir pour les tests.

### 2.2 La matrice de modulation

Fichiers : [`plugin/gin_imodmatrix.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_imodmatrix.h) (interface vue par l'UI, `ModSrcId` ligne 13, `ModDstId` ligne 35, `ModFunction` ligne 73) et [`plugin/gin_modmatrix.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.h) (`ModVoice` ligne 8, `ModMatrix` ligne 93).

| Concept | Fonctionnement |
| --- | --- |
| Sources | `addMonoModSource (id, nom, bipolaire)` et `addPolyModSource (…)` ([`gin_modmatrix.h:320-321`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.h#L320-L321)) renvoient un `ModSrcId`. Valeur écrite par bloc : `setMonoValue (src, v)` ou `setPolyValue (voice, src, v)` |
| Destinations | Tout `gin::Parameter` passé à `addParameter (p, poly, smoothingTime)` (ligne 322) ; le paramètre reçoit un pointeur vers la matrice, ce qui allume l'anneau de modulation de son `Knob` |
| Routes | Par destination, une liste de `Source` : profondeur, activée, mapping bipolaire, courbe (`linear`, `quadratic`, `sine`, `exponential` In/Out/InOut et leurs inverses) |
| Calcul | `getValue (param)` ou `getValue (voice, param)` ([`gin_modmatrix.h:233-296`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.h#L233-L296)) : valeur normalisée du paramètre + somme des sources mises en forme × profondeur, bornée à [0, 1], lissée par un `ValueSmoother` par paramètre et par voix, puis convertie dans la plage utilisateur |
| Voix | La voix hérite de `ModVoice` ; `ModMatrix::addVoice` à la construction ; `finishBlock (n)` avance les lisseurs |
| Apprentissage | `enableLearn (src)` + `ModOverlay` : on clique une source puis on glisse sur un knob |
| Persistance | `updateState` et `stateUpdated` écrivent et relisent un nœud `MODMATRIX` de `MODITEM` (`srcId`, `dstId`, `depth`, `enabled`, `function`, `biPolarMapping`) dans le `ValueTree` du processeur, donc dans les sessions et les presets |
| Tests | 11 tests `juce::UnitTest` dans [`gin_modmatrix.test.h`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.test.h) |

**Thread safety côté audio.** Le chemin audio (`getValue`, `setMonoValue`, `setPolyValue`, `finishBlock`) n'alloue pas et ne verrouille pas. En revanche les structures sont des `juce::Array` non protégées :

| Appel depuis le message thread | Effet si l'audio tourne |
| --- | --- |
| `setModDepth` sur une route existante ([`gin_modmatrix.cpp:350`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.cpp#L350)) | Écriture d'un `float` non atomique : course de données bénigne en pratique |
| `setModDepth` qui **crée** une route, `clearModDepth` ([`:416`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.cpp#L416)) | `pi.sources.add` ou `remove` peut réallouer pendant que `getValue` itère : **accès mémoire libérée possible** |
| `stateUpdated` (chargement d'état ou de preset, [`:66`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/plugin/gin_modmatrix.cpp#L66)) | Vide puis reconstruit toutes les listes, sans verrou ni suspension du traitement |

Aucun verrou ni `suspendProcessing` n'entoure ces appels, ni dans `gin_plugin` ni dans l'exemple `Synth`. Pour respecter `.claude/rules/realtime-audio.md`, il faut soit patcher `ModMatrix` pour publier une table de routage immuable par échange de pointeur atomique (libération différée hors thread audio), soit envelopper ces trois appels. C'est un patch à maintenir.

### 2.3 Composants UI

Tous prennent des `gin::Parameter*`, pas des paramètres JUCE génériques : ils supposent `gin::Processor`.

| Composant | Fichier | Rôle |
| --- | --- | --- |
| `Knob` | [`components/gin_knob.h:55`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_knob.h#L55) | Rotatif + valeur + anneau de modulation live ; `Knob (param, fromCentre)` |
| `Select`, `Switch`, `Fader`, `HorizontalFader`, `PluginComboBox`, `PluginButton` | `components/` | Contrôles liés à un paramètre |
| `ADSRComponent` | [`components/gin_adsrcomponent.h:48`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_adsrcomponent.h#L48) | Enveloppe éditable à la souris, `setParams (a, d, s, r)` |
| `LFOComponent` | [`components/gin_lfocomponent.h:49`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_lfocomponent.h#L49) | Forme du LFO avec phase animée |
| `MSEGComponent`, `StepLFOComponent` | `components/` | Édition d'enveloppe multi segments et de LFO à pas |
| `ModMatrixBox`, `ModSrcListBox`, `ModulationSourceButton`, `ModulationDepthSlider`, `ModOverlay`, `ModulationOverview` | `components/` | Liste des routes, sources glissables, apprentissage |
| `PatchBrowser` | [`components/gin_patchbrowser.h:43`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_plugin/components/gin_patchbrowser.h#L43) | Liste des `Program`, filtres par auteur et tags |
| `ParamBox`, `ParamArea`, `ProcessorEditor`, `ScaledPluginEditor` | `components/` | Mise en page en panneaux, barre de titre (presets, menu), mise à l'échelle |
| `CopperLookAndFeel`, `PluginLookAndFeel` | `lookandfeel/` | Look complet avec la police Barlow |

## 3. `gin_dsp`

Module JUCE (dépend de `juce_dsp`, `juce_audio_utils`) : **pas utilisable dans notre `dsp/` sans JUCE**. Ses classes sont simples (`setSampleRate`, `reset`, `process (juce::AudioSampleBuffer&)`), donc faciles à envelopper dans `plugin/`.

| Domaine | Classes | Réutilisable chez nous |
| --- | --- | --- |
| Oscillateurs | `StereoOscillator` (VA à tables bande limitée), `VoicedStereoOscillator` et `BLLTVoicedStereoOscillator` (unisson), `WTOscillator`, `WTVoicedStereoOscillator`, `BandLimitedLookupTables`, `SampleOscillator` | Oui, pour un synthé |
| Enveloppes | `ADSR` (linéaire), `AnalogADSR`, `MSEG` | Oui |
| LFO | `LFO` (18 formes, delay, fade), `StepLFO` | Oui |
| Filtres | `Filter` (biquad multi canal, pentes, sur AudioFilter MIT, MZTi près de Nyquist), `EQ`, `GraphicEQ`, `DCBlocker` | Oui |
| Dynamique | `Dynamics` + `EnvelopeDetector`, `GateEffect`, `Maximizer`, `TransientShaper` | Oui |
| Effets | `SimpleVerb`, `PlateReverb` (Dattorro), `StereoDelay`, `DelayLine`, `AirWindowsDistortion`, `SoftClipper`, `BitCrusher`, `Exciter`, `StereoEnhancer`, `StereoProcessor` | Oui |
| Mesure | `LevelTracker`, `RMSMeter`, `LoudnessMeter` (K weighting), `TruePeakMeter`, `CorrelationMeter` + composants d'affichage (`components/`) | Oui, côté `ui/` |
| Utilitaires | `ValueSmoother`, `EasedValueSmoother`, `AudioFifo`, `AudioMidiFifo`, `ResamplingFifo` (libsamplerate), `Synthesiser` MPE avec glide, `Sample`, `SamplePlayer`, `MidiFilePlayer` | Au cas par cas |

Trois réserves :

1. **Aléatoire non déterministe** : `LFO` (formes S&H et bruit) et `WTOscillator::noteOn` sans phase explicite utilisent `juce::Random::getSystemRandom()` (voir [`BREAKING_CHANGES.md`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/BREAKING_CHANGES.md), novembre 2026). Contraire à `.claude/rules/dsp.md` et aux références `tests/golden/` : passer une phase explicite et ne pas utiliser ces formes dans un rendu de test.
2. **Verrous** : `Synthesiser` prend un `CriticalSection` sur le thread audio (comme `juce::MPESynthesiser`), `SamplePlayer` et `MidiFilePlayer` un `SpinLock`, `ScratchBuffer` un `CriticalSection`. À éviter dans `processBlock` ou à faire valider par `rt-safety-reviewer`.
3. `Filter::setNumChannels` alloue ([`dsp/gin_filter.h:90-100`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/modules/gin_dsp/dsp/gin_filter.h#L90-L100)) : à appeler dans `prepareToPlay` seulement.

Le comportement audible change parfois entre deux commits : `BREAKING_CHANGES.md` les liste. Épingler un commit et relire ce fichier à chaque mise à jour.

## 4. Compatibilité JUCE 9, activité, exemples

| Point | Constat |
| --- | --- |
| JUCE 9 | La CI clone la branche `develop` de JUCE ([`ci/build.sh:11`](https://github.com/FigBug/Gin/blob/9e9c172de34776c7c3157b5efbdc245dc7a2755f/ci/build.sh#L11)), donc la tête de JUCE 9 ; commits "Fix building with JUCE 9" (2026-06-23) et "gin_network builds with JUCE 9" (2026-10-31). Le README annonce JUCE 7.0+ |
| Risque inverse | Suivre `develop` veut dire qu'un commit Gin peut exiger un JUCE plus récent que notre tag épinglé : compiler avant de monter Gin |
| CI | Linux, macOS, Windows, couverture Codecov |
| Tests | 93 fichiers `*.test.h` (`juce::UnitTest`), dont 45 dans `gin_dsp` et 6 dans `gin_plugin`, lancés par `examples/UnitTests` |
| Activité | Commits par mois depuis novembre 2025 : 149, 58, 32, 9, 4, 6, 13, 10, 10, 32, 5, 15, 10 (novembre 2026 en cours). Mainteneur principal Roland Rabien (SocaLabs), soutien de reFX |
| Exemples | `examples/Effect` (gain, pan, inversion avec lissage, 125 lignes), `examples/Synth` (synthé MPE complet : oscillateurs, filtre, ADSR, LFO mono et poly, délai, matrice de modulation, `ParamBox` et knobs), `examples/Demo` (vitrine des modules), `examples/UnitTests` |

## 5. Comment on l'utiliserait dans nos plugins

### Décision par type de plugin

| Plugin | Recommandation |
| --- | --- |
| Effet simple ou multi effet sans modulation | Ne pas prendre `gin_plugin` : chowdsp_plugin_state ou APVTS suffisent et gardent l'état versionné. Piocher dans `gin_dsp` si un bloc manque à `juce_dsp` |
| Synthé ou effet avec modulation interne (LFO, enveloppes, routage) | Prendre `gin_plugin` en bloc : `gin::Processor`, `ModMatrix`, knobs, ADSR, LFO, MSEG, `PatchBrowser`. Le gain (matrice + son UI) dépasse le coût, à condition d'ajouter le patch de thread safety et la version d'état |

On ne mélange pas `gin::Processor` avec `chowdsp::PluginStateImpl` ou l'APVTS : les deux possèdent les paramètres et l'état.

### Par couche, pour un synthé

| Couche | Ce que fournit Gin | Ce qu'on écrit |
| --- | --- | --- |
| `dsp/` | Rien (Gin dépend de JUCE) | Le moteur sonore pur ; ou on accepte que les oscillateurs et enveloppes de `gin_dsp` vivent dans `plugin/` derrière une interface |
| `plugin/` | `gin::Processor`, `gin::Parameter` (déclarés dans un seul `Parameters.cpp` avec IDs constants), `ModMatrix`, `ModVoice`, `Program` | Le snapshot `Params` rempli par `modMatrix.getValue(...)` ; un attribut de version dans `state` et la migration dans `stateUpdated` ; le patch de `ModMatrix` (dans `patches/`, avec ADR) ; `ProcessorOptions().withoutUpdateChecker().withoutNewsChecker()` |
| `ui/` | `ProcessorEditor`, `Knob`, `ADSRComponent`, `LFOComponent`, `MSEGComponent`, `ModSrcListBox`, `ModOverlay`, `PatchBrowser`, `CopperLookAndFeel` | Le document de design et notre LookAndFeel ; le texte OFL de la police |
| `tests/plugin/` | Rien de directement réutilisable | Round trip d'état incluant le nœud `MODMATRIX`, chargement d'états des versions publiées, test de stress qui modifie les routes pendant `processBlock` sous ThreadSanitizer |

### CMake

```cmake
add_subdirectory(JUCE)                        # tag épinglé, compatible avec le commit Gin choisi
add_subdirectory(third_party/Gin/modules)     # juce_add_module pour chaque module ; pas le CMakeLists racine (il ajoute juce/ et les exemples)
target_link_libraries(SharedCode INTERFACE gin gin_simd gin_dsp gin_graphics gin_gui gin_plugin)
```

Gin est un sous module épinglé sur un commit (pas de tag). On ne lie ni `gin_webp` (il force `JUCE_USE_WEBP=0`) ni `gin_network` (mbed TLS) : `gin_plugin` n'en a pas besoin.
