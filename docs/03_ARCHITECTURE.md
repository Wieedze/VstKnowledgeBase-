# Architecture

## Trois couches, une seule direction de dépendance

```
ui/  ──►  plugin/  ──►  dsp/
(JUCE GUI)  (JUCE audio_processors)  (C++ standard, aucune dépendance JUCE)
```

| Couche | Contenu | Dépend de | Testée par |
| --- | --- | --- | --- |
| `dsp/` | Filtres, oscillateurs, enveloppes, moteur. Classes avec `prepare(sampleRate, maxBlockSize)`, `reset()`, `process(span)` | Rien d'autre que la STL | Catch2, sans JUCE |
| `plugin/` | `AudioProcessor`, layout des paramètres (APVTS), snapshot de paramètres, état et migration, latence | `dsp/`, JUCE | Catch2 avec JUCE, pluginval |
| `ui/` | `AudioProcessorEditor`, composants, LookAndFeel | `plugin/` (lecture seule via attachments) | Captures headless, revue manuelle |
| `tools/` | Binaire headless : render, check, bench, snapshot | `dsp/`, `plugin/` | Lui même un test |

Règle : `dsp/` ne contient aucun `#include <juce_...>`. Un test CMake le vérifie (voir [04_TESTS](04_TESTS.md)).

## Flux des paramètres

1. L'hôte et l'UI écrivent dans l'APVTS (atomics).
2. Au début de chaque `processBlock`, la couche `plugin/` lit les valeurs et remplit une structure simple `Params` (copie, pas de référence).
3. Le DSP ne reçoit que `Params`. Il ne connaît ni l'APVTS ni les IDs.
4. Lissage (`SmoothedValue` ou équivalent maison dans `dsp/`) pour tout paramètre qui produit un zipper noise.

Données plus grosses qu'un atomic (table d'onde, IR, sample) : construites sur un thread de fond, livrées au thread audio par pointeur atomique ou FIFO lock free, libérées hors du thread audio.

## Arborescence type (à partir de Pamplejuce)

```
monplugin/
├── CMakeLists.txt
├── VERSION
├── CHANGELOG.md
├── CLAUDE.md, GLOSSARY.md, FUTURE.md
├── JUCE/                    sous module, tag épinglé
├── cmake/                   sous module cmake-includes de Pamplejuce
├── patches/                 patchs JUCE versionnés
├── source/
│   ├── dsp/                 C++ pur
│   ├── plugin/              PluginProcessor, Parameters, State
│   └── ui/                  PluginEditor, composants
├── tests/
│   ├── dsp/                 tests unitaires sans JUCE
│   ├── plugin/              tests avec JUCE (état, paramètres)
│   └── golden/              rendus de référence (WAV) + manifeste
├── tools/                   binaire headless
├── benchmarks/
├── docs/
│   ├── SPEC.md              une page
│   ├── CODEMAP.md           chemin → rôle, comme Drum Foundry
│   └── tasks/
└── .claude/
```

## Invariants à poser dès le début

* **Latence fixe et rapportée** via `setLatencySamples`, testée.
* **Indépendance à la taille de bloc** : même sortie pour des blocs de 1, 32, 512 et 4096 échantillons (test).
* **Sortie finie** : aucune NaN ni Inf, quels que soient les paramètres (test balayant les extrêmes).
* **Silence en entrée = silence en sortie** pour un effet sans bruit propre, après la queue.
* **Round trip d'état** : `getStateInformation` puis `setStateInformation` redonne les mêmes paramètres.
* **Migration d'état** : chaque état sauvé porte une version ; un ancien état se recharge avec des valeurs de repli documentées.
* **Invariants de paramètres** explicites (ex. crossovers ordonnés chez TetraDrive) et testés.
