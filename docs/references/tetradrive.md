# TetraDrive : lecture du code

**Verdict.** Petit effet très lisible (environ 6 000 lignes hors JUCE) dont il faut reprendre trois idées précises : un moteur DSP en headers sans JUCE testé par un exécutable autonome, l'automation sample accurate découpée en segments avec rampes linéaires entre points, et une cascade d'oversampling dont la latence tombe sur un nombre entier d'échantillons ; il ne faut reprendre ni son JUCE copié en entier dans le dépôt, ni son absence totale de CI, ni son bypass qui ignore la latence d'oversampling.

Étudié au commit `b765b31` (1.1.1, 2026-10-18). Les numéros de ligne renvoient à ce commit ; les liens pointent sur `main` et peuvent dériver. Licence AGPL v3 : rien n'est copié ici, seules les idées sont décrites. Le code n'a pas été compilé pour cette analyse : tout ce qui suit vient de la lecture des sources.

## 1. Fiche

| Point | Constat |
| --- | --- |
| Langage | C++17 ([`CMakeLists.txt:15`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L15)), CMake 3.22 minimum ([`CMakeLists.txt:1`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L1)) |
| JUCE | 9.0.4, copié en entier dans `external/JUCE` (4 811 fichiers suivis par git, pas un sous module), patch déjà appliqué dans la copie |
| Code propre au projet | `src/` : 4 headers DSP sans JUCE (1 310 lignes) ; `Source/` : processeur, presets, analyseur et UI JUCE |
| Tests | Un seul exécutable, [`tests/EngineTest.cpp`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp), 5 tests |
| CI | Aucune : pas de dossier `.github/` |
| Formatage | Pas de `.clang-format` |

## 2. Structure CMake

| Cible | Contenu | Dépend de JUCE |
| --- | --- | --- |
| `TetraDrive` (`juce_add_plugin`) | `Source/*.cpp` ; inclut `src/` en headers ([`CMakeLists.txt:79-94`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L79-L94)) | Oui |
| `TetraDriveData` | Ressources binaires, dont `CHANGELOG.md` lui même pour la page About ([`CMakeLists.txt:64-77`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L64-L77)) | Oui |
| `td_engine_test` | `tests/EngineTest.cpp` + include de `src/`, rien d'autre ([`CMakeLists.txt:117-128`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L117-L128)) | **Non** |

Il n'y a pas de bibliothèque `dsp` au sens CMake : le DSP est entièrement en headers (`td_dsp.h`, `td_oversample.h`, `td_params.h`, `td_tables.h`), ce qui suffit pour que le test le compile seul. Le test active `-Wall -Wextra -Wconversion -Wsign-conversion` (ou `/W4`), plus strict que le plugin, qui se contente de `juce_recommended_warning_flags`. Les tests sont derrière l'option `TD_BUILD_TESTS`, **désactivée par défaut** ([`CMakeLists.txt:117`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L117)), et enregistrés avec un simple `add_test`.

La version vient du premier titre `## [x.y.z]` de `CHANGELOG.md`, lu par `file(STRINGS ... REGEX)` ; la configuration échoue s'il n'y en a pas, et `CMAKE_CONFIGURE_DEPENDS` relance la configuration quand le changelog change ([`CMakeLists.txt:3-13`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L3-L13), [`:26`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L26)). Le hash git court et la date sont injectés comme définitions ([`CMakeLists.txt:29-36`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L29-L36)). Le `.rc` Windows généré par JUCE est supprimé à la configuration pour forcer sa régénération quand la version change ([`CMakeLists.txt:60-62`](https://github.com/dadda123/TetraDrive/blob/main/CMakeLists.txt#L60-L62)).

Le macro `TD_HEADLESS_TEST` testé dans [`Source/PluginProcessor.cpp:3`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L3) n'est défini par aucune cible : c'est un reste d'un test du processeur sans éditeur qui n'existe plus.

## 3. Tests

Framework maison : une fonction `check(bool, const char*)` qui imprime PASS/FAIL et incrémente un compteur, code de sortie 1 en cas d'échec ([`tests/EngineTest.cpp:11-16`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L11-L16)). Pas de Catch2. Les mesures se font par Goertzel sur une fréquence centrée sur un bin et un nombre entier de périodes ([`:21-32`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L21-L32)).

| Test | Ce qu'il vérifie | Tolérance |
| --- | --- | --- |
| `testResamplerTransparency` ([`:35-78`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L35-L78)) | Une impulsion qui monte puis redescend par 1, 2, 3 étages arrive exactement à la latence annoncée, gain DC unitaire, forme conservée | pic à l'échantillon exact ; DC à 1e-3 ; pic > 0,95, reste < 0,2 |
| `testAliasing` ([`:82-125`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L82-L125)) | Sinus 5 kHz, +20 dB d'entrée, +24 dB de drive à 44,1 kHz : l'énergie aux 5 bins de repli connus baisse d'au moins 20 dB avec 2x, 4x, 8x ; fondamentale et H3 inchangées | ≥ 20 dB de réduction ; fondamentale < 1 dB ; H3 < 1,5 dB |
| `testEngineLatency` ([`:129-166`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L129-L166)) | À bas niveau (shaper quasi linéaire), la sortie suréchantillonnée égale la sortie non suréchantillonnée décalée de `latencySamples()` | erreur relative < -50 dB |
| `testHeat` ([`:170-212`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L170-L212)) | Le mètre de saturation est monotone avec le drive, ~0 pour une bande calme, indépendant du niveau de bande et quasi identique avec 4x | < 0,001 ; > 0,3 ; 1 dB ; 0,01 dB |
| `testFlatCrossover` ([`:216-286`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L216-L286)) | La somme des 4 bandes LR4 égale les coupes basse et haute seules ; les voisines se croisent à -6,02 dB ; le chemin temporel du moteur suit la réponse analytique ; le mode Classic montre bien une ondulation | 0,01 dB ; 0,1 dB ; 0,05 dB ; > 0,5 dB |

Ce qui est bien : chaque attendu vient d'une propriété physique (retard pur, somme passe tout, repli spectral calculé) et non d'une réimplémentation ; les tolérances sont explicites ; un test vérifie que le signal de test produit bien le défaut qu'on veut voir disparaître ([`:116`](https://github.com/dadda123/TetraDrive/blob/main/tests/EngineTest.cpp#L116)). Ce qui manque : aucun test d'indépendance à la taille de bloc, aucun test du découpage sample accurate (il vit dans `Source/`, donc avec JUCE), aucun test d'état ni de presets, aucune référence audio.

## 4. Thread audio

### Des paramètres au DSP

Il n'y a **pas de struct snapshot** comme chez Drum Foundry. Le processeur garde un tableau `applied_` des dernières valeurs normalisées envoyées au moteur et, à chaque bloc, appelle `applyParam` uniquement pour ce qui a changé ([`Source/PluginProcessor.cpp:166-171`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L166-L171)). `applyParam` convertit en valeur réelle et appelle un setter de cible du moteur (`setBandDriveTarget`, `setEdgeTargets`, etc.) avec une durée de rampe ([`:92-131`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L92-L131)). Les valeurs sont lues par `getValue()` des paramètres JUCE, qui est atomique.

Une spécification unique des paramètres, sans JUCE, vit dans [`src/td_params.h:16-74`](https://github.com/dadda123/TetraDrive/blob/main/src/td_params.h#L16-L74) : id, nom, unité, plage, défaut, pas, échelle log, texte d'aide. Le processeur construit la mise en page APVTS à partir d'elle ([`Source/PluginProcessor.cpp:23-45`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L23-L45)) et vérifie par `jassert` que l'index JUCE de chaque paramètre égale son index dans l'enum ([`:55`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L55)). Formatage et parsing du texte affiché sont aussi sans JUCE ([`src/td_params.h:87-130`](https://github.com/dadda123/TetraDrive/blob/main/src/td_params.h#L87-L130)).

### Automation sample accurate

1. Le wrapper VST3 patché appelle `addParameterPoint` pour chaque point de la file, avant `processBlock` ([`Source/PluginProcessor.cpp:83-86`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L83-L86)).
2. Les points vont dans `SampleAccurateEvents`, un `std::array` de 4 096 événements (offset, index, valeur) sans allocation ; au delà, les points sont perdus ([`Source/SampleAccurateEvents.h:14-21`](https://github.com/dadda123/TetraDrive/blob/main/Source/SampleAccurateEvents.h#L14-L21)).
3. Tri par insertion stable au début du bloc ([`:24-34`](https://github.com/dadda123/TetraDrive/blob/main/Source/SampleAccurateEvents.h#L24-L34)).
4. Les paramètres sans points prennent leur valeur de début de bloc (cas de l'UI et de l'AU) ([`Source/PluginProcessor.cpp:166-171`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L166-L171)).
5. Chaque paramètre continu démarre une rampe du début de bloc jusqu'à son premier point ([`:173-180`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L173-L180)).
6. Le bloc est découpé aux offsets des points ; à chaque offset, un paramètre discret (forme, solo, oversampling, mode de crossover, bypass) bascule, et un continu démarre une rampe vers son point suivant, d'une durée égale à l'écart entre les deux points ([`:182-207`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L182-L207)).

C'est une lecture correcte de la sémantique VST3 (les points décrivent des segments linéaires). Une rampe explicite ne descend pas sous 16 échantillons ([`src/td_dsp.h:506`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L506), [`:513-516`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L513-L516)).

### Lissage

Une seule primitive, `Ramp`, linéaire, qui retombe exactement sur la cible ([`src/td_dsp.h:247-275`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L247-L275)). Chaque bloc écrit les rampes dans des buffers par échantillon pré alloués, puis la boucle de traitement les lit.

| Grandeur | Durée par défaut | Où |
| --- | --- | --- |
| Gains (entrée, sortie, drive, niveau de bande) | 20 ms, minimum 64 échantillons | [`src/td_dsp.h:502`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L502), [`:505`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L505) |
| Changement de forme de waveshaper | crossfade entre les deux tables, 10 ms | [`:401-410`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L401-L410) |
| Solo et bypass | crossfade des poids de bandes et du dry, 10 ms | [`:413-419`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L413-L419) |
| Fréquences de coupure | 30 ms, interpolées en log2(Hz), coefficients recalculés tous les 16 échantillons pendant le glissement | [`:289`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L289), [`:422-437`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L422-L437), [`:459-474`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L459-L474), [`:543-558`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L543-L558) |

L'invariant des crossovers est appliqué dans le moteur, pas dans le processeur : `setEdgeTargets` trie les 5 fréquences puis impose un écart minimal de 1/12 d'octave entre voisines ([`src/td_dsp.h:422-428`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L422-L428), constante en [`:290`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L290)). L'automation peut donc croiser deux crossovers sans inverser les bandes.

### Dénormaux, mètres, analyseur, latence

1. `juce::ScopedNoDenormals` en tête de `processInternal` ([`Source/PluginProcessor.cpp:148`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L148)), et en plus remise à zéro des états IIR sous 1e-15 en fin de bloc ([`src/td_dsp.h:100-103`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L100-L103), [`:158`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L158)). Les filtres tournent en `double`.
2. Mètres crête : un `std::atomic<float>` par mètre ; l'audio fait un max par `compare_exchange_weak`, l'UI lit et remet à zéro par `exchange` ([`Source/LiveMeters.h:8-18`](https://github.com/dadda123/TetraDrive/blob/main/Source/LiveMeters.h#L8-L18)).
3. Analyseur : `juce::AbstractFifo` de 32 768 échantillons, rempli par l'audio, vidé et passé à la FFT par l'UI ([`Source/SpectrumAnalyzer.h:1`](https://github.com/dadda123/TetraDrive/blob/main/Source/SpectrumAnalyzer.h#L1), [`:47`](https://github.com/dadda123/TetraDrive/blob/main/Source/SpectrumAnalyzer.h#L47)).
4. Le changement de facteur d'oversampling arrive sur le thread audio (c'est un paramètre automatable) ; la latence est annoncée à l'hôte depuis le message thread par un `AsyncUpdater` ([`Source/PluginProcessor.cpp:118-124`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L118-L124), [`Source/PluginProcessor.h:84`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.h#L84)).
5. `Engine::reserve` alloue pour la taille de bloc annoncée (minimum 64) dans `prepareToPlay` ; un bloc plus grand est traité en morceaux de cette capacité ; si `prepare` n'a jamais été appelé, `process` alloue en secours ([`src/td_dsp.h:311-320`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L311-L320), [`:461`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L461)).

Pas d'objet lourd échangé à chaud : les tables de waveshaper sont des constantes générées ([`src/td_tables.h`](https://github.com/dadda123/TetraDrive/blob/main/src/td_tables.h)), donc ni `try_lock` ni FIFO d'objets.

## 5. Oversampling et latence

Implémentation maison dans [`src/td_oversample.h`](https://github.com/dadda123/TetraDrive/blob/main/src/td_oversample.h) :

1. Demi bande FIR symétrique de longueur 2L+1, fenêtre de Kaiser, ne stockant que les coefficients impairs ; les phases paires sont de simples retards ([`src/td_oversample.h:14-50`](https://github.com/dadda123/TetraDrive/blob/main/src/td_oversample.h#L14-L50)). Coefficients normalisés pour un gain DC exactement unitaire.
2. Trois étages en cascade : L = 47 (β = 8), puis 15 et 11 avec des L plus courts parce que les étages suivants ne protègent qu'une bande étroite ([`:117-124`](https://github.com/dadda123/TetraDrive/blob/main/src/td_oversample.h#L117-L124)).
3. **Astuce de latence entière** : chaque étage peut retarder sa sortie de `pad` échantillons pour que sa latence, ramenée à la fréquence de base, soit entière. Étage 1 : 47 ; étage 2 : (15 + 1) / 2 = 8 ; étage 3 : (11 + 1) / 4 = 3. D'où 47, 55, 58 échantillons pour 2x, 4x, 8x ([`:27-29`](https://github.com/dadda123/TetraDrive/blob/main/src/td_oversample.h#L27-L29), [`:125-132`](https://github.com/dadda123/TetraDrive/blob/main/src/td_oversample.h#L125-L132)).
4. Seule la table de waveshaping tourne à la fréquence haute. Le drive (linéaire) est appliqué avant la montée et le niveau de bande après la descente ([`src/td_dsp.h:662-714`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L662-L714)). Les filtres de bande restent à la fréquence de l'hôte.
5. Changer de facteur remet à zéro la mémoire des rééchantillonneurs, sans fondu ([`src/td_dsp.h:339-344`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L339-L344)). Le commentaire dit que c'est un choix de configuration, pas d'automation, mais le paramètre reste automatable.

La latence **change avec le réglage** (0, 47, 55, 58). C'est l'inverse de Drum Foundry, qui réserve le pire cas.

Pas de traitement par paquets fixes de 32 échantillons dans TetraDrive : seul le recalcul des coefficients pendant un glissement se fait par pas de 16.

## 6. Crossover Flat (Linkwitz-Riley)

Le mode Flat écrit chaque bande comme un produit de filtres appliqués à l'entrée : LR4 passe bas ou passe haut aux crossovers qui la bornent, et un passe tout biquad aux crossovers qui ne la concernent pas, de façon que la somme des 4 bandes soit un passe tout pur. Les coupes basse et haute sont appliquées une seule fois avant la séparation ([`src/td_dsp.h:108-117`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L108-L117), [`:204-221`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L204-L221)). Les biquads sont ceux du cookbook RBJ en Butterworth ([`:131-147`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L131-L147)). La même fonction de conception sert au moteur et à l'affichage ([`:486-499`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L486-L499)), ce qui garantit que la courbe dessinée est celle qu'on entend. Changer de mode recalcule et vide l'état des filtres, sans fondu ([`:330-334`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L330-L334)).

## 7. État, presets, migration

| Sujet | Comment | Où |
| --- | --- | --- |
| Format de session | XML de l'APVTS, plus un nœud `UI` (taille, réglages d'analyseur) et le nom du preset courant | [`Source/PluginProcessor.cpp:244-258`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L244-L258) |
| Version | La version du plugin est écrite (`version`), mais **jamais relue** | même endroit |
| Migration | Par présence : chaque paramètre absent de la session reçoit son défaut, sauf l'oversampling qui reçoit Off (0) au lieu de 2x pour qu'une session 1.0.0 ne gagne pas de latence | [`:277-286`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L277-L286) |
| Crossover des anciennes sessions | Classic parce que c'est le défaut (index 0), pas par une règle de migration | [`src/td_params.h:72`](https://github.com/dadda123/TetraDrive/blob/main/src/td_params.h#L72) |
| Presets | Fichiers XML `.tdpreset` dans le dossier utilisateur ; valeurs stockées **en unités réelles** (Hz, dB) par id, donc robustes à un changement de plage ; valeur manquante = défaut | [`Source/PresetManager.cpp:61-96`](https://github.com/dadda123/TetraDrive/blob/main/Source/PresetManager.cpp#L61-L96) |
| Hors presets | Solo et Oversampling, déclarés par une fonction unique | [`Source/PresetManager.h:37-38`](https://github.com/dadda123/TetraDrive/blob/main/Source/PresetManager.h#L37-L38) |
| Version de preset | `formatVersion = 1` écrite pour de futures migrations, non lue aujourd'hui | [`Source/PresetManager.h:33-34`](https://github.com/dadda123/TetraDrive/blob/main/Source/PresetManager.h#L33-L34) |
| Version des paramètres JUCE | `ParameterID{id, 1}` pour tous, y compris ceux ajoutés en 1.1.0 | [`Source/PluginProcessor.cpp:27`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L27) |
| Modifié ou non | Comparaison des valeurs réelles avec un instantané, tolérance de 1e-4 de la plage | [`Source/PresetManager.cpp:121-130`](https://github.com/dadda123/TetraDrive/blob/main/Source/PresetManager.cpp#L121-L130) |

## 8. CI

Il n'y en a pas. Le README décrit une construction manuelle avec les générateurs Visual Studio et Xcode ; ni pluginval, ni tests automatisés, ni release sur tag.

## 9. Le patch JUCE

Fichier : [`patches/juce-vst3-sample-accurate.patch`](https://github.com/dadda123/TetraDrive/blob/main/patches/juce-vst3-sample-accurate.patch), 59 lignes de diff, trois fichiers, environ 30 lignes ajoutées et aucune supprimée.

| Fichier JUCE | Changement |
| --- | --- |
| `juce_audio_plugin_client/juce_audio_plugin_client_VST3.cpp`, dans `processParameterChanges` (ligne ~3533 de JUCE 9.0.4) | Dans la branche qui lit le dernier point de la file d'un paramètre, ajoute avant `setValueAndNotifyIfChanged` : si l'instance est un `SampleAccurateParameterSink` (par `dynamic_cast`), parcourir tous les points de la file et appeler `addParameterPoint(param, offset, valeur)`. Le comportement JUCE d'origine (fixer la valeur finale) est conservé. |
| `juce_audio_processors_headless/juce_audio_processors_headless.h` | Une ligne d'include du nouveau header. |
| `juce_audio_processors_headless/utilities/juce_SampleAccurateParameterSink.h` (nouveau) | Interface d'une méthode virtuelle `noexcept`, appelée sur le thread audio avant `processBlock`. |

Conséquences et risques à la mise à jour de JUCE :

1. Le patch touche une fonction interne du wrapper VST3 qui change souvent entre versions ; le contexte du diff (numéros de ligne, forme du lambda `getPointFromQueue`, garde `JUCE_VST3_EMULATE_MIDI_CC_WITH_PARAMETERS`) devra être recalé à la main.
2. Il dépend du module `juce_audio_processors_headless`, qui n'existe que dans le découpage de modules de JUCE 9 ; il ne s'applique pas tel quel à JUCE 8.
3. Le comportement n'existe qu'en VST3. En AU, en Standalone et pour les changements venus de l'UI, le plugin retombe sur la valeur de début de bloc ([`Source/PluginProcessor.cpp:166`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L166)). Les tests ne couvrent pas ce chemin.
4. Le `dynamic_cast` est fait sur le thread audio pour chaque paramètre modifié de chaque bloc. C'est borné et peu coûteux, mais un pointeur mis en cache une fois serait plus propre.
5. Comme JUCE est copié dans le dépôt avec le patch déjà appliqué, rien ne vérifie que `patches/` et `external/JUCE` restent cohérents ; le README demande seulement de faire `git apply` après une mise à jour.

## 10. Points faibles, à ne pas reprendre

1. **Bypass non compensé en latence.** Le signal dry du bypass et du crossfade de routage est l'entrée non retardée ([`src/td_dsp.h:645-659`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L645-L659), [`:731-733`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L731-L733)), alors que la latence annoncée reste celle de l'oversampling. Avec 2x, le signal bypassé arrive donc 47 échantillons trop tôt après compensation de l'hôte, et le fondu de 10 ms mélange deux signaux décalés (filtrage en peigne pendant le fondu). `processBlockBypassed` passe par le même chemin ([`Source/PluginProcessor.cpp:143-145`](https://github.com/dadda123/TetraDrive/blob/main/Source/PluginProcessor.cpp#L143-L145)).
2. **Latence variable et automatable.** Le facteur d'oversampling est un paramètre hôte, basculé à l'échantillon près, qui vide la mémoire des filtres (clic) et change la latence en cours de lecture.
3. **Changement de mode de crossover sans fondu** ([`src/td_dsp.h:330-334`](https://github.com/dadda123/TetraDrive/blob/main/src/td_dsp.h#L330-L334)).
4. **Tri par insertion sur le thread audio** : borné, mais quadratique jusqu'à 4 096 événements dans le pire cas ([`Source/SampleAccurateEvents.h:24-34`](https://github.com/dadda123/TetraDrive/blob/main/Source/SampleAccurateEvents.h#L24-L34)). Les files VST3 étant déjà triées par paramètre, une fusion de k listes triées suffirait.
5. **Recalcul de coefficients coûteux** pendant un glissement de crossover : conception complète par transformée bilinéaire (tan, produits de polynômes) tous les 16 échantillons et pour plusieurs bandes. Acceptable ici, à mesurer chez nous.
6. **JUCE copié en entier dans le dépôt**, sans sous module ni tag vérifiable.
7. **Pas de CI, pas de pluginval, tests désactivés par défaut.**
8. **Version d'état écrite mais jamais lue** ; la migration repose sur l'absence d'un paramètre, ce qui ne permet pas de corriger un changement de sens d'une valeur existante.
9. **`ParameterID` toujours en version 1** alors que des paramètres ont été ajoutés en 1.1.0.
10. Macro `TD_HEADLESS_TEST` morte.

## À reprendre dans nos plugins

1. **DSP en headers ou en bibliothèque sans JUCE, plus une spécification de paramètres sans JUCE.** Chez nous : cible `dsp` dans CMake, et un `ParamSpec` constexpr (id, plage, défaut, unité, texte) dans `dsp/` d'où `plugin/Parameters.cpp` génère la mise en page APVTS. Un test Catch2 fige la liste des ids et vérifie que l'index JUCE de chaque paramètre égale son index de spécification, comme le `jassert` de TetraDrive, mais en test.
2. **Tests DSP par propriétés physiques.** Reprendre les quatre familles : impulsion qui ressort à la latence annoncée, sortie suréchantillonnée égale à la sortie simple décalée, repli spectral mesuré aux bins calculés, somme de crossover égale à un passe tout. Mesure par Goertzel ou par `juce::dsp::FFT` dans les tests de `plugin/` ; dans les tests de `dsp/`, une petite fonction Goertzel écrite en TDD.
3. **Automation sample accurate par segments.** Si l'ADR ouvert dans `STATE.md` conclut qu'on en a besoin : un patch JUCE à nous dans `patches/`, avec une ligne d'explication, qui expose les points VST3 ; côté plugin, une liste d'événements de capacité fixe (`std::array`), une fusion des files déjà triées plutôt qu'un tri par insertion, un découpage du bloc aux offsets et des rampes linéaires entre points. Le pointeur vers l'interface puits est mis en cache à la construction. Un test de `plugin/` simule une file de points et vérifie la valeur à chaque offset.
4. **Cascade d'oversampling à latence entière.** Utiliser `juce::dsp::Oversampling` avec `useIntegerLatency = true`, qui fait le même travail ; ne coder une cascade maison que si un benchmark le justifie. Garder l'idée de n'oversampler que la non linéarité, le gain linéaire appliqué avant la montée et après la descente.
5. **Latence constante plutôt que variable.** Ne pas reprendre la latence variable de TetraDrive ; si le facteur d'oversampling est un réglage, compléter par une ligne à retard jusqu'à la latence du pire cas (idée de Drum Foundry) et rendre le paramètre non automatable (`AudioParameterChoiceAttributes().withAutomatable(false)`).
6. **Bypass compensé.** Le chemin dry passe par une ligne à retard de la latence annoncée. Test : en bypass, la sortie égale l'entrée décalée de `getLatencySamples()`.
7. **Invariants de paramètres dans le snapshot.** Tri puis écart minimum (1/12 d'octave) appliqués quand on remplit `Params`, avec un test qui envoie des crossovers croisés et vérifie l'ordre.
8. **Glissement des fréquences en domaine logarithmique**, coefficients recalculés à intervalle fixe. JUCE `SmoothedValue<float, ValueSmoothingTypes::Multiplicative>` lisse déjà en log ; recalculer les coefficients tous les N échantillons, N fixé et documenté.
9. **Crossover Linkwitz-Riley qui somme à plat.** `juce::dsp::LinkwitzRileyFilter` fournit passe bas, passe haut et passe tout du 4e ordre ; reprendre seulement le schéma (passe tout de compensation sur les crossovers qui ne bornent pas la bande, coupes appliquées avant la séparation) et le test de somme plate.
10. **Une seule fonction de conception de filtre pour le DSP et l'affichage.** La courbe de l'UI appelle la même fonction que le moteur, jamais une copie.
11. **Mètres et analyseur.** Crête par `std::atomic<float>` avec max par compare exchange et lecture par `exchange(0)` ; échantillons d'analyseur par `juce::AbstractFifo` ou `farbot::fifo`.
12. **Presets en unités réelles par id**, valeur absente = défaut, liste unique de ce qui n'est pas dans les presets. Évaluer d'abord le module de presets de chowdsp_utils (BSD) avant d'écrire un gestionnaire.
13. **Version tirée de `CHANGELOG.md`** par `file(STRINGS ... REGEX)` avec échec explicite et `CMAKE_CONFIGURE_DEPENDS`, et le changelog compilé en ressource binaire pour la page About.
14. **Rampe qui retombe exactement sur la cible.** Si on écrit notre propre rampe, la tester sur ce point ; sinon `juce::SmoothedValue` le fait déjà.
