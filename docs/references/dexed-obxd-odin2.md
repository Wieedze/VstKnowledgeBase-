# Dexed, OB-Xd (OB-Xf) et Odin 2

Étude faite le 2026-11-02 sur des clones superficiels (`--depth 1`, sans sous modules) dans `/home/claude/study/`. Les chemins `fichier:ligne` sont relatifs à la racine de chaque dépôt et valent pour le commit indiqué. Contexte : playbook VST3 uniquement, C++23, JUCE 9, CMake ; licence de nos plugins pas encore décidée (voir `docs/07_A_REPRENDRE.md`, "La question qui décide de tout").

| Projet | Commit étudié | Lien |
| --- | --- | --- |
| Dexed | `fea2f0f` | [asb2m10/dexed@fea2f0f](https://github.com/asb2m10/dexed/tree/fea2f0f0f2c397799f59b27eb11c038cd34b22c5) |
| OB-Xd (discoDSP) | `0c7c737` (README seul) ; dernier source `f1fcdd5` | [reales/OB-Xd@f1fcdd5](https://github.com/reales/OB-Xd/tree/f1fcdd51eabcb7855cdd90818611cd7e357c359c) |
| OB-Xf (fork Surge Synth Team) | `102bb38` | [surge-synthesizer/OB-Xf@102bb38](https://github.com/surge-synthesizer/OB-Xf/tree/102bb389eeea25f868c656e07aaed1c135087cb7) |
| Odin 2 | `265e9e2` | [TheWaveWarden/odin2@265e9e2](https://github.com/TheWaveWarden/odin2/tree/265e9e227581357efb87ed7217381f8a40c5e2bf) |

## Récapitulatif

| Projet | Licence | Moteur sans JUCE | Build | Tests | Dernier commit | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Dexed | GPL v3 ; dossier `source/msfa/` en **Apache 2.0** (sauf `tuning.*`, sans en tête) | Presque : `msfa/` est du C++ standard, à trois couplages près (logger, MTS-ESP, `tuning.cc` qui inclut JUCE) | CMake (un `Dexed.jucer` subsiste), JUCE 8.0.11 | Aucun | 2026-10-14 | **Le meilleur gain de l'étude** : le moteur FM DX7 `msfa` est Apache 2.0, donc utilisable avec un plugin fermé **et** avec un plugin AGPL. Lecture des SysEx DX7 en GPL : à réécrire ou à prendre seulement si AGPL |
| OB-Xd | GPL v3 (source 2.10 seulement) ; images CC BY-SA 2.0 | Non (en têtes `Engine/` liés à JUCE) | Projucer, JUCE 7 | Aucun | 2026-08-18 (README) ; source retiré le 2026-02-18 | **Ne pas étudier** : le source a été supprimé de `HEAD`, le produit est devenu binaire seul. Prendre OB-Xf |
| OB-Xf | GPL v3 ou ultérieure, tous fichiers | Presque : moteur en en têtes, JUCE utilisé pour `Random`, `jlimit`, `String`, `FastMathApproximations` ; SIMD via simde et sst-basic-blocks (GPL) | CMake, JUCE 8.0.12 (commit `develop` épinglé), C++20 | 131 `TEST_CASE` Catch2, dont des rendus de référence ; lancés en CI Linux | 2026-11-01 | **Fork le plus actif, meilleure ingénierie des trois.** Filtre OB-X/Xpander ZDF, oscillateurs BLEP, décimateur, ADSR réutilisables **seulement si AGPL**. Excellente source d'idées sinon |
| Odin 2 | GPL v3 ; police Aldrich en OFL 1.1 | Non : tout `Source/audio/` inclut `JuceHeader.h` via `GlobalIncludes.h` | CMake, JUCE 6.1.6 | Aucun | 2025-05-30 | **Catalogue d'idées, pas de code à extraire** : beaucoup de filtres et d'effets, mais JUCE 6, couplage fort, allocations sur le thread audio, plus de commit depuis 17 mois |

Règle de lecture : "si AGPL" veut dire que la ligne n'est utilisable que si l'ADR 0001 du plugin choisit l'AGPL v3. L'Apache 2.0 est compatible avec la GPL v3 et l'AGPL v3 (dans ce sens seulement) et avec un plugin fermé, à condition de garder les en têtes, le texte de la licence, un éventuel `NOTICE`, et de signaler les fichiers modifiés.

## 1. Dexed

**Verdict : on reprend le moteur `msfa` (Apache 2.0) tel quel dans `dsp/`, après avoir coupé trois dépendances ; le reste de Dexed (processeur, cartouches SysEx, filtre, UI) est GPL v3 et sert d'exemple ou d'idée, sauf si le plugin est AGPL.**

### 1.1 Licences

| Dossier ou fichier | Licence lue dans le fichier | Remarque |
| --- | --- | --- |
| [`LICENSE`](https://github.com/asb2m10/dexed/blob/fea2f0f0f2c397799f59b27eb11c038cd34b22c5/LICENSE) | GPL v3 | Licence par défaut du dépôt |
| `README.md:16-17` | | "The msfa component [...] stays on the Apache 2.0 license to be able to collaborate between projects" |
| `source/msfa/*.h`, `*.cc`, `porta.cpp` (24 fichiers) | **Apache 2.0** (en tête de chaque fichier), Copyright Google 2012-2013, Pascal Gauthier 2016-2025, Jean Pierre Cimalando 2019 | Les modifications récentes de Pascal Gauthier gardent l'en tête Apache, par exemple `source/msfa/dx7note.cc:1-15` |
| `source/msfa/tuning.h`, `tuning.cc` | **aucun en tête**, donc GPL v3 du dépôt | `tuning.cc:11` inclut `juce_gui_basics` |
| `source/engine/EngineMkI.h` | Apache 2.0 | |
| `source/engine/EngineMkI.cpp`, `EngineOpl.h`, `EngineOpl.cpp` | GPL v3 ou ultérieure | `EngineOpl.cpp:22` cite "carbon14 and opl3" |
| `source/PluginFx.h`, `PluginFx.cpp` | GPL v3 ou ultérieure | `PluginFx.cpp:6-7` : "Filter taken from the Obxd project" |
| `source/core/`, `parameter/`, `midi/`, `ui/`, `util/` | pas d'en tête, donc GPL v3 | |
| Sous modules (non clonés) : `tuning-library` (Surge), `MTS-ESP`, `surgesynthteam_tuningui`, `clap-juce-extensions`, `JUCE` | *à vérifier* dans chaque sous module | tuning-library est annoncée MIT par Surge ; MTS-ESP à vérifier |

### 1.2 Architecture

| Élément | Ce que fait Dexed | Où |
| --- | --- | --- |
| Séparation moteur / JUCE | `msfa/` n'inclut pas JUCE, sauf `tuning.cc`. Mais `controllers.h:21` et `env.cc:23` incluent `../debugger/Logger.h` (GPL, lié à JUCE), et `dx7note.h:32` inclut `libMTSClient.h` | `source/msfa/` |
| Voix | 16 voix fixes (`MAX_ACTIVE_NOTES`), un `Dx7Note*` par voix | `source/PluginProcessor.h:76-77` |
| Opérateurs et algorithmes | 6 opérateurs, table des 32 algorithmes du DX7 | `source/msfa/fm_core.cc:29`, rendu `fm_core.cc:93` |
| Calcul d'une note | `Dx7Note::init` à partir des 156 octets du patch, `Dx7Note::compute` par paquet | `source/msfa/dx7note.cc:163`, `:222` |
| Arithmétique | Entiers 32 bits, tables de sinus et d'exponentielle, émulation fidèle des pas d'enveloppe et du LFO du DX7 | `msfa/sin.*`, `exp2.*`, `env.*`, `lfo.*`, `pitchenv.*` |
| Paquets fixes | Le moteur travaille par paquets de `N = 64` échantillons (`LG_N = 6`) ; le surplus d'un paquet est gardé dans `extra_buf` pour le bloc suivant | `source/msfa/synth.h:29-30`, `source/PluginProcessor.cpp:228-268` |
| Anti aliasing | Aucun, volontairement : c'est le caractère du DX7 | |
| Trois moteurs | "Modern" (msfa), "Mark I" (`EngineMkI`), "OPL" (`EngineOpl`), choisis par pointeur `controllers.core` | `source/PluginProcessor.cpp:478-493` |
| Filtre de sortie | Filtre 4 pôles d'OB-Xd porté (GPL) | `source/PluginFx.cpp:159` |
| Sortie | Mono, copiée sur le canal droit | `source/PluginProcessor.cpp:291-293` |
| Commandes UI vers audio | `CommandFifo` : commandes type erased construites sur le thread UI, exécutées par le thread audio via `AbstractFifo` | `source/util/CommandFifo.h`, appel `PluginProcessor.cpp:198` |

Points contraires à `.claude/rules/realtime-audio.md` et `dsp.md`, à ne pas reproduire :

1. État global : `Freqlut::init`, `Lfo::init`, `Env::init_sr`, `Porta::init_sr` sont statiques et réinitialisés par `prepareToPlay` (`PluginProcessor.cpp:137-141`, `msfa/env.h:52,61`, `msfa/lfo.h:21,34-35`). Deux instances à des fréquences d'échantillonnage différentes se perturbent. Dans `dsp/`, ces tables deviennent des membres d'un objet `prepare(sampleRate, maxBlockSize)`.
2. `prepareToPlay` fait `new Dx7Note` pour chaque voix sans libérer l'ancienne (`PluginProcessor.cpp:147`) : fuite si l'hôte rappelle `prepareToPlay` sans `releaseResources`.
3. `std::vector<MidiMessage> outputMidiMessageQueue` vidé dans `processBlock` (`PluginProcessor.h:233`, `PluginProcessor.cpp:296-300`).

### 1.3 Presets

| Sujet | Détail | Où |
| --- | --- | --- |
| Format | Cartouches SysEx DX7 de 32 voix : 4104 octets, en tête `F0 43 00 09 20 00`, somme de contrôle, voix empaquetée sur 128 octets, dépaquetée sur 155 | `source/core/Cartridge.h:7-8`, `Cartridge.cpp:30` (`load`), `:137` (`unpackProgram`), `:194` (`packProgram`) |
| Robustesse | `load` rend 1 si la somme de contrôle est fausse, 2 si aucune donnée SysEx n'est trouvée ; `normparm` borne chaque paramètre | `Cartridge.h:53-58`, `Cartridge.cpp:21` |
| Documentation du format | `doc/sysex-format.txt`, `doc/TX802-SYSEX.pdf` | `doc/` |
| Bibliothèque | Cartouches `.syx` dans un dossier utilisateur, cartouches d'usine dans `assets/builtin_pgm.zip` (BinaryData), navigateur `CartManager` | `source/PluginData.cpp:62-80`, `source/ui/window/CartManager.cpp` |
| État de session | Version écrite (`IDs::version`, `DexedApvts::MODEL_VERSION`), chargeur de l'ancien format 1.0 | `source/parameter/State.cpp:6-57`, `StateLegacy.h` |
| SysEx en temps réel | Réception et envoi de patchs vers un vrai DX7 | `source/midi/SysexComm.cpp` |

### 1.4 Build, tests, CI

| Sujet | État |
| --- | --- |
| Build | CMake 3.16 minimum, JUCE en sous module (`libs/JUCE` épinglé sur le tag **8.0.11**), standard C++ non fixé (C++17 par défaut de JUCE). Formats VST3, AU, Standalone, CLAP |
| Tests | Aucun |
| CI | GitHub Actions `project-pipeline.yml` : build et installeurs Linux, Windows, macOS. Ni test, ni pluginval |
| Dernier commit | 2026-10-14 (`fea2f0f`) ; version 1.1.0 en cours |

### 1.5 Ce qu'on peut extraire

| Quoi | Licence | Couche chez nous | Effort |
| --- | --- | --- | --- |
| `source/msfa/` sauf `tuning.*` : `dx7note`, `fm_core`, `fm_op_kernel`, `env`, `pitchenv`, `lfo`, `porta`, `sin`, `exp2`, `freqlut`, `controllers`, `synth.h`, `aligned_buf.h`, `module.h` | Apache 2.0 | `dsp/` | Moyen, environ deux jours : remplacer `Logger.h` par un en tête vide, remplacer `TuningState` par une petite interface à nous, retirer MTS-ESP ou le cacher derrière cette interface, transformer les tables statiques en membres, écrire les tests de non régression (rendus d'un patch connu) avant de toucher au code |
| `source/engine/EngineMkI.*` (variante "Mark I") | `.h` Apache, `.cpp` GPL v3 | `dsp/` | Faible, mais **si AGPL** seulement à cause du `.cpp` |
| `source/core/Cartridge.*`, `Program.*` (lecture et écriture SysEx) | GPL v3 | `plugin/` | Faible si AGPL. Sinon, réécrire à partir de `doc/sysex-format.txt` (le format est un fait, pas du code) : environ 200 lignes, en TDD avec de vraies cartouches |
| `source/util/CommandFifo.h` | GPL v3 | `plugin/` | Idée seulement : `farbot::fifo` ou `AbstractFifo` font la même chose |
| `source/PluginFx.*` | GPL v3 | `dsp/` | Ne pas prendre : la version maintenue de ce filtre est dans OB-Xf |

## 2. OB-Xd et OB-Xf

**Verdict : l'OB-Xd de discoDSP n'est plus open source (source supprimé de `HEAD` le 2026-02-18, dernière version publiée en source : 2.10 de 2022). Le fork OB-Xf de la Surge Synth Team est le seul vivant et le mieux outillé des trois projets, mais il est GPL v3 ou ultérieure de bout en bout : son code n'est réutilisable que si le plugin est AGPL.**

### 2.1 OB-Xd (reales/OB-Xd)

| Sujet | État |
| --- | --- |
| Historique | 7 commits. `f1fcdd5` (2022-12-19) "2.10 release" ; `73cea60` (2026-02-18) "Clean up" supprime tout le source ; depuis, seul `README.md` change |
| Licence | `LICENSE` GPL v3 dans `f1fcdd5`. Le README actuel : "Versions up to 2.11 are available under GPL v3", images de `Source/Images` en CC BY-SA 2.0, autres ressources "All rights reserved" |
| Build | Projucer (`OB-Xd.jucer`), README : JUCE 7.0.3 ; contient des fichiers JUCE patchés dans `Modules/` |
| Moteur | `Source/Engine/*.h` (`SynthEngine`, `Motherboard`, `ObxdVoice`, `Filter`, `BlepData`, `Decimator`), 8 voix |

On ne l'étudie pas plus : OB-Xf repart de la même base (2.11) avec des années de corrections.

### 2.2 OB-Xf : licences

| Dossier | Licence | Où |
| --- | --- | --- |
| Tout `src/` | GPL v3 ou ultérieure (en tête identique dans chaque fichier, "successor to OB-Xd version 2.11", Copyright 2013-2025 auteurs d'origine et contributeurs) | par exemple `src/engine/Filter.h:1-17` |
| `LICENSE` | GPL v3 | racine |
| `assets/` | non précisé, donc GPL v3 du dépôt ; *à vérifier* pour les images et les deux polices `.ttf` | `assets/installer/` |
| Sous modules (non clonés) | `sst-basic-blocks` (GPL v3 sauf trois fichiers MIT, voir `07_A_REPRENDRE.md`), `sst-cpputils`, `sst-plugininfra`, `simde` (MIT), `fmt` (MIT), `melatonin_inspector`, `MTS-ESP`, `pybind11`, `clap-juce-extensions` | `.gitmodules` |

### 2.3 OB-Xf : architecture

| Élément | Ce que fait OB-Xf | Où |
| --- | --- | --- |
| Séparation moteur / JUCE | Moteur entièrement en en têtes dans `src/engine/`. JUCE y reste pour peu de choses : `juce::Random` (`Lfo.h:52`, `Voice.h:200-204`), `jlimit` (`OscillatorBlock.h:185`), `FastMathApproximations::sin` (`Lfo.h:206`), `juce::String` (`Program.h:78`, `MidiMap.h`), constantes (`core/Constants.h:82-87`) | `src/engine/` |
| Voix | 32 voix (`MAX_VOICES`), unisson jusqu'à 8 (`MAX_PANNINGS`), file de voix et vol de voix par ancienneté | `src/configuration.h:26,31`, `src/engine/VoiceQueue.h:25`, `src/engine/Motherboard.h:555` |
| SIMD | Quatre voix par registre (`OscillatorQuad`, `AdsrEnvelopeQuad`, `VoiceControlQuad`, `VoiceFinishQuad`) via simde et `sst/basic-blocks/simd/setup.h` | `src/engine/SimdMath.h:25-30`, `src/engine/VoiceFinishQuad.h:42` |
| Oscillateurs | Dent de scie, pulse, triangle, bruit blanc, rose, rouge ; anti aliasing par **BLEP** tabulé (16 échantillons, 64 phases, table transposée pour lecture séquentielle) | `src/engine/BlepData.h:22-30`, `SawOsc.h:45,107`, `Noise.h:101-118` |
| Suréchantillonnage | Mode HQ optionnel ×2, décimation par `Decimator17` (17 coefficients) | `src/engine/Motherboard.h:737-758,769`, `Decimator.h:25` |
| Filtre | 2 pôles multimode (LP, BP mélangé, HP, "push") et 4 pôles avec 15 modes Xpander par mélange des sorties de pôles. Rétroaction résolue sans retard (ZDF/TPT), non linéarité de paire de diodes approchée par Taylor, saturation `atan` dans le premier pôle | `src/engine/Filter.h:117-216` |
| Enveloppes | ADSR avec courbe d'attaque réglable, version scalaire et version SIMD | `src/engine/AdsrEnvelope.h:22`, `AdsrEnvelopeQuad.h` |
| Modulation | LFO global et vibrato synchronisables au tempo, matrice de 8 lignes (sources MPE : strike, lift, press, slide, glide), sources sérialisées par nom et non par entier | `src/configuration.h:39`, `src/engine/VoiceMatrix.h:79-120`, `src/engine/Lfo.h` |
| "Slop" analogique | Dérive aléatoire par voix (niveau, enveloppes, coupure, portamento) | `src/engine/Voice.h:200-204` |
| MIDI | Découpage du bloc à chaque événement MIDI (rendu précis à l'échantillon) | `src/ObxfProcessor.cpp:176-195` |
| Paramètres | Méta données `sst::basic_blocks::params::ParamMetaData`, FIFO de changements de paramètres, attachments maison | `src/parameter/` |

Points contraires à nos règles temps réel, à ne pas reproduire :

1. `ParameterUpdateHandler::updateParameters` est appelée en tête de `processBlock` (`src/ObxfProcessor.cpp:89`) et prend un `std::mutex` puis cherche dans un `std::unordered_map<juce::String, ...>` à partir d'un `char*`, ce qui construit une `juce::String` (allocation) sur le thread audio : `src/parameter/ParameterUpdateHandler.cpp:157-159`, `ParameterUpdateHandler.h:112`.
2. `juce::Random::getSystemRandom()` : générateur global non seedable (`Voice.h:200-204`), contraire à la règle "pas de `rand()`, générateur seedable" de `dsp.md`.
3. `tan` et `atan` évalués à chaque échantillon dans le filtre (`Filter.h:146,187,198`) : correct mais coûteux ; une table ou une approximation se mesure avec `tools bench`.

### 2.4 OB-Xf : presets

| Sujet | Détail | Où |
| --- | --- | --- |
| Format | Un fichier `.fxp` par patch (conteneur VST2 `CcnK`) qui porte du XML : valeurs par ID de paramètre, nom, auteur, licence, catégorie, projet, lignes de matrice | `src/state/StateManager.cpp:61-81,93-107` |
| Factory | 493 `.fxp` rangés par catégorie (Atmospheres, Basses, Bells...) | `assets/installer/Surge Synth Team/OB-Xf/Patches/` |
| Import OB-Xd | Banques `.fxb` et patchs `.fxp` d'OB-Xd convertis, avec compensation documentée du décalage d'octave d'OB-Xd | `src/state/ObxdImporter.h:37-72`, `README.md` section "Compatibility with OB-Xd", test `src/tests/obxd_import.cpp` |
| État de session | XML avec `ob-xf_version`, élément `program` et `dawExtraState` séparés | `src/state/StateManager.cpp:31-49,188-221` |
| Navigateur | Arbre de patchs, chargement par fichier | `src/Utils.h:244-247` |

### 2.5 OB-Xf : build, tests, CI

| Sujet | État |
| --- | --- |
| Build | CMake 3.15 minimum, C++20 (`CMakeLists.txt:22`), JUCE en sous module épinglé sur un commit de `develop` du 2026-09-02 qui déclare **8.0.12**. Formats VST3, AU, LV2, CLAP, Standalone, AUv3 (iOS en cours) |
| Tests | Cible `obxf-tests` (Catch2, JUCE console app), 131 `TEST_CASE` : oscillateurs, filtre (bornes, sortie finie, reset, rendus de référence), enveloppes (bornes, durées), bruit, MPE, accordage, moteur entier, import OB-Xd. Tolérances explicites (`Approx(...).margin(...)`, `src/tests/filt.cpp:289`). Rendus de référence du moteur entier régénérables par variable d'environnement (`src/tests/engine.cpp:20-28`) |
| CI | GitHub Actions : build Windows (MSVC, clang-cl, ARM64, ARM64EC), macOS, Linux (gcc 12, 13, 14, ARM), tests sur Linux, vérification clang-format. Pas de pluginval |
| Dernier commit | 2026-11-01 (`102bb38`) |

Remarque sur les tests : les valeurs de référence des filtres sont des sorties de l'implémentation figées. C'est de la non régression, utile, mais cela ne prouve pas la justesse (règle "pas de test qui reproduit l'implémentation" de `testing.md`).

### 2.6 OB-Xf : ce qu'on peut extraire (si AGPL)

| Quoi | Couche chez nous | Effort |
| --- | --- | --- |
| `src/engine/Filter.h` (2 pôles, 4 pôles, modes Xpander) avec ses tests `src/tests/filt.cpp` | `dsp/` | Faible : en tête autonome, remplacer les constantes JUCE de `core/Constants.h` par `std::numbers` |
| `src/engine/BlepData.h`, `SawOsc.h`, `PulseOsc.h`, `TriangleOsc.h` avec `src/tests/osc.cpp` | `dsp/` | Faible |
| `src/engine/Decimator.h` (`Decimator17`, `Decimator9`) | `dsp/` | Très faible ; mais JUCE `dsp::Oversampling` ou HIIR suffisent souvent |
| `src/engine/AdsrEnvelope.h` avec `src/tests/env.cpp` | `dsp/` | Faible |
| `src/engine/Noise.h` (blanc, rose, rouge) | `dsp/` | Très faible ; remplacer la source aléatoire par un générateur seedable |
| `src/engine/DelayLine.h` | `dsp/` | Très faible |
| Moteur entier (`Motherboard`, `Voice`, `*Quad`) | `dsp/` | Élevé : SIMD lié à sst-basic-blocks et simde, `juce::String` dans `Program`, matrice liée aux ID de paramètres. À n'envisager que pour un clone OB-X complet |
| `src/state/ObxdImporter.*` | `plugin/` | Moyen ; seulement si on veut lire les banques OB-Xd |

## 3. Odin 2

**Verdict : beaucoup de modules (huit types d'oscillateurs, sept familles de filtres, sept effets), mais tout le DSP dépend de `JuceHeader.h`, le projet est sur JUCE 6.1.6, n'a aucun test et n'a pas reçu de commit depuis le 2025-05-30. On s'en sert comme catalogue d'idées et de références bibliographiques, pas comme source de code.**

### 3.1 Licences

| Dossier ou fichier | Licence | Remarque |
| --- | --- | --- |
| [`LICENSE`](https://github.com/TheWaveWarden/odin2/blob/265e9e227581357efb87ed7217381f8a40c5e2bf/LICENSE) | GPL v3, sauf la police | `LICENSE:1` : la police `assets/font/Aldrich-Regular.ttf` est en SIL OFL 1.1 (`assets/font/OFL.txt`) |
| `Source/audio/**` | GPL v3 ou ultérieure (en tête TheWaveWarden 2020-2021) | |
| `Source/audio/Filters/LadderFilter.*`, `DiodeFilter.*`, `Korg35Filter.*`, `VAOnePoleFilter.*` | GPL v3 | "based on the diagrams and implementations in Will Pirkle's book *Designing Software Synthesizer Plug-Ins in C++*" (`LadderFilter.h:15-16`) |
| `Source/audio/FX/ZitaReverb.*` | GPL v3 | Dérivé de zita-rev1 (Fons Adriaensen, GPL) |
| `Source/audio/FX/SurgeReverb.*` | GPL v3 | Dérivé de la réverbe de Surge (GPL v3) |
| `Source/audio/FX/FeedbackDelayNetwork.*`, `IntegerDelayLine.*`, `Source/audio/ImpulseResponseCreator.*` | aucun en tête, donc GPL v3 | `FeedbackDelayNetwork.h:9-11` : "currently not used in the synthesizer" |
| `Source/audio/Oscillators/Wavetables/Coefficients/AKWF_*.h` | marqués GPL v3 | Les formes d'onde AKWF d'origine sont annoncées domaine public (CC0) par leur auteur : *à vérifier* ; si on en veut, les prendre à la source et non chez Odin |

### 3.2 Architecture

| Élément | Ce que fait Odin 2 | Où |
| --- | --- | --- |
| Séparation moteur / JUCE | Aucune : `GlobalIncludes.h:17` inclut `JuceHeader.h` et 26 fichiers de `Source/audio/` utilisent JUCE directement. La matrice de modulation vit dans `Source/gui/ModMatrix.h:181,258` alors que l'audio s'en sert. Constantes par `#define` (`GlobalIncludes.h:67,102-115,177`) | `Source/GlobalIncludes.h` |
| Voix | 24 voix (`VOICES`), unisson, modes Legato, Poly, Retrig ; gestionnaire de voix avec ordre de vol (libres, en release, plus anciennes) | `GlobalIncludes.h:67,236`, `Source/audio/Voice.h:638-735` |
| Oscillateurs | Analogique, wavetable 1D et 2D, multi, vecteur, chiptune avec arpégiateur, FM, PM, bruit, et trois tables dessinables (chip, wave, spectre) | `Source/audio/Oscillators/` |
| Anti aliasing | Tables d'onde limitées en bande : 33 sous tables par table, construites au chargement à partir de coefficients de Fourier ; synchro avec suréchantillonnage ×3 | `Source/audio/OdinConstants.h:18`, `WavetableContainer.cpp:59`, `WavetableOsc1D.cpp:158-169` |
| Filtres | Ladder (LP, BP, HP en 12 et 24 dB), SEM 12 dB, Korg 35 LP et HP, diode, formant, peigne, ring mod ; modèles VA de Pirkle (ZDF/TPT à partir de passe bas un pôle), overdrive `tanh` | `Source/audio/Filters/`, `LadderFilter.h:98-100,162-175`, `OdinFilterBase.h:43-73`, aiguillage `PluginProcessorProcess.cpp:258-297` |
| Enveloppes | ADSR linéaires, modulables | `Source/audio/ADSR.cpp:27-48` |
| Modulation | Matrice de 9 lignes | `GlobalIncludes.h:177`, `Source/gui/ModMatrix.h` |
| Effets | Délai, chorus, flanger, phaser, réverbe Zita, distorsion suréchantillonnée, EQ paramétrique | `Source/audio/FX/` |
| Calcul | En `double` dans les filtres (`LadderFilter.h:162`) | |

Points contraires à nos règles temps réel :

1. `VoiceManager::getVoices` renvoie un `std::vector<int>` construit par `push_back` et appelle `DBG` avec `std::to_string`, depuis le traitement MIDI du thread audio : `Source/audio/Voice.h:654-719`, appel `Source/PluginProcessorMidi.cpp:98`.
2. Le DSP lit directement l'état JUCE ; aucun snapshot de paramètres.

### 3.3 Presets

| Sujet | Détail | Où |
| --- | --- | --- |
| Format | `.odin` = `juce::ValueTree` binaire (`writeToStream`), type racine `Odin`, sous arbres `osc`, `fx`, `lfo`, `draw`, `misc` | `assets/init_patch.odin`, `Source/PluginProcessorReadPatch.cpp:22-104` |
| Migration | Numéro `patch_migration_version` (actuel : 5) comparé à `ODIN_PATCH_MIGRATION_VERSION`, migration dédiée | `GlobalIncludes.h:45`, `Source/PluginProcessorMigratePatch.cpp`, `PluginProcessorReadPatch.cpp:35-47` |
| Factory | 266 `.odin` en banques et catégories | `assets/Soundbanks/` |
| Navigateur | Navigateur de patchs complet (banques, catégories, import, export) dans l'UI | `Source/gui/PatchBrowser.h`, `PatchBrowserSelector.h`, `BrowserEntry.h` |

### 3.4 Build, tests, CI

| Sujet | État |
| --- | --- |
| Build | CMake 3.15 minimum, version 2.4.1, JUCE en sous module épinglé sur le tag **6.1.6**, plus un fork JUCE pour LV2. Formats VST3, AU, LV2, CLAP, Standalone |
| Tests | Aucun |
| CI | Azure Pipelines (`azure-pipelines.yml`) : Windows 2019, macOS, Ubuntu 22.04, build seulement |
| Dernier commit | 2025-05-30 (`265e9e2`) |

### 3.5 Ce qu'on peut extraire (si AGPL)

| Quoi | Couche chez nous | Effort |
| --- | --- | --- |
| `Source/audio/Filters/` (ladder, diode, Korg 35, SEM, VA un pôle) | `dsp/` | Moyen : retirer `GlobalIncludes.h`, passer en `float`, remplacer `FastMathApproximations::tanh`. Mieux : réécrire en TDD d'après le livre de Pirkle (une idée n'est pas protégée) ou prendre `chowdsp_filters` (GPL) ou `dsp::LadderFilter` de JUCE |
| `Source/audio/FX/ZitaReverb.*` | `dsp/` | Moyen ; Cloud Seed Core (MIT) est déjà notre réverbe de référence |
| `Source/audio/Oscillators/WavetableContainer.*` et coefficients | `dsp/` | Élevé : tableaux statiques énormes et macros ; on préfère `gin_dsp` (BSD) pour les wavetables |

## 4. À reprendre

### 4.1 Code à extraire

| # | Quoi | Source | Licence | Couche | Condition |
| --- | --- | --- | --- | --- | --- |
| 1 | Moteur FM DX7 `msfa` (opérateurs, 32 algorithmes, enveloppes, LFO, pitch env, portamento) | Dexed `source/msfa/` sauf `tuning.*` | Apache 2.0 | `dsp/` | Toujours utilisable. Garder les en têtes, joindre la licence Apache, noter les modifications dans `PATCHES.md`, ADR non obligatoire (pas GPL) mais ligne dans `DEPENDENCIES.md` |
| 2 | En tête `EngineMkI.h` | Dexed `source/engine/` | Apache 2.0 (le `.cpp` est GPL) | `dsp/` | Seulement si AGPL pour la paire complète |
| 3 | Lecture et écriture des cartouches SysEx DX7 | Dexed `source/core/Cartridge.*`, `Program.*` | GPL v3 | `plugin/` | Si AGPL ; sinon réécriture depuis `doc/sysex-format.txt` |
| 4 | Filtre OB-X 2 et 4 pôles, modes Xpander, avec tests | OB-Xf `src/engine/Filter.h`, `src/tests/filt.cpp` | GPL v3+ | `dsp/` | Si AGPL ; ADR obligatoire |
| 5 | Oscillateurs BLEP et table BLEP | OB-Xf `src/engine/BlepData.h`, `SawOsc.h`, `PulseOsc.h`, `TriangleOsc.h` | GPL v3+ | `dsp/` | Si AGPL ; sinon `EllipticBlepOscillators.h` de sst-basic-blocks (MIT) ou `gin_dsp` (BSD) |
| 6 | ADSR à courbe réglable, bruits coloré, décimateurs | OB-Xf `src/engine/AdsrEnvelope.h`, `Noise.h`, `Decimator.h` | GPL v3+ | `dsp/` | Si AGPL |
| 7 | Import des banques OB-Xd | OB-Xf `src/state/ObxdImporter.*` | GPL v3+ | `plugin/` | Si AGPL et si on clone un OB-X |

### 4.2 Idées de conception

| # | Idée | Vu dans | Licence du code d'origine | Couche chez nous |
| --- | --- | --- | --- | --- |
| 1 | Moteur par paquets fixes avec report du surplus d'un bloc sur le suivant, sans latence ajoutée | Dexed `PluginProcessor.cpp:228-268` | GPL v3 (idée libre) | `dsp/` |
| 2 | Plusieurs moteurs derrière un pointeur choisi par paramètre (Modern, Mark I, OPL) | Dexed `PluginProcessor.cpp:478-493` | GPL v3 (idée libre) | `dsp/` |
| 3 | Commandes type erased construites hors du thread audio et livrées par FIFO | Dexed `source/util/CommandFifo.h` | GPL v3 (idée libre) ; en pratique `farbot::fifo` (MIT) | `plugin/` |
| 4 | Traiter quatre voix par registre SIMD | OB-Xf `src/engine/*Quad.h` | GPL v3+ (idée libre) | `dsp/` |
| 5 | Découper le bloc à chaque événement MIDI pour un rendu précis à l'échantillon | OB-Xf `src/ObxfProcessor.cpp:176-195` | GPL v3+ (idée libre) | `plugin/` |
| 6 | Sérialiser les sources et cibles de modulation par nom stable, jamais par entier | OB-Xf `src/engine/VoiceMatrix.h:79-120` | GPL v3+ (idée libre) | `plugin/` |
| 7 | Rendus de référence du moteur entier régénérables par variable d'environnement, séparés des tests rapides par un tag Catch2 caché | OB-Xf `src/tests/engine.cpp:20-28,435` | GPL v3+ (idée libre) | tests de `dsp/` ; régénération toujours dans un commit `golden:` validé à l'écoute |
| 8 | Preset = métadonnées (auteur, licence, catégorie, projet) en plus des valeurs | OB-Xf `src/state/StateManager.cpp:61-81` | GPL v3+ (idée libre) ; en pratique `chowdsp_presets_v2` ou `gin_plugin` (BSD) | `plugin/` |
| 9 | Importer les formats d'un synthé existant avec une note sur chaque perte de fidélité | OB-Xf `README.md`, Dexed `Cartridge.cpp` | GPL (idée libre) | `plugin/` |
| 10 | Numéro de migration de preset distinct du numéro de version du plugin | Odin 2 `GlobalIncludes.h:45`, `PluginProcessorMigratePatch.cpp` | GPL v3 (idée libre) | `plugin/` |
| 11 | Tables d'onde limitées en bande générées à partir de coefficients de Fourier, une sous table par plage de fréquence | Odin 2 `WavetableContainer.cpp:59` | GPL v3 (idée libre) | `dsp/`, construction sur un thread de fond |
| 12 | Liste de filtres VA de référence (ladder, diode, Korg 35, SEM) tirée de Pirkle, *Designing Software Synthesizer Plug-Ins in C++* | Odin 2 `Source/audio/Filters/` | Livre : idées libres | `dsp/`, en TDD |

### 4.3 À éviter

| # | Défaut | Vu dans | Couche concernée chez nous | Règle |
| --- | --- | --- | --- | --- |
| 1 | Tables statiques globales dépendant de la fréquence d'échantillonnage | Dexed `msfa/freqlut.h:19`, `env.h:52,61`, `lfo.h:21,34-35` | `dsp/` | `dsp.md` : pas d'état global. À corriger en premier lors de l'extraction de `msfa` |
| 2 | `new` dans `prepareToPlay` sans libération de l'allocation précédente | Dexed `PluginProcessor.cpp:147` | `plugin/` | `cpp.md` : RAII, pas de `new` nu |
| 3 | Mutex et construction de `juce::String` en tête de `processBlock` | OB-Xf `ParameterUpdateHandler.cpp:157-159` | `plugin/` | `realtime-audio.md` : ni verrou ni allocation |
| 4 | `std::vector::push_back` et `DBG` dans l'allocation de voix | Odin 2 `Voice.h:654-719` | `dsp/` | `realtime-audio.md` |
| 5 | Générateur aléatoire global non seedable dans le DSP | OB-Xf `Voice.h:200-204` | `dsp/` | `dsp.md` : générateur déterministe et seedable |
| 6 | DSP qui inclut `JuceHeader.h`, matrice de modulation rangée dans `gui/` | Odin 2 `GlobalIncludes.h:17`, `Source/gui/ModMatrix.h` | `dsp/`, `ui/` | `03_ARCHITECTURE.md` : `dsp/` sans JUCE, l'UI ne porte pas de logique audio |
| 7 | Constantes et types de filtre en `#define` | Odin 2 `GlobalIncludes.h:67-177` | toutes | `cpp.md` : pas de macro hors configuration de build |
| 8 | Fichiers sans en tête de licence au milieu d'un dossier sous une autre licence | Dexed `source/msfa/tuning.*` | toutes | Chaque fichier repris ou écrit porte son en tête |
| 9 | Dépendre d'un projet dont le source peut disparaître | OB-Xd (source supprimé en 2026) | toutes | Épingler un commit, garder une copie vendored de ce qu'on reprend |
| 10 | Tests de "référence" dont les valeurs attendues sont la sortie de l'implémentation | OB-Xf `src/tests/filt.cpp:344-519` | tests | `testing.md` : la valeur attendue cite sa source ; ces tests restent de la non régression |
