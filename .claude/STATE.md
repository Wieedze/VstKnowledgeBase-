# STATE

Maintained by hand. A task does not close without updating this file.

## This repo

Playbook (knowledge base), not a plugin. Initial version of 2026-11-02.

## In a plugin project, this file contains

| Field | Value |
| --- | --- |
| Current plugin | MoodzFilter (`docs/plugins/moodzfilter/`) |
| Current phase | 0 (decide): SPEC frozen, AGPL license ADR accepted, identity ADR proposed |
| Gate to pass | Validate `COMPANY_NAME` and the plugin codes (MoodzFilter ADR 0002), then phase 1 |
| Current task | — |
| Pinned JUCE version | — |
| CPU budget per block | — |
| Known defects (sound, perf, hosts) | — |
| Recommended order of next tasks | — |

## Open questions of the playbook

* Whether to adopt TetraDrive's sample accurate automation patch (to be tested on JUCE 9).
* ~~Choice of allocation counter for real-time tests~~: settled, RealtimeSanitizer (ADR 0002).
* Licenses still to check: MTS-ESP, OB-Xf assets, AKWF waveforms (CC0?), provenance of BYOD's IRs and neural models.
* Study the 3 suspected bugs in valentine and those in Frequalizer only if we reuse their code (found by reading, not compiled).
* Exact format of `tests/golden/manifest.json`.
