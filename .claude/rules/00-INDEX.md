# Index des règles

Charger seulement les fichiers qui correspondent à la tâche (table de routage dans `CLAUDE.md`).

| Fichier | Domaine | Charger quand |
| --- | --- | --- |
| `realtime-audio.md` | Thread audio | `dsp/` ou `plugin/` touché |
| `cpp.md` | C++ moderne, style | Tout code C++ |
| `dsp.md` | Traitement du signal | `dsp/` touché |
| `juce.md` | JUCE, paramètres, état | `plugin/` ou `ui/` touché |
| `ui.md` | Éditeur, composants | `ui/` touché |
| `testing.md` | Tests, golden, TDD | Toute tâche de code |
| `build.md` | CMake, CI, packaging | Build ou CI touché |
| `scope.md` | Périmètre, anti dérive | Toute nouvelle fonctionnalité |
| `workflow.md` | Fin de tâche, vérification | Toute tâche, à la fin |

Changer une règle : éditer le fichier, écrire un ADR dans `.claude/choices/` qui dit pourquoi, et lier le post mortem s'il y en a un.
