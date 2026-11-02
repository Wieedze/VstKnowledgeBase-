# Pamplejuce : étude et guide d'adaptation

Étude faite le 2026-11-02 sur le code, pas sur la documentation en ligne.

| Dépôt | Commit étudié | Date |
| --- | --- | --- |
| [sudara/pamplejuce](https://github.com/sudara/pamplejuce/tree/ca3cae0b288a644d11bb64651f81c2e0a7e7b942) | `ca3cae0` | 2026-08-16 |
| [sudara/cmake-includes](https://github.com/sudara/cmake-includes/tree/8de22da65803144fcbb1185803f2e41a4b094c8b) (HEAD) | `8de22da` | 2026-10-26 |
| cmake-includes **épinglé par Pamplejuce** (sous module `cmake`) | `5d75b1f` | entre 2026-08-16 et 2026-10-10 |
| JUCE épinglé par Pamplejuce (sous module `JUCE`, branche `develop`) | `620b879`, `project(JUCE VERSION 9.0.1)` | |

Dans ce document, `PJ/` désigne le dépôt Pamplejuce et `CI/` le dépôt cmake-includes (qui devient le dossier `cmake/` du projet).

## Verdict

**On part de Pamplejuce, sans hésiter, mais pas tel quel.** Il fournit gratuitement le projet CMake, Catch2, la cible `Benchmarks`, la CI trois OS avec pluginval 10, la signature, les installeurs, le fichier `VERSION` propagé, et même l'option RealtimeSanitizer (`WITH_REALTIME_SANITIZER`) déjà écrite dans `cmake/Sanitizers.cmake`. Licence MIT (`PJ/LICENSE`, Copyright 2022 Sudara Williams).

Il faut l'adapter sur six points, tous détaillés plus bas :

1. Le glob de sources (`PJ/CMakeLists.txt:115`) prend tout `source/` : il faut le restreindre à `source/plugin` et `source/ui`, et créer une bibliothèque `dsp` séparée, sans JUCE.
2. Le glob des tests (`CI/Tests.cmake:59`) prend tout `tests/` dans une seule cible liée à JUCE : il faut deux cibles, `DspTests` (sans JUCE) et `PluginTests`.
3. `include(Sanitizers)` n'est pas appelé dans `PJ/CMakeLists.txt` : l'option RTSan existe mais n'est pas branchée.
4. La CI échoue dès le premier push sans certificats (le README le dit lui même, `PJ/README.md:48-49`) : il faut conditionner ou commenter les étapes de signature.
5. Rien pour `tools check`, `tools compare`, clang-format, le grep "pas de JUCE dans dsp/", ni le budget de benchmarks : ce sont des jobs à ajouter.
6. Le sous module `cmake` est en retard sur cmake-includes HEAD, avec un réglage fast math corrigé depuis (voir piège 4).

## 1. Comment les cibles sont créées

Le `CMakeLists.txt` racine fait 175 lignes et délègue presque tout aux fonctions `pamplejuce_*` de `cmake/`.

| Cible | Créée par | Contenu | Lien |
| --- | --- | --- | --- |
| `Pamplejuce` (+ `_VST3`, `_AU`, `_Standalone`, `_All`…) | `juce_add_plugin`, `PJ/CMakeLists.txt:70-96` | Les binaires de plugin | `PRIVATE SharedCode` (`:163`) |
| `Pamplejuce_CLAP` | `clap_juce_extensions_plugin`, `PJ/CMakeLists.txt:102-104` | Le binaire CLAP | idem |
| `SharedCode` | `add_library(SharedCode INTERFACE)`, `PJ/CMakeLists.txt:100` | Toutes les sources de `source/` (`:115-116`), modules JUCE, `Assets`, `melatonin_inspector` (`:149-160`) | Lié au plugin **et** aux tests |
| `Assets` | `pamplejuce_add_assets()`, `CI/Assets.cmake:4-24` | `juce_add_binary_data` de tout `assets/` | `INTERFACE` de `SharedCode` |
| `Tests` | `pamplejuce_add_tests()`, `CI/Tests.cmake:33-94` | Glob `tests/*.cpp`, `tests/*.h` ; copie les définitions du plugin (`:72`) ; `JUCE_MODAL_LOOPS_PERMITTED=1`, `RUN_PAMPLEJUCE_TESTS=1`, `CI=1` | `SharedCode Catch2::Catch2` (sans `WithMain`) |
| `Benchmarks` | `pamplejuce_add_benchmarks()`, `CI/Benchmarks.cmake:3-54` | **Seulement** `benchmarks/Catch2Main.cpp` et les `.h` (`:28`) | idem |

Pourquoi `SharedCode` est une bibliothèque `INTERFACE` : chaque cible qui la lie recompile les sources avec ses propres définitions (`JucePlugin_*` copiées depuis la cible plugin), ce qui évite les violations ODR entre le plugin et l'exécutable de tests. Conséquence : le code de `source/` est compilé deux fois (plugin, tests), trois avec les benchmarks.

### Où se règle quoi

| Réglage | Fichier:ligne | Valeur du template |
| --- | --- | --- |
| `PROJECT_NAME` (nom interne, sans espace) | `PJ/CMakeLists.txt:20` | `Pamplejuce` |
| `PRODUCT_NAME` (nom affiché dans le DAW) | `PJ/CMakeLists.txt:28` | `Pamplejuce Demo` |
| `COMPANY_NAME`, `BUNDLE_ID` | `PJ/CMakeLists.txt:31`, `:34` | |
| `FORMATS` | `PJ/CMakeLists.txt:38` | `Standalone AU VST3 AUv3` (JUCE ignore AU/AUv3 hors Apple) |
| `PLUGIN_MANUFACTURER_CODE`, `PLUGIN_CODE` | `PJ/CMakeLists.txt:84`, `:89` | `Pamp`, `P001` |
| `COPY_PLUGIN_AFTER_BUILD` | `PJ/CMakeLists.txt:79` | `TRUE` (sous Windows, droits admin requis pour `Common Files\VST3`) |
| CLAP : `CLAP_ID`, `CLAP_FEATURES` | `PJ/CMakeLists.txt:102-104` | `${BUNDLE_ID}`, `audio-effect` |
| `JUCE_DISPLAY_SPLASH_SCREEN` | `PJ/CMakeLists.txt:134` (commenté) | |
| `PRODUCT_NAME_WITHOUT_VERSION` codé en dur | `PJ/CMakeLists.txt:141` | `"Pamplejuce"`, à changer aussi |
| Version | fichier `PJ/VERSION` (`0.0.1`, sans saut de ligne), lu par `CI/PamplejuceVersion.cmake:11,55` ; exposée en `CURRENT_VERSION`, puis `project(... VERSION ...)` (`PJ/CMakeLists.txt:46`) et définition `VERSION="…"` (`:138`) | Option `PAMPLEJUCE_AUTO_BUMP_PATCH_LEVEL` (`CI/PamplejuceVersion.cmake:8`) : patch = nombre de commits depuis la dernière modification de `VERSION` |
| CPM | `include(CPM)` (`PJ/CMakeLists.txt:8`), `CI/CPM.cmake` télécharge CPM 0.42.0 avec hash SHA256 ; cache via `CPM_SOURCE_CACHE` | |
| Catch2 | `CPMAddPackage("gh:catchorg/Catch2@3.8.1")`, `CI/Tests.cmake:25` | |
| C++23, fast math | `pamplejuce_shared_code_defaults()` (`PJ/CMakeLists.txt:107`, `CI/SharedCodeDefaults.cmake`) | |
| Sanitizers ASan, TSan, RTSan | `CI/Sanitizers.cmake` : options `WITH_ADDRESS_SANITIZER`, `WITH_THREAD_SANITIZER`, `WITH_REALTIME_SANITIZER` (`:3-5`) | **Non inclus** par `PJ/CMakeLists.txt` |
| macOS : cible minimale 10.14, universel arm64 + x86_64 en CI Release | `CI/PamplejuceMacOS.cmake:10,15-18` | |
| Windows : runtime statique | `CI/JUCEDefaults.cmake:11-13` | |
| Intel IPP | `include(PamplejuceIPP)`, `PJ/CMakeLists.txt:166` | Actif si trouvé |
| `.env` pour la CI (nom, version, bundle) | `include(GitHubENV)`, `PJ/CMakeLists.txt:175`, `CI/GitHubENV.cmake` | Écrit seulement si `CI` est défini |

### Pièges relevés dans le code

1. **Le glob de `source/` est récursif** (`PJ/CMakeLists.txt:115`). Si on met `source/dsp/` dedans et qu'on crée aussi une bibliothèque `dsp`, le code DSP est compilé deux fois et lié deux fois : symboles dupliqués.
2. **Le glob des tests est récursif** (`CI/Tests.cmake:59`). `tests/dsp/*.cpp` finirait dans la cible liée à JUCE, ce qui annule la vérification "DSP sans JUCE".
3. **La cible `Benchmarks` ne compile que `Catch2Main.cpp`** (`CI/Benchmarks.cmake:28`), qui fait `#include "Benchmarks.cpp"` (`PJ/benchmarks/Catch2Main.cpp:23`). Un nouveau fichier `.cpp` de benchmark est ignoré tant qu'il n'est pas inclus là.
4. **Fast math.** Le sous module épinglé (`5d75b1f`) passe `-Ofast` en Release ; cmake-includes HEAD le remplace par `-ffast-math -fno-finite-math-only` (`CI/SharedCodeDefaults.cmake:24-25`, CHANGELOG du 2026-10-26 : "JUCE's -O3 was undoing -Ofast"). `-fno-finite-math-only` est ce qui garde `std::isnan` et `std::isinf` fiables : nos tests "aucune NaN/Inf" en dépendent. Sous MSVC : `/fp:fast` (`:14`).
5. **Mettre à jour `cmake/` casse IPP sous Windows** : HEAD attend `intelipp.static.win-x64/2026.1.0.761` (`CI/PamplejuceIPP.cmake:3`) alors que le workflow installe `2026.0.0.712` (`PJ/.github/workflows/build_and_test.yml:76`), et le test `PJ/tests/PluginBasics.cpp:38` vérifie la chaîne de version exacte `2026.0.0`. Si on garde IPP, les trois bougent ensemble.
6. **`pamplejuce_shared_code_defaults(TARGET x)` pose ses options en `INTERFACE`** (`CI/SharedCodeDefaults.cmake:14-38`). Appliquée à une bibliothèque `STATIC` comme `dsp`, elle ne compile pas `dsp` lui même avec ces options : elle les pousse seulement aux consommateurs. Pour `dsp`, régler les options à la main.
7. **`PluginProcessor.h` inclut `ipps.h` sous `#if (MSVC)`** (`PJ/source/PluginProcessor.h:5-7`). `MSVC` n'est pas une macro du préprocesseur (c'est `_MSC_VER`) : la ligne est morte. À supprimer.
8. **Le dossier de build s'appelle `Builds`**, et `PJ/packaging/installer.iss:38-40` le code en dur (`..\Builds\…_artefacts\Release\…`). Nos docs utilisent `build`. Il faut choisir l'un des deux partout.
9. **`melatonin_inspector` est livré en Release** : il est lié à `SharedCode` sans condition (`PJ/CMakeLists.txt:152`) et l'éditeur affiche un bouton "Inspect the UI" (`PJ/source/PluginEditor.cpp:8-19`, `PJ/source/PluginEditor.h:5, 22-23`).
10. **cmake-includes n'a pas de fichier LICENSE** (dépôt entier vérifié ; seul `CI/CPM.cmake:1` porte `SPDX-License-Identifier: MIT`, pour le code de CPM). Pamplejuce est MIT, mais le sous module qui contient l'essentiel du CMake ne déclare aucune licence. Risque pratique faible (même auteur, conçu pour être utilisé ainsi), mais à noter dans `docs/DEPENDENCIES.md` et, si le plugin est commercial, à clarifier par une issue sur le dépôt.

## 2. Adapter le template à `dsp/ plugin/ ui/ tools/`

Arborescence visée : `docs/03_ARCHITECTURE.md`. Les étapes sont dans l'ordre où les faire, chacune vérifiable par un build.

### Étape 0 : créer le dépôt et épingler les dépendances

1. "Use this template" sur GitHub (copie, pas fork), puis `git submodule update --init --recursive`.
2. Épingler JUCE sur un tag : `cd JUCE && git fetch --tags && git checkout <tag>`, puis retirer `branch = develop` de `.gitmodules` (`PJ/.gitmodules:4`). Le commit épinglé par le template est un `develop` en 9.0.1.
3. Mettre `cmake/` à jour vers cmake-includes HEAD (fast math corrigé, piège 4) et noter le commit dans `docs/DEPENDENCIES.md`. Idem pour `modules/melatonin_inspector` et `modules/clap-juce-extensions` s'ils sont gardés.
4. Supprimer `PJ/.github/workflows/nightly.yml` (réservé au dépôt du template, `:13`) et `linux-ci-image.yml` + `.github/docker/` (pousse vers `ghcr.io/sudara/…`, `linux-ci-image.yml:21-24`).

### Étape 1 : identité du plugin

Modifier `PJ/CMakeLists.txt:20, 28, 31, 34, 84, 89, 141` et le test de nom `PJ/tests/PluginBasics.cpp:18`. Les codes 4 caractères sont définitifs (`docs/02_TOOLCHAIN.md`). Pour un instrument, ajouter `IS_SYNTH TRUE` et `NEEDS_MIDI_INPUT TRUE` à `juce_add_plugin`, et changer `CLAP_FEATURES`.

### Étape 2 : formats

Notre décision est **VST3 uniquement** (ADR 0003, `docs/02_TOOLCHAIN.md`). Remplacer `PJ/CMakeLists.txt:38` par :

```cmake
set(FORMATS VST3)
```

Retirer aussi, dans le workflow et le packaging, toutes les étapes qui signent, copient ou empaquettent AU, AUv3 et Standalone (repérées dans le tableau de la CI plus bas). CLAP est retiré lui aussi : supprimer `PJ/CMakeLists.txt:60-61, 102-104` et les lignes CLAP du workflow (`build_and_test.yml:116, 143, 158, 163, 171`), de `packaging/installer.iss:16, 39` et de `packaging/distribution.xml.template` (choix `clap`). Si on retire AUv3, rien d'autre à faire : `AUV3_PATH` (`build_and_test.yml:115`) n'est utilisé nulle part.

### Étape 3 : la bibliothèque `dsp` sans JUCE

À placer après `include(PamplejuceFunctions)` (`PJ/CMakeLists.txt:52`) :

```cmake
file(GLOB_RECURSE DspFiles CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/source/dsp/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/source/dsp/*.h")
add_library(dsp STATIC ${DspFiles})
target_include_directories(dsp PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/source")   # #include "dsp/Foo.h"
target_compile_features(dsp PUBLIC cxx_std_23)
set_target_properties(dsp PROPERTIES POSITION_INDEPENDENT_CODE ON)            # lié dans un .so VST3 sous Linux
set_target_properties(dsp PROPERTIES COMPILE_WARNING_AS_ERROR ON)             # CMake >= 3.24, règle cpp.md
if (MSVC)
    target_compile_options(dsp PRIVATE /W4)
else ()
    target_compile_options(dsp PRIVATE -Wall -Wextra)
endif ()
```

Ce qui garantit l'absence de JUCE : `dsp` ne lie aucune cible JUCE, donc un `#include <juce_…>` échoue à la compilation de `dsp` et de `DspTests`. Le grep CI de `docs/04_TESTS.md` reste utile comme second filet, avec le bon chemin (`source/dsp/`).

Fast math pour `dsp` : à trancher par ADR. Recommandation de départ : **pas de fast math dans `dsp`** tant que les références golden ne sont pas stables, puis mesurer avec `tools bench`. Raison : `-ffast-math` change les résultats selon le compilateur et l'architecture, ce qui fragilise `tools compare` entre plateformes. Comme `dsp` est une bibliothèque statique compilée une seule fois, les tests et le plugin exécutent exactement le même code objet, quel que soit le choix.

### Étape 4 : `SharedCode` = `plugin/` + `ui/`, liée à `dsp`

Remplacer `PJ/CMakeLists.txt:115-116` par :

```cmake
file(GLOB_RECURSE SourceFiles CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/source/plugin/*.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/source/plugin/*.h"
    "${CMAKE_CURRENT_SOURCE_DIR}/source/ui/*.cpp"     "${CMAKE_CURRENT_SOURCE_DIR}/source/ui/*.h")
target_sources(SharedCode INTERFACE ${SourceFiles})
target_include_directories(SharedCode INTERFACE "${CMAKE_CURRENT_SOURCE_DIR}/source")
```

et ajouter `dsp` à la liste `target_link_libraries(SharedCode INTERFACE …)` (`PJ/CMakeLists.txt:149-160`). Le nom `SourceFiles` est conservé exprès : `pamplejuce_xcode_prettify()` le lit par défaut (`CI/XcodePrettify.cmake:23-25`).

Déplacer `PluginProcessor.*` dans `source/plugin/` et `PluginEditor.*` dans `source/ui/`. Corriger les includes (`"plugin/PluginProcessor.h"`).

**Respecter le sens `ui → plugin`.** Dans le template, `PluginProcessor.cpp` inclut `PluginEditor.h` pour `createEditor()` (`PJ/source/PluginProcessor.cpp:2, 161-164`). C'est une dépendance `plugin → ui`. Correction sans rien coder de nouveau : définir `PluginProcessor::createEditor()` dans un fichier de `source/ui/` (par exemple `ui/CreateEditor.cpp`). Le header du processeur n'inclut plus rien de `ui/`.

### Étape 5 : deux cibles de tests

Remplacer `pamplejuce_add_tests()` (`PJ/CMakeLists.txt:169`) par :

```cmake
# Tests avec JUCE : plugin/, état, paramètres, latence, editor
pamplejuce_add_tests(TARGET PluginTests DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/tests/plugin")

# Tests DSP sans JUCE
file(GLOB_RECURSE DspTestFiles CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/tests/dsp/*.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/tests/dsp/*.h")
add_executable(DspTests ${DspTestFiles})
target_link_libraries(DspTests PRIVATE dsp Catch2::Catch2WithMain)
catch_discover_tests(DspTests)
```

Catch2 et `catch_discover_tests` sont disponibles parce que `CI/Tests.cmake:2-31` s'exécute à l'inclusion de `PamplejuceFunctions`. Déplacer `PJ/tests/Catch2Main.cpp` et `PJ/tests/helpers/` dans `tests/plugin/` (le `main` y crée le `ScopedJuceInitialiser_GUI`). `tests/golden/` et `tests/plugin/states/` ne contiennent ni `.cpp` ni `.h` et ne sont donc pas compilés.

### Étape 6 : benchmarks

Garder `pamplejuce_add_benchmarks()` pour le coût du processeur complet (avec JUCE), et ajouter si besoin une cible `DspBenchmarks` sur le modèle de `DspTests` (Catch2 v3 fournit `BENCHMARK` via `catch2/benchmark/catch_benchmark.hpp`). Chaque nouveau fichier de benchmark JUCE doit être inclus dans `benchmarks/Catch2Main.cpp` (piège 3). Les benchmarks sont enregistrés dans ctest (`CI/Benchmarks.cmake:35`), donc ils tournent dans l'étape "Test & Benchmarks" de la CI. Aucun mécanisme de budget : la comparaison à `benchmarks/budget.json` est à écrire (dans `tools bench`, pas dans Catch2).

### Étape 7 : la cible `tools`

Même montage que `Tests` (exécutable simple qui lie `SharedCode`), derrière l'option prévue dans `docs/04_TESTS.md` :

```cmake
option(MYPLUGIN_BUILD_TOOLS "Build the headless tools binary" OFF)
if (MYPLUGIN_BUILD_TOOLS)
    file(GLOB_RECURSE ToolFiles CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/tools/*.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/tools/*.h")
    add_executable(MyPluginTools ${ToolFiles})
    target_compile_definitions(MyPluginTools PRIVATE $<TARGET_PROPERTY:${PROJECT_NAME},COMPILE_DEFINITIONS>)
    target_link_libraries(MyPluginTools PRIVATE SharedCode)
endif ()
```

La copie des définitions de compilation est celle de `CI/Tests.cmake:72` : sans elle, les macros `JucePlugin_*` manquent. Pour `tools snapshot`, le `main` doit créer un `juce::ScopedJuceInitialiser_GUI` comme `PJ/tests/Catch2Main.cpp:12`, et la capture se fait comme dans le commentaire de `PJ/tests/helpers/test_helpers.h:10-19` (`createComponentSnapshot`).

### Étape 8 : brancher RealtimeSanitizer

Ajouter `include(Sanitizers)` juste après `include(PamplejuceLog)` (`PJ/CMakeLists.txt:49`). Il doit venir après `project()`, sinon le module s'arrête en erreur (`CI/Sanitizers.cmake:10-15`). Ensuite `-DWITH_REALTIME_SANITIZER=ON` ajoute `-fsanitize=realtime` à la compilation et à l'édition de liens (`:38-41`) et exige Clang 20 ou plus ; AppleClang ne le supporte pas (`:34-37`, `:56`).

Deux façons de marquer le code temps réel :

* `[[clang::nonblocking]]` sur les `process` de `dsp/` (notre règle `realtime-audio.md`). Clang analyse aussi ces fonctions à la compilation et signale les appels non marqués : à vérifier avec `COMPILE_WARNING_AS_ERROR` sur `dsp`.
* Dans les tests du processeur, sans toucher la signature JUCE : entourer l'appel de `processBlock` par un `__rtsan::ScopedSanitizeRealtime` (header `<sanitizer/rtsan_interface.h>`, protégé par `#if __has_feature(realtime_sanitizer)`).

### Étape 9 : IPP

Sans besoin identifié, retirer IPP : `PJ/CMakeLists.txt:165-166`, `build_and_test.yml:21, 66-68` (dépôt Intel), `intel-oneapi-ipp-devel` dans `:70`, `:73-76`, et `PJ/tests/PluginBasics.cpp:29-41`. Moins de dépendances, moins de pannes CI (piège 5).

### Étape 10 : inspecteur en Debug seulement

Garder le lien (`PJ/CMakeLists.txt:66-67, 152`) mais entourer le membre `inspector`, le bouton et le `#include` de l'éditeur par `#if JUCE_DEBUG`. Ainsi le plugin livré n'embarque ni le bouton ni la fenêtre.

### Étape 11 : patchs JUCE

Pamplejuce n'a aucun mécanisme de patch. Pour `patches/` (`.claude/rules/build.md`), le plus simple : une étape CI `git -C JUCE apply ../patches/*.patch` juste après "Checkout code" (`build_and_test.yml:86-89`), et le même script en local. Le faire dans CMake (`execute_process`) rendrait le configure non idempotent.

### Étape 12 : dossier de build

Soit on garde `Builds` (CI, `installer.iss`, `.gitignore:14-15`, CLAUDE.md du template), soit on passe à `build` et on modifie `build_and_test.yml:16`, `installer.iss:38-40`, `.gitignore`. Recommandation : garder `Builds` et corriger nos docs, c'est trois fichiers de moins à maintenir contre le template.

## 3. La CI (`.github/workflows/build_and_test.yml`)

Déclencheurs : `push`, `pull_request`, `workflow_dispatch`, `workflow_call` (`:3-7`). Le job ne s'exécute sur `pull_request` que pour les PR venant d'un fork (`:32`) ; les PR internes sont couvertes par le `push` de la branche. `concurrency` annule le build précédent de la même ref (`:10-12`). Variables : `BUILD_TYPE: Release`, `BUILD_DIR: Builds`, `DISPLAY: :0` pour pluginval sous Linux (`:14-21`).

### Matrice (`:38-50`)

| Nom | Runner | Compilateur | Options |
| --- | --- | --- | --- |
| Linux | `ubuntu-22.04` | Clang (`egor-tensin/setup-clang@v2`), lld | `-G Ninja`, lld |
| macOS | `macos-14` | AppleClang | `-G Ninja -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"` |
| Windows | `windows-latest` | **clang-cl**, pas `cl.exe` | `-G Ninja` |

### Étapes, dans l'ordre

| Lignes | Étape | OS | Secrets | Sans certificats |
| --- | --- | --- | --- | --- |
| 54 | `ilammy/msvc-dev-cmd@v1` | tous (utile sous Windows) | non | garder |
| 57-59 | Set up Clang | Linux | non | garder |
| 62-71 | Dépendances JUCE Linux, dépôt Intel, IPP, lancement de Xvfb | Linux | non | garder, retirer IPP |
| 73-76 | IPP via nuget | Windows | non | retirer si pas d'IPP |
| 78-84 | Ninja (choco), Ninja + osxutils (brew) | Win, mac | non | garder |
| 86-89 | Checkout avec `submodules: recursive` | tous | non | garder |
| 91-92 | sccache | tous | non | garder |
| 94-98 | Configure, Build (Release) | tous | non | garder |
| 100-102 | `ctest --verbose --output-on-failure` (tests **et** benchmarks) | tous | non | garder |
| 104-118 | Lecture du `.env` écrit par CMake, chemins des artefacts | tous | non | garder |
| 120-124 | **pluginval** | tous | non | garder |
| 126-134 | Import des certificats (`sudara/basic-macos-keychain-action@v1`) | macOS | `DEV_ID_APP_CERT`, `DEV_ID_APP_PASSWORD`, `DEV_ID_INSTALLER_CERT`, `DEV_ID_INSTALLER_PASSWORD` | **commenter** |
| 136-144 | codesign VST3, AU, CLAP, Standalone (`--options=runtime --timestamp`) | macOS | `DEVELOPER_ID_APPLICATION` | **commenter** |
| 146-163 | Icônes personnalisées (sips, DeRez, Rez, SetFile) | macOS | non | facultatif |
| 165-183 | pkgbuild, productbuild `--sign`, `notarytool`, `stapler` | macOS | `DEVELOPER_ID_INSTALLER`, `NOTARIZATION_USERNAME`, `NOTARIZATION_PASSWORD`, `TEAM_ID` | **commenter** (ou garder `pkgbuild` et retirer `--sign` et la notarisation) |
| 185-188 | Zip des artefacts (exclut la lib `SharedCode`) | Linux | non | garder |
| 190-194 | Installeur Inno Setup (`iscc packaging\installer.iss`) | Windows | non | garder |
| 196-220 | Signature Azure Trusted Signing (`azure/artifact-signing-action@v2`, fichiers `.exe`) | Windows | six secrets `AZURE_*` | **commenter** |
| 222-241 | Upload `.exe`, `.zip`, `.pkg` (`actions/upload-artifact@v7`) | par OS | non | garder ; sur macOS sans `.pkg`, zipper le dossier d'artefacts comme sous Linux |
| 243-261 | Job `release` sur tag `v*` : télécharge les artefacts, `softprops/action-gh-release@v3` en **prerelease** | Linux | `GITHUB_TOKEN` implicite | garder ; passer `prerelease: false` quand on publie vraiment |

Plutôt que commenter, une variante qui évite d'éditer le workflow le jour où les certificats arrivent : exposer `HAS_MAC_SIGNING: ${{ secrets.DEV_ID_APP_CERT != '' }}` dans `env` du job, puis `if: runner.os == 'macOS' && env.HAS_MAC_SIGNING == 'true'` sur les étapes 126 à 183 (les secrets ne sont pas lisibles directement dans `if`). Même chose pour Azure.

### pluginval

```yaml
curl -LO "https://github.com/Tracktion/pluginval/releases/download/v1.0.4/pluginval_${{ runner.os }}.zip"
7z x pluginval_${{ runner.os }}.zip
${{ matrix.pluginval-binary }} --strictness-level 10 --verbose --validate "${{ env.VST3_PATH }}"
```

(`:120-124`). Version figée 1.0.4, strictness 10, VST3 seulement, sur le build Release, avant toute signature. Le CLAP n'est pas validé. Sous Linux, pluginval a besoin de l'écran virtuel Xvfb lancé à `:71`. Ajout utile : `--output-dir pluginval-logs` puis un upload `if: failure()` pour garder le journal.

### Jobs à ajouter

Tous dans le même fichier, en parallèle du job de build.

**`dsp-guard`** (quelques secondes, Linux) : `! grep -rn "juce" source/dsp/` et `clang-format --dry-run --Werror` sur `source/ tests/ tools/`. Pamplejuce n'a aucune vérification clang-format en CI.

**`rtsan`** (Linux) :

```yaml
  rtsan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
        with: { submodules: recursive }
      - name: Install clang 20 and JUCE deps
        run: |
          wget https://apt.llvm.org/llvm.sh && chmod +x llvm.sh && sudo ./llvm.sh 20
          sudo apt-get update && sudo apt-get install -y ninja-build libasound2-dev libx11-dev libxi-dev libxinerama-dev libxext-dev libfreetype6-dev libglu1-mesa-dev xvfb
          sudo /usr/bin/Xvfb :0 &
      - name: Configure
        run: cmake -B Builds-rtsan -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_C_COMPILER=clang-20 -DCMAKE_CXX_COMPILER=clang++-20 -DWITH_REALTIME_SANITIZER=ON
      - name: Build tests only
        run: cmake --build Builds-rtsan --target DspTests PluginTests
      - name: Run
        env: { DISPLAY: ":0" }
        run: ./Builds-rtsan/DspTests && ./Builds-rtsan/PluginTests
```

On lance les deux exécutables directement plutôt que `ctest` : la cible `Benchmarks` n'étant pas construite, ctest signalerait ses tests comme non construits. On ne construit que les tests : inutile de compiler les formats ni de lancer pluginval sous sanitizer. RTSan arrête le programme à la première violation par défaut, ce qui fait échouer ctest. Ne jamais activer `PERFETTO` dans ce job (voir la fiche melatonin_perfetto).

**`audio-regression`** (Linux seulement) : configure en Release avec `-DMYPLUGIN_BUILD_TOOLS=ON`, `cmake --build Builds --target MyPluginTools`, puis `MyPluginTools check`, `MyPluginTools render --preset all --out Builds/renders`, `MyPluginTools compare Builds/renders tests/golden`. En cas d'échec, `upload-artifact` de `Builds/renders` (`if: failure()`) pour que l'humain écoute. Un seul OS parce que le fast math et les compilateurs différents donnent des écarts entre plateformes ; les références sont donc produites par ce job (artefact téléchargé), écoutées, puis commitées en `golden: <raison>`.

**Cohérence version / tag** : dans le job `release` (`:243`), vérifier que `${GITHUB_REF_NAME#v}` est égal au contenu de `VERSION` avant de publier (`.claude/rules/build.md`).

**Budget de benchmarks** : à faire dans `tools bench` (sortie non nulle au dessus du budget), appelé par le job `audio-regression`.

## 4. `tests/` et `benchmarks/`

Contenu fourni :

* `PJ/tests/Catch2Main.cpp` : `main` maison qui crée `juce::ScopedJuceInitialiser_GUI` pendant toute la session Catch2 (`:12`), d'où le lien sur `Catch2::Catch2` et non `Catch2WithMain`. Nécessaire pour l'APVTS, `juce::Graphics`, `Timer`.
* `PJ/tests/PluginBasics.cpp` : un test factice, un test qui instancie `PluginProcessor` et vérifie `getName()` et un nom de programme non vide (`:11-26`, ce dernier évite un échec du validateur VST3 de Steinberg), un test de version IPP (`:29-41`).
* `PJ/tests/helpers/test_helpers.h` : `runWithinPluginEditor` crée l'éditeur, exécute un lambda, le détruit (`:22-31`). Le commentaire `:10-19` montre la capture d'écran de l'éditeur en JPEG.
* `PJ/benchmarks/Benchmarks.cpp` : coût du constructeur, du destructeur, et de l'ouverture/fermeture de l'éditeur (`BENCHMARK_ADVANCED`). **Aucun benchmark de `processBlock`**.

Découverte des tests : `catch_discover_tests(... DISCOVERY_MODE PRE_TEST)` (`CI/Tests.cmake:93`), donc chaque `TEST_CASE` est un test ctest. `CI=1` est défini en CI (`:87-89`) pour sauter ce qui ne doit pas tourner sur un runner.

Tester le processeur : rien n'est fourni au delà de l'instanciation. Le schéma, à écrire nous mêmes dans `tests/plugin/` :

```cpp
TEST_CASE ("latence rapportée = latence mesurée", "[plugin][latency]")
{
    PluginProcessor p;
    p.setPlayConfigDetails (2, 2, 48000.0, 512);
    p.prepareToPlay (48000.0, 512);

    juce::AudioBuffer<float> buffer (2, 512);
    juce::MidiBuffer midi;
    buffer.clear();
    buffer.setSample (0, 0, 1.0f); buffer.setSample (1, 0, 1.0f);   // impulsion
    p.processBlock (buffer, midi);
    // position du pic sur le canal 0 comparée à p.getLatencySamples(), tolérance 0 échantillon
}
```

Même schéma pour le round trip d'état (`getStateInformation` dans un `juce::MemoryBlock`, `setStateInformation` sur une seconde instance, comparaison des paramètres) et le chargement des fichiers de `tests/plugin/states/`.

## 5. `CLAUDE.md` et `AGENTS.md`

`AGENTS.md` est un **lien symbolique** vers `CLAUDE.md` (`ls -la` du dépôt). Sous Windows, si `core.symlinks` est à `false` (valeur par défaut de Git for Windows), le fichier devient un texte d'une ligne contenant `CLAUDE.md`.

Contenu de `PJ/CLAUDE.md` (158 lignes) :

| Section | Lignes | Ce qu'elle dit | Où ça va chez nous |
| --- | --- | --- | --- |
| First-Time Setup | 5-29 | Sept questions (nom, société, type, IDE, CI, IPP, signature macOS et Windows), puis édition de `CMakeLists.txt`, du workflow, et suppression de la section | Une tâche de phase 0, `docs/tasks/0001-init-depuis-pamplejuce.md`, qui reprend les questions et ce guide ; pas dans le routeur |
| About This Project | 31-35 | Présentation du template | Supprimer |
| Build Commands | 37-61 | Configure Debug dans `Builds`, build, `ctest`, `./Builds/Tests "[tag]"`, `./Builds/Benchmarks` | `.claude/rules/workflow.md` (commandes de vérification), aligné sur le nom du dossier choisi (étape 12) |
| Project Structure | 63-72 | Rôle de chaque dossier | `docs/CODEMAP.md` |
| Architecture | 74-92 | `SharedCode`, fonctions `pamplejuce_*`, `include(Tests)` devenu sans effet | `.claude/rules/build.md`, une ligne par fait |
| Key Configuration | 94-104 | Où changer noms, codes, formats, version | Tâche 0001 |
| Code Quality | 106-110 | Warnings traités comme erreurs ; les erreurs clangd sur les modules JUCE sont souvent fausses | Le premier point existe déjà (`cpp.md`) ; ajouter le second à `.claude/rules/juce.md` |
| Includes | 112-114 | Les modules JUCE incluent déjà la STL | Inutile, et faux pour `dsp/` qui n'inclut pas JUCE |
| Threading Model, Realtime Safety | 116-134 | Thread audio et thread message, pas d'allocation ni de lock | Déjà couvert, plus strictement, par `.claude/rules/realtime-audio.md` ; ne pas dupliquer |
| Adding Dependencies | 136-154 | Modules JUCE en sous module liés à `SharedCode` en `INTERFACE` ; bibliothèques non JUCE via `CPMAddPackage` | Mécanique dans `.claude/rules/build.md` ; le choix reste régi par `docs/07_A_REPRENDRE.md` |
| Code Style | 156-158 | `.clang-format` Allman, 4 espaces, sans limite de colonnes | `cpp.md` cite déjà le clang-format du repo |

Fusion recommandée : notre `CLAUDE.md` routeur **remplace** celui du template, `AGENTS.md` reste un lien vers lui (pour que les autres agents lisent le même routeur), et chaque fait utile du template est déplacé dans la règle correspondante, conformément à la consigne "le routeur ne contient aucune règle".

Une divergence à arbitrer : le template conseille de développer en Debug (`PJ/CLAUDE.md:21`), nos commandes de `docs/02_TOOLCHAIN.md` configurent en Release. Les deux ont un rôle : Debug pour les assertions JUCE pendant la boucle TDD, Release pour pluginval et `tools bench`.

## Écarts avec nos documents

* `docs/04_TESTS.md:74` et `.claude/rules/build.md:8` présentent la CI "à partir de Pamplejuce" avec `tools check`, `tools compare`, benchmarks avec budget et clang-format. Pamplejuce ne fournit que build, `ctest` et pluginval : le reste est à ajouter (section 3).
* `docs/02_TOOLCHAIN.md` prévoit MSVC (Visual Studio) en local ; la CI Windows de Pamplejuce compile avec **clang-cl**. Les warnings et certains bugs diffèrent. Soit ajouter une entrée MSVC à la matrice, soit utiliser clang-cl en local (composant "C++ Clang tools" de Visual Studio).
* `docs/02_TOOLCHAIN.md:61` et `docs/07_A_REPRENDRE.md:20` disent "Pamplejuce, MIT" : vrai pour le dépôt principal, mais le sous module `cmake/` n'a pas de licence (piège 10).
* `docs/02_TOOLCHAIN.md:47` décide `VST3 Standalone` (+ AU) ; le template construit aussi AUv3 et CLAP par défaut.
* Nos docs utilisent le dossier `build`, le template `Builds` (étape 12).
* `docs/04_TESTS.md:27` propose melatonin_audio_sparklines pour les échecs des tests DSP : le module dépend de `juce_dsp`, donc incompatible avec des tests DSP sans JUCE (détail dans `melatonin-et-clap.md`).
* `docs/07_A_REPRENDRE.md:78` dit que RTSan est "à mettre dans un job CI" : l'option CMake existe déjà dans cmake-includes, il ne manque que `include(Sanitizers)` et le job.

## Liens

* Template : https://github.com/sudara/pamplejuce
* CMake : https://github.com/sudara/cmake-includes (CHANGELOG à lire avant chaque mise à jour du sous module)
* Documentation : https://melatonin.dev/manuals/pamplejuce/
* Signature macOS : https://melatonin.dev/blog/how-to-code-sign-and-notarize-macos-audio-plugins-in-ci/
* Signature Windows : https://melatonin.dev/blog/code-signing-on-windows-with-azure-trusted-signing/
* RealtimeSanitizer : https://clang.llvm.org/docs/RealtimeSanitizer.html
