# Règles JUCE

## Paramètres

* Tous les paramètres sont déclarés dans un seul fichier (`plugin/Parameters.*`) : ID, nom, plage, défaut, texte affiché.
* Les IDs sont des constantes, jamais des chaînes répétées.
* **Après la première release, un ID ne se renomme ni ne se supprime.** Un paramètre obsolète reste déclaré et ignoré. Un test fige la liste.
* Version de paramètre (`ParameterID{ id, version }`) incrémentée à chaque ajout.
* Le DSP ne lit jamais l'APVTS : la couche `plugin/` remplit un snapshot `Params` par bloc.
* Invariants entre paramètres (ordre, écarts minimum) appliqués dans le snapshot et testés.

## État

* L'état sauvé porte un numéro de version.
* `setStateInformation` sait charger toutes les versions passées ; chaque valeur manquante a un repli documenté.
* On liste ce qui n'est **pas** dans les presets (bypass, solo, réglages de session).
* Des fichiers d'état de chaque version publiée sont gardés dans `tests/plugin/states/`.

## Processeur

* `setLatencySamples` appelé dès que la latence change, et la latence est constante autant que possible.
* `getTailLengthSeconds` renseigné pour les effets à queue (réverbe, délai).
* Bus layouts : déclarer précisément ce qui est supporté dans `isBusesLayoutSupported`.
* Pas d'accès à l'éditeur depuis le processeur.

## Mise à jour de JUCE

* Jamais dans une tâche de fonctionnalité. Tâche dédiée, ADR, réapplication des patchs de `patches/`, CI complète.
