# Ce qu'on récupère tout fait

Principe : **tout ce qu'on n'a pas besoin de coder nous mêmes est un gain.** Moins de code à écrire, à tester et à maintenir, et du code déjà éprouvé en production. On ne code soi même que ce qui fait l'identité sonore du plugin.

État au 2026-11-02. Les licences sont celles indiquées par chaque projet ; les lignes marquées *à vérifier* doivent être confirmées dans le fichier LICENSE avant usage.

## La question qui décide de tout : la licence du plugin

| Si le plugin est… | On peut prendre | On ne peut pas prendre |
| --- | --- | --- |
| **Open source AGPL v3** (comme Drum Foundry et TetraDrive) | MIT, BSD, ISC, WTFPL, **et** GPL v3 / AGPL v3 (compatibles avec l'AGPL v3) | Code sans licence |
| **Fermé / commercial** (licence JUCE commerciale) | MIT, BSD, ISC, WTFPL seulement | Tout GPL / AGPL : chowdsp GPL, Surge, Vital, Drum Foundry, TetraDrive… |

Cette décision est l'ADR 0001 de chaque projet de plugin (`docs/06_PLAN_DEMARRAGE.md`, phase 0). Tant qu'elle n'est pas prise, on n'utilise que du MIT/BSD : ça reste valable dans les deux cas.

## 1. Le squelette : ne rien écrire

| Brique | Source | Licence | Ce qu'on évite de coder |
| --- | --- | --- | --- |
| Projet CMake, cibles plugin/Tests/Benchmarks, CI 3 OS, pluginval, signature, packaging, `VERSION` | [Pamplejuce](https://github.com/sudara/pamplejuce) | MIT | Tout le build et la CI. Son `CLAUDE.md` contient même un assistant de configuration pour l'agent |
| Interface `SharedCode` qui lie le code au plugin **et** aux tests sans violation ODR | Pamplejuce | MIT | Le montage CMake des tests |
| Validation hôte | [pluginval](https://github.com/Tracktion/pluginval) | GPL v3 (outil, pas lié au plugin) | Un banc de test d'hôte |
| Tests | [Catch2 v3](https://github.com/catchorg/Catch2) | BSL 1.0 | Le framework de test |

## 2. Le DSP : d'abord ce que JUCE fournit déjà

Le module `juce_dsp` de JUCE couvre une grande partie des besoins courants. On le sait déjà présent, sous la même licence que JUCE : aucun coût d'intégration.

| Besoin | Classe JUCE |
| --- | --- |
| Filtres biquad, SVF, ladder, FIR | `dsp::IIR::Filter`, `dsp::StateVariableTPTFilter`, `dsp::LadderFilter`, `dsp::FIR::Filter`, `dsp::ProcessorDuplicator` |
| Oversampling | `dsp::Oversampling` (latence fournie) |
| Convolution (réverbe à IR, cabinet) | `dsp::Convolution` (chargement en arrière plan géré) |
| Ligne de délai interpolée | `dsp::DelayLine` |
| Dynamique | `dsp::Compressor`, `dsp::Limiter`, `dsp::NoiseGate`, `dsp::BallisticsFilter` |
| Modulation | `dsp::Chorus`, `dsp::Phaser`, `dsp::Oscillator` |
| Réverbe simple | `dsp::Reverb` (Freeverb) |
| Saturation simple | `dsp::WaveShaper` |
| Gain, pan, dry/wet avec compensation de latence | `dsp::Gain`, `dsp::Panner`, `dsp::DryWetMixer` |
| Lissage de paramètres | `SmoothedValue` |
| Analyse | `dsp::FFT`, `dsp::WindowingFunction` |
| FIFO lock free | `AbstractFifo` |

Limite : ces classes dépendent de JUCE, donc elles vivent dans `plugin/` ou dans une couche adaptatrice, pas dans `dsp/` pur. Si on veut garder `dsp/` sans JUCE, on prend les bibliothèques ci dessous.

## 3. Le DSP : bibliothèques tierces

| Bibliothèque | Licence | Ce qu'elle apporte | Utilisable si plugin fermé |
| --- | --- | --- | --- |
| [chowdsp_utils](https://github.com/Chowdhury-DSP/chowdsp_utils) modules BSD : `chowdsp_math`, `chowdsp_simd`, `chowdsp_buffers`, `chowdsp_data_structures` | BSD | Maths vectorielles, SIMD (xsimd), buffers, buffer circulaire, allocateurs arena/pool | Oui |
| chowdsp_utils modules GPL : `chowdsp_filters`, `chowdsp_eq`, `chowdsp_waveshapers`, `chowdsp_sources`, `chowdsp_reverb`, `chowdsp_compressor`, `chowdsp_dsp_utils`, `chowdsp_modal_dsp` | GPL v3 | Filtres d'ordre élevé, EQ (dont phase linéaire), clippers ADAA anti aliasing, wavefolder, oscillateurs anti aliasés, FDN façon Dattorro, compresseur, pitch shifter, rééchantillonneurs, filtres modaux | Non (licence non GPL à demander à l'auteur) |
| [Gin](https://github.com/FigBug/Gin) `gin_dsp` | BSD 3 | Oscillateurs wavetable, filtres, compresseur, réverbe, ADSR, LFO, matrice de modulation | Oui |
| [Signalsmith DSP](https://github.com/Signalsmith-Audio/dsp) | MIT *à vérifier* | Délais, filtres, rééchantillonnage, FFT, sans dépendance JUCE : compatible avec `dsp/` pur | Oui |
| [sst-basic-blocks](https://github.com/surge-synthesizer/sst-basic-blocks) (Surge) | GPL v3, sauf trois fichiers MIT : `LanczosResampler.h`, `HilbertTransform.h`, `EllipticBlepOscillators.h` | Blocs de base de Surge ; les trois fichiers MIT sont réutilisables partout | Seulement les 3 fichiers MIT |
| [Cloud Seed Core](https://github.com/GhostNoteAudio/CloudSeedCore) | MIT | Réverbe algorithmique à 8 lignes modulées, déjà utilisée par Drum Foundry | Oui |
| [Airwindows](https://github.com/airwindows/airwindows) / [airwindows-juce](https://github.com/hollance/airwindows-juce) | MIT | Des centaines d'algorithmes (saturations, consoles, compresseurs, réverbes) | Oui |
| [HIIR](http://ldesoras.free.fr/prod.html) (Laurent de Soras) | WTFPL *à vérifier* | Oversampling demi bande polyphase IIR, très efficace (celui que TetraDrive décrit) | Oui |

## 4. Paramètres, état, presets : ne pas réinventer

| Bibliothèque | Licence | Remplace |
| --- | --- | --- |
| `chowdsp_parameters` | BSD | Création des paramètres, paramètres de redirection |
| `chowdsp_plugin_state` | BSD | Remplaçant de l'APVTS, avec attachments UI |
| `chowdsp_presets_v2` | BSD | Gestionnaire de presets complet (sauvegarde, navigation, tags) |
| `chowdsp_serialization`, `chowdsp_json` | BSD | Sérialisation JSON/XML de l'état |
| `chowdsp_version` | BSD | Comparaison de versions pour la migration d'état |
| `gin_plugin` | BSD 3 | Processeur étendu, paramètres modulables, matrice de modulation, navigateur de patchs, composants knob/ADSR/LFO/MSEG |

Pour un synthé avec modulation, `gin_plugin` évite d'écrire la matrice de modulation et son UI, la partie qui a le plus dérivé dans le projet multi FX précédent.

## 5. Temps réel : primitives éprouvées

| Bibliothèque | Licence | Apporte |
| --- | --- | --- |
| [farbot](https://github.com/hogliux/farbot) | MIT | `RealtimeObject` (partager un objet entre l'UI et l'audio), `fifo` configurable sans lock, `AsyncCaller` (déporter une libération ou un log hors du thread audio) |
| [readerwriterqueue](https://github.com/cameron314/readerwriterqueue) | BSD *à vérifier* | File SPSC lock free, suggérée par Pamplejuce |
| [RealtimeSanitizer (RTSan)](https://clang.llvm.org/docs/RealtimeSanitizer.html) | LLVM | Détection automatique des appels non temps réel : on marque `processBlock` `[[clang::nonblocking]]`, on compile avec `-fsanitize=realtime`, et tout `malloc`, `free` ou `mutex` appelé depuis là fait échouer le programme. **Remplace l'allocateur instrumenté qu'on prévoyait d'écrire** (voir `docs/04_TESTS.md`) |

RTSan est le plus gros gain de cette section : c'est l'outil qui vérifie mécaniquement la règle n°1 de `.claude/rules/realtime-audio.md`. À mettre dans un job CI Linux avec clang.

## 6. UI : composants et outils

| Bibliothèque | Licence | Apporte |
| --- | --- | --- |
| [melatonin_inspector](https://github.com/sudara/melatonin_inspector) | MIT *à vérifier* | Inspecteur d'UI en direct, déjà dans Pamplejuce |
| melatonin_blur | MIT *à vérifier* | Ombres et flous rapides |
| [foleys_gui_magic](https://github.com/ffAudio/foleys_gui_magic) | *à vérifier* (LICENSE.md) | Éditeur d'UI en glisser déposer, feuille de style, analyseurs et mètres prêts |
| `gin_gui` | BSD 3 | Composants de synthé, layouts JSON |
| `chowdsp_gui`, `chowdsp_visualizers` | GPL v3 | LookAndFeel, binding paramètres, courbe d'EQ |

## 7. Divers

| Bibliothèque | Licence | Apporte |
| --- | --- | --- |
| [clap-juce-extensions](https://github.com/free-audio/clap-juce-extensions) | MIT *à vérifier* | Format CLAP en plus du VST3, déjà dans Pamplejuce |
| [nlohmann/json](https://github.com/nlohmann/json) | MIT | JSON |
| [melatonin_perfetto](https://github.com/sudara/melatonin_perfetto) | MIT *à vérifier* | Profiling du thread audio |
| [melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) | MIT | Buffers audio en ASCII dans les tests |

## 8. Les patterns à reprendre des projets de référence

Ces idées ne sont pas du code à copier (Drum Foundry et TetraDrive sont AGPL) mais des choix de conception à reproduire. Une idée n'est pas protégée ; seul le code l'est.

| Pattern | Vu dans | Ce qu'on fait |
| --- | --- | --- |
| Binaire `tools` headless (render, check, bench, snapshot) | Drum Foundry | Cible `<Plugin>Tools` dès la phase 1 |
| Snapshot de paramètres par bloc | Drum Foundry (`DrumParams`) | Structure `Params` remplie par `plugin/`, seule entrée du DSP |
| DSP compilable sans JUCE, tests sans JUCE | TetraDrive (`src/` + `tests/`) | Cible `dsp` sans JUCE |
| Paquets internes fixes de 32 échantillons | Drum Foundry | Pour tout algorithme sensible à la taille de bloc |
| Latence fixe quelle que soit la configuration | Drum Foundry | Réserver la latence du pire cas |
| Crossfade de 20 ms quand la chaîne change | Drum Foundry | Pour tout réordonnancement ou changement de mode audible |
| Construction lourde en arrière plan puis crossfade | Drum Foundry (réverbe Natural) | IR, tables d'onde, samples |
| Undo par geste utilisateur, pas par automation | Drum Foundry | Si on fait un undo |
| Patch JUCE pour automation sample accurate en VST3 | TetraDrive | Évaluer sur JUCE 9 (question ouverte dans `STATE.md`) |
| Invariants entre paramètres (crossovers ordonnés, 1/12 d'octave min) | TetraDrive | Appliqués dans le snapshot, testés |
| Migration d'état avec valeurs de repli | TetraDrive (sessions < 1.1.0) | Version dans l'état, fichiers d'état gardés en test |
| Version lue dans `CHANGELOG.md`, cohérence vérifiée en CI | TetraDrive, Drum Foundry | Une seule source de version |
| Carte du code (chemin → rôle) dans la doc | Drum Foundry | `docs/CODEMAP.md` |
| Code vendored avec `PATCHES.md` | Drum Foundry (Cloud Seed) | Chaque dépendance modifiée documente ses patchs |

## Règle de choix

1. Est-ce que JUCE le fait déjà ? Si oui, on l'utilise.
2. Sinon, une bibliothèque MIT/BSD le fait-elle ? Si oui, on l'ajoute via CPM ou en sous module, version fixée.
3. Sinon, et si le plugin est AGPL, une bibliothèque GPL le fait-elle ? Si oui, idem.
4. Sinon seulement, on le code, en TDD.

Toute dépendance ajoutée : une ligne dans `docs/DEPENDENCIES.md` du projet (nom, version, licence, pourquoi), et un ADR si elle est GPL ou si elle remplace du code existant.
