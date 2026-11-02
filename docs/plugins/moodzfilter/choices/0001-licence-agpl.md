# 0001 — MoodzFilter sous licence AGPL v3

**Date** : 2026-11-02
**Statut** : acceptée

## Contexte

La licence fixe ce qu'on a le droit de reprendre (`docs/07_A_REPRENDRE.md` du playbook). Le plugin sert d'abord aux productions de Maxime, sans projet de vente.

## Options considérées

1. Fermé / commercial : seulement MIT, BSD, Apache ; licence JUCE commerciale.
2. Open source AGPL v3 : en plus, tout le code GPL v3 (sst-filters, sst-waveshapers, chowdsp GPL, OB-Xf).

## Décision

Option 2. Le code du plugin est public sous AGPL v3, et JUCE est utilisé sous sa licence AGPL v3.

## Conséquences

On peut brancher sst-filters et le filtre ZDF d'OB-Xf au lieu de les coder. Chaque bibliothèque GPL reprise reçoit une ligne dans `docs/DEPENDENCIES.md` du plugin. Une version vendue plus tard demanderait de retirer tout le code GPL et une licence JUCE commerciale : c'est une décision coûteuse à défaire.
