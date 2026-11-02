# Plan de démarrage d'un plugin

Les phases sont fermées par un gate. On ne passe pas à la suivante tant que le gate n'est pas vert.

## Phase 0 : décider (une session)

1. `/grill-me` sur l'idée du plugin.
2. Écrire `docs/SPEC.md` : une page. Ce que fait le plugin, pour qui, les 3 à 5 fonctionnalités de la v1, et une section **Hors v1** au moins aussi longue.
3. ADR 0001 : licence (AGPL ou commerciale) et donc ce qu'on a le droit de copier.
4. ADR 0002 : instrument ou effet, codes plugin et fabricant. Le format est déjà fixé : VST3 uniquement (ADR 0003 du playbook).

**Gate 0** : SPEC relue et figée, deux ADR écrits.

## Phase 1 : squelette qui passe tout (1 à 2 sessions)

1. Nouveau repo depuis Pamplejuce. Épingler JUCE sur un tag.
2. Copier `.claude/`, `CLAUDE.md`, `GLOSSARY.md`, `docs/tasks/TEMPLATE.md` depuis ce playbook.
3. Créer les trois cibles `dsp`, `plugin`, `ui` et la cible `tools`.
4. Plugin "pass through" avec un seul paramètre de gain lissé.
5. Tests : gain en dB exact, NaN, taille de bloc, round trip d'état, liste figée des IDs.
6. `tools render`, `tools compare`, première référence golden.
7. CI verte sur Windows, macOS, Linux, pluginval 10 compris.
8. Le plugin se charge dans ton DAW Windows.

**Gate 1** : CI verte, pluginval 10 vert, chargé dans le DAW, `STATE.md` à jour.

## Phase 2 : le cœur DSP

Le traitement principal de la SPEC, sans modulation, sans UI soignée (éditeur générique JUCE).

**Gate 2** : tests DSP et golden verts, budget CPU fixé dans `benchmarks/budget.json` et respecté, écoute validée.

## Phase 3 : paramètres, presets, état

Layout de paramètres définitif (IDs gelés à partir d'ici), presets, migration d'état versionnée.

**Gate 3** : tests de migration verts, IDs gelés par ADR.

## Phase 4 : UI

Éditeur réel. Captures headless via `tools snapshot` pour la revue.

**Gate 4** : UI testée à plusieurs échelles, aucune régression des gates précédents.

## Phase 5 : release

Signature, installeurs, CHANGELOG, tag `vX.Y.Z` qui déclenche la release.

**Gate 5** : installeur testé sur une machine propre.

## Ce qui vient après la v1

Tout ce qui est dans `FUTURE.md`. Une fonctionnalité en sort seulement par une nouvelle SPEC (ou un amendement de la SPEC) et un passage par la phase 0.
