# Workflow de fin de tâche

## Commandes de vérification minimales

```
cmake --build build
ctest --test-dir build --output-on-failure
build/<Plugin>Tools check
build/<Plugin>Tools compare build/renders tests/golden
pluginval --strictness-level 10 --validate <chemin du .vst3>   # si plugin/ touché
```

La sortie de chaque commande est collée dans le rapport de fin de tâche. "Ça compile" sans sortie ne compte pas.

## Affirmations chiffrées

Tout chiffre audio écrit dans un rapport, un commit ou une doc (dB, ms, échantillons de latence, % CPU) est accompagné de la commande qui le reproduit. Un chiffre sans commande est retiré.

## Ordre de fin de tâche

1. Vérifications ci dessus, vertes.
2. `rt-safety-reviewer` si `dsp/` ou `plugin/` touché.
3. `code-review`.
4. `task-verifier`.
5. Si pass : post mortem dans `.claude/learning/`, `STATE.md` mis à jour, note de fin dans le fichier de tâche.

## Commits

* Un commit = un changement cohérent. Message à l'impératif.
* Les changements de références audio sont dans leur propre commit `golden: …`.
* Pas de commit qui mélange refactor et fonctionnalité.
