# Résumé : les décisions de base

État au 2026-11-02. Chaque ligne renvoie au document qui la justifie.

| Sujet | Décision | Pourquoi | Détail |
| --- | --- | --- | --- |
| Point de départ | Template [Pamplejuce](https://github.com/sudara/pamplejuce) | Build, Catch2, pluginval, CI, signature déjà réglés ; il fournit même un `CLAUDE.md`/`AGENTS.md` | [01](01_REFERENCES.md) |
| Framework | JUCE 9.x en sous module git, version épinglée sur un tag | JUCE 9 est sorti, TetraDrive est déjà en 9.0.4, Pamplejuce suit JUCE 9 | [02](02_TOOLCHAIN.md) |
| Langage | C++23 (C++20 minimum) | Standard du template | [02](02_TOOLCHAIN.md) |
| Build | CMake ≥ 3.25 + Ninja, dépendances via CPM | Un seul système pour Windows, macOS, Linux et la CI | [02](02_TOOLCHAIN.md) |
| Poste de dev | Build Windows natif (MSVC) pour tester dans le DAW ; WSL2/Linux pour les tests DSP rapides et la CI | Un VST3 Linux ne se charge pas dans un DAW Windows | [02](02_TOOLCHAIN.md) |
| Architecture | Trois couches : `dsp/` sans JUCE, `plugin/` (processeur, paramètres, état), `ui/` | Le DSP se teste sans hôte et sans DAW | [03](03_ARCHITECTURE.md) |
| Tests unitaires | Catch2 v3 sur `dsp/` et `plugin/`, en TDD | Boucle rouge vert refactor, feedback pour l'agent | [04](04_TESTS.md) |
| Tests système | Un binaire `tools` headless (render, check, bench) comme Drum Foundry | L'agent vérifie sans ouvrir de DAW | [04](04_TESTS.md) |
| Validation | pluginval strictness 10 en CI, à chaque PR | Attrape ce qu'un hôte réel ferait planter | [04](04_TESTS.md) |
| Non régression audio | Rendus de référence comparés avec tolérance | Un refactor ne doit pas changer le son en silence | [04](04_TESTS.md) |
| Règles temps réel | Pas d'allocation, de lock, d'I/O ni d'exception dans `processBlock` | Sinon : craquements, plantages d'hôte | [rules/realtime-audio](../.claude/rules/realtime-audio.md) |
| Anti dérive | SPEC d'une page, tâches atomiques avec "Hors périmètre", `FUTURE.md`, phases avec gates | Le scope d'un plugin explose vite (cf. matrice de modulation) | [rules/scope](../.claude/rules/scope.md) |
| Méthode agentique | Routeur `CLAUDE.md` + rules + ADR + post mortems + `task-verifier` (méthode ARP) ; skills Matt Pocock pour l'alignement et le TDD | Fonctionne déjà sur ARP ; Pocock ajoute grilling, glossaire, TDD | [05](05_WORKFLOW_AGENTIQUE.md) |

## Les trois idées à retenir

1. **Le DSP doit pouvoir tourner sans JUCE et sans DAW.** C'est ce que font Drum Foundry (outil headless) et TetraDrive (tests sans JUCE). C'est aussi ce qui rend le travail agentique possible : un agent ne peut pas écouter, mais il peut lancer un test.
2. **Le thread audio est sacré.** Toute la discipline de code tourne autour de ça, et c'est la classe de bugs qu'un agent introduit le plus facilement sans s'en rendre compte. Un agent de revue dédié la vérifie.
3. **Le périmètre se défend par écrit.** Une SPEC d'une page, des tâches avec une liste "Hors périmètre", et un `FUTURE.md` pour tout le reste.
