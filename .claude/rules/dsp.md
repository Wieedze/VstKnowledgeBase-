# Règles DSP

* `dsp/` ne dépend pas de JUCE. Aucun `#include <juce_...>`.
* Chaque processeur expose `prepare(double sampleRate, int maxBlockSize)`, `reset()`, `process(...)`. Pas d'état global.
* Toute formule cite sa source en commentaire (RBJ cookbook, papier, livre, page).
* Les coefficients sont recalculés hors de la boucle par échantillon, et seulement quand un paramètre change.
* Tout paramètre audible est lissé.
* Non linéarités (saturation, waveshaping, clipping) : oversampling autour d'elles seulement, latence calculée et rapportée.
* Résultat indépendant de la taille de bloc. Si un algorithme l'exige, traiter par paquets internes de taille fixe (Drum Foundry : 32 échantillons dans sa réverbe). Le test d'indépendance à la taille de bloc active la modulation.
* Sortie finie garantie : protéger les divisions, les `log`, les filtres instables aux bornes.
* Pas de `rand()` : générateur déterministe et seedable, pour que les rendus de test soient reproductibles.
* Un algorithme inspiré d'un projet tiers cite le projet et sa licence ; si le projet est GPL/AGPL et que du code est repris, ADR obligatoire.
