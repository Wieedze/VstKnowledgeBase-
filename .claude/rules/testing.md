# Règles de test

* **TDD** : le test qui décrit le comportement est écrit et vu rouge avant le code. Une tranche verticale à la fois.
* Un test DSP nomme son signal d'entrée, ses paramètres, la valeur attendue, la tolérance, et d'où vient la valeur attendue.
* Pas de test qui reproduit l'implémentation pour calculer l'attendu.
* Tolérances explicites, jamais d'égalité exacte sur des flottants.
* Les tests DSP tournent sans JUCE et en moins de quelques secondes.
* Un bug corrigé = un test qui échouait sur ce bug.
* **Références audio (`tests/golden/`)** : un agent ne les régénère jamais pour faire passer un test. Changement = commit séparé `golden: <raison>`, validé par l'humain après écoute.
* pluginval strictness 10 avant toute PR qui touche `plugin/`.
* Un test désactivé porte un lien vers une tâche qui le réactive.
