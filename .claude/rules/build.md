# Règles de build et CI

* CMake ≥ 3.25, générateur Ninja par défaut.
* JUCE en sous module, épinglé sur un tag. Les patchs JUCE vivent dans `patches/` avec une ligne d'explication chacun.
* Dépendances tierces via CPM avec version fixée (pas de branche mouvante).
* Cibles : `dsp` (bibliothèque sans JUCE), `<Plugin>` (formats), `Tests`, `Benchmarks`, `<Plugin>Tools` (option, off en release).
* Version unique dans `VERSION` (ou le premier titre de `CHANGELOG.md`), propagée au binaire. La CI vérifie la cohérence.
* CI sur chaque PR : Linux, Windows, macOS ; build, `ctest`, `tools check`, `tools compare`, pluginval 10, benchmarks, clang-format.
* Release : un tag `vX.Y.Z` cohérent avec la version déclenche la construction des installeurs.
* Les binaires et installeurs ne sont jamais commités ; ils sont des artefacts CI.
