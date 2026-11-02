# BYOD et Valentine : lecture du code

Étudiés aux commits [`1cf22b6`](https://github.com/Chowdhury-DSP/BYOD/commit/1cf22b6ac802b9dc33cfc9f8dd6af5b3c3e40bc9) de BYOD (version 1.3.1, 2025-08-13) et [`87eba9b`](https://github.com/tote-bag-labs/valentine/commit/87eba9bc332615d4de0c93c3c07cfb679c1ff25a) de Valentine (version 1.0.1, 2025-08-24). Les numéros de ligne renvoient à ces commits ; les liens pointent sur `main` et peuvent dériver. Rien n'a été compilé : tout vient de la lecture des sources. Les deux dépôts sont **GPL v3** : ce document décrit des idées et cite des emplacements, il ne recopie pas de code. L'étude de chowdsp_utils lui même est dans [`chowdsp-utils.md`](chowdsp-utils.md) ; ici on ne regarde que ce que BYOD en fait.

## Verdicts

**BYOD.** Le plus gros catalogue d'effets de guitare open source sous JUCE (69 processeurs, environ 28 000 lignes de DSP), dont la valeur pour nous est triple : des cœurs de circuits en filtres d'onde numériques (WDF) presque indépendants de JUCE, une démonstration grandeur nature de chowdsp_wdf et RTNeural (toutes deux BSD 3), et un mécanisme de paramètres de redirection qui rend un graphe dynamique automatisable en VST3. Le code des processeurs n'est réutilisable que si notre plugin est AGPL v3. Il ne faut pas reprendre son moteur de graphe tel quel : il protège le thread audio par un `SpinLock` en `try_lock` qui saute des blocs entiers, change de graphe sans aucun crossfade, et réalloue et journalise sur le thread audio quand le facteur d'oversampling change.

**Valentine.** Petit compresseur saturateur (environ 1 300 lignes de DSP) dont il faut reprendre deux idées : une compensation de latence qui garde une latence entière et constante quelle que soit l'activation des étages, et un bouton de ratio unique qui pilote aussi le knee et le seuil par interpolation par morceaux. Le reste est faible : DSP mêlé à JUCE et à une bibliothèque de mètres, un seul test réel (des fonctions mathématiques), et trois bogues visibles à la lecture. Sa CI (pluginval strictness 10 sur trois OS, Catch2 via `catch_discover_tests`) est la partie la plus propre, mais Pamplejuce fait déjà la même chose en mieux.

## 1. Licences vérifiées

| Élément | Licence lue dans le fichier | Où | Conséquence pour nous |
| --- | --- | --- | --- |
| BYOD (dépôt) | GPL v3 | `LICENSE` | AGPL seulement |
| BYOD, distribution iOS | BSD 3 accordée **à Chowdhury DSP** par la CLA des contributeurs, pas à nous | [`docs/Licensing.md`](https://github.com/Chowdhury-DSP/BYOD/blob/main/docs/Licensing.md) | Ne change rien pour un tiers : on reçoit du GPL v3 |
| BYOD, `SurgeWaveshapers.*` | GPL v3, code repris de Surge, en tête de fichier | [`src/processors/drive/waveshaper/SurgeWaveshapers.h:1-14`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/drive/waveshaper/SurgeWaveshapers.h#L1-L14) | AGPL seulement |
| BYOD, IR (`res/amp_irs`, `res/lofi_irs`) et modèles neuronaux (`res/guitar_ml_models`) | Aucune licence ni provenance documentée ; donc GPL v3 du dépôt par défaut | `res/` | Ne pas embarquer sans demander l'origine |
| chowdsp_utils (sous module, `34db5bd`) | Par module : GPL v3 ou BSD 3 (champ `license:` de chaque module) | voir section 3.2 | Voir tableau 3.2 |
| chowdsp_wdf (sous module) | BSD 3 | `LICENSE` | Utilisable partout |
| RTNeural (sous module) | BSD 3 | `LICENSE` | Utilisable partout |
| math_approx (sous module) | BSD 3 | `LICENSE` | Utilisable partout |
| magic_enum (sous module) | MIT | `LICENSE` | Utilisable partout |
| sst-cpputils (sous module) | MIT | `LICENSE.md` | Utilisable partout |
| ea_variant (sous module) | Boost 1.0 | `LICENSE` | Utilisable partout |
| clap-juce-extensions, melatonin_perfetto (sous modules) | Déjà couverts par [`melatonin-et-clap.md`](melatonin-et-clap.md) | | CLAP non utilisé chez nous |
| Valentine (dépôt, y compris `libs/tote_bag/`) | GPL v3 ; les fichiers de `tote_bag` n'ont pas d'en tête propre | `LICENSE` | AGPL seulement |
| ff_meters (sous module de Valentine) | BSD 3 (Foleys Finest Audio) | `LICENSE` | Utilisable partout |
| Valentine, JUCE | `JUCE_ENABLE_GPL_MODE=1` | [`CMakeLists.txt:215`](https://github.com/tote-bag-labs/valentine/blob/main/CMakeLists.txt#L215) | Rappel : JUCE en mode GPL impose un plugin GPL |

Les licences des sous modules ont été lues dans un clone superficiel de chacun (dossier `/home/claude/study/_byod_deps/`), pas dans les commits épinglés par BYOD ; un changement de licence entre les deux est improbable mais non exclu.

## 2. BYOD : architecture de la chaîne

### 2.1 Fiche

| Point | Constat |
| --- | --- |
| Langage, build | C++20, CMake 3.15 minimum ([`CMakeLists.txt:1,11`](https://github.com/Chowdhury-DSP/BYOD/blob/main/CMakeLists.txt#L1-L11)), build unity par lots de 8 et en tête précompilé |
| Formats | AU, VST3, Standalone, CLAP, LV2 sous Linux, AAX et VST2 si SDK |
| JUCE | Sous module `modules/JUCE` (commit `a8ae6ed`) |
| Taille | 39 400 lignes dans `src/`, dont 28 000 dans `src/processors/` |
| Tests | Exécutable `BYOD_headless --unit-tests`, framework `juce::UnitTest`, 15 fichiers |
| CI | GitHub Actions, Linux, Windows, macOS ; pluginval sur Windows seulement, strictness 7 |
| Format de code | `.clang-format` et un workflow qui l'applique aux PR |

### 2.2 Un graphe, pas une liste

La chaîne de BYOD n'est pas une liste réordonnable : c'est un **graphe orienté** de processeurs reliés par des câbles, avec des ports multiples (audio, modulation, niveau). « Réordonner » revient à déplacer des connexions.

1. Chaque processeur possède ses connexions de sortie (`std::vector<Array<ConnectionInfo>>`) et compte ses entrées connectées ([`src/processors/BaseProcessor.h:43-49`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L43-L49), [`:300-302`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L300-L302)).
2. Le traitement est un parcours en profondeur **récursif** depuis le processeur d'entrée ([`src/processors/chain/ProcessorChain.cpp:100-185`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L100-L185)). Une sortie reliée à un seul processeur passe le même buffer ; une sortie reliée à plusieurs copie le buffer dans un tampon pris dans une arène ([`:146-153`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L146-L153)).
3. Un processeur à plusieurs entrées attend que toutes ses entrées soient prêtes (compteur `numInputsReady`) avant d'être appelé ([`:154-166`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L154-L166)).
4. Une branche dont la sortie n'est reliée à rien n'est pas calculée ([`:129-135`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L129-L135)).
5. Les sources de modulation sans entrée (LFO, MIDI) sont traitées d'abord ([`:217-229`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L217-L229)).
6. Tous les tampons intermédiaires viennent d'une arène (`chowdsp::ArenaAllocator`, module BSD) vidée en fin de bloc ([`:259`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L259)). Sa taille est calculée d'après le nombre de connexions et le bloc suréchantillonné ([`:273-287`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L273-L287)).

L'oversampling est **global** à la chaîne (1x à 16x, phase minimale ou linéaire, `chowdsp::VariableOversampling`, module GPL) : tous les processeurs tournent au taux suréchantillonné ([`src/processors/chain/ChainIOProcessor.cpp:21-26`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ChainIOProcessor.cpp#L21-L26)). Le dry/wet global retarde le signal sec de la latence de l'oversampling ([`src/processors/chain/DryWetProcessor.cpp:20-25`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/DryWetProcessor.cpp#L20-L25)), et le bypass hôte passe par une ligne à retard de la même latence ([`src/BYOD.cpp:92-109`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/BYOD.cpp#L92-L109)).

### 2.3 Ajouter, retirer, reconnecter sans bloquer l'audio (ou presque)

Toutes les modifications passent par des `juce::UndoableAction` (`AddOrRemoveProcessor`, `AddOrRemoveConnection`) exécutées sur le thread message ([`src/processors/chain/ProcessorChainActionHelper.cpp`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActionHelper.cpp)). Le schéma est le même partout :

| Étape | Où | Thread |
| --- | --- | --- |
| Créer et `prepare` le nouveau processeur | [`ProcessorChainActions.cpp:28-30`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L28-L30) | Message, hors verrou |
| Allouer la nouvelle arène si le nombre de connexions change trop | [`:74-79`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L74-L79) | Message, hors verrou |
| Insérer le processeur ou la connexion, échanger l'arène | [`:33-36`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L33-L36), [`:81-86`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L81-L86) | Message, **sous `SpinLock`** |
| Libérer l'ancienne arène | [`:87`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L87) | Message, hors verrou |
| Garder le processeur retiré dans l'action d'undo, libérer sa mémoire interne | [`:61-65`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainActions.cpp#L61-L65) | Message |

Côté audio, `processAudio` tente le verrou et, s'il est pris, **retourne sans rien faire** ([`ProcessorChain.cpp:189-191`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L189-L191)) : le bloc sort non traité, sans la latence de l'oversampling que l'hôte compense pourtant. C'est un saut audible. Le chargement d'un état ou d'un preset reconstruit tout le graphe par une suite d'actions sur le thread message ([`ProcessorChainStateHelper.cpp:41-84`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainStateHelper.cpp#L41-L84)), chacune prenant le verrou.

**Crossfade : il n'y en a pas au niveau de la chaîne.** Ni à l'ajout, ni au retrait, ni au changement de connexion. Le bypass de chaque processeur est un interrupteur franc entre `processAudio` et `processAudioBypassed` ([`BaseProcessor.cpp:109-112`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.cpp#L109-L112)). Les seuls fondus sont internes à deux processeurs : Centaur entre modèles neuronaux ([`drive/centaur/GainStageML.cpp:64-72`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/drive/centaur/GainStageML.cpp#L64-L72)) et Solo-Vibe quand le nombre d'étages change ([`modulation/uni_vibe/UniVibe.cpp:186-211`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/modulation/uni_vibe/UniVibe.cpp#L186-L211)), tous deux par `addFromWithRamp` sur un bloc.

**Violations de nos règles temps réel, lues dans le code :**

1. Quand le facteur d'oversampling change, `processAudio` appelle `initializeProcessors()` **sur le thread audio** ([`ProcessorChain.cpp:194-197`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L194-L197)), qui refait le `prepare` de tous les processeurs et réalloue l'arène avec `aligned_alloc` et un `Logger::writeToLog` ([`:60-77`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L60-L77), [`:304-311`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChain.cpp#L304-L311)).
2. Le `SpinLock` reste un verrou partagé entre UI et audio, contraire à `.claude/rules/realtime-audio.md` même en `try_lock`, parce que l'échec perd un bloc au lieu de garder l'ancien graphe.
3. Récursion sur le thread audio, bornée par la taille du graphe mais pas par une constante.

### 2.4 Déclarer un processeur

1. Une classe dérivée de `BaseProcessor`, lui même un `juce::AudioProcessor` allégé (`JuceProcWrapper`) qui porte **sa propre APVTS** ([`src/processors/BaseProcessor.h:83-111`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L83-L111), [`JuceProcWrapper.h`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/JuceProcWrapper.h)).
2. Les ports sont décrits par deux `enum class` (entrées, sorties) et une fonction qui donne le type de chaque port ; `magic_enum` les compte ([`BaseProcessor.h:51-68`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L51-L68)).
3. Trois méthodes à écrire : `prepare`, `processAudio`, et `processAudioBypassed` pour les modules multi ports ([`BaseProcessor.h:227-232`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.h#L227-L232)). Chaque processeur reçoit un paramètre `on_off` commun ([`ParameterHelpers.h:10-13`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/ParameterHelpers.h#L10-L13)).
4. Une ligne dans la table statique `ProcessorStore::store` : nom affiché, fabrique, catégorie, nombre d'entrées et de sorties ([`src/processors/ProcessorStore.cpp:90-168`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/ProcessorStore.cpp#L90-L168)). Le menu d'ajout, le remplacement compatible (même nombre de ports) et les tests sont générés depuis cette table.
5. Les métadonnées d'UI (couleur, description, auteurs, lien) sont des champs de `uiOptions` remplis dans le constructeur. Un script crée les fichiers ([`scripts/new_proc.sh`](https://github.com/Chowdhury-DSP/BYOD/blob/main/scripts/new_proc.sh)) et un guide l'explique ([`docs/CreatingANewProcessor.md`](https://github.com/Chowdhury-DSP/BYOD/blob/main/docs/CreatingANewProcessor.md)).

Le nom affiché sert d'identifiant dans les états sauvés : renommer un processeur casse les sessions, exactement le cas de notre règle sur les IDs de paramètres.

### 2.5 Paramètres d'un graphe dynamique exposés à l'hôte

VST3 exige une liste de paramètres fixe. BYOD déclare **500 paramètres génériques** `forward_param_N` (40 emplacements de 12 paramètres) et, à l'ajout d'un processeur, redirige un emplacement libre vers ses paramètres internes, avec un nom « Processeur : Paramètre » ([`src/state/ParamForwardManager.cpp:26-80`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/state/ParamForwardManager.cpp#L26-L80), [`ParamForwardManager.h:11-12`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/state/ParamForwardManager.h#L11-L12)). L'indice d'emplacement est sauvé avec le processeur pour que l'automation retrouve sa cible au rechargement. La mécanique vient de `chowdsp::ForwardingParametersManager`, du module `chowdsp_parameters` **BSD 3**. Un test fige ce comportement et garde des états anciens (`src/headless/tests/OldParamForwardStates/`).

### 2.6 Liste des processeurs

69 entrées dans `ProcessorStore` (compté par `grep -c 'processorFactory<' src/processors/ProcessorStore.cpp`). Licence : **GPL v3 pour toutes**. La colonne dépendances ne liste que ce qui dépasse JUCE et le socle `BaseProcessor` ; « filtres chowdsp » désigne des classes des modules GPL (`chowdsp_filters` via `chowdsp_dsp_utils`, `chowdsp_eq`). Chemins relatifs à `src/processors/`.

#### Drive (23)

| Nom | Technique | Fichier | Dépendances |
| --- | --- | --- | --- |
| Bass Face | RNN entraîné, oversampling JUCE interne | `drive/BassFace.cpp` | RTNeural, filtres chowdsp |
| Blonde Drive | Waveshaper analytique et filtres (Joyo American Sound) | `drive/BlondeDrive.cpp` | Filtres chowdsp |
| Centaur | Klon : étages en WDF, ou mode neuronal avec fondu entre modèles | `drive/centaur/` | chowdsp_wdf, RTNeural |
| Diode Clipper | WDF à paire de diodes, omega de Wright approché | `drive/diode_circuits/` | chowdsp_wdf, math_approx |
| Diode Rectifier | WDF redresseur | `drive/diode_circuits/` | chowdsp_wdf, math_approx |
| Dirty Tube | Modèle de triode en WDF | `drive/tube_amp/` | chowdsp_wdf |
| Distortion Plus | WDF (MXR), dérivé de la thèse de S. Schachter, matrice de diffusion par R-Solver | `drive/mxr_distortion/` | chowdsp_wdf |
| Flapjack | WDF avec ampli op en adaptateur R (Crowther Hot Cake) | `drive/flapjack/` | chowdsp_wdf |
| Fuzz Machine | Méthode nodale DK (Fuzz Face), suréchantillonnage elliptique | `drive/fuzz_machine/` | Rééchantillonneurs chowdsp |
| GuitarML | LSTM, modèles JSON chargeables par l'utilisateur | `drive/GuitarMLAmp.cpp` | RTNeural |
| Hysteresis | Hystérésis de Jiles Atherton (modèle de bande ChowTape, DAFx), SIMD | `drive/hysteresis/` | chowdsp SIMD |
| Junior B | WDF et triode neuronale, adaptateur R modifié | `drive/junior_b/` | chowdsp_wdf, RTNeural |
| Tone King | WDF (Analogman King of Tone) | `drive/king_of_tone/` | chowdsp_wdf |
| Metal Face | RNN entraîné | `drive/MetalFace.cpp` | RTNeural |
| Mouse Drive | WDF (étage de clipping du RAT) | `drive/mouse_drive/` | chowdsp_wdf |
| Muff Clipper | Étage de clipping Big Muff en fonctions hyperboliques | `drive/muff_clipper/` | Aucune |
| Muff Drive | Étages Big Muff et filtres du premier ordre | `drive/big_muff/` | Filtres chowdsp |
| Range Booster | Transistor PNP résolu par Newton Raphson (Rangemaster) | `drive/RangeBooster.cpp` | Filtres chowdsp |
| RONN | Réseau convolutif récurrent aléatoire (idée de C. Steinmetz) | `drive/RONN.cpp` | RTNeural |
| Tube Screamer | WDF (étage de clipping) | `drive/tube_screamer/` | chowdsp_wdf |
| Waveshaper | Waveshapers de Surge (ADAA, wavefolder Buchla 259 de DAFx 17) | `drive/waveshaper/` | Code Surge GPL copié |
| Warp | Filtre à rétroaction non linéaire tanh résolu par Newton Raphson | `drive/Warp.cpp` | Cartes conformes chowdsp |
| Yen Drive | WDF (ZenDrive) | `drive/zen_drive/` | chowdsp_wdf |

#### Tone (13)

| Nom | Technique | Fichier | Dépendances |
| --- | --- | --- | --- |
| Amp IRs | Convolution d'IR de baffle, chargement utilisateur | `tone/amp_irs/` | `juce::dsp::Convolution` |
| Bass Cleaner | Filtre analogique discrétisé par transformée bilinéaire | `tone/BassCleaner.cpp` | Filtres chowdsp |
| Bassman Tone | Tone stack Fender en WDF | `tone/bassman/` | chowdsp_wdf |
| Baxandall EQ | WDF d'après Werner et al. (IEEE, 2018) | `tone/baxandall/` | chowdsp_wdf |
| Blonde Tone | EQ à bandes (SVF bell, passe bas) | `tone/BlondeTone.cpp` | chowdsp_eq |
| Graphic EQ | 5 bandes à Q adaptatif | `tone/GraphicEQ.cpp` | Filtres chowdsp |
| High Cut | Passe bas analogique discrétisé | `tone/HighCut.cpp` | Filtres chowdsp |
| LoFi IRs | Convolution d'IR de jouets et claviers | `tone/LofiIrs.cpp` | `juce::dsp::Convolution` |
| Muff Tone | Tone stack Big Muff, plusieurs variantes | `tone/BigMuffTone.cpp` | Filtres chowdsp |
| SVF | Filtre à variables d'état multimode | `tone/StateVariableFilter.cpp` | Filtres chowdsp |
| Treble Booster | Filtre de tonalité du Klon | `tone/TrebleBooster.cpp` | Filtres chowdsp |
| TS-Tone | Circuit de tonalité du Tube Screamer en WDF | `tone/tube_screamer_tone/` | chowdsp_wdf |
| Ladder Filter | Ladder 4 pôles passe haut et passe bas, drive non linéaire (B. Warns) | `tone/ladder_filter/` | Aucune |

#### Modulation (12)

| Nom | Technique | Fichier | Dépendances |
| --- | --- | --- | --- |
| Chorus | Multi phase, ligne BBD en option lo fi | `modulation/Chorus.cpp` | BBD et Hilbert chowdsp |
| Flanger | Délai modulé, BBD en option | `modulation/Flanger.cpp` | BBD chowdsp |
| MIDI Modulator | Source de modulation depuis un CC MIDI | `modulation/MIDIModulator.cpp` | Aucune |
| Panner | Panoramique modulable | `modulation/Panner.cpp` | Aucune |
| Param Modulator | Paramètre utilisé comme source de modulation | `modulation/ParamModulator.cpp` | Aucune |
| Phaser4 | Phaser 4 étages (filtres de Schulte) | `modulation/phaser/` | Filtres chowdsp |
| Phaser8 | Phaser 8 étages façon Phase 90, deux sorties | `modulation/phaser/` | Filtres chowdsp |
| Rotary | Haut parleur tournant (délai Lagrange modulé) | `modulation/Rotary.cpp` | Délai chowdsp |
| Scanner Vibrato | Vibrato à scanner Hammond en WDF | `modulation/scanner_vibrato/` | chowdsp_wdf |
| Solo-Vibe | Uni-Vibe : étages passe tout pilotés par une table de LDR | `modulation/uni_vibe/` | Aucune |
| Tremolo | Trémolo à LFO lissé | `modulation/Tremolo.cpp` | Filtres chowdsp |
| Laser Trem | Décalage de fréquence par filtre de Hilbert | `modulation/FrequencyShifter.cpp` | Hilbert chowdsp |

#### Utility (9)

| Nom | Technique | Fichier | Dépendances |
| --- | --- | --- | --- |
| Clean Gain | Gain linéaire | `utility/CleanGain.cpp` | Aucune |
| DC Bias | Ajout d'une constante | `utility/DCBias.h` | Aucune |
| DC Blocker | Passe haut réglable | `utility/DCBlocker.h` | Filtres chowdsp |
| Frequency Splitter | Crossover trois voies | `utility/FreqBandSplitter.cpp` | Crossover chowdsp |
| Mixer | Somme de quatre entrées | `utility/Mixer.cpp` | Aucune |
| Oscilloscope | Visualisation | `utility/Oscilloscope.cpp` | chowdsp_visualizers |
| Stereo Merger | Deux mono vers stéréo | `utility/StereoMerger.cpp` | Aucune |
| Stereo Splitter | Stéréo vers deux mono | `utility/StereoSplitter.cpp` | Aucune |
| Tuner | Accordeur A440 | `utility/Tuner.cpp` | Accordeur chowdsp |

#### Other (12)

| Nom | Technique | Fichier | Dépendances |
| --- | --- | --- | --- |
| Compressor | Compresseur à détecteur de niveau | `other/Compressor.cpp` | Détecteur chowdsp |
| Crying Child | Wah Cry Baby, méthode nodale DK, suréchantillonnage | `other/cry_baby/` | Rééchantillonneurs chowdsp |
| Delay | Délai à rétroaction, BBD lo fi ou ping pong, synchro tempo | `other/Delay.cpp` | Délai, BBD et rythme chowdsp |
| Envelope Filter | SVF piloté par enveloppe | `other/EnvelopeFilter.cpp` | Filtres chowdsp |
| Level Detective | Suiveur d'enveloppe | `other/LevelDetective.cpp` | Détecteur chowdsp |
| Gate | Noise gate | `other/Gate.cpp` | Détecteur chowdsp |
| Octaver | Sous octave par diviseur de fréquence (style U-Boat) | `other/Octaver.cpp` | Filtres chowdsp |
| Poly Octave | Générateur d'octave polyphonique par banc de filtres (thèse Aalto) | `other/poly_octave/` | Aucune |
| Shimmer Reverb | FDN et pitch shifter | `other/ShimmerReverb.cpp` | Réverbe et pitch shifter chowdsp |
| Smooth Reverb | Diffuseurs et FDN | `other/SmoothReverb.cpp` | Réverbe chowdsp |
| Spring Reverb | Réseau de réflexions et passe tout de Schroeder, rééchantillonnage | `other/spring_reverb/` | Rééchantillonneurs chowdsp |
| Krusher | Réduction de fréquence et de bits ; implémentation Jai avec repli C++ | `other/krusher/` | Compilateur Jai optionnel |

Les cœurs WDF (`*WDF.h`) n'incluent que `pch.h` et `OmegaProvider.h` et n'utilisent JUCE qu'à la marge (zéro à deux occurrences par fichier, mesuré par `grep -c 'juce::\|jassert\|SmoothedValue\|AudioBuffer\|dsp::'`) : ce sont les seules parties de BYOD qui se déplaceraient dans notre `dsp/` sans réécriture. Les schémas des circuits sont fournis en SVG dans [`res/schematics/`](https://github.com/Chowdhury-DSP/BYOD/tree/main/res/schematics) et des scripts de dérivation Python dans [`sim/`](https://github.com/Chowdhury-DSP/BYOD/tree/main/sim).

## 3. BYOD : socle

### 3.1 Build

Une bibliothèque statique `juce_plugin_modules` regroupe JUCE et tous les modules tiers, liée au plugin et à l'exécutable de test ([`modules/CMakeLists.txt`](https://github.com/Chowdhury-DSP/BYOD/blob/main/modules/CMakeLists.txt)). Les réseaux neuronaux sont compilés deux fois (SSE ou ARM, et AVX) avec sélection à l'exécution ([`src/CMakeLists.txt`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/CMakeLists.txt), fonction `make_lib_simd_runtime`). La version est écrite en dur dans `project()` et diffère entre iOS et bureau ([`CMakeLists.txt:6-10`](https://github.com/Chowdhury-DSP/BYOD/blob/main/CMakeLists.txt#L6-L10)). Des modules additionnels payants viennent d'un dépôt privé (`BYOD_BUILD_ADD_ON_MODULES`).

### 3.2 Modules chowdsp_utils utilisés

| Module | Licence (champ `license:`) | Usage dans BYOD |
| --- | --- | --- |
| `chowdsp_plugin_base` | GPL v3 | `chowdsp::PluginBase` : classe de base du plugin |
| `chowdsp_plugin_utils` | GPL v3 | Réglages globaux, `DeferredAction`, utilitaires |
| `chowdsp_dsp_utils` | GPL v3 | `VariableOversampling`, délais, BBD, filtres, rééchantillonneurs |
| `chowdsp_eq`, `chowdsp_compressor`, `chowdsp_reverb`, `chowdsp_sources` | GPL v3 | EQ, détecteurs de niveau, FDN, oscillateurs |
| `chowdsp_gui`, `chowdsp_visualizers` | GPL v3 | LookAndFeel, oscilloscope |
| `chowdsp_presets` (v1, pas `presets_v2`) | BSD 3 | Gestionnaire de presets |
| `chowdsp_serialization`, `chowdsp_logging`, `chowdsp_units`, `chowdsp_rhythm`, `chowdsp_fuzzy_search`, `chowdsp_clap_extensions` | BSD 3 | Sérialisation, journal de plantage, unités, synchro tempo, recherche de presets |
| `chowdsp_parameters`, `chowdsp_data_structures` (dépendances transitives) | BSD 3 | Paramètres de redirection, arène, `SmallVector` |

### 3.3 Presets et état

1. L'état est du XML : la chaîne (chaque processeur sérialise son APVTS, sa position à l'écran et son emplacement de redirection), l'état des presets et la version du plugin ([`src/state/StateManager.cpp:29-37`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/state/StateManager.cpp#L29-L37), [`BaseProcessor.cpp`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/BaseProcessor.cpp) fonction `toXML`).
2. Version absente : repli sur `1.0.1` ; des branches de migration testent la version (`stateVersion <= "1.2.1"_v`) ([`ProcessorChainStateHelper.cpp:63-78`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/processors/chain/ProcessorChainStateHelper.cpp#L63-L78)). C'est le motif de nos règles, appliqué avec `chowdsp::Version` (BSD).
3. 41 presets d'usine `.chowpreset` dans [`res/presets/`](https://github.com/Chowdhury-DSP/BYOD/tree/main/res/presets), plus un serveur de presets en ligne optionnel et la découverte de presets CLAP, inutiles pour nous.

### 3.4 Tests

Framework `juce::UnitTest` dans une application console, lancée par `BYOD --unit-tests --all`. L'essentiel des tests passe **automatiquement sur tous les processeurs** de la table grâce à `runTestForAllProcessors` ([`src/headless/tests/UnitTests.h:3-24`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/headless/tests/UnitTests.h#L3-L24)).

| Test | Ce qu'il vérifie | Remarque |
| --- | --- | --- |
| `SilenceTest` | Un bruit en entrée ne donne pas une sortie muette (> 1e-6) | Le nom trompe : c'est un test de « pas de silence » |
| `NaNResetTest` | Un bloc de NaN remet la chaîne à zéro, puis le son revient | Repose sur `sanitizeBuffer` en fin de `processBlock` ([`BYOD.cpp:88-89`](https://github.com/Chowdhury-DSP/BYOD/blob/main/src/BYOD.cpp#L88-L89)) |
| `ParameterSmoothTest` | Saut de paramètre sans discontinuité > 0,1 | Tous processeurs |
| `PreBufferTest` | Pas de DC ni de transitoire au démarrage | Tous processeurs |
| `StereoTest` | Routage mono, stéréo, gauche, droite | Signaux DC de signe connu |
| `BadModulationTest` | Les sorties de modulation restent finies et bornées | |
| `ForwardingParamStabilityTest` | Noms et cibles des paramètres de redirection stables, états anciens rechargés | Fichiers d'état gardés |
| `ProcessorStoreInfoTest` | La table dit vrai (nom, catégorie, ports) | |
| `UndoRedoTest` | 100 opérations aléatoires annulées puis refaites | |
| `PresetsTest`, `PresetSearchTest`, `AmpIRsSaveLoadTest`, `RAMUsageTest`, `WaveshaperTest` | Presets, recherche, IR utilisateur, mémoire, NaN des waveshapers | |

Aucune référence audio, aucun test de réponse en fréquence contre une formule, aucun test d'indépendance à la taille de bloc.

### 3.5 CI

[`.github/workflows/cmake.yml`](https://github.com/Chowdhury-DSP/BYOD/blob/main/.github/workflows/cmake.yml) : Linux (g++ 11), Windows (clang-cl), macOS 13. Tests unitaires sur Linux et Windows ; `auval` sur macOS ; pluginval **seulement sur Windows**, version `v1.0.0-beta5`, **strictness 7** ([`scripts/validate.sh:5,47`](https://github.com/Chowdhury-DSP/BYOD/blob/main/scripts/validate.sh#L47)). Pas de pluginval sous Linux (désactivé dans le script). Un workflow séparé applique clang-format 14 aux PR.

## 4. Valentine

### 4.1 Fiche

| Point | Constat |
| --- | --- |
| Langage, build | C++20, CMake 3.24.1, Ninja en CI |
| JUCE | Sous module `libs/JUCE` sur la branche `juce8` |
| Formats | AU, VST3, Standalone |
| Version | Fichier `VERSION` lu par CMake, hash git injecté via `version.h.in` ([`CMakeLists.txt:17-41`](https://github.com/tote-bag-labs/valentine/blob/main/CMakeLists.txt#L17-L41)) |
| DSP | `libs/tote_bag/dsp/`, environ 1 300 lignes, **dépend de JUCE** et, pour le compresseur, de ff_meters |
| Tests | Catch2 v3.4.0 par `FetchContent`, `catch_discover_tests`, 3 fichiers |
| CI | Linux, macOS, Windows ; `ctest` ; pluginval 1.0.3 strictness 10 ; signature, notarisation et installeurs |

### 4.2 Architecture

Il n'y a pas de séparation DSP sans JUCE : les classes de `tote_bag/dsp` prennent des `juce::dsp::AudioBlock`, utilisent `juce::Atomic`, `juce::SmoothedValue`, `juce::AudioBuffer`, et le compresseur écrit directement dans un `FFAU::LevelMeterSource` **à chaque échantillon** ([`libs/tote_bag/dsp/Compressor.cpp:144`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Compressor.cpp#L144)). Les paramètres arrivent par `parameterChanged` qui pousse dans des atomics ou appelle des setters ([`src/PluginProcessor.cpp:490-571`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L490-L571)) ; pas de snapshot par bloc. La table des paramètres est faite de tableaux parallèles indexés par une `enum class` ([`src/ValentineParameters.h`](https://github.com/tote-bag-labs/valentine/blob/main/src/ValentineParameters.h)), avec `ParameterID` en version 1.

Ordre du traitement ([`src/PluginProcessor.cpp:305-436`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L305-L436)) :

1. Copie de l'entrée, puis retard du signal sec de la latence totale.
2. Crush optionnel au taux de base : maintien d'échantillon (ZOH) avec interpolation fractionnaire, puis quantification en bits ([`libs/tote_bag/dsp/DigiDegraders.cpp`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/DigiDegraders.cpp)). L'aliasing est voulu.
3. Gain d'entrée en rampe (`Compress`, de -21 à +48 dB) : c'est lui qui pousse dans un seuil fixe, à la manière d'un 1176.
4. Oversampling **4x** : `juce::dsp::Oversampling` à deux étages demi bande IIR polyphase ([`:631-634`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L631-L634) ; `kOversampleFactor = 2` est l'exposant, [`:21`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L21) et [`:240-241`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L240-L241)).
5. Compresseur, puis saturation optionnelle, puis clipper optionnel, au taux suréchantillonné.
6. Sous échantillonnage, retard fractionnaire du signal traité, gain de sortie en rampe, mix.

### 4.3 Algorithmes

| Bloc | Algorithme | Où |
| --- | --- | --- |
| Détection | Sidechain mono (moyenne des canaux), passage en dB, lissage attaque/relâchement à un pôle **dans le domaine logarithmique** (« decoupled branched ») | [`EnvelopeDetector.cpp:81-91`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/EnvelopeDetector.cpp#L81-L91), [`Compressor.cpp:127-156`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Compressor.cpp#L127-L156) |
| Courbe | Knee doux quadratique classique de Giannoulis, Massberg et Reiss (JAES 2012) ; la source n'est pas citée dans le code | [`Compressor.cpp:83-120`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Compressor.cpp#L83-L120) |
| Couplage | Un seul bouton de ratio (1 à 20, puis « infini » = 1000) ; knee (7 à 0 dB) et seuil (-15 à -10 dB) en sont déduits par interpolation linéaire par morceaux sur 6 points | [`ValentineParameters.h:50-90`](https://github.com/tote-bag-labs/valentine/blob/main/src/ValentineParameters.h#L50-L90), [`tbl_math.hpp:56-68`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/utils/tbl_math.hpp#L56-L68) |
| Saturation | `asinh` avec **ADAA du premier ordre** (antidérivée `x·asinh(x) − √(x²+1)`), asymétrie par gain différent selon le signe, gain de compensation `1/asinh(g)` | [`Saturation.cpp:49-75`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Saturation.cpp#L49-L75), [`Saturation.h:89-117`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Saturation.h#L89-L117) |
| Clipper | `tanh` simple avec gain fixe de -6 dB (le type ADAA existe mais n'est pas celui choisi) | [`PluginProcessor.cpp:628-629`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L628-L629) |
| Latence | Latence rapportée = plafond de (oversampling + 0,5 + 0,5) ; le chemin traité est retardé de la différence avec la latence réelle par une ligne Lagrange 3 dont le retard glisse sur 1 s quand un étage s'active | [`PluginProcessor.cpp:649-695`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L649-L695) |

**Défauts visibles à la lecture** (non vérifiés par exécution) :

1. Le mix applique `mix` non lissé au signal traité et `currentMix` lissé au signal sec ([`PluginProcessor.cpp:431`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L431)) : la somme n'est plus constante pendant une rampe.
2. Au ratio maximal, la branche qui règle 1000:1 n'a pas de `else`, et `setRatio (newValue)` l'écrase aussitôt avec 21 ([`:521-529`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L521-L529)).
3. `Saturation::processBlock` appelle `getNextValue()` une fois par canal et par échantillon ([`Saturation.cpp:161-170`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/Saturation.cpp#L161-L170)) : la rampe avance deux fois plus vite en stéréo et les deux canaux reçoivent des gains différents.
4. La compensation compte 0,5 échantillon pour chaque étage ADAA, alors que l'ADAA tourne au taux 4x (soit 0,125 échantillon au taux de base) et que le clipper n'est pas en ADAA ([`:651-653`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L651-L653)). Le principe reste bon ; le calcul est à refaire par mesure.
5. Le relâchement automatique de l'`EnvelopeDetector` est calculé mais jamais utilisé : `getReleaseCoefficient` n'est appelé nulle part ([`EnvelopeDetector.cpp:73-79`](https://github.com/tote-bag-labs/valentine/blob/main/libs/tote_bag/dsp/EnvelopeDetector.cpp#L73-L79)).
6. `getTailLengthSeconds` renvoie 0 alors que le relâchement monte à 1,1 s ; l'état sauvé ne porte pas de numéro de version ([`:574-617`](https://github.com/tote-bag-labs/valentine/blob/main/src/PluginProcessor.cpp#L574-L617)).

### 4.4 Tests

Trois fichiers ([`tests/`](https://github.com/tote-bag-labs/valentine/tree/main/tests)) : `MathTests.cpp` (recherche d'indices et interpolation par morceaux), `AudioHelpersTests.cpp` (puissance de deux suivante, `cosh` borné qui ne déborde pas) et `PluginBasics.cpp`, qui ne contient que `REQUIRE (1 == 1)` ; le test du processeur est commenté pour cause de fuites mémoire ([`tests/PluginBasics.cpp:5-21`](https://github.com/tote-bag-labs/valentine/blob/main/tests/PluginBasics.cpp#L5-L21)). Aucun test du compresseur, de la saturation ni de la latence. La cible `Tests` est liée à la cible du plugin et lui emprunte ses définitions et include, pour éviter une violation ODR ([`CMakeLists.txt:261-288`](https://github.com/tote-bag-labs/valentine/blob/main/CMakeLists.txt#L261-L288)) : c'est le montage de Pamplejuce dans une version plus ancienne.

### 4.5 CI

[`.github/workflows/cmake_ctest.yml`](https://github.com/tote-bag-labs/valentine/blob/main/.github/workflows/cmake_ctest.yml) : matrice Linux, macOS, Windows ; clang, Ninja, ccache ; `ctest --output-on-failure` ; **pluginval 1.0.3 strictness 10 sur le VST3 des trois OS**, avec Xvfb sous Linux ; signature et notarisation macOS, installeur Inno Setup sous Windows, release GitHub sur tag `v*`. C'est le modèle Pamplejuce, déjà retenu dans le playbook.

## 5. À reprendre

Licence « GPL v3 » signifie : seulement si notre plugin est AGPL v3, avec un ADR (`CLAUDE.md`, contraintes dures). Une idée n'est pas protégée ; seul le code l'est.

### 5.1 Code à brancher ou à extraire

| Quoi | Source | Licence | Couche chez nous | Remarque |
| --- | --- | --- | --- | --- |
| chowdsp_wdf | Sous module de BYOD | BSD 3 | `dsp/` | Bibliothèque WDF en en têtes, sans JUCE ; c'est l'outil de tous les circuits de BYOD |
| RTNeural | Sous module de BYOD | BSD 3 | `dsp/` | Inférence de réseaux (LSTM, GRU, convolutions) temps réel ; à prendre seulement si un modèle entraîné fait partie de la SPEC |
| math_approx | Sous module de BYOD | BSD 3 | `dsp/` | Approximations rapides (dont omega de Wright pour les diodes en WDF) |
| `chowdsp::ForwardingParametersManager` | `chowdsp_parameters` | BSD 3 | `plugin/` | Si un jour on a une chaîne dynamique : seule façon propre d'exposer ses paramètres à l'hôte VST3 |
| `chowdsp::ArenaAllocator` | `chowdsp_data_structures` | BSD 3 | `dsp/` | Tampons temporaires sans allocation sur le thread audio |
| Cœurs WDF de circuits (`TubeScreamerWDF.h`, `ZenDriveWDF.h`, `MXRDistWDF.h`, `BaxandallWDF.h`, `BassmanToneStack.*`, `DiodeClipperWDF.h`…) | BYOD `src/processors/**/` | GPL v3 | `dsp/` | Presque sans JUCE ; adaptation légère (retirer `pch.h`) |
| Hystérésis de Jiles Atherton | BYOD `drive/hysteresis/` | GPL v3 | `dsp/` | Saturation de bande ou transformateur ; utilise le SIMD chowdsp |
| Range Booster, Warp | BYOD `drive/` | GPL v3 | `dsp/` | Petits fichiers autonomes à résolution Newton Raphson |
| Fichiers de presets, schémas SVG, scripts `sim/` | BYOD `res/`, `sim/` | GPL v3 | Aucune (référence) | Les schémas servent à refaire un circuit nous mêmes avec chowdsp_wdf |
| `Saturation` (asinh ADAA) et `Compressor` | Valentine `libs/tote_bag/dsp/` | GPL v3 | `dsp/` | Plutôt réécrire : couplés à JUCE et ff_meters, avec les défauts 1 à 5 ci dessus |
| ff_meters | Sous module de Valentine | BSD 3 | `ui/` | Mètres de niveau et de réduction de gain prêts ; à comparer avec `foleys_gui_magic` |

### 5.2 Idées de conception

| Idée | Vu dans | Licence du code d'origine | Couche chez nous |
| --- | --- | --- | --- |
| Table unique des modules (nom, fabrique, catégorie, ports) qui génère menu et tests | BYOD `ProcessorStore.cpp:90-168` | GPL v3 | `plugin/` |
| Tests paramétrés qui tournent sur **toutes** les entrées de la table (NaN, DC au démarrage, lissage, stéréo) | BYOD `UnitTests.h:3-24` | GPL v3 | `tests/dsp/`, `tests/plugin/` |
| Préparer et allouer hors verrou, puis seulement échanger sous verrou ; libérer après | BYOD `ProcessorChainActions.cpp:68-89` | GPL v3 | `plugin/` (à faire par échange de pointeur atomique, pas par verrou) |
| Garder l'objet retiré dans l'action d'undo, donc le détruire hors du thread audio | BYOD `ProcessorChainActions.cpp:61-65` | GPL v3 | `plugin/` |
| Sortie assainie : si NaN ou Inf, remettre le DSP à zéro | BYOD `BYOD.cpp:88-89` | GPL v3 | `plugin/` |
| Bypass hôte retardé de la latence | BYOD `BYOD.cpp:92-109` ; Valentine `processBlockBypassed` | GPL v3 | `plugin/` |
| Latence rapportée = pire cas arrondi à l'entier ; chemin traité retardé de l'écart, retard glissant | Valentine `PluginProcessor.cpp:649-695` | GPL v3 | `plugin/` et `dsp/` |
| Un bouton de ratio qui pilote knee et seuil par une table de points | Valentine `ValentineParameters.h:50-90` | GPL v3 | `dsp/` (table dans `Params`) |
| Gain d'entrée qui pousse dans un seuil fixe plutôt qu'un seuil réglable | Valentine | GPL v3 | `dsp/` |
| Détecteur en dB lissé dans le domaine log (Giannoulis 2012) | Valentine `EnvelopeDetector.cpp:81-91` | GPL v3 ; la méthode est publiée | `dsp/` |
| Lo fi au taux de base, non linéarités au taux suréchantillonné | Valentine `PluginProcessor.cpp:347-393` | GPL v3 | `dsp/` |
| Fondu sur un bloc lors d'un changement de modèle ou de structure | BYOD Centaur, Solo-Vibe | GPL v3 | `dsp/` (notre crossfade de 20 ms reste la règle) |
| Script qui crée les fichiers d'un nouveau module | BYOD `scripts/new_proc.sh` | GPL v3 | outillage |

### 5.3 À éviter

| Pratique | Vu dans | Pourquoi | Couche concernée |
| --- | --- | --- | --- |
| `SpinLock` partagé UI/audio, bloc sauté si le verrou est pris | BYOD `ProcessorChain.cpp:189-191` | Perte de bloc audible ; contraire à `realtime-audio.md` | `plugin/` |
| `prepare` des modules et allocation d'arène sur le thread audio au changement d'oversampling, avec journalisation | BYOD `ProcessorChain.cpp:194-197`, `:304-311` | Allocation et I/O sur le thread audio | `plugin/` |
| Changement de graphe et bypass de module sans crossfade | BYOD `BaseProcessor.cpp:109-112` | Clics | `dsp/`, `plugin/` |
| Un `juce::AudioProcessor` et une APVTS par module | BYOD `BaseProcessor.h:83` | DSP lié à JUCE, impossible à tester sans JUCE | `dsp/` |
| Nom affiché utilisé comme identifiant sauvé | BYOD `ProcessorStore.cpp:90-168` | Renommer casse les sessions | `plugin/` |
| pluginval sur un seul OS en strictness 7 | BYOD `scripts/validate.sh` | Notre règle est strictness 10 partout | CI |
| Ressources (IR, modèles) sans provenance ni licence | BYOD `res/` | Risque juridique | ressources |
| DSP qui écrit dans un mètre d'UI à chaque échantillon | Valentine `Compressor.cpp:144` | Couplage `dsp/` vers `ui/`, coût par échantillon | `dsp/`, `ui/` |
| Paramètres en tableaux parallèles indexés par enum | Valentine `ValentineParameters.h` | Facile à désynchroniser ; préférer une spécification par paramètre | `plugin/` |
| Test factice qui garde la CI verte | Valentine `tests/PluginBasics.cpp:5-8` | Donne une fausse assurance | `tests/` |
| État sauvé sans version, `getTailLengthSeconds` à 0 pour un effet à relâchement long | Valentine `PluginProcessor.cpp:206-209`, `:574-617` | Contraire à `juce.md` | `plugin/` |
| Formats AU, AUv3, LV2, AAX, CLAP, iOS, serveur de presets | Les deux | Hors périmètre : VST3 seulement (ADR 0003) | build |
