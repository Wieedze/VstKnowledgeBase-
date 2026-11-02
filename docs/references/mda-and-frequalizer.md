# mda-plugins-juce et Frequalizer

**Verdict mda-plugins-juce : tout le dépôt est sous licence MIT (Paul Kellett 2008, Matthijs Hollemans 2021-2025), donc réutilisable que le plugin soit AGPL ou fermé. Les 24 plugins ont un cœur DSP qui n'utilise presque rien de JUCE (des boucles sur `float*` avec des membres simples) et s'extrait facilement dans `dsp/`, mais ce sont des algorithmes d'il y a vingt ans, sans lissage de paramètres, sans latence ni queue déclarées, parfois avec `rand()` sur le thread audio. On les reprend comme algorithmes de départ commentés, réécrits à notre format (`prepare`/`reset`/`process`, `Params`, tests), pas comme code de production tel quel.**

**Verdict Frequalizer : licence BSD 3-Clause (Daniel Walz, Foleys Finest Audio, 2018), réutilisable partout. Le dépôt n'est plus maintenu depuis janvier 2022, il est épinglé sur JUCE 6.1.2 et ne compile pas sur JUCE 9 sans retouches. Les idées (analyseur FFT sur thread de fond alimenté par `AbstractFifo`, courbe d'EQ via `getMagnitudeForFrequencyArray`, glisser les bandes dans le graphe) sont bonnes ; le code viole plusieurs de nos règles temps réel (verrou et allocation possibles sur le thread audio, accès à l'éditeur depuis `processBlock`). On reprend la structure et les formules de tracé, on réécrit le transport de données. La version évoluée de l'analyseur, dans foleys_gui_magic (BSD 3, actif), est un meilleur point de départ.**

Étude faite le 2026-11-02 sur deux clones superficiels :

1. mda-plugins-juce, `master` au commit [`5527024`](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb) (2026-02-25, "add dither plug-in").
2. Frequalizer, `master` au commit [`c4b1b61`](https://github.com/ffAudio/Frequalizer/tree/c4b1b611c8d818107639c79f974bca6a414d672d) (2022-01-16, "Added notarization").

Les chemins `fichier:ligne` sont relatifs à la racine de chaque dépôt et valent pour ces commits. Les vérifications d'API JUCE 9 ont été faites sur la copie de JUCE 9.0.4 présente dans `study/TetraDrive/external/JUCE`.

---

# Partie A : mda-plugins-juce

## A1. Licence

[`LICENSE.txt`](https://github.com/hollance/mda-plugins-juce/blob/552702479a9eac534f3abbf6e878a5eab473e0cb/LICENSE.txt) : **MIT**, avec deux lignes de copyright : "Copyright (c) 2008 Paul Kellett" et "Copyright (c) 2021-2025 M.I. Hollemans (JUCE version)". Le `README.markdown` le confirme ("This source code is licensed under the MIT license but keep in mind that JUCE has its own licensing terms").

| Point vérifié | Constat |
| --- | --- |
| En têtes de fichiers | Aucun fichier source ne porte d'en tête de licence ou de copyright (recherche de `Copyright`, `License`, `GPL`, `MIT` dans tous les `.h` et `.cpp` : aucun résultat). Le `LICENSE.txt` racine couvre donc tout. |
| Données d'échantillons | `Piano/Source/mdaPianoData.h` (3,3 Mo) et `EPiano/Source/mdaEPianoData.h` (2,3 Mo) sont des tableaux `short` issus des plugins originaux, sans licence séparée : ils tombent sous le MIT du dépôt. |
| Code MDA d'origine | Le dépôt dit s'appuyer sur la publication SourceForge `mda-vst` de Paul Kellett ; le `LICENSE.txt` reprend le MIT de 2008. Le port LV2 `mda.lv2` (David Robillard) est, lui, sous GPL d'après le projet amont (non vérifié ici) : **ne pas confondre les deux sources**. |
| Ports AU de Sophia Poirier | Le README dit les avoir "consultés". Leur licence n'est pas indiquée dans le dépôt (*à vérifier* si on voulait les lire aussi) ; le code publié ici reste sous MIT par son auteur. |

Conséquence : utilisable dans un plugin AGPL comme dans un plugin fermé, à condition de garder la notice MIT (les deux lignes de copyright) dans `docs/DEPENDENCIES.md` et dans les notices du binaire.

## A2. Les 24 plugins

Taille = lignes de `PluginProcessor.cpp` + `PluginProcessor.h`. "Extractible" juge l'effort pour sortir le DSP dans une classe `dsp/` sans JUCE. Dans tous les plugins, les seuls symboles JUCE hors squelette (APVTS, bus, état, éditeur) sont `juce::Decibels::decibelsToGain`, `juce::MathConstants` (RingMod) et `juce::Random` (TestTone) ; les synthés lisent en plus un `juce::MidiBuffer`.

| Nom | Type | Technique DSP | Taille | DSP extractible sans JUCE | Intérêt pour nous |
| --- | --- | --- | --- | --- | --- |
| [Ambience](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Ambience) | Effet | Petite réverbe : passe bas un pôle puis quatre allpass de Schroeder en série (gain direct 1, rétroaction 0,8) sur des tampons de 1024 échantillons. | 303 + 70 | Facile | Faible : longueurs en échantillons non mises à l'échelle du taux d'échantillonnage (`Ambience/Source/PluginProcessor.cpp:105-111`), `new[]` sans libération préalable si `prepareToPlay` est rappelé (`:44-47`). Idée seulement. |
| [Bandisto](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Bandisto) | Effet | Distorsion 3 bandes : crossover par trois passe bas un pôle en série (reconstruction exacte `l + m + h`), waveshaper `x / (1 + d·|x|)` par bande, côté stéréo non distordu. | 367 + 57 | Facile | Moyen : bon exemple de séparation de bandes reconstructible et de waveshaper simple ; aliasing non traité (pas d'oversampling). |
| [BeatBox](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/BeatBox) | Effet | Remplacement de batterie : suiveurs d'enveloppe sur trois bandes filtrées déclenchant des sons kick, caisse claire, charleston synthétisés au `prepareToPlay` (sinus amorti, bruit filtré). | 540 + 93 | Moyen (`std::rand()` dans `synth()`, `BeatBox/Source/PluginProcessor.cpp:112,144`) | Faible, sauf l'idée de déclencheur par bande. |
| [Degrade](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Degrade) | Effet | Bitcrusher : écrêtage, quantification, réduction de fréquence d'échantillonnage (échantillonnage ou moyenne), non linéarité en puissance, puis chaîne de passe bas un pôle. | 379 + 79 | Facile | Moyen : base d'un "lo-fi" ; le passe bas `filterFreq` est documenté (`Degrade/Source/PluginProcessor.cpp:69-90`). |
| [Delay](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Delay) | Effet | Délai stéréo à tampon mono unique, retards entiers G et D (D en ratio de G), filtre de tonalité un pôle passe bas ou passe haut dans la boucle de rétroaction. | 372 + 87 | Facile | Moyen : bon modèle commenté de délai, mais retard entier (pas d'interpolation, donc pas de modulation possible), `getTailLengthSeconds` à 0. `juce::dsp::DelayLine` fait mieux pour la ligne elle même. |
| [Detune](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Detune) | Effet | Pitch shifter à ligne de délai : deux têtes de lecture à vitesse ±cents, interpolation linéaire, fondu par fenêtre de Hann en demi recouvrement. | 330 + 61 | Facile (tableaux fixes `BUFMAX = 4096`, `Detune/Source/PluginProcessor.h:46-49`) | Bon : effet "doubleur" à faible coût, très bien expliqué (`Detune/Source/PluginProcessor.cpp:137-161`). Latence non déclarée (`setLatencySamples` absent). |
| [Dither](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Dither) | Effet | Réduction de longueur de mot : troncature, dither TPDF, TPDF passe haut, mise en forme du bruit du second ordre. | 313 + 74 | Facile, mais `rand()` dans la boucle (`Dither/Source/PluginProcessor.cpp:171,176`) | Bon pour un étage de sortie ou un outil de mastering ; remplacer `rand()` par un générateur seedable (règle `dsp.md`). |
| [DX10](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/DX10) | Instrument | Synthé FM à deux opérateurs, 8 voix, enveloppes exponentielles, LFO par oscillateur récursif mis à jour tous les 100 échantillons. | 939 + 184 | Moyen : il faut sortir le découpage du bloc par événement MIDI (`DX10/Source/PluginProcessor.cpp:389-530`) | Bon comme base de synthé FM minimal et de gestion de voix. |
| [Dynamics](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Dynamics) | Effet | Compresseur crête lié stéréo (suiveur attaque/relâche un pôle, gain `1/(1 + r·(env/seuil − 1))`), limiteur à attaque nulle et gate dans la même boucle. | 396 + 63 | Facile | Moyen : lisible, mais `juce::dsp::Compressor`/`NoiseGate`/`Limiter` couvrent déjà le besoin. Utile pour la courbe "overcompression". |
| [Envelope](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Envelope) | Effet | Suiveur d'enveloppe et VCA ; modes L×|R|, sortie d'enveloppe en DC, aplatissement de dynamique. | 243 + 55 | Facile | Faible comme plugin, utile comme brique (suiveur d'enveloppe un pôle). |
| [EPiano](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/EPiano) | Instrument | Lecture d'échantillons Rhodes par groupes de touches, désaccord pseudo aléatoire par note, LFO tremolo ou panoramique, overdrive. | 866 + 207 + données 2,3 Mo | Moyen (MIDI, gros en tête de données) | Moyen : bon exemple de lecteur d'échantillons multi zones à très faible coût ; données lourdes à compiler. |
| [Image](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Image) | Effet | Matrice M/S : largeur et pan de la composante stéréo, niveau et pan du centre, encodage et décodage M/S. | 233 + 49 | Facile | Bon : brique stéréo prête (dix lignes de calcul). |
| [JX10](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/JX10) | Instrument | Synthé soustractif 8 voix : deux scies band limitées par intégration d'impulsions sinc (`JX10/Source/PluginProcessor.cpp:697-785`), SVF de Chamberlin modifié avec saturation douce (`:864-869`), enveloppes un pôle, contrôle à taux réduit (32 échantillons), glide, modes mono/legato. | 1610 + 274 | Moyen | **Élevé** pour un synthé : le plus documenté du dépôt, et l'auteur en a tiré un livre (lien dans `JX10/README.markdown`). |
| [Limiter](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Limiter) | Effet | Limiteur style opto, genou dur ou doux, gain lissé attaque/relâche ; pas un limiteur brickwall (pas d'anticipation). | 320 + 74 | Facile | Moyen : explication pédagogique (`Limiter/Source/PluginProcessor.cpp:140-174`), mais pas de look ahead. |
| [Loudness](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Loudness) | Effet | Correction des courbes d'égale sonie (Stevens-Davis) par une table de coefficients interpolée et deux passe bas un pôle en boost ou en coupe. | 228 + 52 | Facile | Faible à moyen : niche (correction de grave selon le niveau d'écoute). |
| [Overdrive](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Overdrive) | Effet | Saturation douce `sign(x)·sqrt(|x|)` mélangée au signal propre, puis passe bas un pôle ("Muffle"). | 193 + 60 | Facile | Moyen : saturation la plus simple possible ; sans oversampling, donc à entourer de `juce::dsp::Oversampling` ou à remplacer par un clipper ADAA. |
| [Piano](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Piano) | Instrument | Lecture d'échantillons de piano par groupes de touches, 32 voix, pédale de sustain, accordage étiré, filtre "Muffle" lié à la vélocité. | 842 + 211 + données 3,3 Mo | Moyen | Moyen : même remarque qu'EPiano. |
| [RezFilter](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/RezFilter) | Effet | Filtre résonant (variante de SVF de Chamberlin, instable près de Nyquist selon l'auteur) modulé par suiveur d'enveloppe et LFO sinus ou sample and hold. | 407 + 70 | Facile, mais `rand()` dans la boucle (`RezFilter/Source/PluginProcessor.cpp:166,241`) | Faible : l'auteur déconseille ce filtre (`:178-182`) ; prendre `juce::dsp::StateVariableTPTFilter` ou un SVF de Cytomic. Garder l'idée de modulation. |
| [RingMod](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/RingMod) | Effet | Modulateur en anneau par sinus, avec rétroaction de la sortie. | 194 + 63 | Facile | Faible : trivial ; bon premier exercice TDD. |
| [Shepard](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Shepard) | Générateur | Son de Risset (Shepard continu) par deux tables d'onde lues avec un fondu, seul, en anneau ou mélangé à l'entrée. | 245 + 67 | Facile (tables générées une fois, `Shepard/Source/PluginProcessor.cpp:11-22`) | Faible. |
| [Splitter](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Splitter) | Effet | Séparation par fréquence (crossover un pôle) et par niveau (gate à enveloppe), modes normal, inverse et split G/D. | 327 + 57 | Facile | Faible. |
| [Stereo](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Stereo) | Effet | Élargisseur mono vers stéréo : panoramique Haas ou filtrage en peigne, retard modulable par LFO. | 395 + 75 | Facile (retard en échantillons, dépend du taux, `Stereo/Source/PluginProcessor.cpp:47-54`) | Moyen : deux techniques d'élargissement classiques. |
| [SubSynth](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/SubSynth) | Effet | Synthèse de sub grave : distorsion du grave filtré, division d'octave par bascule, inversion de phase par cycle, ou oscillateur déclenché ("Key Osc"). | 389 + 80 | Facile | Moyen pour un plugin de basse ou de batterie. |
| [TestTone](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/TestTone) | Générateur | Générateur de test : sinus MIDI ou tiers d'octave, impulsion, bruits blanc et rose, balayages log et linéaires. | 718 + 130 | Moyen (`juce::Random`, `std::rand()` ligne 313, écouteur de paramètres) | **Bon pour nos tests** : signaux de référence pour `tools render` et les tests DSP ; à réécrire avec un générateur seedable. |

Plugins originaux pas encore convertis (README) : Combo, De-ess, DubDelay, Leslie, Looplex, Multiband, Re-Psycho!, Round Panner, SpecMeter, Talkbox, Thru-Zero Flanger, Tracker, Vocoder, VocInput.

## A3. Structure commune, qualité, maintenance

### Structure

Chaque plugin est un dossier avec un `.jucer`, un `README.markdown` (paramètres) et deux fichiers : `Source/PluginProcessor.h` et `.cpp`. Pas d'éditeur : `GenericAudioProcessorEditor` partout. Le modèle, décrit dans le README racine (section "How the code is structured"), est le suivant :

1. `createParameterLayout()` déclare les paramètres APVTS en unités naturelles (dB, ms, Hz) avec `ParameterID{ "Nom", 1 }`.
2. `prepareToPlay()` alloue les tampons puis appelle `resetState()`.
3. `resetState()` remet à zéro l'état de rendu ; elle est aussi appelée par `reset()`.
4. `update()` lit l'APVTS et calcule les paramètres "cuits" (membres préfixés `_`).
5. `processBlock()` appelle `update()`, copie membres en locales, boucle sur les échantillons, recopie l'état.

Exemple type : [`Delay/Source/PluginProcessor.cpp:76-271`](https://github.com/hollance/mda-plugins-juce/blob/552702479a9eac534f3abbf6e878a5eab473e0cb/Delay/Source/PluginProcessor.cpp#L76-L271).

Ce découpage `update()` / état / boucle est déjà presque notre `Params` + `process`. L'extraction consiste à déplacer l'état et la boucle dans une classe `dsp/` et à remplacer la lecture APVTS de `update()` par la lecture d'un snapshot.

### Qualité

| Aspect | Constat |
| --- | --- |
| Documentation | Excellente : chaque formule héritée est expliquée, avec les bugs corrigés (par exemple le facteur 2 retiré du dry de Delay, `Delay/Source/PluginProcessor.cpp:153-162`) et les doutes de l'auteur ("I didn't study this filter in detail"). |
| Allocation | Faite dans `prepareToPlay` uniquement, aucune dans `processBlock` (recherche de `new`, `resize`, `push_back`). Ambience utilise `new[]`/`delete[]` nus (`Ambience/Source/PluginProcessor.cpp:44-57`). |
| Lissage | Aucun : le README racine l'assume ("did not add any new features such as parameter dezippering"). Changements de paramètres audibles en escalier. |
| Mise à jour des paramètres | `update()` est appelée à chaque bloc sans détection de changement (sauf TestTone), alors que le README dit "only when parameters have actually changed". Detune y recalcule une fenêtre de Hann jusqu'à 4096 points quand la latence change (`Detune/Source/PluginProcessor.cpp:106-116`). |
| Aléatoire | `rand()`/`std::rand()` dans RezFilter, Dither, TestTone (boucle audio) et BeatBox (`prepareToPlay`). Contraire à notre règle `dsp.md`. |
| Latence et queue | Aucun `setLatencySamples` (Detune en aurait besoin) ; `getTailLengthSeconds` renvoie 0 partout, y compris Delay et Ambience. |
| Taux d'échantillonnage | Plusieurs plugins raisonnent en échantillons fixes (Ambience, Stereo) : le son change à 48 ou 96 kHz. |
| Bus | Stéréo imposée en sortie ; le code lit toujours deux canaux d'entrée. |
| Style | Style personnel (pas JUCE), C++17 simple, un `.cpp` monolithique par plugin. Pas de tests, pas de CI. |
| Build | Projucer uniquement, exportateur Xcode macOS seul, chemins de modules relatifs `../../../../../JUCE/modules`. Testé par l'auteur "with Xcode on a Mac using JUCE 7". Aucun CMake : il faudra recâbler dans notre squelette Pamplejuce, ce qui est sans effort vu qu'on ne garde que le DSP. |

### Activité

Dernier commit le 2026-02-25 ("add dither plug-in"), précédent le 2025-12-15. Rythme lent mais régulier depuis 2021 (ajout d'un plugin tous les quelques mois). Seul auteur : Matthijs Hollemans. Le dépôt se présente comme de "l'archéologie de plugin" à but pédagogique, pas comme une bibliothèque : pas de version, pas de tag, on épingle un commit si on vendor.

## A4. Les plus utiles à reprendre

Classés par intérêt pour un premier plugin, avec ce que JUCE ou une bibliothèque déjà retenue fait déjà (règle de choix de `docs/07_A_REPRENDRE.md`).

| Rang | Plugin | Pourquoi | Concurrent déjà retenu |
| --- | --- | --- | --- |
| 1 | JX10 | Synthé complet et commenté : oscillateurs band limités, SVF, enveloppes, voix, glide, découpage du bloc par événement MIDI. Le meilleur point de départ si on fait un synthé simple. | `gin_dsp` (BSD 3) a oscillateurs et ADSR, mais pas un synthé entier aussi lisible. |
| 2 | TestTone | Signaux de test (sinus, bruits, balayages, impulsion) pour nos rendus de référence et nos tests DSP. | Rien de prêt dans la liste actuelle. |
| 3 | Detune | Pitch shifter à faible coût, idéal pour un doubleur ou un chorus "multi effets". | chowdsp a un pitch shifter, mais en GPL. |
| 4 | Dither | Étage de sortie propre (TPDF passe haut, noise shaping du second ordre). | Rien dans la liste actuelle. |
| 5 | Image | Matrice M/S complète, quelques lignes. | `dsp::Panner` ne fait pas le M/S. |
| 6 | Bandisto | Découpage 3 bandes reconstructible et waveshaper par bande. | `dsp::LinkwitzRileyFilter` pour le crossover si on veut plus raide. |
| 7 | DX10 | Base FM deux opérateurs et polyphonie minimale. | Aucun synthé FM dans la liste actuelle. |
| 8 | Delay, Overdrive, Dynamics, Limiter | Utiles comme lecture et comme référence de test, mais JUCE fournit `DelayLine`, `WaveShaper`, `Compressor`, `Limiter`, `NoiseGate` (règle de choix n°1). | `juce_dsp`, Airwindows (MIT) pour des saturations plus riches. |
| 9 | SubSynth, Stereo, Degrade | À garder en réserve pour un plugin de basse, d'élargissement ou lo-fi. | Airwindows (MIT) couvre aussi ces terrains. |

À ne pas reprendre comme DSP : RezFilter et le filtre d'Ambience (instabilité et dépendance au taux, de l'aveu même de l'auteur), Piano et EPiano tant qu'on ne fait pas de lecteur d'échantillons (5,6 Mo de données en en tête).

---

# Partie B : Frequalizer

## B1. Licence

[`LICENSE.md`](https://github.com/ffAudio/Frequalizer/blob/c4b1b611c8d818107639c79f974bca6a414d672d/LICENSE.md) : **BSD 3-Clause**, "Copyright (c) 2018, Daniel Walz - Foleys Finest Audio UG". Les sources n'ont pas d'en tête de licence (seulement "Author: Daniel Walz" dans `Source/Analyser.h:6`) ; le fichier racine couvre tout.

Réserve : `Resources/*.png` (logos Foleys Finest, Facebook, GitHub, LinkedIn) et `Source/SocialButtons.h` relèvent de l'image de marque. La clause 3 interdit d'utiliser le nom de l'auteur pour promouvoir un dérivé, et les logos tiers sont des marques. On ne reprend aucun de ces fichiers.

## B2. Maintenance et version de JUCE

| Point | Constat |
| --- | --- |
| JUCE | Sous module `External/JUCE` épinglé sur `e6ec181`, commit "Updated JUCE to 6.1.2" (2021-11-11). |
| Build | CMake 3.13 (`CMakeLists.txt:1`), `juce_add_plugin` avec VST3, plus AU sur macOS et AAX ou VST2 si les SDK sont fournis (`CMakeLists.txt:5-19`). Lie `juce_opengl`. |
| CI | GitHub Actions macOS et Windows, signature, notarisation, InnoSetup (commits de janvier 2022). Linux retiré. |
| Activité | Dernier commit 2022-01-16. Projet de démonstration de 2018, non maintenu. |
| Taille | 1590 lignes dans `Source/` : `Analyser.h` 144, processeur 617 + 172, éditeur 438 + 124. |

### Ce qui casse ou grince avec JUCE 8 et 9

Vérifié sur JUCE 9.0.4.

1. **Erreur de compilation** : `startThread (5)` (`Source/Analyser.h:56`). Depuis JUCE 7, `Thread::startThread` ne prend plus d'entier mais un `Thread::Priority` (`enum class`, `juce_Thread.h:65,286` de JUCE 9). Remplacer par `startThread (juce::Thread::Priority::low)` ou passer à un `TimeSliceThread`.
2. **CMake** : JUCE 9 exige CMake 3.22 ; le `cmake_minimum_required(VERSION 3.13.0)` ne bloque pas mais n'est plus exact. Sans objet chez nous (squelette Pamplejuce).
3. **Avertissements de dépréciation** (bloquants avec `-Werror`) : les constructeurs positionnels de `AudioParameterFloat`, `AudioParameterBool` et `AudioParameterChoice` avec label, catégorie et lambdas (`Source/FrequalizerProcessor.cpp:74-131`) sont marqués `[[deprecated ("Prefer the signature taking an Attributes argument")]]` dans JUCE 9 (`juce_AudioParameterFloat.h:97`).
4. **IDs sans version** : IDs en `juce::String` nus, donc `ParameterID` de version 0 ; contraire à notre règle `juce.md` (version incrémentée à chaque ajout).
5. **OpenGL** : l'éditeur attache un `OpenGLContext` au composant de plus haut niveau (`Source/FrequalizerEditor.cpp:44-46`). JUCE 9 passe à EGL sous Linux et OpenGL est déprécié par Apple ; JUCE 8 a un rendu Direct2D sous Windows. Inutile pour un tracé de 300 points : on retire OpenGL.
6. Le reste de l'API utilisée (`IIR::Coefficients::make*`, `getMagnitudeForFrequencyArray`, `ProcessorChain`, `AbstractFifo`, `dsp::FFT`, `WindowingFunction`, `Graphics::setFont (float)`) existe toujours dans JUCE 9.

## B3. L'analyseur FFT

Code : [`Source/Analyser.h`](https://github.com/ffAudio/Frequalizer/blob/c4b1b611c8d818107639c79f974bca6a414d672d/Source/Analyser.h), une classe template `Analyser<Type>` qui hérite de `juce::Thread`. Deux instances (entrée et sortie) dans le processeur (`Source/FrequalizerProcessor.h:168-169`).

### Transport des données depuis le thread audio

1. `processBlock` appelle `inputAnalyser.addAudioData (buffer, ...)` avant le filtrage et `outputAnalyser.addAudioData` après, **seulement si `getActiveEditor() != nullptr`** (`Source/FrequalizerProcessor.cpp:290-302`).
2. `addAudioData` (`Analyser.h:30-48`) écrit dans un `juce::AbstractFifo` (sans verrou, un producteur et un consommateur) adossé à un `AudioBuffer` mono. Les canaux sont **additionnés** sans division (somme, pas moyenne). Si la place manque, le bloc entier est **jeté**.
3. Puis `waitForData.signal()` (`Analyser.h:47`) réveille le thread d'analyse. **Problème** : dans JUCE 9, `WaitableEvent` est un `std::mutex` plus `std::condition_variable` (`juce_WaitableEvent.h:145-146`) : `signal()` prend un verrou sur le thread audio. Contraire à `realtime-audio.md`.
4. La taille de la FIFO vaut une seconde d'audio (`setupAnalyser (int (sampleRate), ...)`, `Source/FrequalizerProcessor.cpp:264-265`), et `setupAnalyser` redimensionne `audioFifo` et relance le thread à chaque `prepareToPlay` (`Analyser.h:50-57`). Si l'hôte rappelle `prepareToPlay` sans `releaseResources`, le tampon est redimensionné pendant que le thread le lit.

### Calcul (thread de fond, priorité 5)

1. Quand 4096 échantillons sont prêts (`dsp::FFT fft { 12 }`, `Analyser.h:131`), le thread les copie, puis appelle `finishedRead (n / 2)` (`Analyser.h:71`) : **recouvrement de 50 %**, saut de 2048 échantillons.
2. **Fenêtrage** : Hann normalisée (`WindowingFunction ... hann, true`, `Analyser.h:132`).
3. `performFrequencyOnlyForwardTransform` donne les magnitudes des 2048 premiers bins.
4. **Lissage** : moyenne glissante sur 4 trames. `averager` a 5 canaux : le canal 0 tient la somme, les canaux 1 à 4 forment un anneau ; on retire la trame la plus ancienne, on écrit la nouvelle mise à l'échelle par `1 / (2048 × 4)`, on l'ajoute (`Analyser.h:76-80`). Aucune balistique attaque/relâche, aucun lissage en fréquence.
5. Écriture protégée par un `CriticalSection` partagé avec le thread UI (`Analyser.h:76`), puis drapeau atomique `newDataAvailable`.

### Rendu

1. L'éditeur a un `Timer` à 30 Hz (`Source/FrequalizerEditor.cpp:50`) qui appelle `checkForNewAnalyserData()` et ne repeint la zone du graphe que si une trame est arrivée (`:158-162`).
2. Dans `paint`, `createPath` (`Analyser.h:90-102`) construit un `juce::Path` sous le même verrou : un point par bin, abscisse `log2 (f / 20 Hz) / 10` (dix octaves à partir de 20 Hz), ordonnée en dB de −80 à 0 (`Analyser.h:113-124`). Le verrou est entre l'UI et le thread d'analyse, pas l'audio : acceptable.
3. Deux tracés superposés (entrée en vert, sortie en rouge), trait de 1 px, sans remplissage (`Source/FrequalizerEditor.cpp:104-111`). Pas de décimation des bins aigus : environ 2048 segments par tracé, dont la majorité tassés dans la dernière octave.

### Défauts relevés

1. Verrou sur le thread audio via `WaitableEvent::signal` (`Analyser.h:47`).
2. Lecture de `getActiveEditor()` dans `processBlock` (`Source/FrequalizerProcessor.cpp:290,301`), contraire à `juce.md` ("Pas d'accès à l'éditeur depuis le processeur").
3. `checkForNewData` fait `load` puis `store` au lieu de `exchange` (`Analyser.h:104-109`) : une trame peut être manquée, sans gravité.
4. `newDataAvailable` n'a pas d'initialiseur explicite (`Analyser.h:141`) ; valeur initialisée en C++20, indéterminée avant.

### La version évoluée : foleys_gui_magic

Le même auteur a repris cet analyseur dans `foleys_gui_magic` (BSD 3, dernier commit 2026-08-15, déjà cité dans `07_A_REPRENDRE.md`), fichier `modules/foleys_gui_magic/Visualisers/foleys_MagicAnalyser.{h,cpp}`. Différences utiles :

1. Plus de `WaitableEvent` : le calcul est un `TimeSliceClient` sur un thread commun qui interroge la FIFO (`useTimeSlice`, `foleys_MagicAnalyser.cpp:159`). Le thread audio ne fait plus qu'écrire dans l'`AbstractFifo`.
2. Lissage par balistique : montée instantanée, décroissance multiplicative de 0,8 par trame (`:181-193`), commentée `FIXME: calculate by fft size and sampleRate`.
3. Choix du canal analysé, ou somme.

Bug relevé au passage : la boucle de somme utilise `audioFifo.getNumChannels()` (toujours 1) au lieu du nombre de canaux d'entrée (`foleys_MagicAnalyser.cpp:140`), puis divise par le nombre de canaux d'entrée : en stéréo, seul le canal gauche est analysé, atténué de moitié.

## B4. Les courbes de réponse de l'EQ et l'interaction

### Calcul des courbes

1. Six bandes fixes, chacune un `ProcessorDuplicator<IIR::Filter, IIR::Coefficients>` dans un `ProcessorChain` suivi d'un `dsp::Gain` (`Source/FrequalizerProcessor.h:160-162`). Douze types (`FilterType`, `:22-37`), tous des biquads ou premiers ordres des fabriques `IIR::Coefficients::make*` (`Source/FrequalizerProcessor.cpp:442-486`).
2. Grille de 300 fréquences `20 × 2^(i/30)` : dix octaves, 30 points par octave (`Source/FrequalizerProcessor.cpp:156-160`).
3. À chaque changement de paramètre, `updateBand` calcule la réponse de la bande avec `Coefficients::getMagnitudeForFrequencyArray` (`:506-508`), puis `updatePlots` multiplie les réponses des bandes actives (ou de la seule bande en solo) par le gain de sortie pour obtenir la courbe totale (`:516-532`), et `sendChangeMessage()` prévient l'éditeur.

### Tracé

1. `createFrequencyPlot` (`Source/FrequalizerProcessor.cpp:550-559`) : x linéaire en indice (donc logarithmique en fréquence grâce à la grille), y = centre − `pixelsPerDouble × log2 (magnitude)`, soit une échelle linéaire en dB.
2. `pixelsPerDouble = 2 × hauteur / decibelsToGain (24)` (`Source/FrequalizerEditor.cpp:266`) : l'échelle ±24 dB est approchée par une formule détournée, alors que les poignées utilisent un `jmap` exact en dB (`:294-302`). Les deux coïncident à peu près sans être identiques ; à unifier.
3. Une courbe par bande en couleur (atténuée si inactive), plus la courbe totale en gris ; par bande, une ligne verticale et un point à (fréquence, gain) (`Source/FrequalizerEditor.cpp:113-127`). Grille de 10 octaves et repères à ±12 et ±24 dB (`:79-99`).

### Interaction

1. `mouseMove` repère la bande dont l'abscisse est à moins de 4 px (`clickRadius`) du curseur ; si l'ordonnée l'est aussi, le glisser modifie aussi le gain (curseur quatre flèches), sinon seulement la fréquence (`Source/FrequalizerEditor.cpp:195-232`).
2. `mouseDrag` convertit la position en fréquence (`20 × 2^(10 × pos)`) et en gain, puis appelle `Slider::setValue (..., sendNotification)` sur les potentiomètres de la bande (`:234-243`, `:418-426`) : le paramètre passe par l'attachment APVTS.
3. Double clic : bascule "active" de la bande via `setValueNotifyingHost` (`:245-262`).
4. Clic droit : menu des types de filtre (`:164-193`).
5. Le panneau de chaque bande (`BandEditor`) a type, fréquence, Q, gain, solo et activation, grisés selon le type (`:367-411`).

### Défauts relevés

1. **Temps réel** : `parameterChanged` est appelé sur le thread qui modifie le paramètre, donc parfois le thread audio (automation). `updateBand` y alloue des `Coefficients` sur le tas (`Source/FrequalizerProcessor.cpp:445-486`), prend `getCallbackLock()` (`:492`), calcule 300 magnitudes et appelle `sendChangeMessage()` (`:531`), qui poste un message. Depuis l'UI, le même verrou bloque le thread audio.
2. **Courses de données** : `bands[i].magnitudes`, `magnitudes` et les champs de `Band` sont écrits par le thread du paramètre et lus par `paint` sans synchronisation ; `setBandSolo` modifie les drapeaux de contournement du `ProcessorChain` depuis l'UI pendant que l'audio les lit (`:390-415`).
3. **Gestes** : le glisser n'appelle pas `beginChangeGesture`/`endChangeGesture`. Comme le potentiomètre n'est pas lui même tenu, l'attachment traite chaque `setValue` comme un geste complet : l'hôte reçoit des dizaines de gestes par glisser (automation en écriture et undo de l'hôte pollués).
4. **Test de clic faux** : dans `mouseDown`, la parenthèse est mal placée : `getPositionForFrequency (float (int (band->frequency)) * plotFrame.getWidth())` multiplie la fréquence par la largeur avant le logarithme (`Source/FrequalizerEditor.cpp:173`). Le menu contextuel ne s'ouvre presque jamais sur la bonne bande.
5. **État** : pas de numéro de version ; `setStateInformation` affecte `state.state` directement et peut appeler `setSize` sur l'éditeur hors du thread message (`:585-600`) ; le solo n'est pas sauvé (acceptable, c'est un réglage de session).
6. Aucun lissage des coefficients : changer un paramètre pendant la lecture remplace les coefficients d'un coup (clic possible sur les gros sauts de gain ou de fréquence).

## B5. Ce qu'on peut extraire

| Élément | Où | Ce qu'on garde | Ce qu'on change |
| --- | --- | --- | --- |
| Analyseur | `Source/Analyser.h` ou mieux `foleys_MagicAnalyser.*` | `AbstractFifo` mono, FFT 4096, Hann normalisée, recouvrement 50 %, mapping `binToY` et `indexToX` | Pas de `signal()` côté audio (sondage par timer ou `TimeSliceClient`), pas de `getActiveEditor()` (drapeau atomique "analyseur visible" écrit par l'éditeur), FIFO dimensionnée une fois pour le pire cas, moyenne des canaux, balistique dépendante du taux et de la taille de FFT, décimation des bins aigus. Mieux encore : un `farbot::fifo` ou `AbstractFifo` et un thread de fond qui produit un tableau de magnitudes, échangé avec l'UI par `farbot::RealtimeObject`. |
| Courbe d'EQ | `Source/FrequalizerProcessor.cpp:156-160, 506-532, 550-559` | Grille log de fréquences, `getMagnitudeForFrequencyArray`, produit des réponses, tracé en dB | Calcul **dans l'UI** (thread message) à partir des valeurs de paramètres lues dans l'APVTS, jamais dans `parameterChanged`. Une seule fonction de mapping dB vers pixel. |
| Interaction | `Source/FrequalizerEditor.cpp:195-302` | Détection de poignée, glisser fréquence/gain, double clic, menu contextuel, formules `getPositionForFrequency` et inverses | Gestes encadrés (`beginChangeGesture` au `mouseDown`, `endChangeGesture` au `mouseUp`), écriture directe des paramètres (`setValueNotifyingHost` sur la valeur normalisée) plutôt que par les potentiomètres, correction de la parenthèse de `:173`, rayon de clic mis à l'échelle (150 %, 200 %). |
| Mise à jour des filtres côté audio | `Source/FrequalizerProcessor.cpp:442-514` | Liste des types et appels `make*` | Dans `processBlock` : snapshot `Params`, recalcul des coefficients seulement si changement, sans allocation (coefficients calculés en `std::array` dans `dsp/`, ou `IIR::ArrayCoefficients` qui renvoie un tableau par valeur), lissage. |

---

# À reprendre

Rappel : MIT et BSD 3 sont compatibles avec les deux choix de licence de nos plugins. Toute reprise de code garde la notice d'origine et une ligne dans `docs/DEPENDENCIES.md` du projet.

## 1. Code à extraire

| N° | Quoi | Source | Licence | Couche chez nous | Remarque |
| --- | --- | --- | --- | --- | --- |
| 1 | Oscillateur scie band limité par intégration de sinc, SVF à saturation douce, enveloppes un pôle, gestion de 8 voix et découpage du bloc par événement MIDI | `JX10/Source/PluginProcessor.cpp` | MIT | `dsp/` (oscillateurs, filtre, enveloppes, voix) et `plugin/` (lecture du `MidiBuffer`) | Pour un synthé simple. Réécrit en TDD, coefficients dépendant du taux d'échantillonnage, lissage ajouté. |
| 2 | Générateur de signaux de test (sinus, bruit blanc, bruit rose filtré, balayages log et lin, impulsion) | `TestTone/Source/PluginProcessor.cpp` | MIT | `tools/` et `tests/dsp/` | Pour `tools render` et les tests ; `rand()` remplacé par un générateur seedable. |
| 3 | Pitch shifter à deux têtes et fenêtre de Hann | `Detune/Source/PluginProcessor.cpp:70-251` | MIT | `dsp/` | Latence déclarée par `plugin/` via `setLatencySamples` ; fenêtre précalculée pour toutes les tailles au `prepare`. |
| 4 | Dither TPDF, TPDF passe haut, noise shaping du second ordre | `Dither/Source/PluginProcessor.cpp:67-220` | MIT | `dsp/` | Générateur seedable. |
| 5 | Matrice M/S et réglages de largeur | `Image/Source/PluginProcessor.cpp:69-163` | MIT | `dsp/` | Gains lissés. |
| 6 | Crossover 3 bandes un pôle reconstructible et waveshaper `x/(1 + d·|x|)` | `Bandisto/Source/PluginProcessor.cpp:69-223` | MIT | `dsp/` | Oversampling autour du waveshaper (règle `dsp.md`). |
| 7 | FM deux opérateurs avec LFO récursif | `DX10/Source/PluginProcessor.cpp` | MIT | `dsp/` et `plugin/` | Si un synthé FM est au programme. |
| 8 | Fonctions de mapping de l'analyseur et de la courbe (`indexToX`, `binToY`, `getPositionForFrequency`, `getFrequencyForPosition`, `getPositionForGain`, `getGainForPosition`) | `Source/Analyser.h:113-124`, `Source/FrequalizerEditor.cpp:284-302` | BSD 3 | `ui/` | Une seule implémentation partagée analyseur et courbe. |
| 9 | Boucle d'analyse FFT (fenêtre, FFT, magnitudes, balistique) | `foleys_MagicAnalyser.cpp:159-197` (de préférence à `Source/Analyser.h:59-88`) | BSD 3 | `ui/` (thread de fond côté éditeur) avec l'écriture FIFO dans `plugin/` | Corriger la somme des canaux (`:140`) et le `FIXME` de la décroissance. |
| 10 | Calcul de la courbe d'EQ (grille log, `getMagnitudeForFrequencyArray`, produit des bandes) | `Source/FrequalizerProcessor.cpp:156-160, 506-532` | BSD 3 | `ui/` | Exécuté sur le thread message à partir de l'APVTS. |
| 11 | Interaction de glisser des bandes dans le graphe | `Source/FrequalizerEditor.cpp:164-262` | BSD 3 | `ui/` | Avec gestes encadrés et correction de `:173`. |

## 2. Idées

| N° | Idée | Vu dans | Licence | Couche chez nous |
| --- | --- | --- | --- | --- |
| 1 | Séparer paramètres "cuits" (`update()`) et état de rendu, copier en locales dans la boucle : c'est notre `Params` + état de la classe DSP. | mda, README racine | MIT | `plugin/` (snapshot) et `dsp/` |
| 2 | Paramètres en unités naturelles avec skew plutôt que des formules sur 0..1. | mda, README racine ("Parameter calculations") | MIT | `plugin/` |
| 3 | Taux de contrôle réduit (32 ou 100 échantillons) pour enveloppes, LFO et glide. Compatible avec nos paquets internes de 32 échantillons. | JX10, DX10 | MIT | `dsp/` |
| 4 | Commentaire "how this works" en tête de chaque boucle DSP, avec doutes et bugs corrigés : notre règle "le pourquoi et la source" appliquée. | Tout mda | MIT | `dsp/` |
| 5 | Analyseur entrée et sortie superposés sur la courbe d'EQ, repeint seulement quand une trame arrive. | Frequalizer | BSD 3 | `ui/` |
| 6 | N'alimenter l'analyseur que si l'éditeur est visible, via un drapeau atomique écrit par l'éditeur (et non `getActiveEditor()`). | Frequalizer, corrigé | BSD 3 | `plugin/` et `ui/` |
| 7 | Grisage des contrôles selon le type de filtre (`updateControls`). | Frequalizer `Source/FrequalizerEditor.cpp:367-411` | BSD 3 | `ui/` |
| 8 | Solo de bande hors état sauvé (réglage de session), à lister dans "ce qui n'est pas dans les presets". | Frequalizer | BSD 3 | `plugin/` |

## 3. À éviter

| N° | À éviter | Où | Licence | Couche concernée | Pourquoi |
| --- | --- | --- | --- | --- | --- |
| 1 | `WaitableEvent::signal()` depuis `processBlock` | `Source/Analyser.h:47` | BSD 3 | `plugin/` | Verrou (`std::mutex`) sur le thread audio. |
| 2 | `getActiveEditor()` dans `processBlock` | `Source/FrequalizerProcessor.cpp:290,301` | BSD 3 | `plugin/` | Accès à l'éditeur depuis le processeur, non thread safe. |
| 3 | Recalcul des coefficients, allocation, `getCallbackLock()` et `sendChangeMessage()` dans `parameterChanged` | `Source/FrequalizerProcessor.cpp:335-365, 442-532` | BSD 3 | `plugin/` | Allocation et verrou possibles sur le thread audio, blocage de l'audio par l'UI. |
| 4 | Glisser sans `begin/endChangeGesture` | `Source/FrequalizerEditor.cpp:234-243` | BSD 3 | `ui/` | Automation et undo de l'hôte pollués. |
| 5 | `OpenGLContext` pour un tracé 2D simple | `Source/FrequalizerEditor.cpp:44-46` | BSD 3 | `ui/` | Inutile, déprécié sur macOS, dépendance EGL sous Linux avec JUCE 9. |
| 6 | Logos, `SocialButtons.h`, noms "Frequalizer" et "Foleys Finest" | `Resources/`, `Source/SocialButtons.h` | BSD 3 (clause 3) et marques tierces | `ui/` | Image de marque d'autrui. |
| 7 | `rand()` / `std::rand()` dans le DSP | `RezFilter/...:166,241`, `Dither/...:171,176`, `TestTone/...:313`, `BeatBox/...:112,144` | MIT | `dsp/` | Non seedable, non garanti temps réel ; règle `dsp.md`. |
| 8 | Paramètres non lissés et `update()` complet à chaque bloc | Tout mda | MIT | `dsp/` et `plugin/` | Zipper noise ; coefficients à recalculer seulement sur changement (règle `dsp.md`). |
| 9 | Longueurs de délai en échantillons fixes | `Ambience/...:105-111`, `Stereo/...:47-54` | MIT | `dsp/` | Son dépendant du taux d'échantillonnage. |
| 10 | Latence et queue non déclarées | Detune (latence), Delay et Ambience (queue) | MIT | `plugin/` | Règle `juce.md` (`setLatencySamples`, `getTailLengthSeconds`). |
| 11 | Filtres de RezFilter et SVF de Chamberlin non protégés près de Nyquist | `RezFilter/Source/PluginProcessor.cpp:178-186` | MIT | `dsp/` | Instables selon l'auteur ; prendre `juce::dsp::StateVariableTPTFilter` ou un SVF TPT. |
| 12 | `new[]`/`delete[]` nus dans `prepareToPlay`/`releaseResources` | `Ambience/Source/PluginProcessor.cpp:44-57` | MIT | `dsp/` | Fuite si `prepareToPlay` est rappelé ; règle `cpp.md` (RAII). |
| 13 | Projets `.jucer` | Tout mda | MIT | build | On reste sur CMake (Pamplejuce) ; on ne reprend que le DSP. |
