# Tests

Un agent ne peut pas écouter le plugin. Tout ce qui compte doit donc être vérifiable par une commande qui sort 0 ou non zéro.

## Pyramide

| Niveau | Outil | Cible | Quand |
| --- | --- | --- | --- |
| 1. Unitaire DSP | Catch2, sans JUCE | `dsp/` | Chaque changement, en TDD |
| 2. Propriétés DSP | Catch2 + générateurs | `dsp/` | Chaque changement |
| 3. Plugin | Catch2 avec JUCE | `plugin/` : paramètres, état, latence | Chaque changement de `plugin/` |
| 4. Non régression audio | `tools render` + comparaison | Rendus de référence | Chaque PR |
| 5. Validation hôte | pluginval strictness 10 | Binaire VST3 | Chaque PR (CI) |
| 6. Performance | Cible `Benchmarks`, `tools bench` | Coût CPU par bloc | Chaque PR touchant `dsp/` |
| 7. Écoute | Toi, dans le DAW | Le son | Fin de phase, avant merge des changements sonores |

## Niveau 1 et 2 : ce qu'on teste sur un bloc DSP

* Réponse à une impulsion, à un sinus, à un DC : valeurs attendues calculées à part (Python, papier) et citées dans le test.
* Réponse en fréquence d'un filtre : gain mesuré à quelques fréquences contre la formule, à ± 0,1 dB.
* `reset()` remet bien l'état à zéro (deux rendus successifs identiques).
* Aucune NaN/Inf sur un balayage des paramètres aux bornes.
* Indépendance à la taille de bloc.
* Indépendance au sample rate quand c'est attendu (44,1 / 48 / 96 kHz).
* Pas d'allocation dans `process` : compteur d'allocation en build de test (opérateur `new` surchargé qui échoue si un drapeau "zone temps réel" est actif).

Utiliser [melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) pour que les échecs affichent la forme du signal en ASCII.

## Niveau 3 : plugin

* Round trip d'état.
* Chargement d'états des versions précédentes (fichiers gardés dans `tests/plugin/states/`).
* Latence rapportée = latence mesurée (impulsion en entrée, position du pic en sortie).
* Bus layouts supportés et refusés.
* IDs de paramètres : un test fige la liste des IDs. Un ID supprimé ou renommé fait échouer le test.

## Niveau 4 : non régression audio

Comme `DrumFoundryTools render` :

1. `tools render --preset all --out build/renders` produit un WAV par preset et par signal de test (impulsion, sweep, bruit rose, boucle de batterie courte).
2. `tools compare build/renders tests/golden` compare à la référence : erreur max, RMS de la différence, avec une tolérance déclarée par fichier dans `tests/golden/manifest.json`.
3. Changer une référence est un acte explicite : commit séparé, message `golden: <raison>`, et une phrase dans le post mortem.

## Niveau 5 : pluginval

```
pluginval --strictness-level 10 --validate build/<Plugin>_artefacts/Release/VST3/<Plugin>.vst3
```

En CI via Pamplejuce. En local avant toute PR qui touche `plugin/`.

## Le binaire `tools`

Sous commandes minimales, à construire dès la phase 1 :

| Commande | Rôle |
| --- | --- |
| `render` | Rendus WAV (+ PNG spectrogramme optionnel) avec le vrai moteur |
| `compare` | Comparaison avec les références |
| `check` | Batterie rapide : NaN, round trip, taille de bloc, latence |
| `bench` | Coût CPU par bloc, par configuration |

Option CMake `-D<PLUGIN>_BUILD_TOOLS=ON`, désactivée pour les builds de release.

## Vérifier que `dsp/` reste sans JUCE

La cible `dsp` est une bibliothèque CMake sans lien vers JUCE. Si quelqu'un ajoute un `#include <juce_...>`, la compilation de la cible de tests DSP échoue. Ajouter aussi un check grep en CI :

```
! grep -rn "juce" source/dsp/
```

## CI GitHub Actions (à partir de Pamplejuce)

Sur chaque PR, Linux + Windows + macOS :

1. Configure et build (Release).
2. `ctest` (niveaux 1 à 3).
3. `tools check` et `tools compare` (niveau 4).
4. pluginval strictness 10 (niveau 5).
5. Benchmarks, avec alerte si un bloc dépasse le budget fixé dans `benchmarks/budget.json`.
6. clang-format en mode vérification.

Une PR rouge ne se merge pas, y compris quand c'est un agent qui l'a ouverte.
