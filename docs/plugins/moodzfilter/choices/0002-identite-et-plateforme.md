# 0002 — Identité du plugin et plateforme

**Date** : 2026-11-02
**Statut** : proposée (les codes deviennent définitifs à la première build chargée dans un DAW, en phase 1)

## Contexte

JUCE demande un nom de produit, un nom de fabricant et deux codes de 4 caractères. Une fois une session sauvée dans un DAW, changer un code casse le rechargement de la session.

## Décision

| Champ CMake | Valeur proposée |
| --- | --- |
| `PRODUCT_NAME` | MoodzFilter |
| `COMPANY_NAME` | Moodz |
| `PLUGIN_MANUFACTURER_CODE` | `Mood` |
| `PLUGIN_CODE` | `Mzf1` |
| `FORMATS` | `VST3` |
| `IS_SYNTH` | `FALSE` |
| `NEEDS_MIDI_INPUT` | `FALSE` |
| Plateforme v1 | Windows uniquement ; la CI garde un job Linux pour les tests et RealtimeSanitizer |

## Conséquences

Pas de signature Apple ni de notarisation à prévoir en v1. Le job Linux reste nécessaire, car RealtimeSanitizer ne tourne pas sous Windows. À valider avant la phase 1 : `COMPANY_NAME` (Moodz, Radikal Moodz ou autre).
