---
plugin: MoodzFilter
phase: 2
phase_title: DSP core
gate: DSP tests and golden references green, CPU budget set in benchmarks/budget.json and met, listening approved
updated: 2026-11-03
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
- [x] Gain out −∞ to +6 dB and generic editor · task 0006, ADR 0004, -inf floor, JUCE generic editor, tools snapshot, https://github.com/Wieedze/MoodzFilter/pull/7
- [x] Load the VST3 in Ableton Live (gate) · passed 2026-11-02, session saved and reloaded with Gain out kept

## p2 · Phase 2 · DSP core

- [x] Integrate sst-filters in the dsp layer · task 0007, ADR 0005, GPL v3 via CPM, 7 low pass candidates listed, https://github.com/Wieedze/MoodzFilter/pull/9
- [x] Listen to the 7 low pass candidates and choose the 4 models · task 0008 audition build, Model (7 candidates), Cutoff and Resonance in the plugin, listened in Ableton Live on 2026-11-03: all 7 work, Maxime kept 5 (Diode Ladder 24 dB, K35, Vintage Ladder, Cytomic SVF, OB-Xd 4-pole 24 dB), golden change approved; keeping 5 instead of the SPEC's 4 is a SPEC change pending in task 0009, https://github.com/Wieedze/MoodzFilter/pull/11
- [x] Filter list: five models with their passbands · task 0009, ADRs 0006 and 0007, Model lists 9 entries (Cytomic SVF Low-pass, High-pass, Band-pass, Notch; Vintage Ladder Low-pass; OB-Xd 4-pole Low-pass; Diode Ladder Low-pass; K35 Low-pass, High-pass), Mode dropped so a model shows only the passbands it has, Maxime's Live test passed on 2026-11-03, https://github.com/Wieedze/MoodzFilter/pull/12
- [x] Per-model settings: Slope, K35 saturation, Vintage variant · task 0010, ADR 0008, three parameters: Slope 6 to 24 dB/oct (OB-Xd 4-pole continuous through Morph, Diode Ladder at the nearest 6 dB step), K35 saturation 0 to 100 % (25 % = Mild), Vintage variant (6 sub-models); defaults give back the task 0009 sound, Maxime's Live test approved on 2026-11-03 at 16:32 CET, https://github.com/Wieedze/MoodzFilter/pull/13
- [x] Crossfade on a Model change · task 0011, 20 ms linear crossfade between filter variants in a dsp crossfading filter bank: a Model change, a Diode Ladder slope step and a Vintage variant change no longer click (SPEC success criterion 3), the slope wobble passes without hysteresis, no golden change, Maxime's Live test approved on 2026-11-03 at 20:33 CET, https://github.com/Wieedze/MoodzFilter/pull/14
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
