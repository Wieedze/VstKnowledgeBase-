# MoodzFilter : SPEC v1

**Date** : 2026-11-02
**Statut** : figée (phase 0). Toute modification passe par `/grill-with-docs`, puis un ADR, puis cette SPEC amendée.

## En une phrase

Un filtre multi-modèles avec drive et LFO synchronisé au tempo, en VST3 pour Windows, fait pour les productions de Maxime dans Ableton Live.

## Cadre

| Décision | Choix | Trace |
| --- | --- | --- |
| Format | VST3 uniquement | ADR 0003 du playbook |
| Plateforme | Windows uniquement | ADR 0002 MoodzFilter |
| Hôte de référence | Ableton Live (VST3, Windows) | |
| Licence | Open source AGPL v3 | ADR 0001 MoodzFilter |
| Public | Productions personnelles | |
| Type | Effet stéréo (entrée et sortie stéréo, mono accepté) | |
| Stéréo | Lié : le même filtre et la même modulation sur les deux canaux | |
| Interface | Éditeur générique de JUCE | |

## Chaîne du signal

```
entrée → gain in → drive (oversamplé) → filtre (modèle choisi) → mix dry/wet → gain out → sortie
                                  ↑
                         LFO synchronisé (cutoff)
```

L'oversampling entoure le drive et le filtre, seuls étages non linéaires. Le chemin dry est retardé de la latence de l'oversampling pour que le mix ne crée pas de filtrage en peigne.

## Paramètres v1

| Paramètre | Plage | Défaut | Note |
| --- | --- | --- | --- |
| Modèle | 4 modèles (voir ci dessous) | Modèle 1 | Liste figée à la phase 2, ajouts en fin de liste uniquement |
| Mode | Passe-bas, passe-haut, passe-bande, notch (selon le modèle) | Passe-bas | |
| Cutoff | 20 Hz à 20 kHz, échelle logarithmique | 1 kHz | Lissé |
| Résonance | 0 à 100 % | 20 % | Lissée |
| Drive | 0 à 24 dB | 0 dB | Lissé |
| LFO forme | Sinus, triangle, dent de scie, carré | Sinus | |
| LFO vitesse | Valeurs synchronisées au BPM de l'hôte, de 4 mesures à 1/32, avec triolets et pointées | 1/4 | |
| LFO profondeur | 0 à ±4 octaves sur le cutoff | 0 | Lissée |
| Oversampling | Désactivé, 2x, 4x | 2x | Latence fixe pour un réglage donné, rapportée à l'hôte |
| Mix | 0 à 100 % | 100 % | Lissé |
| Gain in | −24 à +24 dB | 0 dB | Lissé |
| Gain out | −24 à +24 dB | 0 dB | Lissé |

## Modèles de filtre

Quatre modèles en v1, choisis à l'écoute pendant la phase 2 parmi ceux de [sst-filters](https://github.com/surge-synthesizer/sst-filters) (GPL v3, compatible AGPL) et le filtre ZDF d'[OB-Xf](https://github.com/surge-synthesizer/OB-Xf). Cible : un multimode propre, un ladder, un modèle façon OB-X, un diode. Le choix final est tracé par ADR.

## Presets

Quelques presets d'usine et la sauvegarde ou le rechargement des presets de l'utilisateur, avec un module existant (`chowdsp_presets_v2` ou équivalent) plutôt que du code maison. L'état de session est versionné dès la v1.

## Hors v1

Tout ceci est noté dans `FUTURE.md` et n'entre qu'avec une SPEC amendée :

1. Suiveur d'enveloppe.
2. Décalage de phase stéréo du LFO.
3. Traitement mid/side.
4. Matrice de modulation, autres destinations que le cutoff.
5. Interface dessinée, analyseur de spectre.
6. Suivi des notes MIDI, sidechain.
7. macOS, Linux, autres formats.
8. Plus de 4 modèles de filtre.

## Critères de réussite de la v1

1. Les 4 modèles sonnent juste dans Ableton Live, validé à l'écoute.
2. CI verte : tests DSP, RealtimeSanitizer, pluginval strictness 10, rendus de référence.
3. Aucun clic ni craquement en automatisant le cutoff, le modèle et l'oversampling pendant la lecture.
4. Une session Ableton sauvée avec la v1 se recharge à l'identique.
