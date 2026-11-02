# STATE

Maintenu à la main. Une tâche ne se ferme pas sans mettre ce fichier à jour.

## Ce repo

Playbook (base de connaissances), pas un plugin. Version initiale du 2026-11-02.

## Dans un projet de plugin, ce fichier contient

| Champ | Valeur |
| --- | --- |
| Phase en cours | 0 (décider) |
| Gate à passer | SPEC figée + ADR licence + ADR formats |
| Tâche en cours | — |
| Version JUCE épinglée | — |
| Budget CPU par bloc | — |
| Défauts connus (son, perf, hôtes) | — |
| Ordre recommandé des prochaines tâches | — |

## Questions ouvertes du playbook

* Adopter ou non le patch d'automation sample accurate de TetraDrive (à tester sur JUCE 9).
* Choix du compteur d'allocation pour les tests temps réel (allocateur maison ou outil existant).
* Format exact de `tests/golden/manifest.json`.
