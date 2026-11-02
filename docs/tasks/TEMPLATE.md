# NNNN — Titre court à l'impératif

**Phase** : 0 / 1 / 2 / 3 / 4 / 5
**Couche** : dsp / plugin / ui / build / docs
**Dépend de** : NNNN, NNNN

## Objectif

Une phrase : le comportement observable à la fin.

## Comportement attendu (mesurable)

| Signal de test | Paramètres | Résultat attendu | Tolérance |
| --- | --- | --- | --- |
| Sinus 1 kHz, −12 dBFS | gain = +6 dB | sortie à −6 dBFS | ± 0,01 dB |

## Hors périmètre

Ce que cette tâche ne fait **pas**, même si c'est tentant. Tout ajout va dans `FUTURE.md`.

* …

## Règles à charger

* `.claude/rules/…`

## Skills

* `tdd`

## Definition of done

* [ ] Tests écrits avant le code, rouges puis verts.
* [ ] `cmake --build build` sans warning nouveau.
* [ ] `ctest --test-dir build` vert.
* [ ] `tools check` vert ; `tools compare` vert ou référence changée par commit `golden:` justifié.
* [ ] pluginval 10 vert si `plugin/` touché.
* [ ] `rt-safety-reviewer` passé si `dsp/` ou `plugin/` touché.
* [ ] `GLOSSARY.md` à jour si un terme nouveau apparaît.
* [ ] ADR écrit si une décision non évidente a été prise.
* [ ] `task-verifier` : pass. Post mortem écrit, `STATE.md` mis à jour.

## Note de fin (remplie par le task-verifier)
