# FUTURE

Requested or imagined, deliberately not built now. One line per idea, with the date and the context. An idea only leaves this file through a SPEC or a SPEC amendment.

## Formats (out of scope, ADR 0003)

* 2026-11-02: AU / AUv3 (Logic Pro), CLAP (clap-juce-extensions, already studied in `docs/references/melatonin-and-clap.md`), Standalone. Each would need its own validation in CI.

## Playbook

* 2026-11-02: a "blank plugin" template repo ready to clone (Pamplejuce + this playbook + dsp/plugin/ui/tools targets already in place).
* 2026-11-02: a Claude Code `juce-plugin` skill that wraps the real-time rules and the task loop.
* 2026-11-02: detailed reading notes per reference project (Surge, Vital, chowdsp) in `docs/references/`.

## MoodzFilter (out of v1, see `docs/plugins/moodzfilter/SPEC.md`)

* 2026-11-02: envelope follower; stereo phase offset of the LFO; mid/side; modulation matrix and destinations other than the cutoff; custom-drawn interface and analyser; MIDI note tracking; sidechain; macOS and Linux; more than 4 filter models.

## After MoodzFilter

* 2026-11-02: a community VST. People vote online on features, and each week we implement the winning vote. Prerequisite: finish MoodzFilter end to end to know what the index must contain. Points to settle when the time comes: where to vote (the public cannot write into a claude.ai artifact, so it needs GitHub or a site of our own), who sorts the proposals before the vote, how a week of voting goes through grilling, SPEC and ADR without breaking the real-time rules or the parameter IDs, and binary signing for public distribution.
