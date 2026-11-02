# Projets de référence

Analysés le 2026-11-02, d'abord à partir de leurs README, puis en lisant le code. Le tableau ci dessous a été corrigé après lecture du code ; l'étude détaillée est dans [`references/drum-foundry.md`](references/drum-foundry.md) et [`references/tetradrive.md`](references/tetradrive.md). Point clé : **seul TetraDrive teste son DSP sans JUCE.** C'est la première chose à copier.

## Les deux projets de départ

| | [Drum Foundry](https://github.com/donjmilligan/drum-foundary) | [TetraDrive](https://github.com/dadda123/TetraDrive) |
| --- | --- | --- |
| Type | Instrument : synthé de kick et snare par couches, courbes dessinées sur la forme d'onde | Effet : distorsion multibande 4 bandes, émulation d'une unité des années 2000 |
| JUCE | 8.0.15 dans `libs/JUCE`, téléchargé par CMake si le dossier est vide | 9.0.4 vendored dans `external/JUCE`, avec un patch VST3 |
| Build | CMake + Ninja, option `DRUMFOUNDRY_BUILD_TOOLS` | CMake, générateurs Visual Studio ou Xcode |
| Formats | VST3, AU, Standalone (macOS) ; VST3, Standalone (Windows) | VST3 (Windows) ; VST3, AU (macOS) |
| DSP séparé de JUCE | Non : 33 des 37 fichiers de `src/dsp` utilisent JUCE | Oui : `src/` compile sans JUCE |
| Tests | Binaire `DrumFoundryTools check` (NaN, round trip d'état, taille de bloc, undo, clipper), pas de ctest | `tests/` headless, activés par `-DTD_BUILD_TESTS=ON`, sans dépendance JUCE |
| Validation | pluginval strictness 10 et `auval` en commandes **manuelles** (README), pas en CI | Aucune |
| Versioning | Version dans `CMakeLists.txt` ; la CI échoue si le README ne correspond pas | Version lue dans le premier titre de `CHANGELOG.md` |
| CI / release | GitHub Actions : un tag `vX.Y.Z` construit installeurs et release ; ni tests, ni pluginval, ni `tools check`, pas de Linux | **Aucune CI** |
| Licence | AGPL v3 + NOTICE | AGPL v3 |

### À reprendre de Drum Foundry

1. **Un binaire d'outils dev qui fait tourner le vrai moteur sans DAW.** Sous commandes `render` (WAV + PNG de spectrogramme par preset), `check` (batterie de vérifications), `bench` (coût CPU temps réel), `snapshot` (capture d'écran de l'éditeur). C'est exactement ce dont un agent a besoin pour vérifier son travail.
2. **Un snapshot de paramètres par bloc.** `DrumParams` est une copie simple que le DSP lit à chaque bloc ; le DSP ne lit jamais l'arbre de paramètres JUCE directement.
3. **Zéro blocage sur le thread audio.** Les éditions d'enveloppe passent par un `try_lock` (l'audio n'attend jamais) ; les samples sont décodés en arrière plan puis livrés sans blocage ; la réverbe "Natural" reconstruit sa réponse impulsionnelle sur un thread de fond puis fait un crossfade.
4. **Latence fixe et déclarée**, identique quel que soit l'ordre de la chaîne d'effets ou le mode de sortie.
5. **Traitement par paquets fixes de 32 échantillons**, mais seulement dans la réverbe Cloud (FIFO interne). Les LFO partent du début de chaque bloc hôte et dépendent donc encore de la taille de bloc ; leur test ne route aucun LFO.
6. **Changement d'ordre de la chaîne sans clic** : fondu de sortie de 10 ms, silence, reset des modules, fondu d'entrée de 10 ms.
7. **Undo par gestes utilisateur** : l'automation et le rappel de session par l'hôte ne créent pas d'étape d'undo, ils déplacent la base.
8. **Une carte du code dans le README** : tableau chemin → rôle. Très utile pour un agent qui découvre le repo.
9. **Sources DSP citées** (Giannoulis, Massberg et Reiss, JAES 2012 pour les compresseurs ; RBJ cookbook ; filtres de Vicanek) et mention qu'aucun code tiers n'a été copié.
10. **Code vendored documenté** : `libs/CloudSeedCore/PATCHES.md` liste les patchs appliqués (modulation déterministe, pas d'allocation sur changement de paramètre).

### À reprendre de TetraDrive

1. **Séparation physique `src/` (DSP pur) et `Source/` (JUCE + UI).** Le moteur compile et se teste sans JUCE.
2. **Le patch JUCE pour l'automation sample accurate en VST3** : par défaut le wrapper VST3 de JUCE ne transmet que la dernière valeur d'automation par bloc. Le patch est versionné dans `patches/` et réappliqué à chaque mise à jour de JUCE.
3. **Oversampling seulement autour des non linéarités** (les waveshapers), en demi bandes polyphases en cascade ; les filtres de crossover restent à la fréquence de l'hôte. Latence calculée (47, 55, 58 échantillons pour 2x, 4x, 8x) et rapportée à l'hôte.
4. **Invariants sur les paramètres** : les crossovers restent ordonnés avec au moins 1/12 d'octave d'écart, l'automation ne peut pas inverser les bandes.
5. **Compatibilité de session explicite** : les sessions d'avant 1.1.0 se rechargent en mode Classic, oversampling off. Chaque nouveau paramètre a une valeur de repli pour les anciens états.
6. **Ce qui n'est pas dans les presets est listé** (Solo, Bypass, Oversampling).
7. **CHANGELOG comme source unique de version**, affichée dans le binaire, les métadonnées VST3/AU et la page About.

## Template recommandé

[**Pamplejuce**](https://github.com/sudara/pamplejuce) (MIT, environ 750 étoiles). Au 2026-11-02 il fournit :

* C++23, JUCE 9.x en sous module (branche develop), CPM, CMake ≥ 3.25 ;
* Catch2 v3.8.1, une cible `Tests` et une cible `Benchmarks` ;
* GitHub Actions : build et tests Linux, macOS, Windows, pluginval 1.x, signature et notarisation macOS, signature Windows via Azure Trusted Signing ;
* `.clang-format`, `.gitignore` multiplateforme, fichier `VERSION` propagé dans JUCE ;
* melatonin_inspector pour déboguer l'UI ;
* un `CLAUDE.md` / `AGENTS.md` avec un assistant de configuration initiale.

Documentation : [melatonin.dev/manuals/pamplejuce](https://melatonin.dev/manuals/pamplejuce).

## Autres projets à lire

| Projet | Quoi | Pourquoi le lire | Licence |
| --- | --- | --- | --- |
| [Surge XT](https://github.com/surge-synthesizer/surge) | Synthé hybride, très actif | Gros projet bien tenu : modulation, presets, tests, CI multiplateforme | GPL v3 |
| [Vital](https://github.com/mtytel/vital) | Synthé wavetable | Matrice de modulation et UI temps réel de référence | GPL v3 |
| [chowdsp_utils](https://github.com/Chowdhury-DSP/chowdsp_utils) | Modules DSP JUCE | DSP propre et réutilisable | BSD |
| [BYOD](https://github.com/Chowdhury-DSP/BYOD) | Distorsion modulaire | Chaîne de processeurs réordonnable | GPL v3 |
| [valentine](https://github.com/tote-bag-labs/valentine) | Compresseur | Plugin d'effet complet, taille raisonnable | GPL v3 |
| [Dexed](https://github.com/asb2m10/dexed) | Émulation DX7 | Synthèse FM, presets | GPL v3 |
| [OB-Xd](https://github.com/reales/OB-Xd), [Odin 2](https://github.com/TheWaveWarden/odin2) | Synthés analogiques virtuels | Filtres et oscillateurs modélisés | GPL v3 |
| [mda-plugins-juce](https://github.com/hollance/mda-plugins-juce) | Plugins MDA réécrits en JUCE | Petits et lisibles, idéaux pour apprendre | Voir repo |
| [Frequalizer](https://github.com/ffAudio/Frequalizer) | EQ avec analyseur | Analyseur de spectre, courbes de filtres | Voir repo |

Liste complète, tenue à jour : [awesome-juce](https://github.com/sudara/awesome-juce).

## Outils et modules

| Outil | Rôle |
| --- | --- |
| [pluginval](https://github.com/Tracktion/pluginval) | Valide le binaire comme un hôte : chargement, états, automation, tailles de bloc. Niveau 10 = le plus strict |
| [melatonin_inspector](https://github.com/sudara/melatonin_inspector) | Inspecte et édite l'UI JUCE en direct |
| [melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) | Affiche un buffer audio en ASCII dans la console et les tests ; dépend de `juce_dsp`, donc seulement dans les tests de `plugin/` |
| [melatonin_perfetto](https://github.com/sudara/melatonin_perfetto) | Profiling du thread audio avec Perfetto |
| [DSP-Testbench](https://github.com/AndrewJJ/DSP-Testbench) | Banc de test DSP : sources, routage, analyse |
| [juce-plugin-ci](https://github.com/maxwellpollack/juce-plugin-ci) | CI GitHub Actions plus légère que Pamplejuce |

## Lectures

* [How to use CMake with JUCE](https://melatonin.dev/blog/how-to-use-cmake-with-juce/), Sudara.
* [Real-time audio programming 101: time waits for nothing](http://www.rossbencina.com/code/real-time-audio-programming-101-time-waits-for-nothing), Ross Bencina. La référence sur les règles du thread audio.
* [Wait-free programming from scratch](https://jatinchowdhury18.medium.com/wait-free-programming-from-scratch-5ac6a65c23c4), Jatin Chowdhury.
* Timur Doumler, talks CppCon/ADC sur le C++ temps réel et le pattern Read Copy Update.
* [Audio EQ Cookbook](https://www.w3.org/TR/audio-eq-cookbook/), Robert Bristow Johnson.
