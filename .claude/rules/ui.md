# Règles UI

* L'éditeur ne contient pas de logique audio. Il lit et écrit les paramètres via les attachments APVTS.
* Les données de visualisation (analyseur, mètres, scope) arrivent par une FIFO lock free alimentée par le thread audio ; l'UI la lit sur un timer.
* L'éditeur peut être détruit et recréé à tout moment par l'hôte : aucun état important ne vit seulement dans l'UI.
* Taille redimensionnable, mise à l'échelle testée à 100 %, 150 %, 200 %.
* Polices embarquées, licences incluses.
* Le look est décrit dans un document de design (couleurs, tailles, composants) avant d'être codé.
* `tools snapshot` produit des captures pour la revue ; un agent ne déclare pas l'UI finie sans capture.
