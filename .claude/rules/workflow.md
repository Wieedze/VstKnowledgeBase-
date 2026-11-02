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
6. Inscrire l'entrée dans le journal de l'index du projet (onglet Décisions de l'artefact VstKnowledgeBase, collection `journal` de sa base) : une entrée par ADR, par post mortem et par gate franchi, avec un lien vers le fichier du repo. Mettre à jour le document `projet/etat` quand la phase change. Le repo reste la source : le journal n'est qu'un index.

## Commits

* Un commit = un changement cohérent. Message à l'impératif.
* Les changements de références audio sont dans leur propre commit `golden: …`.
* Pas de commit qui mélange refactor et fonctionnalité.
