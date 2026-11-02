# VstKnowledgeBase

Base de connaissances et de règles pour développer des plugins VST3 avec JUCE, seul ou avec des agents de code (Claude Code).

Ce repo ne contient pas de plugin. Il contient ce qu'on doit savoir et décider **avant** et **pendant** le développement d'un plugin : les projets open source à étudier, la toolchain, l'architecture, la stratégie de tests, les règles temps réel, les garde fous anti dérive et la méthode agentique. Un projet de plugin le référence (ou le copie dans son `.claude/`) au démarrage.

## Par où commencer

| Ordre | Fichier | Contenu |
| --- | --- | --- |
| 1 | [`docs/00_RESUME.md`](docs/00_RESUME.md) | Les décisions de base en une page |
| 2 | [`docs/01_REFERENCES.md`](docs/01_REFERENCES.md) | Drum Foundry, TetraDrive, Pamplejuce et les autres projets à lire |
| 3 | [`docs/02_TOOLCHAIN.md`](docs/02_TOOLCHAIN.md) | JUCE, CMake, compilateurs, WSL2 contre Windows natif |
| 4 | [`docs/03_ARCHITECTURE.md`](docs/03_ARCHITECTURE.md) | Séparation DSP pur, couche JUCE, UI ; arborescence type |
| 5 | [`docs/04_TESTS.md`](docs/04_TESTS.md) | Catch2, outil headless, pluginval, non régression audio, CI |
| 6 | [`docs/05_WORKFLOW_AGENTIQUE.md`](docs/05_WORKFLOW_AGENTIQUE.md) | La méthode ARP adaptée au C++ audio, skills Matt Pocock |
| 7 | [`docs/06_PLAN_DEMARRAGE.md`](docs/06_PLAN_DEMARRAGE.md) | Les premières étapes concrètes d'un nouveau plugin |
| 8 | [`docs/07_A_REPRENDRE.md`](docs/07_A_REPRENDRE.md) | Tout ce qu'on récupère tout fait (bibliothèques, outils, patterns) au lieu de le coder |

Les règles que les agents doivent appliquer sont dans [`.claude/rules/`](.claude/rules/00-INDEX.md). Le routeur pour Claude Code est [`CLAUDE.md`](CLAUDE.md).

## Utiliser ce playbook dans un projet de plugin

1. Créer le plugin depuis le template [Pamplejuce](https://github.com/sudara/pamplejuce) ("Use this template").
2. Copier `.claude/`, `CLAUDE.md`, `GLOSSARY.md` et `docs/tasks/TEMPLATE.md` de ce repo dans le nouveau projet.
3. Remplir `docs/SPEC.md` du projet (une page : ce que fait le plugin, ce qu'il ne fait pas).
4. Suivre [`docs/06_PLAN_DEMARRAGE.md`](docs/06_PLAN_DEMARRAGE.md).

## Faire évoluer le playbook

Une leçon apprise dans un projet de plugin remonte ici : règle modifiée dans `.claude/rules/`, décision tracée dans `.claude/choices/`, post mortem dans `.claude/learning/`. Les règles ne changent jamais en silence.

## Licence des références

Drum Foundry et TetraDrive sont sous AGPL v3. On les lit et on s'en inspire ; copier leur code impose de publier le plugin sous AGPL. JUCE lui même est sous AGPL v3 ou licence commerciale. Voir [`docs/02_TOOLCHAIN.md`](docs/02_TOOLCHAIN.md#licences).
