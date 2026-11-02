# Drum Foundry : lecture du code

**Verdict.** Instrument nettement plus gros (environ 47 000 lignes hors JUCE) dont les meilleures idées sont l'outil headless qui pilote le vrai processeur, le snapshot de paramètres assaini à la lecture, la latence fixe complétée par un retard en fin de chaîne et la passation sans blocage par `try_lock` avec liste de retrait ; mais il n'a ni DSP séparé de JUCE, ni tests dans la CI, ni pluginval automatisé, et ses paquets de 32 échantillons ne servent l'indépendance à la taille de bloc que dans la réverbe Cloud.

Étudié au commit `b9541dd` (version 0.1.1, 2026-10-12). Les numéros de ligne renvoient à ce commit ; les liens pointent sur `main` et peuvent dériver. Licence AGPL v3 avec conditions additionnelles (`NOTICE`) : rien n'est copié ici, seules les idées sont décrites. Le code n'a pas été compilé pour cette analyse.

## 1. Fiche

| Point | Constat |
| --- | --- |
| Langage | C++20, CMake 3.22 minimum ([`CMakeLists.txt:1-6`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L1-L6)) |
| JUCE | 8.0.15 ; `libs/JUCE` est dans `.gitignore` (ni sous module ni copie suivie) ; si le dossier est vide, `FetchContent` télécharge le tag ([`CMakeLists.txt:30-41`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L30-L41)) |
| Code | `src/` (processeur, paramètres, `dsp/`, `ui/`, presets, samples), `tools/` (11 000 lignes dont `Tools.cpp` à 8 973 lignes) |
| Code tiers | Cloud Seed Core (MIT) vendored dans `libs/CloudSeedCore` avec `PATCHES.md` |
| Audit interne | [`Docs/Host-Compatibility-and-Release-Readiness.md`](https://github.com/donjmilligan/drum-foundary/blob/main/Docs/Host-Compatibility-and-Release-Readiness.md) : résultats pluginval/auval locaux, bench, risques |

## 2. Structure CMake

| Cible | Contenu | Dépend de JUCE |
| --- | --- | --- |
| `DrumFoundryAssets` | Logo et polices en ressources binaires ([`CMakeLists.txt:49-55`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L49-L55)) | Oui |
| `DrumFoundryCode` (`INTERFACE`) | **Toutes** les sources : processeur, DSP, UI, presets, samples, Cloud Seed ([`CMakeLists.txt:62-119`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L62-L119)) | Oui |
| `DrumFoundry` | Le plugin : VST3, AU et Standalone sur macOS ; VST3 et Standalone ailleurs ([`CMakeLists.txt:124-152`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L124-L152)) | Oui |
| `DrumFoundryTools` | `juce_add_console_app` qui lie `DrumFoundryCode` et ajoute `tools/*.cpp` ; option `DRUMFOUNDRY_BUILD_TOOLS`, **ON** par défaut ([`CMakeLists.txt:13`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L13), [`:158-166`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L158-L166)) | Oui |

Constats :

1. **Le DSP n'est pas séparé de JUCE.** 33 des 37 fichiers de `src/dsp/` incluent JUCE ou utilisent `juce::` (`AudioBuffer`, `SmoothedValue`, `dsp::Oversampling`, `dsp::Convolution`, `MidiBuffer`). Le moteur est testable sans DAW, pas sans JUCE.
2. La bibliothèque `INTERFACE` fait compiler toutes les sources deux fois (plugin et outil) ; c'est simple, mais une bibliothèque statique serait plus rapide.
3. Pas d'`enable_testing()` ni de `ctest` : les vérifications passent uniquement par l'outil.
4. Cloud Seed compile avec `-w` (warnings coupés pour ses fichiers et pour le seul fichier qui l'inclut) ([`CMakeLists.txt:57-60`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L57-L60)).
5. Runtime MSVC lié statiquement pour éviter la dépendance au redistribuable ([`CMakeLists.txt:24-28`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L24-L28)) ; copie dans les dossiers système activée par défaut sur macOS seulement ([`:15-22`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L15-L22)).
6. La version est écrite à la main dans `project(DrumFoundry VERSION 0.1.1)` ([`CMakeLists.txt:3`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L3)) et propagée par `DRUMFOUNDRY_VERSION`.

## 3. Tests : l'outil `DrumFoundryTools`

### Structure

Framework maison, sans Catch2. Chaque vérification est une fonction `int checkXxx()` qui imprime `FAIL: ...` et renvoie le nombre d'échecs ; `cmdCheck` les additionne et sort avec 0 ou 1 ([`tools/Tools.cpp:8624-8919`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8624-L8919)). `main` initialise JUCE avec `ScopedJuceInitialiser_GUI` (nécessaire pour les captures d'éditeur) et répartit les sous commandes ([`:8921-8973`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8921-L8973)). Les vérifications construisent un vrai `DrumFoundryProcessor` et appellent `prepareToPlay`, `processBlock`, `getStateInformation` comme un hôte.

| Sous commande | Rôle |
| --- | --- |
| `render <dir> [float]` | Chaque preset d'usine en WAV 24 bits ou float et PNG forme d'onde + spectrogramme |
| `snapshot <png> ...` | Capture de l'éditeur, avec preset, échelle, onglet et options |
| `check` | La batterie complète (ci dessous) |
| `check-eq`, `check-comp`, `check-order`, `check-clipper`, `check-undo`, `check-editor`, `check-samples` | Un sous ensemble |
| `bench` | Coût CPU moyen |
| `measure`, `measure-presets`, `emit-preset`, `measure-clicks`, `styles`, `analyzer`, `samples-ui` | Analyse de one shots, export de presets en code, captures |

### Ce que `check` vérifie en tête

| Vérification | Méthode | Tolérance | Où |
| --- | --- | --- | --- |
| Presets d'usine | Chaque preset, à 44,1 et 96 kHz, notes 36, 60, 84 : tout fini, crête ≤ plafond du clipper, pas quasi silencieux | crête ≤ 1,001 ; crête ≥ 0,01 | [`tools/Tools.cpp:8630-8654`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8630-L8654) |
| Aller retour d'état | Modifier une enveloppe, `getStateInformation` puis `setStateInformation` sur une autre instance ; comparer enveloppes, nom de preset, chaque paramètre | relative 1e-5 | [`:8656-8676`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8656-L8676) |
| État corrompu | Sessions avec NaN, inf et textes invalides, par `setStateInformation` et par `loadStateTree` : paramètres finis, choix dans leurs bornes, tables finies, rendu offline et `processBlock` finis sur 2 s | exact (fini ou non) | [`:8678-8744`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8678-L8744) |
| `ParamReader` seul | NaN et inf écrits directement dans les atomics des paramètres : le snapshot doit être fini, les choix bornés, le défaut utilisé | exact | [`:8746-8774`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8746-L8774) |
| Enveloppes non finies | Points NaN/inf : nettoyés, tables cuites finies, éditions refusées | exact | [`:8776-8810`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8776-L8810) |
| `processBlock` avant `prepareToPlay` | 8 blocs avec données hôte périmées : pas de crash, sortie finie | exact | [`:8812-8834`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8812-L8834) |
| Indépendance à la taille de bloc | 24 000 échantillons en un bloc contre des blocs de tailles variables (suite `sz = sz % 700 + 37`), deux notes, réverbe off, on avec gate, on sans gate | écart max ≤ 1e-3 | [`:8836-8878`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8836-L8878) |

Puis 34 vérifications spécialisées (sidechain, réverbe, filtre de sortie, clipper, samples, styles, couches, solo, chaîne d'effets, LFO, undo, EQ, compresseurs, ordre de chaîne, et plusieurs vérifications de l'éditeur) ([`:8880-8913`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8880-L8913)).

Limites :

1. **Aucune référence audio comparée.** `render` écrit des WAV et des PNG pour l'écoute et la revue, mais rien ne les compare à des fichiers gardés. Notre `tools compare` contre `tests/golden/` n'a pas d'équivalent chez eux.
2. **Le test de taille de bloc ne route aucun LFO**, alors que c'est précisément le chemin découpé en paquets de 32 (section 5). La tolérance de 1e-3 est large pour une comparaison qui devrait être quasi exacte.
3. **`bench` mesure un coût moyen** (pourcentage d'un cœur sur 30 s) et imprime des chiffres sans seuil ni échec ([`tools/Tools.cpp:686-820`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L686-L820)). Le pire bloc, qui est ce qui fait décrocher, n'est pas mesuré ; leur propre audit l'a mesuré à part et a trouvé un dépassement (section 9).
4. Un seul fichier de 8 973 lignes mélange tests, rendus et captures.
5. L'outil n'est lancé par aucune CI (section 7).

## 4. Thread audio

### Des paramètres au DSP : `DrumParams` et `ParamReader`

1. `DrumParams` est une struct de valeurs simples (floats, ints, bools, `std::array` de sous structs, l'ordre de chaîne `FxChain`), sans `std::vector` ni chaîne ([`src/Parameters.h:287-289`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.h#L287-L289)). Le commentaire dit pourquoi : le même moteur tourne en direct ou hors ligne.
2. `ParamReader` met en cache, à la construction, le pointeur `std::atomic<float>*` de chaque paramètre et sa plage, son défaut, son skew ([`src/Parameters.h:478-537`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.h#L478-L537), [`src/Parameters.cpp:756-772`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L756-L772)).
3. Chaque lecture **assainit** : non fini donne le défaut, le reste est borné à la plage ([`src/Parameters.h:494-498`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.h#L494-L498)) ; les choix sont arrondis et bornés au nombre d'items ([`src/Parameters.cpp:775-790`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L775-L790)).
4. Dans `processBlock`, un snapshot est pris une fois par bloc, complété par le tempo hôte, l'ordre de chaîne et l'état de Listen de l'EQ, puis donné au moteur ([`src/PluginProcessor.h:63-69`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L63-L69), [`src/PluginProcessor.cpp:228-233`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L228-L233)).
5. L'ordre de la chaîne d'effets n'est pas un paramètre : il est sérialisé en texte dans l'état et **empaqueté dans un `std::atomic<uint64_t>`** pour l'audio ([`src/PluginProcessor.h:73`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L73), [`:264`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L264), [`src/dsp/FxChain.h:132-160`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/FxChain.h#L132-L160)).
6. Les LFO modulent une copie `modulated` du snapshot, recalculée au début de chaque paquet et à chaque note ([`src/dsp/DrumEngine.cpp:66-74`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L66-L74)).

### Objets lourds : trois mécanismes

| Objet | Mécanisme | Où |
| --- | --- | --- |
| Tables d'enveloppe (12 tables de 4 096 floats, environ 196 Ko) | Le message thread cuit les tables sous un `CriticalSection`, puis les copie dans `publishedTables` sous un `SpinLock` et lève un drapeau atomique. L'audio, si le drapeau est levé, tente `ScopedTryLockType` ; s'il obtient le verrou, il **copie** les tables dans le moteur, sinon il réessaie au bloc suivant | [`src/PluginProcessor.cpp:343-352`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L343-L352), [`:210-220`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L210-L220), [`src/dsp/DrumEngine.h:58`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.h#L58) |
| Samples importés | Décodage sur un thread de fond ; publication d'une table de pointeurs bruts sous `SpinLock` ; l'audio la prend par `try_lock` dans `beginBlock` et publie le numéro de série adopté ; un sample remplacé va sur une liste `retired` avec le premier numéro de série qui ne le contient plus, et un `Timer` d'une seconde le libère quand l'audio a adopté ce numéro. Les `shared_ptr` ne sont jamais touchés par l'audio | [`src/samples/SampleBank.h:25-37`](https://github.com/donjmilligan/drum-foundary/blob/main/src/samples/SampleBank.h#L25-L37), [`src/samples/SampleBank.cpp:257-294`](https://github.com/donjmilligan/drum-foundary/blob/main/src/samples/SampleBank.cpp#L257-L294), [`:399-426`](https://github.com/donjmilligan/drum-foundary/blob/main/src/samples/SampleBank.cpp#L399-L426), [`src/dsp/SampleData.h:37-46`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/SampleData.h#L37-L46) |
| Réponse impulsionnelle de la réverbe Natural | Construite par un `TimeSliceClient` sur un thread de fond partagé ; remise à `juce::dsp::Convolution::loadImpulseResponse`, et c'est **la convolution de JUCE qui fait le crossfade** vers la nouvelle IR ; quand rien ne joue, `serviceWhileIdle` fait tourner la convolution sur un échantillon de silence pour qu'elle installe la nouvelle salle | [`src/dsp/NaturalReverb.h`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.h), [`src/dsp/NaturalReverb.cpp:37`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.cpp#L37), [`:112`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.cpp#L112), [`:146`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.cpp#L146) |

Le `try_lock` évite que l'audio attende, mais la copie de 196 Ko de tables se fait sur le thread audio. C'est borné ; un échange de pointeur (`farbot::RealtimeObject` ou double tampon) éviterait la copie.

### Lissage, dénormaux, gardes

1. Lissage par `juce::SmoothedValue`, 20 ms, sur les gains, le drive, le mix, le plafond du clipper ([`src/dsp/DriveStage.h:22-35`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DriveStage.h#L22-L35), [`src/dsp/MasterChain.h:130-132`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.h#L130-L132)). Au premier bloc, les valeurs sautent à leur cible au lieu de monter depuis zéro.
2. `juce::ScopedNoDenormals` en tête de `processBlock` ([`src/PluginProcessor.cpp:186`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L186)) et dans l'outil.
3. `prepareToPlay` refuse une fréquence non finie ou nulle et une taille de bloc ≤ 0 ; le moteur reste alors « non préparé » et `processBlock` sort du silence ([`src/dsp/DrumEngine.cpp:29-48`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L29-L48), [`src/PluginProcessor.cpp:188-194`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L188-L194)).
4. **Garde NaN** : après chaque paquet, si la sortie contient un NaN ou un inf, le bloc est vidé et le moteur réinitialisé, pour que la valeur ne reste pas piégée dans un état IIR. Le commentaire note que cela casse silencieusement sous `-ffast-math` ([`src/dsp/DrumEngine.cpp:14-26`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L14-L26), [`:234-241`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L234-L241)).
5. Le sidechain partage la mémoire des canaux de sortie : le détecteur de transitoires lit tout le bloc avant que le moteur n'écrase ces canaux ([`src/PluginProcessor.cpp:198-208`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L198-L208)).
6. `reset()` de l'hôte ne touche rien directement : il lève un drapeau atomique, et c'est l'audio qui réinitialise ([`src/PluginProcessor.h:35`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L35), [`src/PluginProcessor.cpp:204-205`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L204-L205)).
7. Les événements MIDI et les coups du sidechain sont fusionnés dans l'ordre temporel à l'échantillon près, sans allocation (tableau fixe plutôt que `MidiBuffer`) ([`src/dsp/DrumEngine.cpp:196-227`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L196-L227)).

## 5. Oversampling, latence, chaîne, paquets de 32

### Oversampling

| Module | Méthode | Latence | Où |
| --- | --- | --- | --- |
| Drive (x2 dans la chaîne) | `juce::dsp::Oversampling` 2x, demi bande polyphase IIR, latence entière ; tourne toujours, même éteint (le Mix descend à 0 en 20 ms) | constante | [`src/dsp/DriveStage.h:13-22`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DriveStage.h#L13-L22), [`:46`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DriveStage.h#L46) |
| Clipper (sortie et x2 dans la chaîne) | Facteur selon la fréquence : 8x sous 50 kHz, 4x sous 100 kHz, 2x sous 200 kHz, 1x au delà ; FIR à phase linéaire fenêtre de Kaiser, 70 dB d'atténuation, longueur choisie pour que l'aller retour fasse un nombre entier d'échantillons ; puis limiteur à anticipation (0,2 ms) qui tient le plafond malgré le dépassement de Gibbs | ne dépend que de la fréquence d'échantillonnage | [`src/dsp/Clipper.h:36-58`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/Clipper.h#L36-L58), [`src/dsp/Clipper.cpp:144-175`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/Clipper.cpp#L144-L175) |

**Idée remarquable du clipper** : seule la différence `shape(u) - u` passe par l'oversampler, puis elle est ajoutée à l'entrée retardée du même nombre entier d'échantillons. Sous le genou, la différence vaut exactement zéro, donc le signal sort identique au bit près, simplement retardé ([`src/dsp/Clipper.h:42-46`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/Clipper.h#L42-L46)).

### Latence fixe quelle que soit la chaîne

La latence annoncée vaut toujours deux Drives + deux Clippers de chaîne + le Clipper de sortie, que ces modules soient dans la chaîne ou non ([`src/dsp/MasterChain.cpp:102-110`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L102-L110)). La différence entre ce maximum et la latence de la chaîne active est comblée par une ligne à retard placée après l'étage de sortie, allouée en puissance de deux dans `prepare` ([`src/dsp/MasterChain.cpp:37-39`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L37-L39), [`:133`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L133), [`:320-328`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L320-L328)). `setLatencySamples` n'est appelé que dans `prepareToPlay` ([`src/PluginProcessor.cpp:161`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L161)). `getTailLengthSeconds` ajoute cette latence à la durée du coup ou de la réverbe ([`:274-285`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L274-L285)).

### Changement d'ordre de la chaîne

Ce n'est **pas un crossfade** entre l'ancienne et la nouvelle chaîne, c'est un passage par le silence ([`src/dsp/MasterChain.h:40-44`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.h#L40-L44), [`src/dsp/MasterChain.cpp:227-274`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L227-L274)) :

1. fondu de sortie linéaire de 10 ms (`kChainFadeSeconds`, [`src/dsp/MasterChain.cpp:12`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L12)) ;
2. maintien du silence le temps que ce qui traverse encore l'étage de sortie et la ligne à retard soit sorti (latence du clipper + taille du retard + 16) ;
3. bascule : chaque module de la nouvelle chaîne est réinitialisé, puis le retard de fin est recalculé ([`:112-134`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L112-L134)) ;
4. fondu d'entrée de 10 ms.

Un nouvel ordre qui arrive pendant le fondu remplace simplement la cible en attente.

### Les paquets de 32 échantillons

Deux usages distincts, qu'il ne faut pas confondre :

| Usage | Comment | Indépendant de la taille de bloc ? |
| --- | --- | --- |
| Réverbe Cloud | Cloud Seed a des boucles de rétroaction dont le comportement dépend de la taille de bloc ; elle tourne donc toujours par paquets de 32 via une petite FIFO interne, au prix de 32 échantillons de retard sur le signal wet (0,7 ms à 48 kHz) ([`src/dsp/CloudReverb.h:25-28`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/CloudReverb.h#L25-L28), [`:61-69`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/CloudReverb.h#L61-L69), [`:79`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/CloudReverb.h#L79)) | Oui |
| Modulation par LFO | Quand un LFO est routé, le moteur découpe le bloc en paquets d'au plus 32 et réapplique les LFO au début de chacun ; sinon il traite par paquets de la taille max ([`src/dsp/DrumEngine.h:36-38`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.h#L36-L38), [`src/dsp/DrumEngine.cpp:183-186`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L183-L186)) | **Non** : les paquets partent du début de chaque bloc hôte, donc les instants de mise à jour des LFO dépendent de la taille de bloc. Le test de taille de bloc ne route pas de LFO |

## 6. État, presets, migration

| Sujet | Comment | Où |
| --- | --- | --- |
| Contenu | APVTS + enveloppes dessinées + chemins absolus des samples (même manquants) + nom de preset + ordre de chaîne en texte | [`src/PluginProcessor.cpp:422-453`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L422-L453) |
| Version | Entier `format`, actuellement 10, avec l'historique de chaque format documenté au même endroit | [`src/PluginProcessor.h:212-227`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L212-L227) |
| Migration | Une série de blocs `if (format < N)` dans `loadStateTree`, chacun réécrivant les valeurs concernées, puis `format` mis à la version courante | [`src/PluginProcessor.cpp:539-684`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L539-L684) |
| Assainissement | Toute valeur de paramètre d'une session ou d'un preset : non finie donne le défaut, le reste est borné | [`:50-72`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L50-L72), appel en [`:686`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L686) |
| Paramètres absents | Ajoutés à leur défaut avant `replaceState`, pour qu'un vieux patch ne garde pas les valeurs du patch précédent | [`:79-98`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L79-L98), [`:687`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L687) |
| Paramètres de session | Liste unique (sidechain, solos, Master Out) : rappelés par l'hôte, ignorés par les presets et par l'undo | [`src/Parameters.cpp:659-671`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L659-L671), [`src/PluginProcessor.cpp:466-486`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L466-L486) |
| État de l'UI | Propriétés `ui*` stockées dans la session, retirées avant de charger un patch, bornées à la lecture | [`:700-743`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L700-L743) |
| Undo | Instantanés du patch entier (100 pas), un pas par geste utilisateur ; l'automation et le rappel de session déplacent seulement la base ; l'hôte le signale par un atomique depuis n'importe quel thread | [`src/UndoHistory.h:16-38`](https://github.com/donjmilligan/drum-foundary/blob/main/src/UndoHistory.h#L16-L38), [`:83`](https://github.com/donjmilligan/drum-foundary/blob/main/src/UndoHistory.h#L83), [`src/PluginProcessor.cpp:741`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L741) |
| Version des paramètres JUCE | `ParameterID{id, 1}` pour tous | [`src/Parameters.cpp:124-134`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L124-L134) |

La cause de la plupart des migrations est un **choix qui a reçu de nouveaux items au milieu de sa liste** : Body Style a vu son item Sample passer de l'index 6 à 11, puis 16, puis plus loin ; Click Type pareil ([`src/PluginProcessor.cpp:549-588`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L549-L588)). Chaque insertion coûte une règle de migration et casse l'automation enregistrée sur ce paramètre.

## 7. CI

Un seul workflow : [`.github/workflows/build.yml`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml), déclenché sur push vers `main`, sur tag `v*`, sur pull request et à la main ; les runs de PR obsolètes sont annulés ([`:28-40`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L28-L40)).

| Job | Plateforme | Étapes | Où |
| --- | --- | --- | --- |
| `windows` | `windows-latest` | Lit la version dans `CMakeLists.txt` ; configure **avec `DRUMFOUNDRY_BUILD_TOOLS=OFF`** ; build Release ; publie le plugin brut **avant** l'empaquetage pour qu'il reste téléchargeable si la suite échoue ; installeur Inno Setup (installé par Chocolatey si absent ou trop vieux) ; zip du VST3 | [`:43-156`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L43-L156) |
| `macos` | `macos-latest` | Lit la version ; **échoue si le README n'affiche pas `**Version X.Y.Z**`** ; installe Ninja ; `packaging/macos/make-pkg.sh` (build universel arm64 + x86_64, outils OFF, `.pkg` non signé) | [`:158-221`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L158-L221), [`packaging/macos/make-pkg.sh:59-65`](https://github.com/donjmilligan/drum-foundary/blob/main/packaging/macos/make-pkg.sh#L59-L65) |
| `release` | `ubuntu-latest`, seulement sur tag | Vérifie que Windows et macOS ont lu la même version et que le tag lui correspond ; télécharge les installeurs ; crée la release GitHub (ou remplace ses fichiers si elle existe) ; attache chaque fichier deux fois, avec et sans version dans le nom, pour que les liens `releases/latest/download/...` du README restent valides | [`:223-291`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L223-L291) |

Absent de la CI : **Linux, les tests (`DrumFoundryTools check` n'est même pas compilé), pluginval, auval, la signature et la notarisation**. pluginval strictness 10 et `auval` sont des commandes manuelles listées dans le README et dans l'audit interne, lancées sur la machine du développeur.

## 8. Code vendored

[`libs/CloudSeedCore/PATCHES.md`](https://github.com/donjmilligan/drum-foundary/blob/main/libs/CloudSeedCore/PATCHES.md) donne le dépôt amont, le commit exact, la date, la licence, les fichiers repris et, pour chaque fichier, le changement ; chaque changement est marqué `[Drum Foundry patch]` dans la source. Les patchs : phases de modulation tirées d'un LCG semé au lieu de `std::rand()` (rendus reproductibles), tailles de buffers surchargeables, graines de lignes mises en cache pour qu'un changement de taille ou de decay n'alloue pas, `strcpy_s` remplacé par `snprintf`, réglage d'un paramètre directement en unités. C'est le bon modèle de documentation.

## 9. Points faibles, à ne pas reprendre

1. **Pas de DSP sans JUCE.** Le README et notre `01_REFERENCES.md` laissent entendre une séparation ; en réalité tout passe par une bibliothèque `INTERFACE` liée à JUCE.
2. **Aucune vérification dans la CI** : ni `check`, ni pluginval, ni auval. La qualité repose sur la discipline du développeur.
3. **Pré rendu non borné à la note.** Une couche avec un Offset négatif est rendue puis jetée dans le callback audio à chaque note ([`src/dsp/DrumVoice.cpp:204-205`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumVoice.cpp#L204-L205)). Leur propre audit mesure jusqu'à 4 fois le budget d'un bloc de 64 à 96 kHz (section 5.1 du document `Docs/`). Les numéros de ligne cités dans cet audit sont déjà périmés.
4. **Copie de 196 Ko de tables sur le thread audio** à chaque édition d'enveloppe ([`src/dsp/DrumEngine.h:58`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.h#L58)).
5. **Paquets de 32 alignés sur le bloc hôte** pour les LFO : non indépendant de la taille de bloc, et non testé.
6. **Items insérés au milieu des listes de choix**, d'où quatre règles de migration pour le seul Body Style.
7. **`ParameterID` toujours en version 1** malgré des ajouts de paramètres.
8. **`bench` sans pire cas ni seuil.**
9. **Pas de références audio comparées**, seulement des rendus pour l'écoute.
10. **Changement d'ordre par le silence** : propre, mais audible comme un trou de 20 à 25 ms. Pour un effet en insert sur une piste, un vrai crossfade entre deux chaînes serait préférable.
11. Pas de gestion du manque de mémoire dans le décodage de samples (noté par leur audit, section 6.1).
12. La référence au papier de Giannoulis, Massberg et Reiss n'est que dans le README ; le code des compresseurs ne cite pas sa source (le code de l'EQ cite Vicanek et le cookbook RBJ : [`src/dsp/ParametricEq.h:84-97`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/ParametricEq.h#L84-L97)).

## À reprendre dans nos plugins

1. **Un outil headless qui pilote le vrai `AudioProcessor`.** Cible `<Plugin>Tools` (console JUCE) avec `render`, `check`, `bench`, `snapshot`, plus ce qui leur manque : `compare` contre `tests/golden/`. Les vérifications de `check` sont écrites comme des tests Catch2 (cible `Tests`, `ctest`), et `check` se contente de les lancer ou de lancer les vérifications qui demandent l'éditeur. La CI construit l'outil et l'exécute.
2. **Snapshot de paramètres assaini à la lecture.** Un `ParamReader` dans `plugin/` qui met en cache les `std::atomic<float>*` de `getRawParameterValue` et remplit notre `Params` (struct simple sans allocation) une fois par bloc ; non fini donne le défaut, le reste est borné, les choix sont arrondis et bornés. Test : écrire NaN et inf dans les atomics et vérifier un snapshot fini.
3. **Assainir et compléter l'état au chargement.** Avant `replaceState`, borner toute valeur et ajouter les paramètres absents à leur défaut. Test : sessions corrompues (NaN, inf, texte) chargées par `setStateInformation`, puis rendu fini.
4. **Version d'état entière et migrations en chaîne.** Un entier `format` dans l'état, l'historique des formats commenté à côté de la constante, des blocs `if (format < N)` dans l'ordre, et un fichier d'état de chaque version publiée dans `tests/plugin/states/`. Règle complémentaire chez nous : **les nouveaux items d'un choix s'ajoutent toujours en fin de liste**, ce qui supprime la cause principale de leurs migrations.
5. **Latence fixe par retard de fin de chaîne.** Annoncer la latence du pire cas une fois dans `prepareToPlay` ; un module à latence tourne toujours, même éteint ; la différence avec la chaîne active est comblée par une ligne à retard (`juce::dsp::DelayLine` ou un tampon circulaire pré alloué). Test : pour chaque configuration, une impulsion ressort à `getLatencySamples()`.
6. **Oversampling de la seule différence non linéaire.** Pour un clipper ou un saturateur à genou : oversampler `shape(u) - u` et l'ajouter à l'entrée retardée, ce qui rend le chemin propre au bit près sous le genou. Rééchantillonnage par `juce::dsp::Oversampling` (latence entière) ; test : sous le genou, sortie égale à l'entrée retardée, à l'égalité exacte des bits si le design le permet, sinon à 1e-7.
7. **Facteur d'oversampling selon la fréquence d'échantillonnage** (8x, 4x, 2x, 1x), décidé dans `prepare`, pour garder la latence constante pendant une session.
8. **Passation sans blocage, mais sans copie lourde.** Pour les tables et objets lourds : `farbot::RealtimeObject` (MIT) ou un échange de pointeur atomique, plutôt qu'un `try_lock` suivi d'une copie. Pour les ressources partagées (samples, IR) : pointeurs bruts côté audio, propriété en `shared_ptr` côté message thread, liste de retrait indexée par un numéro de série que l'audio publie, vidée par un `juce::Timer`.
9. **Construction de l'IR en arrière plan et crossfade délégué à JUCE.** `juce::dsp::Convolution` avec une `ConvolutionMessageQueue` partagée fait déjà le chargement en fond et le fondu ; ne pas réécrire ce mécanisme.
10. **Garde NaN en sortie de moteur.** Après chaque bloc, un test de finitude ; si un NaN apparaît, sortie à zéro et réinitialisation des états. Interdire `-ffast-math` (ou garder `-fno-finite-math-only`) dans `build.md`, puisque la garde en dépend.
11. **Paquets de taille fixe avec FIFO interne**, pas alignés sur le bloc hôte, pour tout algorithme sensible à la taille de bloc, et l'étendre à la modulation : soit un compteur de phase continu entre blocs, soit une FIFO comme pour Cloud. Le test de taille de bloc couvre chaque chemin découpé (LFO routé compris) avec une tolérance serrée.
12. **Changement de topologie sans clic.** Pour un instrument, leur passage par le silence suffit ; pour un effet, préférer un crossfade de 10 à 20 ms entre deux instances de chaîne. Dans les deux cas, les modules qui changent de place repartent d'un état réinitialisé.
13. **État non paramètre transmis par un mot atomique.** Un ordre de chaîne ou une petite configuration discrète tient dans un `std::atomic<uint64_t>` empaqueté, et se sérialise en texte lisible dans l'état.
14. **Paramètres de session listés une fois**, utilisés par les presets et par l'undo.
15. **Undo par instantanés et gestes**, seulement si un plugin en a besoin : l'automation et le rappel de session déplacent la base ; JUCE `UndoManager` peut porter les instantanés.
16. **CI de release reprise presque telle quelle dans l'esprit** : lecture de la version, artefacts publiés avant l'empaquetage, release sur tag avec vérification tag = version, fichiers en double sans version pour les liens « latest ». Ajouter ce qui leur manque : Linux, `ctest`, `<Plugin>Tools check` et `compare`, pluginval 10 sur chaque OS, `auval` sur macOS, et une source de version unique (notre `VERSION` ou `CHANGELOG.md`) au lieu de `CMakeLists.txt` plus le README.
17. **Audit de compatibilité hôte versionné dans `Docs/`** avec les commandes qui reproduisent chaque chiffre, ce que notre règle `workflow.md` exige déjà ; y ajouter une mesure du pire bloc, pas seulement de la moyenne.
18. **`PATCHES.md` pour chaque dépendance modifiée**, avec commit amont, licence, fichier par fichier, et un marqueur dans la source.
