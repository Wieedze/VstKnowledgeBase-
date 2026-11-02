# STATE

Maintained by hand. A task does not close without updating this file.

## This repo

Playbook (knowledge base), not a plugin. Initial version of 2026-11-02. PR #1 and PR #2 merged into main; the index website is published on GitHub Pages (https://wieedze.github.io/VstKnowledgeBase-/) by GitHub Actions on every push to main.

## In a plugin project, this file contains

| Field | Value |
| --- | --- |
| Current plugin | MoodzFilter (`docs/plugins/moodzfilter/`) |
| Current phase | 1 (skeleton). Phase 0 closed on 2026-11-02: SPEC frozen, ADR 0001 (AGPL) and ADR 0002 (identity) accepted |
| Gate to pass | Gate 1: green CI, green pluginval 10, VST3 loaded in the DAW (Ableton Live, Windows), `STATE.md` up to date |
| Plugin identity (ADR 0002) | `COMPANY_NAME` Radikal Moodz, `PLUGIN_MANUFACTURER_CODE` `Rdkm`, `PLUGIN_CODE` `Mzf1`, VST3 only, Windows only for v1. Final once a session is saved in Live |
| Current task | None started. Next: create the MoodzFilter repo from Pamplejuce |
| Pinned JUCE version | — |
| CPU budget per block | — |
| Known defects (sound, perf, hosts) | — |
| Recommended order of next tasks | Phase 1 lane of `docs/plugins/moodzfilter/ROADMAP.md`: 1. Create the MoodzFilter repo from Pamplejuce (copy `.claude/`, `CLAUDE.md`, `GLOSSARY.md`, the SPEC). 2. Pin JUCE 9 to a tag, remove AU, AUv3, CLAP, Standalone. 3. Separate the `dsp`, `plugin`, `ui`, `tools` targets. 4. Smoothed gain alone, with TDD. 5. `tools render` and `compare`, first golden reference. 6. Green CI (Windows, Linux RealtimeSanitizer job, pluginval 10). 7. Load the VST3 in Ableton Live. Playbook lane still open: independent agent check of the repo, remaining licences |

## Open questions of the playbook

* Whether to adopt TetraDrive's sample accurate automation patch (to be tested on JUCE 9).
* ~~Choice of allocation counter for real-time tests~~: settled, RealtimeSanitizer (ADR 0002).
* Licenses still to check: MTS-ESP, OB-Xf assets, AKWF waveforms (CC0?), provenance of BYOD's IRs and neural models.
* Study the 3 suspected bugs in valentine and those in Frequalizer only if we reuse their code (found by reading, not compiled).
* Exact format of `tests/golden/manifest.json`.
