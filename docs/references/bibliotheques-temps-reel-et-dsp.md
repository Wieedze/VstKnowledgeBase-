# Bibliothèques temps réel et DSP : licences vérifiées et verdicts

Étude du 2026-11-02. Les dépôts ont été clonés en shallow dans `/home/claude/study/`. Chaque licence ci dessous a été lue dans le fichier du dépôt, dont le chemin est cité. Les dates de dernier commit viennent de `git log -1 --format=%cd` sur le clone.

## Verdict

On prend **farbot** et **readerwriterqueue** pour le temps réel, **Signalsmith DSP** comme boîte à outils DSP sans JUCE, **HIIR** pour l'oversampling des non linéarités, et **RTSan** dans un job CI Linux clang 20. **Cloud Seed Core** est utilisable pour une réverbe, mais seulement sous forme vendorisée et patchée (il alloue sur changement de paramètre, utilise `std::rand()` et pèse environ 64 Mo par instance). **Airwindows** se reprend par la cible `airwin-registry` du dépôt airwin2rack (MIT, sans SDK VST2 ni JUCE) plutôt que par le dépôt d'origine ou par airwindows-juce. **foleys_gui_magic** est BSD 3 clauses, maintenu et adapté à JUCE 9 ; il reste une option pour l'UI, pas un choix par défaut.

## Tableau récapitulatif

| Bibliothèque | Licence vérifiée (fichier) | Header only | Sans JUCE | Dernier commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| [farbot](https://github.com/hogliux/farbot) | MIT (`LICENSE`) | Oui | Oui | 2026-09-08 | Prendre (`RealtimeObject`, `fifo` en mode single) |
| [readerwriterqueue](https://github.com/cameron314/readerwriterqueue) | BSD 2 clauses "Simplified BSD" (`LICENSE.md`), plus zlib pour le sémaphore de Jeff Preshing dans `atomicops.h` | Oui (2 fichiers) | Oui | 2026-09-07 | Prendre, épinglé sur un commit postérieur à v1.0.7 |
| [CloudSeedCore](https://github.com/GhostNoteAudio/CloudSeedCore) | MIT (`LICENSE`) | Non (3 `.cpp`) | Oui | 2024-09-22 | Prendre vendorisé et patché |
| [Signalsmith DSP](https://github.com/Signalsmith-Audio/dsp) | MIT (`LICENSE.txt`) | Oui | Oui | 2026-10-13 | Prendre |
| [Airwindows](https://github.com/airwindows/airwindows) | MIT (`LICENSE`) | Non | Oui, mais dépend du SDK VST2 | 2026-10-31 | Prendre via airwin2rack |
| [airwin2rack](https://github.com/baconpaul/airwin2rack) (Airwindows Consolidated) | MIT (`LICENSE.md`), restriction de fait sur `src-juce` et `src-rack` | Non (bibliothèque statique) | Oui pour `src/` | 2026-10-31 | Prendre `airwin-registry` |
| [airwindows-juce](https://github.com/hollance/airwindows-juce) | Pas de fichier LICENSE ; le README renvoie à la licence MIT d'Airwindows | Non | Non | 2024-01-26 | Lecture seulement |
| HIIR (Laurent de Soras) | WTFPL v2 (`src/external/hiir/license.txt` du miroir sfizz, et en tête de chaque header) | Presque (un `.cpp` : le designer) | Oui | Copie sfizz : 2025-03-17 | Prendre |
| [foleys_gui_magic](https://github.com/ffAudio/foleys_gui_magic) | BSD 3 clauses (`LICENSE.md`) | Non (module JUCE) | Non | 2026-08-15 | Option UI, pas par défaut |
| [RealtimeSanitizer](https://clang.llvm.org/docs/RealtimeSanitizer.html) | LLVM (Apache 2.0 avec exception LLVM) | Sans objet | Sans objet | Clang 20 | Prendre en CI |

## farbot

Licence MIT, `farbot/LICENSE`, copyright Fabian Renn 2019. Header only : `include/farbot/RealtimeObject.hpp`, `fifo.hpp`, `AsyncCaller.hpp`, `RealtimeTraits.hpp`, avec les implémentations dans `include/farbot/detail/*.tcc`. Aucune dépendance à JUCE, seulement la bibliothèque standard : utilisable dans `dsp/`.

API principale :

```cpp
#include <farbot/RealtimeObject.hpp>
using Coeffs = std::array<float, 5>;
using Shared = farbot::RealtimeObject<Coeffs, farbot::RealtimeObjectOptions::nonRealtimeMutatable>;
Shared coeffs;

void process (std::span<float> io) noexcept            // thread audio
{
    Shared::ScopedAccess<farbot::ThreadType::realtime> c (coeffs);
    applyBiquad (*c, io);
}

void setCoeffs (const Coeffs& n)                       // thread message
{
    Shared::ScopedAccess<farbot::ThreadType::nonRealtime> c (coeffs);
    *c = n;
}
```

Qualité : tests googletest dans `test/test.cpp`, désactivés par défaut (`FARBOT_ENABLE_TESTS`, ajouté en juin 2026). Maintenance faible mais vivante : deux commits en 2026 après une pause depuis 2023.

Pièges temps réel vérifiés dans le code :

1. Côté non temps réel, `nonRealtimeMutatable` prend un `std::mutex` et fait `new T` (`detail/RealtimeObject.tcc`, lignes 59 à 82), puis attend en boucle que le thread audio rende le pointeur. C'est correct tant que seul le thread message écrit, mais il ne faut jamais l'appeler depuis l'audio.
2. Le mode `concurrency::multiple` de `fifo` enregistre chaque thread dans un tableau fixe de `MAX_THREADS = 64` entrées qui ne se libèrent jamais (`detail/fifo.tcc`, lignes 18 à 46). Au delà, un `assert` puis un comportement faux. Un hôte qui fait tourner l'audio sur un pool de threads peut s'en approcher. Préférer `concurrency::single` partout où c'est possible.
3. `AsyncCaller::callAsync` prend un `std::function<void()>&&`. Construire un `std::function` à partir d'une lambda qui capture plus que le petit tampon interne alloue, et RTSan le verra. Capturer au plus un pointeur, ou utiliser une FIFO de commandes typées.

Verdict : prendre `RealtimeObject` et `fifo` (single/single), garder `AsyncCaller` pour des lambdas sans capture lourde.

## readerwriterqueue

Licence vérifiée dans `readerwriterqueue/LICENSE.md` : "Simplified BSD License" (BSD 2 clauses), copyright Cameron Desrochers 2013 à 2021. Le même fichier précise que l'implémentation du sémaphore de Jeff Preshing, utilisée par les files bloquantes et embarquée dans `atomicops.h`, est sous licence zlib, et que `benchmarks/ext` a ses propres licences. Les deux licences sont permissives ; la mention BSD doit figurer dans la documentation du binaire.

Header only : `readerwriterqueue.h` et `atomicops.h` (plus `readerwritercircularbuffer.h` en option). Sans JUCE, C++11.

```cpp
#include "readerwriterqueue.h"
moodycamel::ReaderWriterQueue<MeterFrame> q (256);   // alloue ici, hors audio

// thread audio
q.try_enqueue (frame);                               // n'alloue jamais, renvoie false si plein

// timer UI
MeterFrame f;
while (q.try_dequeue (f)) draw (f);
```

Qualité : tests unitaires et test de stabilité dans `tests/unittests` et `tests/stabtest`, benchmarks. Maintenance active en 2026, dont un correctif d'ordre de barrière mémoire sur AArch64 dans `inner_enqueue()` (commit `9ffc91d`, septembre 2026) et un correctif de ligne de cache PPC64. Le dernier tag, `v1.0.7`, est antérieur : épingler le commit `6867b5645235` via CPM.

Pièges temps réel : `enqueue` et `emplace` allouent quand la file est pleine (`malloc` dans `make_block`, ligne 737). Sur le thread audio, n'utiliser que `try_enqueue` et `try_emplace`. Les variantes `BlockingReaderWriterQueue` et `wait_dequeue` utilisent un sémaphore et sont interdites côté audio. `try_dequeue` côté audio détruit l'élément : le type stocké doit avoir un destructeur trivial ou sans libération.

Verdict : prendre pour les flux audio vers UI (mètres, analyseur). Pour un usage interne à JUCE, `AbstractFifo` reste une alternative sans dépendance supplémentaire.

## Cloud Seed Core

Licence MIT, `CloudSeedCore/LICENSE`, copyright Ghost Note Audio 2024 ; les en têtes des fichiers disent "Ghost Note Engineering Ltd". Le `Readme.md` ajoute des demandes non contraignantes : créditer Ghost Note Audio, ne pas utiliser le nom "Cloud Seed" de façon à laisser croire que le produit vient d'eux.

Structure : `DSP/` contient onze headers et deux `.cpp` (`Biquad.cpp`, `RandomBuffer.cpp`), et `Parameters.cpp` à la racine définit `ParameterLabel`. Ce n'est donc pas header only. `DSP/ReverbController.h` inclut `../Parameters.h` : il faut garder l'arborescence. Aucune dépendance à JUCE. Deux définitions de préprocesseur sont obligatoires : `BUFFER_SIZE` (taille de sous bloc, 1024 dans le projet d'exemple) et `MAX_STR_SIZE`. `PluginProcessor.cpp` est un programme console de démonstration, pas un plugin.

Intégration :

```cpp
// prepareToPlay (hors audio) : objet d'environ 64 Mo, jamais sur la pile
reverb = std::make_unique<Cloudseed::ReverbController> ((int) sampleRate);
for (int i = 0; i < Cloudseed::Parameter::COUNT; ++i)
    reverb->SetParameter (i, ProgramDarkPlate[i]);   // valeurs normalisées 0..1
reverb->ClearBuffers();

// processBlock
reverb->Process (inL, inR, outL, outR, numSamples);  // découpe en sous blocs de BUFFER_SIZE
```

Problèmes cités par Drum Foundry, vérifiés dans le code amont :

1. **Allocation sur changement de paramètre : confirmé.** `ReverbChannel::UpdateLines()` (`DSP/ReverbChannel.h`, ligne 393) appelle `RandomBuffer::Generate`, qui construit trois `std::vector<float>` par `push_back` (`DSP/RandomBuffer.cpp`). `UpdateLines()` est appelée pour `LateLineSize`, `LateLineDecay`, `LateLineModAmount`, `LateLineModRate`, `LateDiffuseModAmount`, `LateDiffuseModRate`, `EqCrossSeed` et `SeedDelay`. `AllpassDiffuser::SetSeed` et `MultitapDelay::SetSeed` réaffectent aussi un `std::vector` (`UpdateSeeds`). Tourner le bouton Decay pendant la lecture alloue donc sur le thread audio.
2. **Modulation non déterministe : confirmé.** Les constructeurs de `ModulatedDelay` (ligne 61) et `ModulatedAllpass` (ligne 63) tirent la phase initiale avec `std::rand()`. Le résultat dépend de l'état global de `rand`, partagé avec l'hôte et les autres plugins : deux rendus du même patch ne sont pas identiques, ce qui casse les tests golden.
3. **Buffers énormes : confirmé.** `ModulatedDelay` et `MultitapDelay` ont chacun un tableau membre de `192000 * 2` floats, `ModulatedAllpass` de 19200 floats. Avec 12 lignes de 12 étages d'allpass par canal, le calcul à partir de ces constantes donne environ 32 Mo par canal, soit environ 64 Mo par `ReverbController`. Commande pour le vérifier (non exécutée ici) : compiler `printf("%zu", sizeof(Cloudseed::ReverbController))` avec `-DBUFFER_SIZE=1024 -DMAX_STR_SIZE=32`.

Autres pièges : aucun lissage interne des paramètres (`SetDelay` prend un entier, les sauts de taille s'entendent) ; `std::sinf` et `M_PI` utilisés dans `ModulatedDelay.h` et `ModulatedAllpass.h`, non portables (Drum Foundry a remplacé `std::sinf` par `std::sin`, et MSVC exige `_USE_MATH_DEFINES`) ; plusieurs tableaux de `BUFFER_SIZE` floats sur la pile à chaque niveau de `Process`.

Le patch de Drum Foundry (`/home/claude/study/drum-foundary/libs/CloudSeedCore/`, voir `PATCHES.md`) rend les tailles de buffers configurables (`CLOUDSEED_DELAY_BUFFER_SIZE`, `CLOUDSEED_ALLPASS_BUFFER_SIZE`, `CLOUDSEED_TAP_BUFFER_SIZE`), remplace `std::rand()` par un LCG `thread_local` seedable (`Utils::NextPhaseRandom`), et met en cache les graines de `UpdateLines()`. **Ce patch ne supprime pas toutes les allocations** : changer `SeedDelay` ou `EqCrossSeed` régénère encore les vecteurs, et `SetSeed` des diffuseurs n'est pas touché. Pour nous, la correction complète consiste à remplacer `RandomBuffer::Generate` par une version qui remplit un `std::array` de taille fixe (`TotalLineCount * 3`, `MaxStageCount * 3`).

Qualité : aucun test, six commits au total, inactif depuis septembre 2024. Le code est court (2336 lignes dans `DSP/`) et lisible.

Verdict : prendre, vendorisé dans `third_party/` avec un `PATCHES.md`, en repartant du patch Drum Foundry et en complétant la suppression des allocations. Paramètres de graine non automatisables.

## Signalsmith DSP

Licence MIT, `dsp/LICENSE.txt`, copyright Geraint Luff / Signalsmith Audio Ltd 2021. Le README précise : "If you'd prefer something else, get in touch." Le dépôt GitHub est un miroir ; la source de référence est `https://signalsmith-audio.co.uk/code/dsp.git`.

Header only, C++11, sans JUCE ni autre dépendance : `delay.h`, `filters.h`, `envelopes.h`, `rates.h`, `fft.h`, `spectral.h`, `curves.h`, `mix.h`, `windows.h`, `perf.h`, avec des redirections dans `include/signalsmith-dsp/`. Version 1.7.0 (`common.h`), vérifiable par `SIGNALSMITH_DSP_VERSION_CHECK(1, 7, 0)`.

```cpp
#include "signalsmith-dsp/filters.h"
#include "signalsmith-dsp/delay.h"

signalsmith::filters::BiquadStatic<float> lp;
signalsmith::delay::Delay<float, signalsmith::delay::InterpolatorCubic> dly;

void prepare (double sr, int) { dly.resize ((int) (2.0 * sr)); }            // alloue
void setCutoff (double hz, double sr) { lp.lowpass (hz / sr); }             // fréquence normalisée
float tick (float x, float delaySamples) { return lp (dly.write (x).read (delaySamples)); }
```

Qualité : les tests vivent dans un dépôt séparé (`dsp-doc`) qui mesure réponses en fréquence et aliasing ; ils ne sont pas dans le clone. Maintenance régulière (corrections en janvier, août et octobre 2026).

Pièges temps réel : `resize()` des délais et de `Oversampler2xFIR` alloue (`std::vector`), à n'appeler que dans `prepare`. `InterpolatorKaiserSincN` construit ses coefficients avec des `std::vector` et une FFT à la construction. `CubicLfo()` sans argument se seede avec `std::random_device` (`envelopes.h`, ligne 53) : utiliser le constructeur `CubicLfo(long seed)` pour respecter la règle de déterminisme de `dsp.md`. `BiquadStatic` n'est "pas garanti stable s'il est modulé au taux audio" selon son propre commentaire.

Verdict : prendre comme bibliothèque DSP par défaut dans `dsp/`.

## Airwindows et airwindows-juce

Licence MIT, `airwindows/LICENSE`, copyright Chris Johnson 2018. Le même texte est dans `plugins/LinuxVST/LICENSE`, et chaque fichier source dit "Airwindows uses the MIT license".

Structure : `plugins/` contient six portages du même code (`LinuxVST`, `MacAU`, `MacSignedAU`, `MacSignedVST`, `MacVST`, `WinVST`), 532 algorithmes dans `plugins/LinuxVST/src/`, environ 43 000 fichiers au total (clone sparse recommandé). Chaque algorithme a trois fichiers, par exemple `plugins/LinuxVST/src/Density/` : `Density.h` (classe dérivée de `AudioEffectX`, état en membres `double`, paramètres `A`, `B`, `C`, `D` normalisés 0..1), `Density.cpp` (plomberie VST2) et `DensityProc.cpp` (`processReplacing` et `processDoubleReplacing`, la boucle par échantillon). Le DSP est extractible en copiant les membres d'état et la boucle de `*Proc.cpp`, mais le portage à la main de chaque algorithme est fastidieux.

Pièges : dépendance au SDK VST2 (`audioeffectx.h`) dans le dépôt d'origine ; graine du bruit `fpdL`/`fpdR` tirée avec `rand()` dans le constructeur (`Density.cpp`, ligne 24), ce qui rend le dither de sortie non déterministe ; dither flottant ajouté en fin de chaque boucle ; aucun lissage de paramètre ; sample rate pris en compte par un `overallscale` relatif à 44,1 kHz ; buffers de réverbe de taille fixe (par exemple `Galactic.h`) et sous échantillonnage interne limité à un facteur 4. Aucun test.

[airwin2rack](https://github.com/baconpaul/airwin2rack) (Paul Walker, "Airwindows Consolidated") règle le problème d'extraction : licence MIT (`LICENSE.md`, copyright 2019 à 2026). La cible CMake `airwin-registry` compile tous les algorithmes en bibliothèque statique, sans SDK VST2 : `src/airwin_consolidated_base.h` remplace `AudioEffectX` par une base minimale, et `src/AirwinRegistry.h` fournit un registre par nom qui crée des `std::unique_ptr<AirwinConsolidatedBase>`. Le README précise que `src`, `libs/airwindows` et `res/awdoc` sont utilisables en code fermé, mais que les cibles `src-juce` et `src-rack` combinées avec JUCE, le SDK VST3 ou le SDK VCV Rack peuvent entraîner du GPL3. Mis à jour chaque semaine sur l'amont (dernier commit 2026-10-31). Attention : le registre utilise `std::string`, `std::map` et `std::function` ; il ne sert qu'à la construction, jamais dans `processBlock`.

[airwindows-juce](https://github.com/hollance/airwindows-juce) (Matthijs Hollemans) contient seulement quatre portages (`BitShiftGain`, `ClipOnly`, `ClipOnly2`, `ClipSoftly`) en projets Projucer, sans fichier LICENSE (le README renvoie à la licence MIT d'Airwindows), dernier commit 2024-01-26. C'est un support d'étude commenté, pas une bibliothèque.

Verdict : pour un algorithme Airwindows donné, partir du fichier correspondant dans airwin2rack (`src/autogen_airwin/`), l'envelopper dans une classe `dsp/` avec lissage et graine déterministe, et citer Airwindows et airwin2rack.

## HIIR

Aucun dépôt GitHub officiel de Laurent de Soras n'a été trouvé ; la page `http://ldesoras.free.fr/prod.html` n'a pas pu être lue (accès refusé pendant l'étude). La licence a été vérifiée sur la copie vendorisée par [sfizz](https://github.com/sfztools/sfizz) : `src/external/hiir/license.txt` est le texte de la WTFPL version 2 (Sam Hocevar, décembre 2004), et chaque header porte la mention de Laurent de Soras, par exemple `src/external/hiir/hiir/Downsampler2xFpu.h` : "You can redistribute it and/or modify it under the terms of the Do What The Fuck You Want To Public License, Version 2". La WTFPL est permissive mais n'est pas approuvée par l'OSI ; certains services juridiques la refusent. À noter dans l'ADR si le plugin est commercial.

Structure : headers `.h`/`.hpp` templatés par nombre de coefficients, en variantes FPU, SSE et NEON (`Upsampler2xFpu<NC>`, `Downsampler2xFpu<NC>`), plus `PolyphaseIir2Designer.cpp`, le seul `.cpp`, qui calcule les coefficients. Sans JUCE. La copie sfizz est une version ancienne (pas de variantes AVX ni double précision) ; pour la dernière version, télécharger l'archive depuis le site de l'auteur.

```cpp
#include "hiir/PolyphaseIir2Designer.h"
#include "hiir/Upsampler2xFpu.h"
#include "hiir/Downsampler2xFpu.h"
constexpr int NC = 8;
hiir::Upsampler2xFpu<NC> up;  hiir::Downsampler2xFpu<NC> down;

void prepare()
{
    double c[NC];
    hiir::PolyphaseIir2Designer::compute_coefs_spec_order_tbw (c, NC, 0.04);  // bande de transition
    up.set_coefs (c);  down.set_coefs (c);
}
// processBlock : up.process_block (os, in, n); saturer os[0..2n); down.process_block (out, os, n);
```

Pièges : filtres IIR, donc phase non linéaire ; la latence de groupe n'est pas un entier et se calcule avec `compute_group_delay` pour la rapporter à l'hôte (`dsp.md`). Pas d'allocation, pas d'état global.

Verdict : prendre pour l'oversampling 2x en cascade autour des non linéarités.

## foleys_gui_magic

Licence BSD 3 clauses, `foleys_gui_magic/LICENSE.md`, copyright Foleys Finest Audio, Daniel Walz, 2019 à 2023. `VERSION.md` indique qu'en 1.4.0 (juillet 2023) la licence commerciale et la double licence ont été retirées pour tous les projets. La déclaration du module (`modules/foleys_gui_magic/foleys_gui_magic.h`) dit "BSD V2 3-clause", version 1.5.0.

C'est un module JUCE (dépend de `juce_gui_basics`, `juce_audio_processors`, `juce_dsp`, `juce_cryptography`, etc.) : il vit dans `ui/`, jamais dans `dsp/`. Tests Catch2 dans `Tests/`, pluginval sur les exemples en CI.

Maintenance et compatibilité JUCE : dernier commit 2026-08-15, précédé de "Adapt to changes in juce 9" le 2026-08-14. Le code utilise `juce::FontOptions`, donc JUCE 8 au minimum. `CMakeIncludes/Juce.cmake` récupère JUCE sans `GIT_TAG` (la ligne `7.0.9` est commentée), donc la CI compile contre la tête de la branche par défaut de JUCE ; pour nous, épingler JUCE et le commit `d53d998e2bc3`. Le README annonce la suppression de la branche `develop`.

Verdict : option valable si l'on veut une UI décrite en XML avec éditeur en direct et des analyseurs prêts, mais elle remplace l'APVTS par son propre état (`MagicProcessorState`), ce qui touche à `juce.md`. Décision à prendre par ADR, pas par défaut.

## RealtimeSanitizer (RTSan)

Source : [documentation Clang](https://clang.llvm.org/docs/RealtimeSanitizer.html), [dépôt realtime-sanitizer/rtsan](https://github.com/realtime-sanitizer/rtsan), [Function Effect Analysis](https://clang.llvm.org/docs/FunctionEffectAnalysis.html).

Version : RTSan fait partie de LLVM à partir de la version 20 ("starting from v20.0.0", README de realtime-sanitizer/rtsan ; Clang 20.1.0 publié en mars 2025). AppleClang ne le fournit pas : en novembre 2025, Apple n'avait rien annoncé ([forum Apple](https://developer.apple.com/forums/thread/807360)). Windows n'est pas pris en charge. Plateformes utilisables : Linux et macOS avec un clang LLVM 20 ou plus (x86_64 et arm64 apparaissent dans les exemples). Pour GCC ou AppleClang, il existe une bibliothèque `rtsan-standalone` que ses auteurs qualifient eux mêmes de bricolage susceptible de cesser de fonctionner ; une image Docker `realtimesanitizer/rtsan-clang` existe aussi.

Attributs : `[[clang::nonblocking]]` marque une fonction temps réel ; RTSan signale à l'exécution tout appel intercepté (`malloc`, `free`, `pthread_mutex_lock`, etc.) fait depuis elle ou ses appelés. `[[clang::blocking]]` marque une de nos fonctions comme interdite dans ce contexte. Le même attribut sert à l'analyse statique de Clang (`-Wfunction-effects`, et `-Wperf-constraint-implies-noexcept` qui exige `noexcept`) ; il existe aussi `[[clang::nonallocating]]`. L'analyse statique signale les appels virtuels et par pointeur de fonction non annotés, et considère `std::function` incompatible : l'activer sur `dsp/` seulement, elle serait trop bruyante sur JUCE.

Usage : compiler et lier avec `-fsanitize=realtime`. À la première violation, le programme sort en erreur (`halt_on_error=true` par défaut). Options par `RTSAN_OPTIONS` (`halt_on_error`, `print_stats_on_exit`, `suppressions=<fichier>`, `verify_interceptors`, `symbolize`). Fichier de suppression : lignes `function-name-matches:<motif>` ou `call-stack-contains:<motif>`. Désactivation locale : `__rtsan::ScopedDisabler` (`#include <sanitizer/rtsan_interface.h>`), sans effet hors build RTSan. Détection à la compilation : `__has_feature(realtime_sanitizer)`.

Retours de la communauté JUCE :

1. [Forum JUCE, octobre 2024](https://forum.juce.com/t/memory-allocation-deep-inside-vst3plugininstance-processblock/63717) : RTSan a trouvé un `push_back` sur `std::vector<float*>` dans `HostBufferMapper::associateBufferTo` (`juce_VST3Common.h`), appelé par `VST3PluginInstance::processBlock`, donc côté hébergement de plugin. L'équipe JUCE a corrigé sur `develop` ("VST3: Avoid potential memory allocations during buffer remapping"). C'est pertinent si nos tests hébergent le plugin via JUCE.
2. [Forum JUCE, décembre 2024](https://forum.juce.com/t/using-realtimesanitizer-inside-daws/64557) : pour tester dans un DAW sur macOS, lancer l'hôte avec `DYLD_INSERT_LIBRARIES=.../libclang_rt.rtsan_osx_dynamic.dylib`. Sans préchargement, les intercepteurs ne fonctionnent pas : soit RTSan ne voit rien, soit (versions récentes) l'hôte s'arrête sur SIGABRT ; `verify_interceptors=false` contourne le problème des scanners, au prix de la vérification.
3. Les notes de version de JUCE 9.0.0 à 9.0.4 ne mentionnent ni RTSan ni `nonblocking` : JUCE n'annote pas son code, et c'est à nous de marquer nos fonctions.

Conséquence pour nous : lancer RTSan dans **nos propres exécutables de test** (Catch2, `Tools`), compilés et liés avec `-fsanitize=realtime`, qui appellent `prepareToPlay` puis `processBlock` directement. Ne pas compter sur pluginval, qui n'est pas lié au runtime RTSan.

Flags CMake :

```cmake
option(ENABLE_RTSAN "Build with RealtimeSanitizer (clang >= 20, Linux ou macOS)" OFF)

if(ENABLE_RTSAN)
  if(NOT CMAKE_CXX_COMPILER_ID STREQUAL "Clang" OR CMAKE_CXX_COMPILER_VERSION VERSION_LESS 20)
    message(FATAL_ERROR "RTSan requiert clang LLVM >= 20 (AppleClang non pris en charge)")
  endif()
  add_compile_options(-fsanitize=realtime -fno-omit-frame-pointer)
  add_link_options(-fsanitize=realtime)
  target_compile_options(dsp PRIVATE -Wfunction-effects -Wperf-constraint-implies-noexcept)
endif()
```

Attribut portable (macro de configuration de build, autorisée par `cpp.md`) :

```cpp
#if defined(__clang__) && __clang_major__ >= 20
  #define RT_NONBLOCKING [[clang::nonblocking]]
#else
  #define RT_NONBLOCKING
#endif

void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) noexcept RT_NONBLOCKING override;
```

L'attribut se place après `noexcept`, dans la position des attributs de type de fonction.

Job GitHub Actions :

```yaml
rtsan:
  runs-on: ubuntu-24.04
  steps:
    - uses: actions/checkout@v4
      with: { submodules: recursive }
    - name: Install clang 20
      run: |
        wget -qO llvm.sh https://apt.llvm.org/llvm.sh
        sudo bash llvm.sh 20
        sudo apt-get install -y ninja-build libasound2-dev libx11-dev libxrandr-dev \
          libxinerama-dev libxcursor-dev libfreetype6-dev libfontconfig1-dev
    - name: Configure
      run: >
        cmake -B build-rtsan -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
        -DCMAKE_C_COMPILER=clang-20 -DCMAKE_CXX_COMPILER=clang++-20
        -DENABLE_RTSAN=ON
    - name: Build
      run: cmake --build build-rtsan --target Tests
    - name: Test under RTSan
      env:
        RTSAN_OPTIONS: halt_on_error=true:print_stats_on_exit=true:suppressions=${{ github.workspace }}/tests/rtsan.supp
      run: ctest --test-dir build-rtsan --output-on-failure
```

Les paquets X11 et ALSA ne servent que si la cible de test lie les modules GUI de JUCE. Le fichier `tests/rtsan.supp` commence vide ; toute ligne ajoutée est justifiée dans un commentaire et une tâche.

Verdict : prendre. RTSan remplace l'allocateur instrumenté prévu dans `docs/04_TESTS.md`, à condition que les tests exercent réellement `processBlock`, y compris les changements de paramètres pendant la lecture, qui sont exactement le cas de Cloud Seed Core.
