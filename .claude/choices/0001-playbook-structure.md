# 0001 — Structure du playbook reprise d'ARP, enrichie des skills Matt Pocock

**Date** : 2026-11-02
**Statut** : acceptée

## Contexte

La méthode agentique d'ARP (routeur `CLAUDE.md`, règles par domaine, ADR, post mortems, `task-verifier` obligatoire) fonctionne. Le développement de plugins en C++ ajoute une classe de bugs que les tests unitaires ne voient pas (temps réel) et un risque de dérive de périmètre élevé.

## Options considérées

1. Reprendre ARP tel quel.
2. Adopter seulement les skills de Matt Pocock (grilling, spec, tickets, TDD).
3. Combiner : structure ARP pour le repo, skills Pocock pour le flux de travail, plus des ajouts propres à l'audio.

## Décision

Option 3. Ajouts propres à l'audio : agent `rt-safety-reviewer`, `task-verifier` qui exécute build, tests, outil headless et pluginval, références golden protégées, phases fermées par des gates, `GLOSSARY.md` au lieu de laisser le vocabulaire émerger.

## Conséquences

Un peu plus de cérémonie par tâche, compensée par des tâches courtes. Le playbook doit rester la source : une leçon apprise dans un plugin remonte ici.
