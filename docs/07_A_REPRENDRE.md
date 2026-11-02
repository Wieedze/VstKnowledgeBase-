# Ce qu'on récupère tout fait

Principe : **tout ce qu'on n'a pas besoin de coder nous mêmes est un gain.** Moins de code à écrire, à tester et à maintenir, et du code déjà éprouvé en production. On ne code soi même que ce qui fait l'identité sonore du plugin.

État au 2026-11-02. Licences vérifiées dans les fichiers LICENSE et les en têtes, code lu dans les dépôts. Le détail, avec chemins `fichier:ligne`, est dans les fiches de [`docs/references/`](references/).

Notre format est **VST3 uniquement** (ADR 0003).

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

| Bibliothèque | Licence vérifiée | Ce qu'elle apporte | Sans JUCE (`dsp/`) | Plugin fermé | Fiche |
| --- | --- | --- | --- | --- | --- |
| [Signalsmith DSP](https://github.com/Signalsmith-Audio/dsp) | MIT | Délais, filtres, rééchantillonnage, FFT, enveloppes. **Bibliothèque DSP par défaut de `dsp/`** | Oui, header only | Oui | [temps réel et DSP](references/bibliotheques-temps-reel-et-dsp.md) |
| [HIIR](http://ldesoras.free.fr/prod.html) | WTFPL v2 | Oversampling demi bande polyphase IIR (2x en cascade) autour des non linéarités | Oui, header only | Oui | idem |
| chowdsp_utils, modules BSD : `chowdsp_math`, `chowdsp_simd`, `chowdsp_buffers`, `chowdsp_data_structures` | BSD 3 | Maths vectorielles, SIMD (xsimd), buffers, buffer circulaire, allocateurs | Oui, mais ils définissent leur propre namespace `juce` : ne pas les exposer dans un en tête public de `dsp/` | Oui | [chowdsp_utils](references/chowdsp-utils.md) |
| chowdsp_utils, modules GPL : `filters`, `eq`, `waveshapers`, `sources`, `reverb`, `compressor`, `dsp_utils`, `modal_dsp`, **`dsp_data_structures`** | GPL v3 | Filtres d'ordre élevé, EQ (dont phase linéaire), clippers ADAA, wavefolder, oscillateurs anti aliasés, FDN, compresseur, pitch shifter, `RealtimeLatestObject` | Variable | Non | idem |
| [Cloud Seed Core](https://github.com/GhostNoteAudio/CloudSeedCore) | MIT | Réverbe algorithmique à 8 lignes modulées | Oui | Oui | [temps réel et DSP](references/bibliotheques-temps-reel-et-dsp.md) |
| [Airwindows](https://github.com/airwindows/airwindows) via **airwin2rack** (`src/autogen_airwin/`) | MIT | Des centaines d'algorithmes (saturations, consoles, compresseurs, réverbes), sans SDK VST2 ni JUCE | Oui | Oui | idem |
| [sst-cpputils](https://github.com/surge-synthesizer/sst-cpputils) | MIT | `rtsan_support.h` (macros `[[clang::nonblocking]]` et garde de désactivation pour RTSan), `ring_buffer.h` (FIFO SPSC), allocateur fixe, petite table de hachage | Oui | Oui | [Surge et sst](references/surge-et-sst.md) |
| [sst-filters](https://github.com/surge-synthesizer/sst-filters), [sst-waveshapers](https://github.com/surge-synthesizer/sst-waveshapers), [sst-effects](https://github.com/surge-synthesizer/sst-effects) | GPL v3 | 41 filtres, 44 waveshapers, réverbes, délais, effets de modulation ; header only, C++20. Pour sst-effects, écrire notre propre `FXConfig` (celle d'exemple appelle `rand()`) | Oui | Non | idem |
| [sst-basic-blocks](https://github.com/surge-synthesizer/sst-basic-blocks) | GPL v3, sauf `LanczosResampler.h`, `HilbertTransform.h`, `EllipticBlepOscillators.h` en double licence MIT/GPL | Blocs de base de Surge, dont `FixedMatrix` (GPL), matrice de modulation de taille fixe sans verrou : **le modèle à suivre** | Oui | Les 3 fichiers MIT, **après avoir retiré leurs includes d'en têtes GPL** (`simd/setup.h`, `SmoothingStrategies.h`) | idem |
| [Gin](https://github.com/FigBug/Gin) `gin_dsp` | BSD 3 | Oscillateurs wavetable, filtres, compresseur, réverbe, ADSR, LFO | **Non** (dépend de `juce_dsp`) : va dans `plugin/` | Oui | [Gin](references/gin.md) |

**Réserves à connaître avant de brancher :**

1. **Cloud Seed Core alloue sur le thread audio** quand on change Decay, Size, Mod ou les graines (`UpdateLines` construit des `std::vector`), utilise `std::rand()` et pèse environ 64 Mo par instance (estimation d'après les constantes du code, non mesurée). À vendoriser dans `third_party/` avec un `PATCHES.md`, en complétant le patch de Drum Foundry qui laisse encore une allocation sur changement de graine. Paramètres de graine non automatisables.
2. **airwindows-juce n'est pas la bonne entrée** : 4 portages seulement, pas de fichier LICENSE, plus de commit depuis janvier 2024. Prendre le fichier de l'algorithme dans airwin2rack, l'envelopper dans une classe `dsp/` avec lissage et graine déterministe, et citer Airwindows.
3. **Gin et chowdsp ne sont pas testés de la même façon sur JUCE 9** : Gin suit JUCE develop (commits JUCE 9, pas de tag, épingler un commit) ; chowdsp n'est testé que sur JUCE 8.0.10.

## 4. Paramètres, état, presets : ne pas réinventer

| Bibliothèque | Licence | Remplace | Réserve |
| --- | --- | --- | --- |
| `chowdsp_parameters` | BSD 3 | Création des paramètres, paramètres de redirection | |
| `chowdsp_plugin_state` | BSD 3 **qui inclut un fichier GPL** (`DeferredMainThreadAction.h`) | Remplaçant de l'APVTS, avec attachments UI | Plugin fermé : patch ou accord de l'auteur. `deserialize` est différé sur le message thread : nos tests d'état et `tools/` doivent tourner sur ce thread |
| `chowdsp_presets_v2` | BSD 3 **qui inclut un fichier GPL** (`ProgramAdapter.h`) | Gestionnaire de presets (sauvegarde, navigation, tags) | Même réserve |
| `chowdsp_version` | BSD 3 | Comparaison de versions pour la migration d'état | |
| `chowdsp_serialization`, `chowdsp_json` | BSD 3 | Sérialisation JSON/XML | |
| `gin_plugin` | BSD 3 | Processeur étendu, paramètres modulables, matrice de modulation, navigateur de patchs, composants knob/ADSR/LFO/MSEG | Voir ci dessous |

**Gin : bonne base, pas à brancher tel quel.** C'est un cadre complet qu'on adopte en bloc à la place de l'APVTS. Quatre écarts avec nos règles, relevés dans le code (détail dans [la fiche](references/gin.md)) :

1. La `ModMatrix` **n'est pas sûre en temps réel** : ajouter ou retirer une route, ou charger un état, réalloue sans verrou pendant que l'audio lit. À corriger (par exemple routes publiées via `farbot::RealtimeObject`) avant usage.
2. L'état n'a pas de version et ne sauve que les valeurs différentes du défaut : incompatible avec `.claude/rules/juce.md` sans surcouche.
3. Un vérificateur de mises à jour et de news réseau est actif par défaut : à désactiver.
4. LFO et `WTOscillator` utilisent un aléatoire non seedable : les rendus de test ne sont pas reproductibles.

## 5. Temps réel : primitives éprouvées

| Bibliothèque | Licence vérifiée | Apporte |
| --- | --- | --- |
| [farbot](https://github.com/hogliux/farbot) | MIT | `RealtimeObject` (partager un objet entre l'UI et l'audio), `fifo` sans lock, `AsyncCaller` (déporter une libération ou un log hors du thread audio) |
| [readerwriterqueue](https://github.com/cameron314/readerwriterqueue) | BSD 2 clauses (le sémaphore de `atomicops.h` est sous zlib) | File SPSC lock free, pour les flux audio vers UI (mètres, analyseur). `AbstractFifo` de JUCE reste l'alternative sans dépendance |
| [RealtimeSanitizer (RTSan)](https://clang.llvm.org/docs/RealtimeSanitizer.html) | LLVM | Détection automatique des appels non temps réel depuis une fonction `[[clang::nonblocking]]` |

**RTSan remplace l'allocateur instrumenté qu'on prévoyait d'écrire**, avec trois limites : il demande **clang 20 ou plus**, ne marche **ni sous Windows ni avec AppleClang**, et **pluginval ne le couvre pas**. On le lance donc dans un job CI Linux, sur nos propres exécutables de test qui exercent `processBlock`, y compris les changements de paramètres pendant la lecture. Pamplejuce a déjà l'option `WITH_REALTIME_SANITIZER` dans `cmake/Sanitizers.cmake` ; il manque `include(Sanitizers)` et le job (exemple dans [la fiche Pamplejuce](references/pamplejuce.md)).

## 6. UI : composants et outils

| Bibliothèque | Licence vérifiée | Apporte | Réserve |
| --- | --- | --- | --- |
| [melatonin_inspector](https://github.com/sudara/melatonin_inspector) | MIT | Inspecteur d'UI en direct, déjà dans Pamplejuce | |
| [melatonin_blur](https://github.com/sudara/melatonin_blur) | MIT, contient un fichier BSD 3 de Gin | Ombres et flous rapides | |
| [foleys_gui_magic](https://github.com/ffAudio/foleys_gui_magic) | BSD 3 | Éditeur d'UI en XML avec édition en direct, analyseurs et mètres prêts | Remplace l'APVTS par `MagicProcessorState` : décision par ADR, pas par défaut |
| `gin_gui` | BSD 3 | Composants de synthé, layouts JSON | |
| `chowdsp_gui`, `chowdsp_visualizers` | GPL v3 | LookAndFeel, binding paramètres, courbe d'EQ | |

## 7. Divers

| Bibliothèque | Licence vérifiée | Apporte | Réserve |
| --- | --- | --- | --- |
| [clap-juce-extensions](https://github.com/free-audio/clap-juce-extensions) | MIT | Format CLAP | **Non utilisé** (VST3 uniquement, ADR 0003) : à retirer du template |
| [nlohmann/json](https://github.com/nlohmann/json) | MIT | JSON | |
| [melatonin_perfetto](https://github.com/sudara/melatonin_perfetto) | MIT déclaré dans l'en tête seulement (pas de fichier LICENSE) ; télécharge le SDK Perfetto en Apache 2.0 | Profiling du thread audio | |
| [melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) | MIT | Buffers audio en ASCII | **Dépend de `juce_dsp`** : utilisable dans les tests de `plugin/`, pas dans les tests DSP sans JUCE |

## 8. Les patterns à reprendre des projets de référence

Ces idées ne sont pas du code à copier (Drum Foundry et TetraDrive sont AGPL) mais des choix de conception à reproduire. Une idée n'est pas protégée ; seul le code l'est. Vérifié dans le code ([Drum Foundry](references/drum-foundry.md), [TetraDrive](references/tetradrive.md)).

| Pattern | Vu dans | Ce qu'on fait |
| --- | --- | --- |
| Binaire `tools` headless (render, check, bench, snapshot) qui pilote le vrai processeur | Drum Foundry | Cible `<Plugin>Tools` dès la phase 1, **lancée en CI** (Drum Foundry ne le fait pas) |
| Snapshot de paramètres par bloc, **assaini à la lecture** (NaN remplacé par le défaut, valeurs bornées) | Drum Foundry (`ParamReader`) | Structure `Params` remplie par `plugin/`, seule entrée du DSP |
| DSP compilable et testé sans JUCE | TetraDrive (`src/` + `tests/`) | Cible `dsp` sans JUCE. Drum Foundry, lui, ne le fait pas |
| Automation découpée aux points d'automation, avec rampes linéaires | TetraDrive (patch VST3) | Pertinent puisqu'on ne livre que du VST3 ; patch de 59 lignes, propre à JUCE 9 |
| Latence fixe, complétée par un **retard en fin de chaîne** | Drum Foundry | Réserver la latence du pire cas et compenser le reste par un délai. TetraDrive fait l'inverse (latence qui varie avec l'oversampling, bypass non compensé) : à éviter |
| Latence d'oversampling calée sur un nombre entier d'échantillons | TetraDrive (47, 55, 58) | Choisir des filtres dont le retard est entier |
| Clipper qui n'oversample que la différence non linéaire | Drum Foundry (`Clipper`) | Le signal reste identique au bit près sous le genou |
| Changement d'ordre de la chaîne : fondu de sortie 10 ms, reset, fondu d'entrée 10 ms | Drum Foundry | Pour tout réordonnancement ou changement de mode audible |
| Paquets internes de taille fixe **pour les algorithmes qui en ont besoin** | Drum Foundry (réverbe Cloud, 32 échantillons) | Leur LFO dépend encore de la taille de bloc et leur test ne le voit pas : notre test de taille de bloc doit activer la modulation |
| Construction lourde en arrière plan, objets remplacés mis sur une **liste de retrait** indexée par numéro de série | Drum Foundry (samples, réverbe Natural) | IR, tables d'onde, samples |
| Version d'état entière avec migrations en chaîne | Drum Foundry (version 10) | Une fonction de migration par version |
| Invariants entre paramètres (crossovers ordonnés, 1/12 d'octave min) | TetraDrive | Appliqués dans le snapshot, testés |
| Version unique, cohérence vérifiée en CI | Drum Foundry, TetraDrive | Une seule source de version |
| Carte du code (chemin → rôle) | Drum Foundry | `docs/CODEMAP.md` |
| Code vendored avec `PATCHES.md` | Drum Foundry (Cloud Seed) | Chaque dépendance modifiée documente ses patchs |

**À ne pas reprendre**, vu chez eux :

1. Insérer des options au milieu d'une liste de choix : chaque insertion force une migration des anciennes sessions. On ajoute en fin de liste.
2. Garder `ParameterID` en version 1 malgré des ajouts (les deux projets).
3. Copier de grosses tables sur le thread audio (Drum Foundry copie 196 Ko).
4. Un rendu non borné déclenché par un paramètre (Offset négatif chez Drum Foundry, jusqu'à 4 fois le budget d'un bloc selon leur propre audit).
5. Un bench qui ne mesure que la moyenne : on mesure le pire cas et on fixe un seuil.
6. Pas de CI (TetraDrive) ou une CI sans tests ni pluginval (Drum Foundry).

## Règle de choix

1. Est-ce que JUCE le fait déjà ? Si oui, on l'utilise.
2. Sinon, une bibliothèque MIT/BSD le fait-elle ? Si oui, on l'ajoute via CPM ou en sous module, version fixée.
3. Sinon, et si le plugin est AGPL, une bibliothèque GPL le fait-elle ? Si oui, idem.
4. Sinon seulement, on le code, en TDD.

Toute dépendance ajoutée : une ligne dans `docs/DEPENDENCIES.md` du projet (nom, version, licence, pourquoi), et un ADR si elle est GPL ou si elle remplace du code existant.
