# Modules melatonin et clap-juce-extensions

Étude faite le 2026-11-02. Chaque licence a été lue dans le fichier du dépôt cloné, pas dans la page GitHub.

| Dépôt | Commit étudié | Date |
| --- | --- | --- |
| [sudara/melatonin_inspector](https://github.com/sudara/melatonin_inspector/tree/9c483f865854d83fe9873e1c20e3fd772f695f80) | `9c483f8` (celui qu'épingle Pamplejuce) | 2026-08-16 |
| [sudara/melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) | `379b719` | 2026-05-14 |
| [sudara/melatonin_perfetto](https://github.com/sudara/melatonin_perfetto) | `c8a2bd4` | 2026-10-11 |
| [sudara/melatonin_blur](https://github.com/sudara/melatonin_blur) | `fcc1857` | 2026-05-26 |
| [free-audio/clap-juce-extensions](https://github.com/free-audio/clap-juce-extensions) | `7adee3a` (Pamplejuce épingle `c1a5ad0`) | 2026-10-06 |

## Synthèse

| Module | Licence vérifiée | Rôle | Intégration | Verdict |
| --- | --- | --- | --- | --- |
| melatonin_inspector | **MIT**, `LICENSE`, "Copyright (c) 2021 Sudara Williams" | Inspecteur d'UI en direct : hiérarchie, tailles, couleurs, propriétés, FPS, temps de `paint` | Déjà dans Pamplejuce (sous module `modules/melatonin_inspector`, `add_subdirectory`, lié à `SharedCode`) | **Garder**, en Debug seulement |
| melatonin_audio_sparklines | **MIT**, `LICENSE`, "Copyright (c) 2021 Sudara Williams" | Résumé et forme d'onde ASCII d'un buffer audio, dans la console ou dans lldb | Sous module + `juce_add_module`, header seul ; dépend de `juce_dsp` | **Garder pour `tests/plugin/` et `tools`**, inutilisable dans `tests/dsp/` |
| melatonin_perfetto | **Pas de fichier LICENSE.** Le header de module déclare `license: MIT` (`melatonin_perfetto/melatonin_perfetto.h:9`). Dépendance Perfetto SDK v53.0 : **Apache 2.0** (`LICENSE` du tag `v53.0` de google/perfetto) | Traces de profilage (`TRACE_DSP`, `TRACE_COMPONENT`) visualisées dans ui.perfetto.dev | Sous module + `add_subdirectory`, lien `Melatonin::Perfetto`, option CMake `PERFETTO` | **Plus tard**, derrière une option à nous, en phase performance |
| melatonin_blur | **MIT**, `LICENSE`, "Copyright (c) 2023 Sudara Williams", **plus un fichier BSD 3 clauses** (`melatonin/implementations/gin.h`, "Copyright (c) 2018, Roland Rabien") | Ombres portées et intérieures, flous rapides façon Figma/CSS | Sous module + `add_subdirectory` ou `juce_add_module` | **Pas maintenant** (UI, phase tardive), à réévaluer avec le document de design |
| clap-juce-extensions | **MIT**, `LICENSE.md`, "Copyright 2019-2020, Paul Walker" (texte MIT sans le titre "MIT License"). Sous modules `clap` et `clap-helpers` : **MIT**, "Copyright (c) 2021 Alexandre BIQUE" | Construit un binaire CLAP à partir d'un plugin JUCE | Déjà dans Pamplejuce (`add_subdirectory(... EXCLUDE_FROM_ALL)` puis `clap_juce_extensions_plugin`) | **Hors v1** : retirer du build, noter dans `FUTURE.md` |

Toutes ces licences sont compatibles avec un plugin fermé comme avec un plugin AGPL v3 (MIT, BSD 3 et Apache 2.0 sont compatibles avec la GPL v3). Obligations : conserver les notices de copyright dans la distribution (fichier de licences tierces de l'installeur), plus le fichier NOTICE d'Apache 2.0 si Perfetto est livré dans un binaire.

## melatonin_inspector

**Ce qu'il fait.** Une fenêtre séparée qui inspecte l'arbre de `juce::Component` de l'éditeur : sélection à la souris, hiérarchie filtrable, position et marges éditables à la volée (non destructif, rien n'est écrit dans le code), couleurs JUCE par nom d'`enum ColourIds`, pipette, compteur de FPS, histogramme du temps de `paint` par composant (JUCE 8.0.13 minimum), inspection d'un `UndoManager`. Module version 1.4.0 (`melatonin_inspector.h:6`), dépend de `juce_gui_basics` et `juce_gui_extra`.

**Intégration.** Rien à faire, Pamplejuce le fournit : `add_subdirectory (modules/melatonin_inspector)` avant `juce_add_plugin` (`pamplejuce/CMakeLists.txt:67`), lien `melatonin_inspector` sur `SharedCode` (`:152`), et dans l'éditeur un `std::unique_ptr<melatonin::Inspector>` créé au clic avec `onClose` qui le réinitialise (`pamplejuce/source/PluginEditor.cpp:8-19`). Raccourci `cmd/ctrl i` quand l'inspecteur est membre de l'éditeur.

**Pour nous.** Utile à l'humain pendant la phase UI, pas à l'agent (c'est un outil interactif). Il ne remplace pas `tools snapshot` exigé par `.claude/rules/ui.md`. Entourer le membre, le bouton et l'include par `#if JUCE_DEBUG` pour ne pas le livrer.

## melatonin_audio_sparklines

**Ce qu'il fait.** Un header de 279 lignes (`melatonin_audio_sparklines.h`, version 1.0.0) qui transforme un `juce::dsp::AudioBlock` ou un `juce::AudioBuffer` en résumé texte et en "sparkline" :

```
Block is 1 channel, 441 samples, min -0.999994, max 0.999994, 100% filled
[0—⎻⎺‾⎺⎻—x—⎼⎽_⎽⎼—]
```

Symboles : `0` vrai zéro, `x` passage par zéro, `E` hors de [-1, 1], `I` infini, `N` NaN, `S` sous normal. Fonctions principales : `melatonin::sparkline(block, collapse, normalize)` qui renvoie une `juce::String` (ligne 145), `printSparkline(...)` qui passe par `DBG` (lignes 164-178), `printSamples(...)`, `blockToString` et `vectorToString` (lignes 243-277) qui produisent une liste `0.1f, 0.2f, …` copiable dans un test. Le fichier `sparklines.py` ajoute un résumé au survol dans lldb (Xcode, CLion).

**Intégration.** `git submodule add -b main … modules/melatonin_audio_sparklines`, puis `juce_add_module(modules/melatonin_audio_sparklines)` et lien sur `SharedCode` (ou seulement sur `PluginTests` et `MyPluginTools`).

**Pour nous.**

* Le module inclut `<juce_dsp/juce_dsp.h>` (ligne 16) et manipule `juce::String`. **Il ne peut pas servir dans `tests/dsp/`**, qui doit compiler sans JUCE (`.claude/rules/testing.md`, `docs/03_ARCHITECTURE.md`). Cela contredit `docs/04_TESTS.md:27`.
* Dans `tests/plugin/`, utiliser `sparkline()` dans un `INFO(...)` ou un `CAPTURE` de Catch2, pas `printSparkline` : `DBG` n'écrit rien en Release, alors que le message de `INFO` s'affiche à l'échec quel que soit le mode.
* Dans `tools check`, afficher la sparkline d'un rendu fautif : c'est exactement le cas "un agent ne peut pas écouter".
* Pour `tests/dsp/`, trois options à trancher : (a) se contenter des valeurs (`blockToString` n'existe pas sans JUCE, mais Catch2 affiche déjà les valeurs comparées) ; (b) une petite cible `DspTestDiagnostics` liée à `juce_dsp`, seulement pour l'affichage, ce qui assouplit la règle "tests DSP sans JUCE" ; (c) quelques dizaines de lignes maison qui produisent la même sparkline sur un `std::span<const float>`. L'option (a) est la seule qui ne demande ni code ni exception à une règle.
* Ne jamais l'appeler sur le thread audio : le README le dit (allocations de chaînes et `DBG`).

## melatonin_perfetto

**Ce qu'il fait.** Intègre le SDK de traçage [Perfetto](https://perfetto.dev) dans JUCE. On ajoute `TRACE_DSP()` en tête de `processBlock` et `TRACE_COMPONENT()` en tête de `paint`, un membre `MelatoninPerfetto tracingSession` dans le processeur, et à la fermeture propre de l'application un fichier `.pftrace` est écrit (Bureau sous Windows, Téléchargements sous macOS, `/tmp` sous Linux), à ouvrir dans ui.perfetto.dev. Module version 1.4.0, C++17 minimum, macOS 10.14 minimum (raison pour laquelle cmake-includes est passé à 10.14, CHANGELOG du 2026-01-03).

**Licence, en détail.** Le dépôt n'a **aucun fichier LICENSE** (liste complète des fichiers vérifiée). La seule déclaration est le champ `license: MIT` de la déclaration de module JUCE (`melatonin_perfetto/melatonin_perfetto.h:9`). Le CMake télécharge Perfetto par `CPMAddPackage(gh:google/perfetto@53.0)` (`CMakeLists.txt:30`) et compile `sdk/perfetto.cc` en bibliothèque statique (`:33-44`) ; Perfetto est sous Apache 2.0.

**Intégration.**

```cmake
add_subdirectory (modules/melatonin_perfetto)
target_link_libraries (SharedCode INTERFACE Melatonin::Perfetto)
```

puis `cmake -B Builds -D PERFETTO=ON` pour activer ; avec `PERFETTO=0` (valeur par défaut, `melatonin_perfetto.h:21`) les macros disparaissent à la compilation.

**Pour nous.**

* Même avec `PERFETTO=OFF`, le `add_subdirectory` télécharge Perfetto et la bibliothèque `perfetto` est liée sans condition (`CMakeLists.txt:98`) : temps de configure et de build pour rien. L'ajouter seulement derrière une option à nous (`if (MYPLUGIN_PERFETTO)`), pas dans le squelette.
* C'est un outil d'humain (on regarde une trace) et de diagnostic ponctuel. La mesure qui fait foi en CI reste `tools bench` et le budget (`docs/04_TESTS.md`).
* Ne jamais combiner `PERFETTO=ON` et le job RealtimeSanitizer : le traçage sur le thread audio n'est pas garanti sans appel système ni verrou, et RTSan le signalerait. Désactiver aussi Perfetto dans tout build livré.
* Utile en phase 4 (performance) pour voir où part le temps d'un bloc, surtout si l'UI et l'audio se disputent le CPU.

## melatonin_blur

**Ce qu'il fait.** Ombres portées et intérieures sur des `juce::Path` (remplies ou tracées) et du texte, flous d'images ARGB, avec cache multicouche et prise en compte de l'échelle d'affichage (Retina). Rendu fidèle à Figma et CSS. Accélération par Accelerate (vImage) sur macOS, IPP optionnel ou Direct2D sur Windows (option `MELATONIN_BLUR_USE_DIRECT2D`, active par défaut sous Windows, `CMakeLists.txt:10-16`), repli sur `FloatVectorOperations` et sur le Stack Blur de Gin. Module version 1.4.0, dépend de `juce_graphics`, `juce_gui_basics`, `juce_audio_basics`.

**Licence, en détail.** MIT pour le module, mais `melatonin/implementations/gin.h` est un fichier repris de Gin sous **BSD 3 clauses** (Copyright 2018 Roland Rabien) : sa notice doit figurer dans la documentation livrée avec le binaire, en plus de la notice MIT.

**Intégration.** Sous module dans `modules/`, `add_subdirectory` avant `juce_add_plugin`, lien `melatonin_blur` sur `SharedCode`. Documentation d'usage sur melatonin.dev (le README y renvoie).

**Pour nous.** Pur confort visuel. La règle "le son prime sur l'UI" (`.claude/rules/scope.md`, règle 7) le repousse après le gate DSP, et seulement si le document de design demande des ombres ou des flous. À noter dans `FUTURE.md` plutôt qu'à intégrer.

## clap-juce-extensions

**Ce qu'il fait.** Un wrapper non officiel qui produit un plugin CLAP à partir d'un `AudioProcessor` JUCE, sans modifier le code du plugin. Fonction CMake `clap_juce_extensions_plugin(TARGET … CLAP_ID … CLAP_FEATURES …)` (`cmake/ClapTargetHelpers.cmake:192`), qui crée la cible `<Projet>_CLAP`. Options notables : `CLAP_PROCESS_EVENTS_RESOLUTION_SAMPLES` (automation précise à l'échantillon par découpage du bloc, 0 par défaut), `CLAP_ALWAYS_SPLIT_BLOCK`, `CLAP_USE_JUCE_PARAMETER_RANGES`, `CLAP_CHECKING_LEVEL`. Les IDs de paramètres CLAP sont dérivés par le même hachage que le wrapper VST3 de JUCE, et l'état passe tel quel par `getStateInformation` / `setStateInformation` (README, section "Risks").

**JUCE natif ?** Le JUCE épinglé par Pamplejuce (develop, `project(JUCE VERSION 9.0.1)`) ne contient aucune occurrence de CLAP dans `extras/Build/CMake/JUCEUtils.cmake` : pas de format CLAP natif à ce commit. Le wrapper reste donc nécessaire pour qui veut du CLAP.

**Intégration.** Déjà faite par Pamplejuce : `add_subdirectory(modules/clap-juce-extensions EXCLUDE_FROM_ALL)` (`pamplejuce/CMakeLists.txt:61`) et l'appel à `clap_juce_extensions_plugin` (`:102-104`). Le workflow signe et empaquette le `.clap`, l'installeur Windows l'installe dans `Common Files\CLAP`.

**Pour nous.**

* Notre décision de formats est VST3 uniquement (ADR 0003). Garder CLAP serait une extension silencieuse du périmètre, et un format livré **sans validation** : pluginval ne teste que le VST3 dans la CI de Pamplejuce. Le retirer pour la v1 (liste des lignes dans `pamplejuce.md`, étape 2), et l'inscrire dans `FUTURE.md`.
* Point à garder en tête pour plus tard : `CLAP_PROCESS_EVENTS_RESOLUTION_SAMPLES` donne en CLAP l'automation précise à l'échantillon que le wrapper VST3 de JUCE ne donne pas (question du patch TetraDrive, `docs/02_TOOLCHAIN.md:49`).
* S'il revient, ajouter un validateur CLAP en CI au même titre que pluginval.

## Écarts avec nos documents

* `docs/07_A_REPRENDRE.md:86, 87, 96, 98` marquent inspector, blur, clap-juce-extensions et perfetto "MIT *à vérifier*". Vérifié : MIT pour les quatre, avec deux réserves. melatonin_perfetto n'a pas de fichier LICENSE (déclaration MIT dans le header seulement) et embarque Perfetto en Apache 2.0 ; melatonin_blur contient un fichier BSD 3 clauses de Gin.
* `docs/04_TESTS.md:27` recommande melatonin_audio_sparklines pour les échecs des tests DSP, alors que le module exige `juce_dsp` et que ces tests doivent tourner sans JUCE.
* `docs/07_A_REPRENDRE.md:96` dit clap-juce-extensions "déjà dans Pamplejuce" comme un acquis ; c'est vrai, mais CLAP n'est pas dans nos formats décidés et n'est pas validé en CI.
