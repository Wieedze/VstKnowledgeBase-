# Glossaire

Vocabulaire partagé entre toi, les agents et le code (convention Matt Pocock : les noms de classes, fichiers et tests suivent ces termes). Un projet de plugin copie ce fichier et l'étend avec ses propres termes.

| Terme | Définition |
| --- | --- |
| **Thread audio** | Le thread de l'hôte qui appelle `processBlock`. Temps réel : il ne doit jamais attendre |
| **Message thread** | Le thread de l'UI JUCE. Peut allouer, bloquer, faire des I/O |
| **Bloc** | Un appel à `processBlock` : N échantillons par canal, N variable et ≤ `maxBlockSize` |
| **Paquet interne** | Sous division fixe d'un bloc utilisée par le DSP pour être indépendant de la taille de bloc |
| **Snapshot de paramètres** (`Params`) | Copie simple des valeurs de paramètres, faite au début de chaque bloc, seule chose que lit le DSP |
| **APVTS** | `AudioProcessorValueTreeState`, l'arbre de paramètres de JUCE, côté `plugin/` seulement |
| **ID de paramètre** | Identifiant stable d'un paramètre, gelé après release |
| **État** | Ce que l'hôte sauve dans la session (`getStateInformation`), versionné |
| **Preset** | Sous ensemble de l'état choisi par l'utilisateur ; on liste ce qui n'en fait pas partie |
| **Migration d'état** | Chargement d'un état d'une version antérieure avec valeurs de repli |
| **Latence** | Retard en échantillons introduit par le plugin, rapporté à l'hôte |
| **Queue** (tail) | Durée pendant laquelle le plugin produit du son après la fin de l'entrée |
| **Lissage** | Interpolation d'un paramètre dans le temps pour éviter le zipper noise |
| **Oversampling** | Traitement à une fréquence multiple pour limiter l'aliasing des non linéarités |
| **Référence golden** | Rendu WAV de référence dans `tests/golden/`, comparé à chaque PR |
| **Signal de test** | Entrée normalisée d'un test : impulsion, sinus, sweep, bruit rose, boucle |
| **Gate** | Condition à remplir pour passer d'une phase à la suivante |
| **Tranche verticale** | Petit morceau de fonctionnalité qui traverse toutes les couches nécessaires et se teste seul |
