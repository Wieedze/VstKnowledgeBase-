# 0003 — VST3 uniquement

**Date** : 2026-11-02
**Statut** : acceptée

## Contexte

Pamplejuce construit par défaut Standalone, AU, AUv3, VST3 et CLAP. Chaque format ajoute du build, de la signature, de l'empaquetage et des cas de test, alors que pluginval ne valide que le VST3 dans la CI du template.

## Options considérées

1. Garder tous les formats du template.
2. VST3 + Standalone (+ AU sur macOS), décision initiale du playbook.
3. VST3 uniquement.

## Décision

Option 3, demandée explicitement : `FORMATS VST3`. Les autres formats sont retirés du CMake, de la CI et des installeurs. Le débogage hors DAW passe par l'AudioPluginHost de JUCE. Tout autre format va dans `FUTURE.md` et n'en sort que par une nouvelle ADR.

## Conséquences

Un seul format à construire, signer, valider et supporter. Pas d'AU : Logic Pro n'est pas couvert. Le patch d'automation sample accurate de TetraDrive, propre au wrapper VST3, s'applique à 100 % des cas utilisateurs.
