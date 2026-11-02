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

- [x] Create the MoodzFilter repo from Pamplejuce · task 0001, https://github.com/Wieedze/MoodzFilter/pull/1
- [x] Pin JUCE 9 to a tag, remove AU, AUv3, CLAP, Standalone · task 0001, JUCE 9.0.5, VST3 only, https://github.com/Wieedze/MoodzFilter/pull/1
- [x] Separate the dsp, plugin, ui, tools targets · task 0002, dsp/ without JUCE, configure-time check, https://github.com/Wieedze/MoodzFilter/pull/2
- [x] Smoothed gain alone, with TDD · task 0003, exact gain, NaN, block size, state, frozen IDs, https://github.com/Wieedze/MoodzFilter/pull/4
- [x] tools render and compare, first golden reference · task 0004, render, compare and check, golden references approved by ear, https://github.com/Wieedze/MoodzFilter/pull/5
- [x] Green CI · Windows, Linux RealtimeSanitizer job, pluginval 10 · task 0005, [[clang::nonblocking]] under RTSan with a canary, strict C++23 everywhere, https://github.com/Wieedze/MoodzFilter/pull/6
- [~] Gain out −∞ to +6 dB and generic editor · task 0006, ADR 0004
- [~] Load the VST3 in Ableton Live (gate) · loaded and Gain out works 2026-11-02; save/reload pending

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
