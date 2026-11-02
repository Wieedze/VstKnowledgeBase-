# Règles C++

* C++23 (C++20 minimum). Pas d'extension de compilateur.
* `clang-format` du repo, appliqué avant commit.
* Warnings : `-Wall -Wextra` (ou `/W4`) ; aucun warning nouveau toléré.
* RAII partout. Pas de `new`/`delete` nus ; `std::unique_ptr` hors thread audio.
* `const` et `noexcept` par défaut sur ce qui tourne sur le thread audio.
* Passer les buffers en `std::span<float>` (ou `juce::dsp::AudioBlock` dans `plugin/`), jamais en pointeur + taille séparés dans une nouvelle API.
* Pas de `float` comparé avec `==` dans les tests : tolérance explicite.
* Une classe = une responsabilité. Les modules profonds (beaucoup de comportement derrière une petite interface) sont préférés aux classes utilitaires éparpillées.
* Noms tirés de `GLOSSARY.md`. Un terme absent du glossaire y est ajouté dans la même tâche.
* Pas de macro sauf pour la configuration de build.
* Commentaires : le pourquoi, et la source d'une formule DSP (papier, page, équation). Pas le quoi.
