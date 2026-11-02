# Vital

**Verdict : Vital est un moteur de synthé remarquable (SIMD `poly_float`, graphe de processeurs presque sans JUCE, 64 slots de modulation pré câblés) mais c'est du GPL v3 figé depuis avril 2022, sur JUCE 6.0.5, Projucer et C++14, sans CI, avec plusieurs écarts à nos règles temps réel ; on n'en extrait du code que pour un plugin AGPL et en petites pièces (`poly_float`, mathématiques rapides, quelques filtres), et on en reprend surtout des idées de conception.**

Étude faite le 2026-11-02 sur `main` au commit [`636ca0e`](https://github.com/mtytel/vital/tree/636ca0ef517a4db087a6a08a6a8a5e704e21f836) (`git log -1 --format=%cd` : Wed Apr 20 16:53:39 2022 +0100). Les chemins `fichier:ligne` sont relatifs à la racine du dépôt et valent pour ce commit. Préfixe des liens : `https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/`, noté `B/` dans les tableaux.

## 1. Licences et restrictions

| Élément | Licence (fichier lu) | Conséquence chez nous |
| --- | --- | --- |
| Code de Vital (`src/`, `tests/`) | GPL v3 **ou ultérieure** : [`LICENSE`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/LICENSE) et en tête de chaque fichier, par exemple [`src/synthesis/framework/processor.h:1-15`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/processor.h#L1-L15) | Réutilisable dans un plugin AGPL v3 (la GPL v3 autorise la combinaison avec l'AGPL v3, section 13). Interdit dans un plugin fermé sans licence commerciale, que le README propose via licensing@vital.audio |
| Nom et marques | [`README.md`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/README.md) : interdit d'utiliser "Vital", "Vital Audio", "Tytel" ou "Matt Tytel" pour nommer ou promouvoir une distribution | Aucun nom de produit, de classe publique ou de texte marketing ne reprend ces noms |
| Services web | README : interdit de contacter `vital.audio`, `account.vital.audio`, `store.vital.audio` depuis ses propres builds | Ne jamais reprendre `src/common/authentication.h`, `download_section`, `update_check_section` |
| Presets d'usine | README : licence séparée, redistribution interdite. Ils **ne sont pas** dans le dépôt | Rien à prendre |
| Wavetables d'usine | Absentes du dépôt (aucun `.vitaltable` ni `.wav` hors `third_party`) | Rien à prendre ; seule la table par défaut est générée par le code |
| App Store iOS | README : interdit sans exception payante | Sans objet (VST3 seulement) |
| Polices `fonts/` | Un seul [`fonts/LICENSE`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/fonts/LICENSE), Apache 2.0, qui couvre Roboto, Open Sans, Droid Sans Mono. Lato et Montserrat sont sous SIL OFL 1.1 en amont et leur texte de licence est **absent** du dépôt | *À vérifier* : prendre les polices à la source (Google Fonts), pas dans Vital |
| `default.vitalskin`, `icons/*.svg` | Aucune licence propre, donc GPL v3 du dépôt par défaut | Pas d'icônes ni de skin repris, l'identité visuelle de Vital est reconnaissable |
| `third_party/concurrentqueue` (moodycamel) | BSD simplifié (`LICENSE.md`) | Utilisable partout, mais à prendre en amont avec version fixée |
| `third_party/kissfft` | BSD 3 (`COPYING`) | Idem ; `juce::dsp::FFT` suffit en général |
| `third_party/json` (nlohmann) | MIT | Déjà listé dans `07_A_REPRENDRE.md` |
| `third_party/VST_SDK/VST3_SDK` | Steinberg VST3 ou GPL v3 (`LICENSE.txt`) | On utilise le SDK fourni par JUCE 9 |
| `third_party/firebase_cpp_sdk` | Binaires Google pour l'authentification | Jamais |
| `third_party/JUCE` | JUCE 6.0.5 embarqué, version lue dans `juce_core.h` | Inutilisable avec JUCE 9 |

## 2. Architecture du moteur

### 2.1 Couches

| Dossier | Lignes | Rôle | Dépendance JUCE |
| --- | --- | --- | --- |
| `src/synthesis/` | 24 952 | Moteur : `framework/` (graphe, SIMD, voix), `filters/`, `effects/`, `modulators/`, `producers/` (oscillateur wavetable, sampler), `modules/` (assemblages), `synth_engine/` | Faible : `#include "JuceHeader.h"` dans [`framework/common.h:19`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/common.h#L19), 107 macros `JUCE_LEAK_DETECTOR`, et `FloatVectorOperations::disableDenormalisedNumberSupport` dans `synth_engine/sound_engine.cpp:245` |
| `src/common/` | 10 219 | `SynthBase` (pont moteur, UI, état), paramètres, chargement JSON, éditeur de wavetables, tuning | Forte (`String`, `File`, `CriticalSection`, `MidiBuffer`) |
| `src/interface/` | 37 046 (cpp seuls) | UI OpenGL complète | Totale |
| `src/plugin/` | petit | `SynthPlugin : AudioProcessor`, `ValueBridge` (paramètre hôte) | Totale |

Le moteur est donc séparable de JUCE à faible coût : remplacer l'include de `common.h`, définir les macros de fuite à vide et remplacer l'appel de dénormaux. C'est le seul gros synthé open source étudié où c'est le cas. Mais il n'expose pas notre interface `prepare / reset / process(span)` : il impose son propre graphe.

### 2.2 Graphe de processeurs

| Élément | Où | Ce qu'il fait |
| --- | --- | --- |
| `Output` | [`framework/processor.h:30-84`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/processor.h#L30-L84) | Tampon de `poly_float` possédé, taille `kMaxBufferSize * oversample`, plus un "trigger" (masque, valeur, offset dans le bloc) pour les événements de voix |
| `Input` | `processor.h:86-97` | Un pointeur vers un `Output` source ; pas de copie |
| `Processor` | `processor.h:128-320` | Classe de base : `process(num_samples)`, `clone()` pour la polyphonie, `hasState()`, `reset(poly_mask)` par voix, `plug / unplug`, débit audio ou débit contrôle (`cr::`, tampon de 1 échantillon) |
| `ProcessorRouter` | [`framework/processor_router.h:30-111`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/processor_router.h#L30-L111) | Sous graphe : ordre topologique (`reorder`, `processor_router.cpp:209-245`), insertion automatique d'un nœud `Feedback` (retard d'un bloc) si une connexion crée un cycle (`processor_router.cpp:179-191`) |
| `SynthModule` | `framework/synth_module.h`, `.cpp` | Module avec contrôles nommés (`createBaseControl`, `createMonoModControl`, `createPolyModControl`) et `StatusOutput` pour l'UI |
| Bloc maximal | [`framework/common.h:50`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/common.h#L50) : `kMaxBufferSize = 128` | `SynthPlugin::processBlock` découpe le bloc hôte en paquets de 128 au plus ([`plugin/synth_plugin.cpp:165-174`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/plugin/synth_plugin.cpp#L165-L174)) et y aligne le MIDI |

Les modifications du graphe sont copiées par chaque clone de voix de façon paresseuse : un compteur partagé `global_changes_` est comparé au compteur local au début de `ProcessorRouter::process` (`processor_router.cpp:66-68`), puis `createAddedProcessors` clone les nouveaux processeurs et `deleteRemovedProcessors` efface les anciens (`processor_router.cpp:313-345`). Ce code tourne **sur le thread audio** et fait `clone()` (allocation) et `std::map::erase` (libération).

### 2.3 SIMD : `poly_float`

| Point | Où |
| --- | --- |
| Choix de l'architecture à la compilation : SSE2 ou NEON, AVX2 explicitement refusé, échec si aucun | [`framework/poly_values.h:23-38`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/poly_values.h#L23-L38) |
| `poly_int` (masques) et `poly_float`, 4 voies de 32 bits | `poly_values.h:51-435` et `437-974` |
| Opérations vectorielles (interpolation, `maskLoad`, `swapVoices`, clamp, etc.) | `framework/poly_utils.h` (687 lignes) |
| Mathématiques rapides vectorisées (`exp2`, `log2`, `tanh` rapides, saturations algébriques, `midiNoteToFrequency`, `dbToMagnitude`) | [`framework/futils.h:37-301`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/futils.h#L37-L301) |

Le choix structurant : **un `poly_float` porte deux voix stéréo** (gauche et droite de la voix A, gauche et droite de la voix B). `kParallelVoices = poly_float::kSize / 2` ([`framework/voice_handler.cpp:25`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/voice_handler.cpp#L25)). Tout le DSP est donc écrit une seule fois et traite deux voix et deux canaux à la fois. La sortie finale est désentrelacée dans `SynthBase::writeAudio` (`common/synth_base.cpp:597-608`).

`poly_values.h`, `poly_utils.h`, `matrix.h`, `utils.h` et `futils.h` ne dépendent d'aucun en tête JUCE ; ils incluent seulement `common.h`, dont il faut retirer la ligne 19.

### 2.4 Polyphonie

| Point | Où |
| --- | --- |
| Voix regroupées par paires dans un `AggregateVoice`, qui possède un clone complet du routeur de voix | `framework/voice_handler.h:242-245`, `voice_handler.cpp:874-896` (`addParallelVoices`) |
| Toutes les voix sont créées au démarrage : `setPolyphony(kMaxPolyphony)` avec `kMaxPolyphony = 33` | `synth_engine/sound_engine.cpp:65`, `common/synth_constants.h:34-35` |
| Le changement de polyphonie à l'exécution ne fait que tuer des voix ; il n'alloue plus puisque le pire cas existe déjà | `voice_handler.cpp:286-288`, `768-779` |
| Priorités (plus récente, plus ancienne, plus haute, plus basse, round robin), vol ou kill | `voice_handler.h:258-271`, tri dans `voice_handler.cpp:631-646` |
| Listes de voix en `CircularQueue` à capacité réservée | `voice_handler.h:477-483`, `framework/circular_queue.h` |

## 3. Matrice de modulation

### 3.1 Représentation

| Élément | Où | Contenu |
| --- | --- | --- |
| Limite | [`common/synth_constants.h:37`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/common/synth_constants.h#L37) | `kMaxModulationConnections = 64` |
| Connexion | [`common/synth_types.h:32-51`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/common/synth_types.h#L32-L51) | Nom de source, nom de destination (chaînes), et un `ModulationConnectionProcessor` possédé |
| Banque | `common/synth_types.h:53-66`, `common/synth_types.cpp:50-55` | 64 connexions créées une fois au constructeur ; une connexion "libre" a des noms vides |
| Sources | Toute sortie nommée d'un module (LFO, enveloppes, macros, aléatoire, vélocité, etc.), retrouvée par `engine_->getModulationSource(name)` | Chaîne vers `Output*` dans des `std::map` |
| Destinations | Chaque paramètre modulable est construit avec `createMonoModControl` ou `createPolyModControl` | [`framework/synth_module.cpp:88-243`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/synth_module.cpp#L88-L243) : valeur de base, somme des modulations (`ModulationSum` ou `cr::VariableAdd`), puis mise à l'échelle (quadratique, cubique, exponentielle) **après** la somme |
| Processeur de connexion | [`synthesis/modules/modulation_connection_processor.h:24-89`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/modules/modulation_connection_processor.h#L24-L89) | Entrées : source, quantité, "power" (courbe), reset. Options : bipolaire, stéréo (signe inversé à droite), bypass, courbe de remappage `LineGenerator` |

Les 64 processeurs de connexion sont **déjà dans le graphe** au démarrage, désactivés : leur quantité et leur courbe sont elles mêmes des destinations polyphoniques modulables ([`modules/synth_voice_handler.cpp:79-94`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/modules/synth_voice_handler.cpp#L79-L94)). Ajouter une modulation revient donc à brancher une entrée et activer un processeur existant.

Un `ValueSwitch` par destination choisit entre la valeur de base seule et la branche "base plus modulation" (`synth_module.cpp:174-188`). Sans modulation, la branche de somme est désactivée et ne coûte rien.

### 3.2 Ajout et retrait sans verrou

1. Le thread message construit un `modulation_change` (pointeurs bruts vers source, destinations mono et poly, interrupteurs, processeur, échelle) : [`common/synth_base.cpp:137-161`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/common/synth_base.cpp#L137-L161). Toutes les recherches par chaîne se font ici, hors audio.
2. Il le pousse dans une `moodycamel::ConcurrentQueue<modulation_change>` (`common/synth_base.h:187`, `synth_base.cpp:177` et `203`).
3. Au début de chaque `processBlock`, `processModulationChanges()` vide la file (`plugin/synth_plugin.cpp:160`, `synth_base.cpp:624-632`).
4. Sur le thread audio, `SoundEngine::connectModulation` branche la source, fixe l'échelle, active la source et le processeur, branche le processeur dans la destination avec `plugNext`, bascule les interrupteurs : [`synthesis/synth_engine/sound_engine.cpp:139-168`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/synth_engine/sound_engine.cpp#L139-L168). `disconnectModulation` fait l'inverse et repasse la source en débit contrôle si plus personne ne la lit à débit audio (`sound_engine.cpp:174-200`).

Points qui ne respectent pas `.claude/rules/realtime-audio.md` dans ce chemin :

| Problème | Où |
| --- | --- |
| `plugNext` crée une nouvelle `Input` (`make_shared`, `push_back`) si la somme n'a plus d'entrée libre ; les `ModulationSum` sont créées avec zéro entrée, donc la première modulation de chaque destination alloue sur le thread audio | [`framework/processor.cpp:105-121`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/processor.cpp#L105-L121), `synth_module.cpp:153` |
| `connect` peut faire `new cr::Feedback()` si la connexion crée un cycle | `framework/processor_router.cpp:179-186` |
| La recopie paresseuse du graphe par voix clone et libère sur le thread audio | `processor_router.cpp:66-68`, `313-345` |
| Les connexions par voix sont dans `std::map` (`processors_`) | `processor_router.h:96` |

### 3.3 Lissage

| Mécanisme | Où | Comportement |
| --- | --- | --- |
| Quantité de modulation | [`modules/modulation_connection_processor.cpp:90-110`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/modules/modulation_connection_processor.cpp#L90-L110) | Rampe linéaire de l'ancienne à la nouvelle quantité sur la durée du bloc ; remise à la cible sans rampe au déclenchement d'une voix (`getResetMask`) ; quantité remise à zéro si l'échelle de destination change (`:56-58`) |
| Paramètres de base | [`utilities/smooth_value.cpp:26-49`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/utilities/smooth_value.cpp#L26-L49) | Filtre un pôle à 5 Hz (débit audio) ou 20 Hz (débit contrôle, `smooth_value.h:25` et `54`), fin en interpolation linéaire, puis **le processeur se désactive** quand la valeur est atteinte |

La rampe par bloc rend le résultat dépendant de la taille de bloc, ce que nos invariants interdisent (`03_ARCHITECTURE.md`). Le découpage à 128 échantillons borne l'effet sans l'annuler.

### 3.4 Coût

1. Chaque connexion active coûte une boucle par échantillon (multiplication, addition, éventuellement courbe et remappage) par paire de voix, en SIMD (`modulation_connection_processor.cpp:67-88` choisit parmi quatre variantes pour ne pas payer la courbe ou le remappage s'ils sont neutres).
2. Une source ou destination à débit contrôle ne calcule qu'une valeur par bloc ; une source passe à débit audio seulement si une destination audio la lit (`sound_engine.cpp:153-156`).
3. Les connexions inactives et les destinations sans modulation sont désactivées, donc gratuites.
4. Le test `tests/stress/modulation_stress_test.cpp` branche toutes les modulations et vérifie seulement que la sortie reste finie ; il ne mesure pas le temps.

## 4. Paramètres hôte et état

| Point | Où | Commentaire |
| --- | --- | --- |
| Paramètre hôte | [`plugin/value_bridge.h`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/plugin/value_bridge.h) : `ValueBridge : AudioProcessorParameter` | Pas d'APVTS. `setValue` appelle `SynthBase::valueChangedExternal` |
| Écriture de la valeur moteur | `common/synth_base.cpp:66-67` et `108-118` | `controls_[name]->set(value)` : recherche `std::map` par `std::string`, écriture non atomique d'un `poly_float` lu par l'audio, puis `new ValueChangedCallback` posté au thread message. En VST3, JUCE appelle `setValue` depuis le thread audio : allocation et chaîne sur ce thread |
| Description des paramètres | `common/synth_parameters.cpp` | Table unique (nom, min, max, défaut, échelle, unité, texte), comme notre `plugin/Parameters.*` |
| État | `plugin/synth_plugin.cpp:189-221`, `common/load_save.cpp` | JSON complet ; `setStateInformation` suspend le traitement (`suspendProcessing`) et ouvre une boîte de dialogue en cas d'erreur |
| Wavetable remplacée | [`synthesis/lookups/wavetable.cpp:38-87`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/lookups/wavetable.cpp#L38-L87), `wavetable.h:131-132`, `synth_oscillator.cpp:1204` et `1283` | L'audio publie `std::atomic<WavetableData*> active_audio_data_` pendant son bloc ; le thread qui remplace attend en `yield` que l'audio ait relâché avant de libérer l'ancienne table. L'audio ne bloque jamais, mais `current_data_` n'est pas atomique |

## 5. UI

| Point | Où |
| --- | --- |
| Rendu tout OpenGL : un `OpenGLContext` attaché à `FullInterface`, repeint en continu, `setSwapInterval(0)` | [`interface/editor_sections/full_interface.cpp:232-249`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/interface/editor_sections/full_interface.cpp#L232-L249) |
| Boucle de rendu : `renderOpenGL` dessine le fond, les mètres de modulation puis chaque `OpenGlComponent` | `full_interface.cpp:613-628` |
| Base des composants : `OpenGlComponent` (`init`, `render`, `destroy`), plus `OpenGlLineRenderer`, `OpenGlMultiQuad`, `OpenGlImage` | `interface/editor_components/open_gl_component.h:27-60` et voisins |
| Shaders maison | `interface/look_and_feel/shaders.*` |
| Composants notables | Éditeur de courbe LFO/MSEG (`line_editor`, `lfo_editor`), enveloppe, réponse de filtre et d'EQ, compresseur multibande, wavetable 3D, oscilloscope, spectrogramme, mètres de modulation sur chaque bouton |

Lecture de l'état audio par l'UI, sans verrou :

1. `StatusOutput` ([`framework/synth_module.h:29-55`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/synth_module.h#L29-L55)) copie la première valeur d'une sortie à la fin de chaque bloc (`sound_engine.cpp:257-258`), masquée par les voix actives et sommée sur les deux voix du `poly_float` (`synth_voice_handler.cpp:318-335`). L'UI garde un pointeur vers le `StatusOutput` et lit `value()` à chaque image (par exemple phase de LFO dans `lfo_editor.cpp:47-50`, mètres de modulation dans `modulation_manager.cpp:1100-1135`).
2. Oscilloscope et spectrogramme : l'audio pousse chaque échantillon dans un `StereoMemory` circulaire (`lookups/memory.h:56-62`, `synth_base.cpp:634-675`) et copie une fenêtre dans `oscilloscope_memory_` ; l'UI lit ces tampons directement (`oscilloscope.h:33`).
3. Aucune de ces lectures n'est atomique ni protégée : ce sont des courses de données au sens du C++, tolérées parce qu'une valeur déchirée ne produit qu'une image fausse. Nos règles (`ui.md`, `realtime-audio.md`) demandent un atomic ou une FIFO.

Limites pour nous : OpenGL est déprécié par Apple depuis macOS 10.14, l'UI fait 37 000 lignes liées à JUCE 6 et à l'identité visuelle de Vital, et l'éditeur n'a pas d'échelle testée comme l'exige `ui.md`.

## 6. Build, tests, CI

| Point | État |
| --- | --- |
| Système de build | Projucer : `plugin/vital.jucer`, `standalone/vital.jucer`, `headless/vital.jucer`, `tests/vital.jucer`, plus un `Makefile` racine pour Linux. Aucun `CMakeLists.txt` hors `third_party` |
| Unity build | `src/unity_build/*.cpp` regroupe les sources par zone |
| JUCE | 6.0.5 embarqué dans `third_party/JUCE` (pas de sous module) |
| Standard C++ | `cppLanguageStandard="14"` dans `plugin/vital.jucer` |
| Formats | VST2, VST3, AU, AUv3, Standalone, LV2 sous Linux |
| SIMD | `-msse2` ou NEON imposé par le `Makefile` |
| Tests | 58 fichiers `*_test.cpp` sur `juce::UnitTest` (`tests/main.cpp`). Les tests DSP vérifient surtout que la sortie reste finie sous entrées extrêmes (`runInputBoundsTest`, par exemple `tests/synthesis/filters/digital_svf_test.cpp:20-23`) ; pas de valeur attendue ni de référence audio |
| CI | Aucune (pas de `.github/`) |

## 7. Qualité et maintenance

1. Dernier commit le 20 avril 2022 (« Update README.md ») ; le README annonce que les sources sont publiées avec retard sur les binaires, et rien n'a été publié depuis.
2. L'auteur refuse les pull requests et ne priorise pas les problèmes de compilation (README).
3. Le code est dense, cohérent, rapide, mais quasiment sans commentaire ni source citée pour les formules DSP (aucune référence trouvée dans `src/synthesis` et `src/common`). Notre règle `dsp.md` exige la source : tout filtre repris devra être documenté par nous.
4. Gestion mémoire en `new` nus confiés au graphe, `std::string` et `std::map` pour l'adressage des contrôles, `std::shared_ptr` partout dans `Processor`.
5. Pas de `ScopedNoDenormals` : `SoundEngine::process` appelle `disableDenormalisedNumberSupport` à chaque bloc sans restaurer l'état.
6. Le portage vers JUCE 9 et C++23 n'a jamais été fait en amont. Des forks communautaires existent (par exemple "Vitalium" dans DISTRHO-Ports), *à vérifier* avant de s'y appuyer.

## 8. À reprendre

### (a) Code extractible tel quel (plugin AGPL v3 seulement)

Tout ce tableau est GPL v3 ou ultérieure. Il exige un ADR (règle de `CLAUDE.md` et `dsp.md`) et est **interdit si le plugin est fermé**. Tant que l'ADR 0001 de licence n'est pas pris, rien de cette catégorie n'entre dans un projet.

| Code | Couche | Effort d'extraction | Remarque |
| --- | --- | --- | --- |
| `poly_float`, `poly_int` : [`src/synthesis/framework/poly_values.h`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/poly_values.h), `poly_utils.h`, `matrix.h`, `utils.h` | `dsp/` | Faible : copier quatre en têtes, remplacer `common.h` par un en tête minimal sans JUCE. Ajouter des tests | SSE2 et NEON seulement. Avant de le prendre, comparer avec `chowdsp_simd` / xsimd (BSD, utilisable partout) : à besoin égal, le BSD gagne selon la règle de choix |
| Mathématiques rapides : [`src/synthesis/framework/futils.h`](https://github.com/mtytel/vital/blob/636ca0ef517a4db087a6a08a6a8a5e704e21f836/src/synthesis/framework/futils.h) | `dsp/` | Faible, dépend du point précédent | Approximations sans borne d'erreur documentée : à mesurer par test avant usage |
| Filtres et effets : `filters/digital_svf`, `diode_filter`, `ladder_filter`, `sallen_key_filter`, `dirty_filter`, `formant_filter`, `comb_filter`, `iir_halfband_decimator`, `fir_halfband_decimator`, `linkwitz_riley_filter` ; `effects/compressor` (multibande), `reverb`, `delay`, `phaser`, `distortion` | `dsp/` | Moyen à fort : chaque classe hérite de `Processor` et lit ses paramètres par `input(i)->at(0)`. Soit on reprend tout `framework/` (7 300 lignes, avec les défauts temps réel du §3.2), soit on réécrit l'enveloppe de la classe autour de notre `prepare / reset / process(span)` en gardant le cœur de calcul | Le cœur de calcul est la partie qui a de la valeur. Pas de source citée : à retrouver et noter |
| Oscillateur wavetable à morphing spectral : `producers/synth_oscillator.cpp` (1 514 lignes), `producers/spectral_morph.h`, `lookups/wavetable.*`, `lookups/wave_frame.*` | `dsp/` | Fort : très couplé à `poly_float`, aux voix par paires et au FFT | Seulement si un projet fait un synthé wavetable ; c'est l'identité sonore de Vital |
| Générateur de courbes LFO/MSEG : `common/line_generator.cpp` | `dsp/` (calcul) | Moyen : retirer `JuceHeader.h` et nlohmann de la partie calcul | `gin_plugin` (BSD) fournit déjà un MSEG ; le préférer |
| `CircularQueue` à capacité réservée : `framework/circular_queue.h` | `dsp/` | Faible | `farbot` et `chowdsp_data_structures` (BSD) couvrent le besoin ; ne prendre que si l'API manque |

### (b) Idées de conception à reproduire

| Idée | Vue dans | Couche chez nous |
| --- | --- | --- |
| Un vecteur SIMD porte deux voix stéréo ; le DSP s'écrit une fois pour deux voix et deux canaux | `voice_handler.cpp:25`, `synth_base.cpp:597-608` | `dsp/` |
| Toutes les voix créées au pire cas au démarrage ; changer la polyphonie ne fait que tuer des voix | `sound_engine.cpp:65`, `voice_handler.cpp:768-779` | `dsp/` |
| Nombre fixe de slots de modulation pré câblés et désactivés ; connecter = brancher et activer, jamais créer | `synth_voice_handler.cpp:79-94`, `synth_types.cpp:50-55` | `dsp/` (moteur), `plugin/` (paramètres des slots déclarés une fois, IDs figés) |
| Quantité et courbe d'une modulation sont elles mêmes des destinations modulables | `synth_voice_handler.cpp:86-91` | `dsp/` |
| Résolution des noms de source et destination sur le thread message, envoi d'un message de pointeurs prêts dans une FIFO lock free, application au début du bloc | `synth_base.cpp:137-203`, `synth_plugin.cpp:160` | `plugin/` |
| Interrupteur par destination : branche "sans modulation" gratuite tant qu'aucune modulation n'y est branchée | `synth_module.cpp:174-188` | `dsp/` |
| Débit contrôle automatique : une source ne passe en audio que si une destination audio la lit | `sound_engine.cpp:153-156`, `196-197` | `dsp/` |
| Variantes de la boucle de modulation choisies par bloc pour ne pas payer courbe ou remappage neutres | `modulation_connection_processor.cpp:67-88` | `dsp/` |
| Mise à l'échelle non linéaire du paramètre appliquée **après** la somme des modulations | `synth_module.cpp:95-141` | `dsp/` |
| Lisseur qui se désactive une fois la cible atteinte | `smooth_value.cpp:26-31` | `dsp/` |
| Découpage du bloc hôte en paquets de taille maximale fixe, MIDI aligné sur ces paquets | `synth_plugin.cpp:165-174` | `plugin/` |
| Pointeur atomique "en cours d'usage" publié par l'audio pendant le bloc ; le thread qui remplace une table attend sa libération avant de détruire l'ancienne. À implémenter avec `farbot::RealtimeObject` plutôt qu'à la main | `wavetable.cpp:85-87`, `wavetable.h:131-132` | `dsp/`, `plugin/` |
| Sorties d'état nommées (`StatusOutput`) copiées en fin de bloc et lues par l'UI à chaque image, mais via atomics ou FIFO chez nous | `synth_module.h:29-55`, `sound_engine.cpp:257-258` | `plugin/` (publication), `ui/` (lecture sur timer) |
| Mètre de modulation dessiné sur chaque bouton modulé, alimenté par ces sorties d'état | `modulation_manager.cpp:1100-1135` | `ui/` |
| Test de stress "toutes les modulations branchées, sortie finie" | `tests/stress/modulation_stress_test.cpp` | Tests `dsp/` |
| Binaire headless qui rend de l'audio pour un preset | `src/headless/main.cpp`, `synth_base.cpp:380-420` | `tools/` (déjà prévu) |

### (c) À ne pas reprendre

| Élément | Pourquoi | Couche concernée |
| --- | --- | --- |
| `ProcessorRouter` et le graphe générique (`processor.*`, `processor_router.*`, `synth_module.*`) en bloc | Mutation du graphe, clonage et libération sur le thread audio (`processor_router.cpp:66-68`, `313-345`), allocation dans `plugNext` (`processor.cpp:116-120`) et `new cr::Feedback` (`processor_router.cpp:182`) ; contraire à `realtime-audio.md`. Nos plugins ont des chaînes fixes qui n'en ont pas besoin | `dsp/` |
| `ValueBridge` et le chemin paramètre hôte vers moteur | Pas d'APVTS, écriture non atomique, `std::map` par chaîne et `new` sur le thread audio (`synth_base.cpp:66-67`, `108-118`) ; contraire à `juce.md` (snapshot `Params`) | `plugin/` |
| Lissage par rampe sur la durée du bloc | Résultat dépendant de la taille de bloc | `dsp/` |
| UI OpenGL complète, shaders, skin, icônes | OpenGL déprécié sur macOS, 37 000 lignes JUCE 6, identité visuelle de Vital, pas de mise à l'échelle testée ; `gin_gui` ou JUCE natif suffisent | `ui/` |
| Lectures UI non synchronisées des tampons audio (`StatusOutput`, oscilloscope) | Courses de données ; on garde l'idée, pas l'implémentation | `ui/` |
| Build Projucer, `Makefile`, JUCE 6.0.5 embarqué, C++14, unity build | Pamplejuce, CMake et JUCE 9 en sous module couvrent tout | build |
| Tests `juce::UnitTest` limités aux sorties finies | Nos tests nomment signal, valeur attendue et tolérance (`testing.md`) | tests |
| `setStateInformation` qui ouvre une boîte de dialogue et suspend le traitement | Pas d'UI depuis le processeur ; migration d'état versionnée chez nous | `plugin/` |
| Authentification, Firebase, téléchargement de contenus, vérification de mise à jour | Interdit par le README et sans objet | tous |
| Nom, marques, presets d'usine, polices sans texte de licence | Restrictions du README et licences absentes | tous |
