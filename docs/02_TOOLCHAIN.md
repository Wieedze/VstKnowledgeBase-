# Toolchain

## Versions

| Outil | Version | Note |
| --- | --- | --- |
| JUCE | 9.x, épinglé sur un tag (ex. `9.0.4`) | Sous module git. Pamplejuce suit `develop` ; on épingle un tag avant la première release |
| C++ | C++23 | C++20 minimum |
| CMake | ≥ 3.25 | |
| Générateur | Ninja | Visual Studio ou Xcode seulement pour déboguer dans l'IDE |
| Dépendances | CPM | Catch2 et modules tiers |
| Tests | Catch2 v3 | |
| Validation | pluginval 1.x | Strictness 10 |
| Format | clang-format | Fichier fourni par Pamplejuce |
| Analyse | clang-tidy | Optionnel au début, obligatoire en CI à partir de la phase 2 |

## Poste de dev : Windows natif et WSL2

Un VST3 compilé sous Linux (WSL2) ne se charge pas dans un DAW Windows. Il faut donc deux chemins.

| Besoin | Où | Comment |
| --- | --- | --- |
| Tester dans Ableton / le DAW | Windows natif | Visual Studio 2022 ou 2026, workload "Desktop development with C++", depuis "x64 Native Tools Command Prompt" |
| Tests DSP rapides, boucle TDD de l'agent | WSL2 ou Windows | La cible `Tests` ne dépend pas du DAW |
| CI | GitHub Actions | Linux, Windows, macOS |

Commandes de base (Windows, prompt x64) :

```
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
ctest --test-dir build --output-on-failure
```

Pièges connus, relevés dans les README de Drum Foundry et TetraDrive :

* Utiliser le prompt **x64**, pas x86, sinon le plugin ne se charge pas.
* Garder le repo dans un chemin court (`C:\dev\monplugin`) : la limite de 260 caractères de Windows casse le build.
* Copier le dossier `.vst3` dans `C:\Program Files\Common Files\VST3` demande les droits admin. Option : `COPY_PLUGIN_AFTER_BUILD` depuis un prompt admin.
* Dans Ableton : Préférences, Plug-ins, activer "Use VST3 Plug-in System Folders" puis Rescan.

## JUCE : réglages à décider au démarrage

| Réglage | Décision | Pourquoi |
| --- | --- | --- |
| `PLUGIN_MANUFACTURER_CODE`, `PLUGIN_CODE` | 4 caractères uniques, fixés une fois pour toutes | Les changer casse les sessions |
| `FORMATS` | `VST3` uniquement (ADR 0003) | Ni AU, ni AUv3, ni CLAP, ni Standalone. Pour déboguer hors DAW : l'AudioPluginHost de JUCE (`extras/AudioPluginHost`) charge le VST3 |
| `IS_SYNTH`, `NEEDS_MIDI_INPUT` | Selon instrument ou effet | |
| Automation sample accurate | Évaluer le patch de TetraDrive (`patches/juce-vst3-sample-accurate.patch`) | Le wrapper VST3 de JUCE ne passe que la dernière valeur par bloc |
| `JUCE_DISPLAY_SPLASH_SCREEN` | Selon la licence | Lié à la licence JUCE |

## Licences

| Composant | Licence | Conséquence |
| --- | --- | --- |
| JUCE | AGPL v3 ou commerciale | Plugin fermé et vendu = licence commerciale JUCE |
| SDK VST3 | MIT | Pas de contrainte particulière |
| Drum Foundry, TetraDrive | AGPL v3 | Lire et s'inspirer ; copier = publier le plugin en AGPL |
| Surge, Vital, Dexed… | GPL v3 | Idem |
| chowdsp_utils | BSD | Réutilisable avec attribution |
| Pamplejuce | MIT | Base libre |

Décision à prendre et à tracer en ADR au démarrage de chaque plugin : open source (AGPL) ou commercial. Elle conditionne ce qu'on a le droit de copier.
