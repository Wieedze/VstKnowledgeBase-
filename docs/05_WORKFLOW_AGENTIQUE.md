# Workflow agentique

On part de la méthode qui fonctionne sur [ARP](https://github.com/Wieedze/ARP) et on l'adapte au C++ temps réel, en y ajoutant les skills de [Matt Pocock](https://github.com/mattpocock/skills).

## Ce qu'on garde d'ARP

| Élément ARP | Rôle | Adaptation VST |
| --- | --- | --- |
| `CLAUDE.md` routeur, sans règle | Dit quoi charger selon la tâche | Table de routage dsp / plugin / ui / build |
| `.claude/rules/` par domaine + `00-INDEX.md` | Charger seulement les règles utiles | `realtime-audio`, `cpp`, `dsp`, `juce`, `ui`, `testing`, `build`, `scope`, `workflow` |
| `.claude/STATE.md` | Où en est le projet en une lecture | Ajout : phase en cours, budget CPU, défauts sonores connus |
| `docs/tasks/` atomiques avec "Do not do in this task" | Anti dérive | Ajout : signal de test et critère mesurable dans la Definition of done |
| `.claude/choices/` ADR | Trace des décisions | Idem |
| `.claude/learning/` post mortems | Leçons réutilisées | Idem |
| `task-verifier` obligatoire | Personne ne note son propre travail | Il lance build, tests, `tools check`, pluginval |
| `FUTURE.md` | Demandé, pas construit | Idem, essentiel pour un plugin |
| `claims.md` (une affirmation chiffrée = une source) | Évite les phrases fausses | Devient : un chiffre audio (dB, ms, % CPU) = une commande qui le reproduit |

## Ce qu'on améliore

1. **Un agent de revue temps réel** (`rt-safety-reviewer`) qui ne fait qu'une chose : chercher dans le diff tout ce qui peut bloquer ou allouer sur le thread audio. C'est la faute la plus fréquente d'un agent en C++ audio, et elle ne se voit pas dans les tests unitaires.
2. **Le `task-verifier` exécute au lieu de lire.** Sur ARP il lit les livrables ; ici il lance `cmake --build`, `ctest`, `tools check`, `tools compare` et pluginval, et colle les sorties.
3. **Un glossaire partagé (`GLOSSARY.md`)**, à la Matt Pocock : les mots du domaine audio (voix, couche, slot de modulation, bloc, snapshot) avec une définition chacun. Les noms de classes et de fichiers les suivent.
4. **Phases avec gates** plutôt qu'un plan de 16 semaines figé : une phase ne commence que quand la précédente passe son gate (voir [`rules/scope.md`](../.claude/rules/scope.md)).
5. **Le routeur reste court.** Le `CLAUDE.md` d'ARP fait plus de 20 Ko et porte des paragraphes d'histoire ; ici l'histoire va dans les ADR.

## Les skills de Matt Pocock à utiliser

Installation dans Claude Code :

```
claude plugin install mattpocock-skills@claude-plugins-official
```

Puis une fois par repo : `/setup-matt-pocock-skills` (tracker de tickets, labels, emplacement des docs).

| Moment | Skill | Usage dans un projet de plugin |
| --- | --- | --- |
| Avant toute fonctionnalité | `/grill-with-docs` | L'agent t'interroge jusqu'à ce que chaque branche soit tranchée, et met à jour `GLOSSARY.md` et les ADR |
| Idée encore floue | `/grill-me` | Même chose sans toucher au code |
| Fixer le périmètre | `/to-spec` | Transforme la discussion en spec |
| Découper | `/to-tickets` | Tickets en tranches verticales, avec dépendances |
| Implémenter | `/implement`, `tdd` | Rouge, vert, refactor, une tranche à la fois |
| Bug ou régression de perf | `diagnosing-bugs` | Boucle qui commence par un test qui échoue sur le bug |
| Revue | `code-review` | Deux axes : standards du repo et fidélité à la spec |
| Tous les quelques jours | `/improve-codebase-architecture` | Repère les modules à approfondir |
| Fin de session | `/handoff`, `retro` | Passation et amélioration de l'environnement agent |

## La boucle d'une tâche

1. **Aligner** : `/grill-with-docs` sur l'idée. Sortie : ADR si décision, glossaire à jour.
2. **Spécifier** : `/to-spec` puis `/to-tickets`. Chaque ticket devient un fichier `docs/tasks/NNNN-slug.md` au format de [`tasks/TEMPLATE.md`](tasks/TEMPLATE.md).
3. **Implémenter en TDD** : un test rouge qui décrit le comportement audio attendu, le code minimal, le refactor.
4. **Vérifier soi même** : build, `ctest`, `tools check`.
5. **Revue temps réel** : `rt-safety-reviewer` sur le diff si `dsp/` ou `plugin/` est touché.
6. **Revue générale** : `code-review`.
7. **Verdict** : `task-verifier`. Pass = post mortem + `STATE.md`. Fail = retour en 3.
8. **Écoute** : si le son change, toi dans le DAW, avant merge.

## Ce qu'un agent ne doit jamais faire seul

* Changer une référence audio (`tests/golden/`) pour faire passer un test.
* Renommer ou supprimer un ID de paramètre.
* Changer `PLUGIN_CODE` ou `PLUGIN_MANUFACTURER_CODE`.
* Mettre à jour JUCE.
* Copier du code d'un projet GPL/AGPL.
* Ajouter une fonctionnalité absente de la tâche.

Chacun de ces cas : stop, question, ADR.
