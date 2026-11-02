# Règles du thread audio

Référence : Ross Bencina, *Real-time audio programming 101: time waits for nothing*. Principe : **si on ne sait pas combien de temps ça prend, on ne le fait pas sur le thread audio.**

Le "thread audio" couvre `processBlock`, tout ce qu'il appelle, et `prepareToPlay`/`releaseResources` seulement pour ce qui y est explicitement autorisé.

## Interdit dans `processBlock` et tout ce qu'il appelle

| Interdit | Exemples | Alternative |
| --- | --- | --- |
| Allocation / libération mémoire | `new`, `delete`, `malloc`, `std::vector::push_back` au delà de la capacité, `std::string`, `std::function` qui capture, `juce::String`, `AudioBuffer::setSize` qui agrandit | Pré allouer dans `prepareToPlay` ; tailles max connues |
| Verrou bloquant | `std::mutex::lock`, `CriticalSection`, `ScopedLock` | Atomics, FIFO SPSC lock free, `try_lock` qui saute le travail si occupé |
| I/O | Fichiers, réseau, `DBG`, `std::cout`, logging | FIFO vers un thread de log |
| Appels système qui peuvent bloquer | `sleep`, création de thread, `MessageManager` | Thread de fond, `AsyncUpdater` côté message thread |
| Exceptions | `throw`, fonctions qui peuvent lancer | Codes de retour, préconditions vérifiées en amont |
| Attente du thread UI | Lire un `Component`, `Value`, `ValueTree` partagé | Snapshot de paramètres atomiques |
| Algorithmes en temps non borné | Tri, recherche dans une structure qui grandit | Taille fixe, complexité bornée et connue |

## Obligatoire

* Toute donnée partagée entre l'UI et l'audio passe par un atomic, une FIFO SPSC, ou un échange de pointeur atomique.
* Un objet lourd remplacé (IR, table, sample) est **libéré hors du thread audio** (file de "garbage" vidée par un timer).
* Les dénormaux sont neutralisés (`juce::ScopedNoDenormals` en tête de `processBlock`).
* `prepareToPlay` peut allouer ; il doit allouer pour le pire cas (`maxBlockSize`, sample rate max utilisé).
* L'hôte peut appeler `processBlock` avec un nombre d'échantillons inférieur à `maxBlockSize`, y compris 0. Le code le gère.

## Comment le vérifier

* Revue du diff par l'agent `rt-safety-reviewer`.
* RealtimeSanitizer : `processBlock` et les `process` du DSP marqués `[[clang::nonblocking]]`, tests lancés avec `-fsanitize=realtime` en CI.
* Primitives prêtes plutôt que maison : `farbot::RealtimeObject`, `farbot::fifo`, `AbstractFifo` (voir `docs/07_A_REPRENDRE.md`).
* `tools bench` : le coût max d'un bloc reste sous le budget.
