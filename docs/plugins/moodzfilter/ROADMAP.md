---
plugin: MoodzFilter
phase: 1
phase_title: Skeleton
gate: Green CI, green pluginval 10, VST3 loaded in the DAW, STATE.md up to date
updated: 2026-11-02
---

# MoodzFilter roadmap

Source of the index's Roadmap view. One section per phase, one line per task.
Task state: `[ ]` to do, `[~]` in progress, `[x]` done. The note follows the title after ` · `.
Update the header (`phase`, `gate`) when a gate is passed, and add a milestone in `docs/MILESTONES.md`.

## playbook · Playbook

- [x] Review and merge PR #1 · playbook, study notes, MoodzFilter scope
- [x] Put the index online on GitHub Pages · Bun + React + Vite site in site/
- [ ] Have the repo checked by independent agents · compare every claim with the code and the licences, fix
- [ ] Check the remaining licences · MTS-ESP, OB-Xf assets, AKWF waveforms, BYOD IRs and models

## p0 · Phase 0 · Decide

- [x] Define the scope and write the SPEC · docs/plugins/moodzfilter/SPEC.md
- [x] ADR 0001 · AGPL licence
- [x] ADR 0002 · validate manufacturer and plugin codes · Radikal Moodz, Rdkm, Mzf1 accepted

## p1 · Phase 1 · Skeleton

- [ ] Create the MoodzFilter repo from Pamplejuce · copy .claude/, CLAUDE.md, GLOSSARY.md and the SPEC
- [ ] Pin JUCE 9 to a tag, remove AU, AUv3, CLAP, Standalone · make signing conditional on the secrets
- [ ] Separate the dsp, plugin, ui, tools targets · dsp/ without JUCE, CI test that checks it
- [ ] Smoothed gain alone, with TDD · exact gain, NaN, block size, state, frozen IDs
- [ ] tools render and compare, first golden reference
- [ ] Green CI · Windows, Linux RealtimeSanitizer job, pluginval 10
- [ ] Load the VST3 in Ableton Live · phase 1 gate

## p2 · Phase 2 · DSP core

- [ ] Plug in sst-filters, listen and choose the 4 models · choice recorded by ADR
- [ ] Input drive with 2x and 4x oversampling · latency reported, dry path delayed
- [ ] BPM-synced LFO on the cutoff · block size test with the LFO active
- [ ] Dry/wet mix, in/out gains, smoothing everywhere
- [ ] CPU budget and listening in Live · gate, golden, budget met, listening approved

## p3 · Phase 3 · State

- [ ] Freeze the parameter IDs
- [ ] Factory presets and user presets · existing module, no in-house code
- [ ] Versioned state, reloading a Live session

## p4 · Phase 4 · UI

- [ ] JUCE generic editor checked · custom-drawn UI out of v1

## p5 · Phase 5 · Release

- [ ] Windows installer and v1.0.0 tag · test on a clean machine
