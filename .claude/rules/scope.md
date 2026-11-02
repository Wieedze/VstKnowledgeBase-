# Règles de périmètre (anti dérive)

Un plugin dérive vite : une matrice de modulation qui passe de 4 à 17 sources, des formes de LFO "parce que c'est facile", une UI refaite avant que le son soit bon. Ces règles existent pour ça.

## Les documents qui tiennent le périmètre

| Document | Rôle |
| --- | --- |
| `docs/SPEC.md` | Une page. Ce que fait la v1 et une section **Hors v1** |
| `docs/tasks/NNNN-*.md` | Une tâche atomique, avec **Hors périmètre** |
| `FUTURE.md` | Tout ce qui est demandé ou imaginé et pas construit maintenant |
| `.claude/STATE.md` | Phase en cours et gate à passer |

## Règles

1. **Rien ne se code s'il n'est pas dans la tâche en cours.** Une idée en cours de route va dans `FUTURE.md` avec une ligne de contexte, puis on revient à la tâche.
2. **Une tâche tient en une session.** Sinon elle est redécoupée avant de commencer.
3. **Les phases sont fermées par des gates** (`docs/06_PLAN_DEMARRAGE.md`). On ne commence pas l'UI avant que le gate DSP soit vert.
4. **Changer la SPEC est une décision**, pas une conséquence : `/grill-with-docs`, puis ADR, puis SPEC amendée.
5. **Quand un agent hésite sur le périmètre, il s'arrête et demande.** Il ne choisit pas l'option la plus large.
6. **Pas de "petit refactor au passage"** dans une tâche de fonctionnalité. Refactor = tâche dédiée.
7. **Le son prime sur l'UI** : pas de travail visuel sur une fonctionnalité dont le DSP n'a pas passé ses tests et l'écoute.

## Signaux de dérive (à vérifier par le task-verifier)

* Fichiers modifiés hors de la couche annoncée par la tâche.
* Paramètres ajoutés non listés dans la tâche.
* Diff beaucoup plus gros que ce que la tâche laissait prévoir.
* Nouveau terme utilisé sans entrée dans `GLOSSARY.md`.
