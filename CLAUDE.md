# CLAUDE.md — Routeur

Ce fichier route vers les bonnes règles, docs et décisions selon la tâche. **Il ne contient aucune règle.** Les règles vivent dans `.claude/rules/`, les décisions dans `.claude/choices/`, les leçons dans `.claude/learning/`.

Si tu veux ajouter une règle ici : ne le fais pas. Ajoute la dans le fichier de `.claude/rules/` qui correspond et mets à jour `.claude/rules/00-INDEX.md`.

## Ordre de lecture au début de chaque tâche

1. Ce fichier.
2. `.claude/STATE.md` : où en est le projet, tâche en cours, défauts connus.
3. Le fichier de tâche dans `docs/tasks/`. Lire ses sections `Hors périmètre` et `Definition of done`.
4. `docs/SPEC.md` du plugin (dans un projet de plugin) ou `docs/00_RESUME.md` (dans ce playbook).
5. `GLOSSARY.md` : utiliser ces termes dans le code, les tests et les messages.
6. Les règles de `.claude/rules/` qui correspondent à la tâche (table ci dessous). Pas toutes.
7. `.claude/choices/INDEX.md` pour les décisions qui touchent la zone.
8. `.claude/learning/INDEX.md` pour les post mortems de tâches proches.

## Table de routage

| Si la tâche touche… | Règles | Skills | Agent de revue |
| --- | --- | --- | --- |
| DSP pur (`dsp/`) | `realtime-audio.md`, `cpp.md`, `dsp.md`, `testing.md` | `tdd` | `rt-safety-reviewer` |
| Couche plugin JUCE (`plugin/`) : paramètres, état, processBlock | `realtime-audio.md`, `cpp.md`, `juce.md`, `testing.md` | `tdd` | `rt-safety-reviewer` |
| UI (`ui/`) | `cpp.md`, `juce.md`, `ui.md` | — | — |
| CMake, CI, packaging | `build.md` | — | — |
| Nouvelle fonctionnalité ou changement de périmètre | `scope.md` | `grill-with-docs`, `to-spec`, `to-tickets` | — |
| Bug | `testing.md` | `diagnosing-bugs` | — |
| Toute tâche, à la fin | `workflow.md` | `code-review` | `task-verifier` (**obligatoire**) |

## Fin de tâche obligatoire

Chaque tâche se termine par l'agent `task-verifier` avant d'être déclarée finie. Il lit la tâche, les règles concernées et les livrables, lance les commandes de vérification, et rend pass ou fail.

* **Pass** : il écrit un post mortem dans `.claude/learning/NNNN-slug.md` et met à jour `.claude/STATE.md`.
* **Fail** : corriger la liste rendue et relancer. La tâche n'est pas finie.

Les commandes de vérification minimales sont dans `.claude/rules/workflow.md`.

## Contraintes dures (les seules qui vivent ici)

* **Rien qui alloue, verrouille, fait des I/O ou peut lancer une exception sur le thread audio.** Détail : `.claude/rules/realtime-audio.md`.
* **Pas de code DSP sans test qui le précède.** Détail : `.claude/rules/testing.md`.
* **Pas d'extension silencieuse du périmètre.** Ce qui n'est pas dans la tâche va dans `FUTURE.md`. Détail : `.claude/rules/scope.md`.
* **Pas d'ID de paramètre renommé ou supprimé après une release** : ça casse les sessions des utilisateurs. Détail : `.claude/rules/juce.md`.
* **Pas de code copié d'un projet AGPL/GPL** sans décision explicite tracée en ADR.

## Carte du repo

```
CLAUDE.md               ← tu es ici (routeur)
GLOSSARY.md             vocabulaire partagé (convention Matt Pocock)
FUTURE.md               demandé, volontairement pas construit
docs/
  00_RESUME.md          les décisions de base
  01_REFERENCES.md      projets open source analysés
  02_TOOLCHAIN.md       JUCE, CMake, compilateurs, licences
  03_ARCHITECTURE.md    couches et arborescence
  04_TESTS.md           stratégie de tests et CI
  05_WORKFLOW_AGENTIQUE.md
  06_PLAN_DEMARRAGE.md
  tasks/TEMPLATE.md     modèle de tâche atomique
.claude/
  STATE.md              état courant, maintenu à la main
  rules/                règles par domaine (00-INDEX.md d'abord)
  agents/               task-verifier, rt-safety-reviewer
  choices/              ADR, append only
  learning/             post mortems, append only
```
