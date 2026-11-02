# 0002 — Reprendre avant de coder, RTSan pour le temps réel

**Date** : 2026-11-02
**Statut** : acceptée

## Contexte

Demande explicite : tout ce qu'on peut éviter de coder nous mêmes est un gain. Le playbook prévoyait un allocateur instrumenté maison pour détecter les allocations sur le thread audio.

## Options considérées

1. Coder les briques génériques (presets, FIFO, matrice de modulation, détection d'allocation).
2. Prendre des briques existantes, en respectant la licence du plugin.

## Décision

Option 2, avec la règle de choix de `docs/07_A_REPRENDRE.md` (JUCE, puis MIT/BSD, puis GPL si AGPL, puis notre code), ajoutée comme règle 8 de `.claude/rules/scope.md`. La détection temps réel passe par RealtimeSanitizer (clang) au lieu d'un allocateur maison.

## Conséquences

Moins de code à maintenir. Chaque dépendance a une version fixée et une ligne dans `docs/DEPENDENCIES.md` du projet. La licence du plugin devient la première décision à prendre, car elle conditionne ce qu'on peut prendre.
