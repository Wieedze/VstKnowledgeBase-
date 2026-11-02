# Surge XT et les bibliothèques sst

**Verdict : les bibliothèques DSP de Surge (sst-basic-blocks, sst-filters, sst-waveshapers, sst-effects) sont GPL v3, header only, sans JUCE et branchables telles quelles dans `dsp/` si le plugin est AGPL ; en contexte commercial il ne reste que sst-cpputils (MIT), sst-plugininfra (MIT, sauf son `patch_base.h` qui tire du GPL), sst-jucegui (MIT, UI) et trois fichiers double licence de sst-basic-blocks, dont deux exigent un petit nettoyage d'include.**

Étude faite le 2026-11-02 sur des clones shallow de la branche par défaut. Les chemins `fichier:ligne` sont relatifs à la racine de chaque dépôt et valent pour les commits ci dessous.

| Dépôt | Commit | Date |
| --- | --- | --- |
| [surge](https://github.com/surge-synthesizer/surge/tree/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14) | `0852de8` (tag `Nightly`) | 2026-10-31 |
| [sst-basic-blocks](https://github.com/surge-synthesizer/sst-basic-blocks/tree/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d) | `38cf04a` | 2026-10-25 |
| [sst-filters](https://github.com/surge-synthesizer/sst-filters/tree/87a171bcba52c014850848a29174a54f0adc6606) | `87a171b` | 2026-10-13 |
| [sst-waveshapers](https://github.com/surge-synthesizer/sst-waveshapers/tree/dd12f31a5a9016c9895e52d1a00eee0e1eebe6ce) | `dd12f31` | 2026-02-25 |
| [sst-effects](https://github.com/surge-synthesizer/sst-effects/tree/987b39dcb2e2e61e6225c3bc390fd00da824d226) | `987b39d` | 2026-10-16 |
| [sst-cpputils](https://github.com/surge-synthesizer/sst-cpputils/tree/67601c8d3cc7405569229b9618da55b6420633d7) | `67601c8` | 2026-06-20 |
| [sst-plugininfra](https://github.com/surge-synthesizer/sst-plugininfra/tree/8e4271ce94039652c1cad3d89444c92325e0ce3e) | `8e4271c` | 2026-09-15 |
| [sst-jucegui](https://github.com/surge-synthesizer/sst-jucegui/tree/22a89ca4e54179cbda0b8164e54e06dae5f30490) | `22a89ca` | 2026-10-14 |

Aucune bibliothèque sst n'a de tag de version : on épingle un commit (règle `build.md`). Toutes exigent C++20 (`static_assert(__cplusplus >= 202002L)` dans `sst-filters/include/sst/filters.h:18`) et compilent donc en C++23.

## 1. Les bibliothèques sst

| Nom | Licence vérifiée | Contenu | Sans JUCE | Dernier commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| sst-basic-blocks | GPL v3 (`LICENSE.md`, en tête de chaque fichier). Trois fichiers double licence MIT/GPL3 | Lags et lissages, one poles, DC blocker, clippers, interpolateurs, bruit rose et corrélé, RNG, panoramiques, Hilbert, rééchantillonneur Lanczos, oscillateurs BLEP elliptiques et DPW, enveloppes (ADSR, AHDSR, DAHD...), LFO, matrice de modulation, métadonnées de paramètre, tables (dB, 2^x, sinus, tempo sync), opérations SIMD | Oui | 2026-10-25 | À brancher si AGPL. Si commercial : les 3 fichiers MIT seulement |
| sst-filters | GPL v3 (`LICENSE.md`, `README.md:59`, en têtes) | 41 types de filtres SIMD 4 voix (section 1.2), Biquad, Butterworth, Linkwitz Riley, demi bande, tilt | Oui | 2026-10-13 | À brancher si AGPL |
| sst-waveshapers | GPL v3 (`LICENSE.md`, en têtes) | 44 waveshapers SIMD : saturateurs, Chebyshev, redresseurs, wavefolders, fuzz, harmoniques additives, ZamSat, OJD | Oui | 2026-02-25 | À brancher si AGPL |
| sst-effects | GPL v3 (`LICENSE.md`, en têtes) | 11 effets de bus (réverbes 1 et 2, délai, Nimbus, Bonsai, phaser, flanger, chorus, rotary, TreeMonster, FloatyDelay) et une soixantaine d'effets de voix (EQ, compresseur, modulations, générateurs) | Oui | 2026-10-16 | À brancher si AGPL, via une config à écrire |
| sst-cpputils | MIT (`LICENSE.md`, en têtes) | Ring buffer lock free, allocateur fixe, hash map de taille fixe, LRU, scope guard, `dyn_array`, macros RTSan | Oui | 2026-06-20 | À brancher dans tous les cas |
| sst-plugininfra | MIT (`LICENSE_MIT.md`), tinyxml et strnatcmp en zlib, ASIO SDK double licence Steinberg/GPL3 | Chemins utilisateur par OS, préférences utilisateur, raccourcis clavier, détection CPU, version git, `patch_base.h` (patch générique avec migration) | Oui | 2026-09-15 | Pièces utiles si commercial, mais `patch_base.h` tire du GPL |
| sst-jucegui | MIT (`LICENSE.md`, en têtes) | 45 composants (Knob, sliders, VU, menus, onglets...), feuille de style, layout JSON, modèle de données `Continuous`/`Discrete` | Non (juce_gui_basics) | 2026-10-14 | Option pour `ui/` dans tous les cas, à évaluer sur JUCE 9 |

### 1.1 sst-basic-blocks

1. **Licence.** GPL v3. Le `README.md:10-17` liste trois fichiers utilisables aussi sous MIT, et chacun le dit dans son en tête : [`include/sst/basic-blocks/dsp/LanczosResampler.h:29-34`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/dsp/LanczosResampler.h#L29-L34), [`HilbertTransform.h:31`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/dsp/HilbertTransform.h#L31), [`EllipticBlepOscillators.h:31-34`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/dsp/EllipticBlepOscillators.h#L31-L34). Une recherche sur tout `include/` ne trouve aucun autre fichier double licence ; la phrase "A very small number of explicitly chosen header files..." présente dans tous les en têtes est du texte générique, pas une double licence.
2. **Piège sur les trois fichiers MIT.** Ils incluent des en têtes GPL :
   1. `LanczosResampler.h:53-54` inclut `simd/setup.h` et `mechanics/simd-ops.h` (GPL). Le fichier lui même dit de retirer l'include et de remplacer l'appel `sum_ps_to_float` par une réduction SSE3 maison.
   2. `HilbertTransform.h:62` inclut `simd/setup.h` (GPL). La version mono flottante `HilbertTransformMonoFloat` (ligne 66) n'a pas besoin du SIMD ; seule `HilbertTransformStereoSSE` (ligne 168) en a besoin.
   3. `EllipticBlepOscillators.h:37-38` inclut `elliptic-blep` de Signalsmith (MIT, `libs/elliptic-blep/LICENSE`) et `SmoothingStrategies.h` (GPL, qui inclut `Lag.h` et `BlockInterpolators.h`, GPL aussi). En commercial il faut fournir notre propre stratégie de lissage au paramètre de template `SmoothingStrategy` (ligne 72) et ne pas inclure `SmoothingStrategies.h`.
3. **Contenu notable.**
   1. Matrice de modulation générique [`mod-matrix/ModMatrix.h`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/mod-matrix/ModMatrix.h) : `FixedMatrix` (ligne 238), taille fixée à la compilation, routes `source * sourceVia * depth`, lag par route, courbes, `prepare` (ligne 303) qui lie des pointeurs, `process` (ligne 428) qui ne fait que lire des pointeurs. Utilisée par Six Sines et Shortcircuit XT. 11 tests (`tests/mod_matrix_tests.cpp`).
   2. Métadonnées de paramètre [`params/ParamMetadata.h:105`](https://github.com/surge-synthesizer/sst-basic-blocks/blob/38cf04ae6a16994cc6c82635ce7c206f2a0ca31d/include/sst/basic-blocks/params/ParamMetadata.h#L105) (2383 lignes) : plage, défaut, unités, `valueToString`/`valueFromString` (lignes 420, 432), constructeurs fluides `asPercent()`, `asDecibelWithRange()`, `asAudibleFrequency()`... 26 tests.
   3. Modulateurs templatés sur la taille de bloc : `modulators/SimpleLFO.h:42`, `modulators/ADSREnvelope.h:50`, `DAHDSREnvelope.h`, `StepLFO.h`.
   4. Lissage : `dsp/Lag.h` (`OnePoleLag` ligne 42, `LinearLag` ligne 111).
4. **Intégration CMake.** Cible `INTERFACE` (`CMakeLists.txt:7-9`) ; elle tire `sst-cpputils` si présent (`:117`) et `simde` sur ARM. Un `CPMAddPackage("gh:surge-synthesizer/sst-basic-blocks#38cf04a")` puis `target_link_libraries(dsp PUBLIC sst-basic-blocks)` suffit.
5. **Qualité.** 12 fichiers de test Catch2 (une centaine de `TEST_CASE`, dont 32 DSP), CI GitHub (`build-tests.yml`, `code-checks.yml`).

### 1.2 sst-filters

1. **Licence.** GPL v3 partout, y compris `filters++/` (en tête "released under the Gnu General Public Licens version 3", par exemple `include/sst/filters++/api.h:8`).
2. **Contenu.** Énumération [`include/sst/filters/FilterConfiguration.h:25-66`](https://github.com/surge-synthesizer/sst-filters/blob/87a171bcba52c014850848a29174a54f0adc6606/include/sst/filters/FilterConfiguration.h#L25-L66) :
   1. Passe bas : 12 et 24 dB, ladder héritée, Vintage Ladder (Huovilainen, RK), OB-Xd 12 et 24 dB, K35, Diode Ladder, Cutoff Warp, Resonance Warp, Cascade SVF.
   2. Passe haut, passe bande, coupe bande : 12 et 24 dB, K35, OB-Xd, Cutoff Warp, Resonance Warp, Cascade SVF.
   3. Multi : Tri pole, Cytomic SVF, OB-Xd Xpander.
   4. Effets : comb + et comb −, allpass, Cascade SVF peak et allpass, sample and hold.
   5. Hors énumération : `BiquadFilter.h`, `ButterworthLPHP.h`, `LinkwitzRiley.h` (crossovers), `HalfRateFilter.h` (demi bande polyphase pour l'oversampling 2x), `CytomicTilt.h`, `FastTiltNoiseFilter.h`, et `CytomicSVF.h` utilisable seul en mono.
3. **Deux API.** L'ancienne `QuadFilterUnit` (4 voix en SSE, coefficients calculés par `FilterCoefficientMaker`) et la nouvelle `filters++` ([`include/sst/filters++/api.h:83`](https://github.com/surge-synthesizer/sst-filters/blob/87a171bcba52c014850848a29174a54f0adc6606/include/sst/filters++/api.h#L83)) : `setFilterModel`, `setPassband`, `setSlope`, `setDriveMode`, et mémoire des lignes de délai fournie par l'appelant (`requiredDelayLinesSizes` ligne 116, `provideDelayLine` ligne 125). Ce dernier point colle à notre règle : on alloue dans `prepare`, le filtre ne fait que l'utiliser.
4. **Intégration.** Cible `INTERFACE` header only, dépend obligatoirement de sst-basic-blocks (`CMakeLists.txt:58-61`, erreur fatale sinon). Cible `sst-filters-extras` pour `FilterPlotter.h` (tracé de réponse hors temps réel).
5. **Qualité.** 17 fichiers de test, CI Linux, macOS, Windows (`.github/workflows/build-pr.yml:16-48`).

### 1.3 sst-waveshapers

1. **Licence.** GPL v3. Les en têtes `include/sst/waveshapers.h:8` et `utilities/globals.h:8` disent par erreur "sst-jucegui is released under the GNU General Public License 3", ce qui reste du GPL.
2. **Contenu.** [`include/sst/waveshapers/WaveshaperConfiguration.h:27-85`](https://github.com/surge-synthesizer/sst-waveshapers/blob/dd12f31a5a9016c9895e52d1a00eee0e1eebe6ce/include/sst/waveshapers/WaveshaperConfiguration.h#L27-L85) : soft, hard, asym, sine, digital, Chebyshev 2 à 5, redresseurs, single/dual/west fold, additifs, cinq fuzz, sinus+x, cycles bornés, ZamSat, OJD, soft fold, linear fold, sine fold. Traitement 4 canaux en SSE (`QuadWaveshaper.h`), tables statiques (`WaveshaperLUT.h:126`).
3. **Pas d'oversampling inclus.** À combiner avec `HalfRateFilter` de sst-filters ou `juce::dsp::Oversampling`, conformément à `dsp.md`.
4. **Intégration.** `INTERFACE`, dépend de sst-basic-blocks (`CMakeLists.txt:47`).
5. **Qualité.** 9 fichiers de test dont `ShapesAreBounded.cpp`. Le moins actif (février 2026), ce qui reflète sa stabilité.

### 1.4 sst-effects

1. **Licence.** GPL v3. Les presets (`presets/voice-effects`) sont dans le même dépôt.
2. **Contenu.** Effets de bus dans [`include/sst/effects/`](https://github.com/surge-synthesizer/sst-effects/tree/987b39dcb2e2e61e6225c3bc390fd00da824d226/include/sst/effects) : `Reverb1.h`, `Reverb2.h`, `Delay.h`, `FloatyDelay.h`, `Nimbus.h` (granulaire Mutable Instruments, donc dépendance eurorack MIT), `Bonsai.h` (saturation à bande), `Phaser.h`, `Flanger.h`, `Chorus.h`, `RotarySpeaker.h`, `TreeMonster.h`. Effets de voix dans `include/sst/voice-effects/` : EQ graphique 6 bandes, EQ paramétrique N bandes, MorphEQ, TiltEQ, compresseur, autowah, bitcrusher, ring mod, frequency shifter, tremolo, Shepard phaser, résonateurs à cordes, widener, microgate...
3. **Architecture.** Chaque effet est un template sur un `FXConfig` qui fournit stockage des paramètres, taille de bloc, fréquence d'échantillonnage, conversions dB et ton ([`effects/EffectCore.h:26-60`](https://github.com/surge-synthesizer/sst-effects/blob/987b39dcb2e2e61e6225c3bc390fd00da824d226/include/sst/effects/EffectCore.h#L26-L60), concept `ValidEffectConfiguration` lignes 92-145). Les effets de voix exigent que la config fournisse aussi la mémoire (`preReservePool`, `checkoutBlock`, `returnBlock`, `voice-effects/VoiceEffectCore.h:80-82`). Chaque effet expose `remapParametersForStreamingVersion` (par exemple `Delay.h:455`) et un `streamingVersion` (`EffectCore.h:273`).
4. **Ce qu'il faut écrire chez nous.** Une `FXConfig` : la config d'exemple `effects/ConcreteConfig.h` n'est pas utilisable telle quelle, sa fonction `rand01` appelle `rand()` (ligne 85), ce que `dsp.md` interdit.
5. **Intégration.** `INTERFACE`, utilise sst-basic-blocks, sst-filters, sst-waveshapers. Option `SST_EFFECTS_PRESETS` qui ajoute une bibliothèque statique et tinyxml (`CMakeLists.txt:130-143`).
6. **Qualité.** Tests minces : 5 fichiers, dont `tests/concrete-runs.cpp:78-84` qui fait tourner chaque effet 1000 blocs et vérifie seulement `|x| < 2`. Les vrais tests de ces effets sont dans Surge (`UnitTestsFX.cpp`). Il faudra nos propres tests de sortie finie et d'indépendance à la taille de bloc.

### 1.5 sst-cpputils

1. **Licence.** MIT, vérifiée dans chaque en tête (17 fichiers sur 17).
2. **Contenu utile au temps réel.**
   1. [`ring_buffer.h:40,134`](https://github.com/surge-synthesizer/sst-cpputils/blob/67601c8d3cc7405569229b9618da55b6420633d7/include/sst/cpputils/ring_buffer.h#L40) : ring buffer SPSC à atomics, taille fixe en template.
   2. `fixed_allocater.h` : allocateur STL sur mémoire préallouée (le constructeur par défaut est supprimé pour forcer l'allocation ailleurs).
   3. `small_hash_map.h` : table de hachage de capacité fixe, sans allocation après construction (c'est elle que `ModMatrix` utilise).
   4. [`rtsan_support.h:20-27`](https://github.com/surge-synthesizer/sst-cpputils/blob/67601c8d3cc7405569229b9618da55b6420633d7/include/sst/cpputils/rtsan_support.h#L20-L27) : macros `SST_CPPUTILS_NONBLOCKING` (pose `[[clang::nonblocking]]`), `SST_CPPUTILS_RTSAN_DISABLE`/`ENABLE` (garde RAII), toutes neutres sans RTSan. Exactement ce que `realtime-audio.md` demande.
   5. `scope_guard.h`, `lru_cache.h`, `dyn_array.h`, `active_set_overlay.h` (ensemble actif sans allocation, utile pour les voix actives).
3. **Qualité.** 3 fichiers de test (157 `TEST_CASE`, surtout `scope_guard`), CI 3 OS.

### 1.6 sst-plugininfra

1. **Licence.** MIT ([`LICENSE.md`](https://github.com/surge-synthesizer/sst-plugininfra/blob/8e4271ce94039652c1cad3d89444c92325e0ce3e/LICENSE.md)), sauf `libs/tinyxml` et `libs/strnatcmp` (zlib). `libs/asiosdk` (non mentionné dans `LICENSE.md`) est l'ASIO SDK 2.3.4 sous double licence Steinberg propriétaire ou GPL3 (`libs/asiosdk/LICENSE.txt`) ; aucune cible CMake ne le lie, il ne sert qu'aux applications standalone.
2. **Contenu.** `paths.h` (dossiers documents et données par OS), `userdefaults.h`, `keybindings.h`, `cpufeatures.h`, `version_information.h` (version et hash git générés par CMake, `CMakeLists.txt:60-70`), et [`patch-support/patch_base.h`](https://github.com/surge-synthesizer/sst-plugininfra/blob/8e4271ce94039652c1cad3d89444c92325e0ce3e/include/sst/plugininfra/patch-support/patch_base.h).
3. **`patch_base.h` en détail.** Patch générique en CRTP. Un concept impose `patchVersion > 0`, un `id`, `migratePatchFromVersion(uint32_t)` et `migrateParamValueFromVersion(par, float, uint32_t)` (lignes 42-49). `toState` (ligne 168) écrit du XML `<patch id version><params><p id value/>`; `fromState` (ligne 211) vérifie l'`id`, lit la version, ignore les IDs inconnus ("vestigal param", ligne 62 du corps), applique la migration par paramètre (ligne 277) puis la migration globale (ligne 301). **Piège de licence** : ligne 27, il inclut `sst/basic-blocks/params/ParamMetadata.h`, qui est GPL. Le fichier est MIT mais inutilisable tel quel en commercial ; l'idée, elle, est reproductible.
4. **Intégration.** Cible statique `sst-plugininfra` (EXCLUDE_FROM_ALL) et cible `patchbase` optionnelle (`SST_PLUGININFRA_PROVIDE_PATCHBASE`, `CMakeLists.txt:53-57`) qui lie tinyxml, sst-basic-blocks et clap. 6 fichiers de test.

### 1.7 sst-jucegui

1. **Licence.** MIT (`LICENSE.md`, et en tête de chaque fichier : "you may use this in commercial software if you are a JUCE Licensee", par exemple `include/sst/jucegui/components/Knob.h:8-12`). Le seul fichier sans cet en tête est `md4c.h` (parseur Markdown, MIT).
2. **Contenu.** 45 composants dans `include/sst/jucegui/components/`, un modèle de données indépendant de l'APVTS ([`data/Continuous.h:34`](https://github.com/surge-synthesizer/sst-jucegui/blob/22a89ca4e54179cbda0b8164e54e06dae5f30490/include/sst/jucegui/data/Continuous.h#L34) : `getValue`, `setValueFromGUI`, `setValueFromModel`, `getValueAsString`...), une feuille de style hiérarchique (`style/StyleSheet.h`), un moteur de layout JSON (`layouts/JsonLayoutEngine.h`), des écrans modaux et un éditeur de raccourcis.
3. **Limites.** Aucun test (0 fichier), aucun adaptateur APVTS fourni (il faut écrire un `Continuous` qui enveloppe un `RangedAudioParameter`). Les exemples téléchargent JUCE 8.0.4 (`CMakeLists.txt:30`) : compatibilité JUCE 9 non vérifiée.

## 2. Surge XT

### 2.1 Architecture

1. **Moteur sans JUCE.** `src/common/` est la cible `surge-common` : `SurgeSynthesizer`, `SurgeStorage`, `SurgePatch`, `SurgeVoice`, oscillateurs, effets, modulateurs. Aucun `#include` JUCE dans `src/common` (vérifié par recherche) ; la cible lie une interface `surge-juce` qui ne porte que des `#define` (`src/CMakeLists.txt:86-110`). La CI compile ce moteur seul ("Windows MSVC surge-common only", `.github/workflows/build-pr.yml:16`).
2. **Couche JUCE mince.** `src/surge-xt/SurgeSynthProcessor.*` adapte le moteur : chaque `Parameter` Surge devient un `juce::RangedAudioParameter` via `SurgeParamToJuceParamAdapter` (`SurgeSynthProcessor.h:108`), et l'UI (`src/surge-xt/gui/`) parle au moteur directement.
3. **Bloc interne fixe.** `BLOCK_SIZE` est une constante de compilation, 32 par défaut ([`src/common/globals.h:45-57`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/globals.h#L45-L57), `src/CMakeLists.txt:17-18`), oscillateurs suréchantillonnés 2x. `processBlock` ([`SurgeSynthProcessor.cpp:566`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/surge-xt/SurgeSynthProcessor.cpp#L566)) consomme les échantillons de l'hôte un par un, appelle `surge->process()` tous les 32 échantillons (ligne 737) et lit la sortie avec un index circulaire `blockPos` (ligne 778). Même choix que Drum Foundry.
4. **JUCE forké.** Le sous module `libs/JUCE` pointe vers `github.com/surge-synthesizer/JUCE`, pas vers JUCE officiel.
5. **Formats.** VST3, AU, AUv3, LV2, Standalone, CLAP via clap-juce-extensions (`src/CMakeLists.txt:121-148`). C++20, CMake 3.22.

### 2.2 Modulation

1. **Sources.** Énumération `modsources` ([`src/common/ModulationSource.h:40-82`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/ModulationSource.h#L40)) : vélocité, keytrack, aftertouch poly et mono, pitch bend, molette, 8 macros, 2 enveloppes, 6 LFO de voix, 6 LFO de scène, timbre (MPE), vélocité de relâchement, aléatoires et alternés, souffle, expression, sustain, notes la plus basse, la plus haute, la dernière. Les LFO ont des formes MSEG et formule Lua (`dsp/modulators/`).
2. **Routage.** Une route est une simple structure `ModulationRouting { source_id, destination_id, depth, muted, source_index, source_scene }` ([`ModulationSource.h:273`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/ModulationSource.h#L273)) rangée dans trois `std::vector` : `modulation_voice`, `modulation_scene` (`SurgeStorage.h:892`) et `modulation_global` (`SurgeStorage.h:1388`).
3. **Application.** Par bloc de 32, chaque voix copie les valeurs de paramètres dans un tableau local (`memcpy(localcopy, paramptr, ...)`, `dsp/SurgeVoice.cpp:177`), puis `applyModulationToLocalcopy` ([`SurgeVoice.cpp:1271`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/dsp/SurgeVoice.cpp#L1271)) ajoute `depth * source->get_output() * (1 - muted)` à chaque destination (ligne 1286). Le DSP ne lit ensuite que `localcopy`. C'est le même principe que notre snapshot `Params`, appliqué par voix.
4. **Comment c'est rendu "temps réel" : par un mutex.** Le routage est protégé par un `std::recursive_mutex modRoutingMutex` (`SurgeStorage.h:1838`) que **`process()` verrouille sur le thread audio** ([`SurgeSynthesizer.cpp:5051`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/SurgeSynthesizer.cpp#L5051), puis 5117, 5189, 5199), et que l'UI verrouille dans `setModDepth01` (ligne 4288). Ce modèle viole `realtime-audio.md` (verrou bloquant) ; il fonctionne en pratique parce que l'UI tient le verrou très peu de temps. À ne pas reproduire : préférer la `FixedMatrix` de sst-basic-blocks (pointeurs liés dans `prepare`, aucun verrou dans `process`) avec une table de routes échangée par pointeur atomique.

### 2.3 Presets

1. **Format.** Fichier `.fxp` : en tête binaire VST2 `fxChunkSetCustom` ('CcnK', 'FPCh') suivi d'un `patch_header` (tag, taille XML, tailles des tables d'onde embarquées), puis le patch en XML et les tables d'onde en binaire ([`src/common/PatchFileHeaderStructs.h`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/PatchFileHeaderStructs.h)). Le XML est lu avec tinyxml (`SurgePatch.cpp:1794`). L'état DAW passe par le même chemin (`SurgeSynthProcessor.cpp:1546`, `getStateInformation`).
2. **Patch streaming revision.** Une constante entière unique, `ff_revision = 31` ([`src/common/SurgeStorage.h:156`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/common/SurgeStorage.h#L156)), précédée d'un journal en commentaire qui décrit chaque incrément depuis la révision 0 (lignes 94-154). À la sauvegarde, l'attribut `revision` est écrit (`SurgePatch.cpp:4094`). Au chargement, il est lu (lignes 1849-1850), un patch plus récent que le binaire déclenche un avertissement (ligne 1854), puis une suite de blocs `if (revision < N)` applique les migrations dans l'ordre : 25 blocs dans `SurgePatch.cpp` (par exemple ligne 2464 pour `< 1`, 2548 pour la résonance remise à l'échelle en `< 6`, 3330 pour `< 23`). Les effets sst portent leur propre version et leur propre `remapParametersForStreamingVersion` (section 1.4).
3. **Chargement hors thread audio, mais lancé depuis lui.** `process()` détecte un patch en file (`patchid_queue`, atomique), met `halt_engine` (le moteur sort du silence) et **crée un `std::thread`** pour charger (`SurgeSynthesizer.cpp:4996`, fonction `loadPatchInBackgroundThread` ligne 4542). Créer un thread depuis le thread audio est interdit chez nous ; l'idée "silence pendant le chargement puis reprise" reste bonne avec un thread de fond permanent.

### 2.4 Tests

1. **Framework.** Catch2 v3, binaire `surge-testrunner` (`src/surge-testrunner/CMakeLists.txt`), lié à `surge-common` et à `juce_audio_basics` seulement. Les tests pilotent le moteur sans hôte (`HeadlessUtils.h`, `Player.h`).
2. **Couverture.** Environ 180 `TEST_CASE` répartis par domaine : `UnitTestsIO.cpp` 34 (lecture de patchs et WAV corrompus refusés, ligne 387), `UnitTestsTUN.cpp` 29 (accordage), `UnitTestsDSP.cpp` 23, `UnitTestsLUA.cpp` 20, `UnitTestsMIDI.cpp` 16, `UnitTestsMOD.cpp` 14 (enveloppes, pitch bend MPE, lissage des contrôleurs), `UnitTestsFX.cpp` 11 (chaque effet créé et traité, réverbe à haute fréquence d'échantillonnage, état empoisonné vidé à l'arrêt).
3. **Tests audio golden.** [`UnitTestsGOLDEN.cpp`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/src/surge-testrunner/UnitTestsGOLDEN.cpp) : les échantillons attendus sont écrits en dur dans le source, tolérance `GOLDEN_TOL = 1e-5f` (ligne 60). `goldenCheckOrPrint` (ligne 77) compare avec `Catch::Approx(...).margin` (ligne 95) ou, en mode impression, régénère le tableau C++ à coller. Les tests de performance sont cachés par le tag `[.]` (ligne 327).
4. **Tests UI.** `src/surge-xt/xt-tests/` ne teste que l'OSC.

### 2.5 CI

1. **GitHub Actions** ([`.github/workflows/build-pr.yml`](https://github.com/surge-synthesizer/surge/blob/0852de8663dd4d4b0ba220c4b2490f3ceebdeb14/.github/workflows/build-pr.yml)) : Windows MSVC (x64, ARM64, ARM64EC, JUCE 7), Ubuntu gcc13, Ubuntu ARM, macOS, Docker Ubuntu 22, et `surge-testrunner` lancé par `ctest` sur macOS, Linux et Windows (lignes 87-107, 140). `code-checks.yml` vérifie clang-format. `build-release.yml` construit les installeurs.
2. **Pas de pluginval.** Aucune occurrence dans `.github`, `azure-pipelines.yml`, `cmake/` ni les `CMakeLists.txt`. Surge ne valide pas ses binaires contre un hôte en CI ; notre règle `testing.md` (pluginval strictness 10) va plus loin.

## 3. Contre exemples temps réel relevés

| Endroit | Ce qui se passe | Règle concernée |
| --- | --- | --- |
| `surge/src/common/SurgeSynthesizer.cpp:5051` | `recursive_mutex::lock()` dans `process()` | Verrou bloquant interdit |
| `surge/src/common/SurgeSynthesizer.cpp:4996` | `std::make_unique<std::thread>` dans `process()` | Allocation et création de thread interdites |
| `sst-effects/include/sst/effects/ConcreteConfig.h:85` | `rand()` | Générateur déterministe obligatoire (`dsp.md`) |
| `sst-basic-blocks/.../mod-matrix/ModMatrix.h:254` | `std::function` appelé par route dans `process` | Acceptable (assigné dans `prepare`, l'appel n'alloue pas), mais coût indirect par échantillon de contrôle |
| `sst-basic-blocks/.../mod-matrix/ModMatrix.h:436` | `unordered_map::at` dans `process` | Recherche sans allocation, temps quasi constant ; à surveiller avec RTSan |

## 4. À reprendre

Chaque ligne indique la licence vérifiée et la couche chez nous. "AGPL seulement" signifie utilisable uniquement si l'ADR 0001 choisit l'AGPL v3.

### (a) Bibliothèques à brancher telles quelles

| # | Bibliothèque | Licence | Couche | Usage |
| --- | --- | --- | --- | --- |
| 1 | sst-cpputils | MIT | `dsp/`, `plugin/` | `ring_buffer.h` (FIFO SPSC), `fixed_allocater.h`, `small_hash_map.h`, et surtout `rtsan_support.h` pour marquer `process` en `[[clang::nonblocking]]` |
| 2 | sst-basic-blocks | GPL v3, AGPL seulement | `dsp/` | Lags, LFO, enveloppes, clippers, DC blocker, `FixedMatrix` comme matrice de modulation, `ParamMetaData` pour décrire les paramètres |
| 3 | sst-filters | GPL v3, AGPL seulement | `dsp/` | 41 types de filtres analogiques modélisés, Linkwitz Riley pour les crossovers, `HalfRateFilter` pour l'oversampling 2x |
| 4 | sst-waveshapers | GPL v3, AGPL seulement | `dsp/` | 44 saturations et wavefolders, à entourer d'oversampling |
| 5 | sst-effects | GPL v3, AGPL seulement | `dsp/` | Réverbes, délais, chorus, phaser, flanger, rotary, EQ, compresseur ; exige d'écrire une `FXConfig` déterministe |
| 6 | sst-jucegui | MIT (JUCE licence commerciale ou GPL3 pour l'ensemble) | `ui/` | Knobs, sliders, VU, feuille de style ; écrire l'adaptateur APVTS vers `data::Continuous`, vérifier JUCE 9 |
| 7 | sst-plugininfra (cible `sst-plugininfra` sans `patchbase`) | MIT, tinyxml zlib | `plugin/` | Chemins utilisateur pour les presets, préférences, version git |

### (b) Code extractible

| # | Fichier ou classe | Licence | Couche | Travail d'extraction |
| --- | --- | --- | --- | --- |
| 1 | `sst-basic-blocks/include/sst/basic-blocks/dsp/LanczosResampler.h` | MIT ou GPL3 | `dsp/` | Retirer les includes lignes 53-54 et remplacer `sum_ps_to_float` par une réduction SSE3, comme le fichier l'indique |
| 2 | `sst-basic-blocks/include/sst/basic-blocks/dsp/HilbertTransform.h`, classe `HilbertTransformMonoFloat` (ligne 66) | MIT ou GPL3 | `dsp/` | Prendre la version mono flottante sans `simd/setup.h` ; utile pour frequency shifter et pitch shift |
| 3 | `sst-basic-blocks/include/sst/basic-blocks/dsp/EllipticBlepOscillators.h` + `libs/elliptic-blep` (Signalsmith) | MIT ou GPL3, Signalsmith MIT | `dsp/` | Fournir notre propre `SmoothingStrategy` (ligne 72) au lieu d'inclure `SmoothingStrategies.h` (GPL) |
| 4 | `sst-cpputils/include/sst/cpputils/rtsan_support.h` | MIT | `dsp/` | Copiable seul (81 lignes, aucune dépendance) si on ne veut pas toute la bibliothèque |
| 5 | `sst-filters/include/sst/filters/CytomicSVF.h`, `LinkwitzRiley.h`, `HalfRateFilter.h` | GPL v3, AGPL seulement | `dsp/` | Utilisables seuls si on ne veut pas tout sst-filters, mais dépendent de sst-basic-blocks |
| 6 | `surge/src/surge-testrunner/UnitTestsGOLDEN.cpp:60-100` (`goldenCheckOrPrint`) | GPL v3, AGPL seulement | tests | Fonction courte ; plus simple à réécrire d'après l'idée (catégorie c, ligne 4) |

### (c) Idées de conception à reproduire

| # | Idée | Vu dans | Couche | Ce qu'on fait |
| --- | --- | --- | --- | --- |
| 1 | Moteur compilable sans JUCE, CI qui le compile seul | Surge `surge-common`, `build-pr.yml:16` | `dsp/` | Job CI qui construit la cible `dsp` sans JUCE (déjà prévu par `03_ARCHITECTURE.md`) |
| 2 | Bloc interne fixe de 32 avec index circulaire côté hôte | `SurgeSynthProcessor.cpp:566-778` | `plugin/` | Confirme le choix des paquets de 32 de Drum Foundry |
| 3 | Copie locale des paramètres par bloc, modulation additive dessus | `SurgeVoice.cpp:177`, `:1271` | `dsp/` | Notre `Params` par bloc, enrichi par voix d'un tableau de modulation |
| 4 | Golden en dur dans le test avec mode "imprimer" pour régénérer | `UnitTestsGOLDEN.cpp:77` | tests | Option pour les petits golden ; la régénération reste un commit `golden:` validé par l'humain (`testing.md`) |
| 5 | Numéro de révision unique + journal des incréments en commentaire + migrations `if (rev < N)` ordonnées | `SurgeStorage.h:94-156`, `SurgePatch.cpp:2464-3330` | `plugin/` | Version d'état unique dans `State`, journal dans `CHANGELOG.md`, une fonction de migration par incrément, un fichier d'état par version dans `tests/plugin/states/` |
| 6 | Paramètres inconnus ignorés, migration par paramètre puis globale, ID de patch vérifié | `sst-plugininfra/.../patch_base.h:211-301` | `plugin/` | Même ordre dans `setStateInformation` |
| 7 | Version de streaming par effet, remap des paramètres par effet | `sst-effects`, `EffectCore.h:273`, `Delay.h:455` | `dsp/` + `plugin/` | Pour un multi effet : chaque module porte sa propre version |
| 8 | Effet templaté sur une config qui fournit paramètres, mémoire et fréquence | `sst-effects/EffectCore.h:26-145`, `VoiceEffectCore.h:80-82` | `dsp/` | Les processeurs reçoivent leur mémoire de l'appelant, jamais d'allocation interne |
| 9 | Filtre qui déclare la taille mémoire nécessaire puis reçoit la mémoire | `sst-filters/filters++/api.h:116-130` | `dsp/` | Même contrat pour nos lignes de délai : `requiredSize()` puis `provide(memory)` dans `prepare` |
| 10 | Matrice de modulation à taille fixe, pointeurs liés dans `prepare`, `process` sans allocation ni verrou | `sst-basic-blocks/ModMatrix.h:238-470` | `dsp/` | Si plugin commercial : réécrire sur ce modèle ; table de routes échangée par pointeur atomique, jamais le mutex de Surge |
| 11 | Silence pendant un chargement lourd puis reprise | `SurgeSynthesizer.cpp` (`halt_engine`) | `plugin/` | Avec un thread de fond permanent et un crossfade de 20 ms, pas un thread créé depuis `process` |
