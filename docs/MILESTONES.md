# Milestones

Source of the "Milestone" entries in the index's decision log. One milestone per section, newest first.
Format: a heading `## YYYY-MM-DD · Title`, then the lines `Project:` and `Link:` (optional), then one summary paragraph.
ADRs and post-mortems do not need to be copied here: the index reads them directly in `.claude/choices/`, `.claude/learning/` and `docs/plugins/*/choices/`.

## 2026-11-05 · MoodzFilter input drive and its two curves

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/16

Task 0013 adds a Drive parameter that saturates the signal before the filter, inside each oversampling path, and a Drive curve parameter, Symmetric by default or Asymmetric for even harmonics too (ADR 0009). At 0 dB the signal passes untouched (`./Builds/DspTests "Drive at 0 dB leaves the signal untouched"`) and no golden reference changed. A DC blocker works on the even part of the Asymmetric curve only, so neither the dry signal nor the limiting odd part is filtered: the code review proposed filtering the whole curve, and measuring that showed it overshooting in the bass. The task passed the task-verifier on its fourth round, the first three failing on test coverage and evidence, none on behaviour. Maxime approved the CI installer in Ableton Live on 2026-11-05 at about 10:25 CET. PR #16 is open, waiting for his merge. Still open, in `FUTURE.md`: one non-finite input sample leaves the filter state non-finite until a reset, which predates this task and is to be handled before the release. The next item is the BPM-synced LFO on the cutoff, not started.

## 2026-11-05 · MoodzFilter oversampling with one constant latency

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/15

Task 0012 runs the filter at Off, 2x or 4x through a new Oversampling parameter, 2x by default. Following ADR 0009, the plugin reports one latency at every setting and sample rate, 40 samples (`./Builds/PluginTests "The reported latency is the same at every setting and rate"`), so changing the setting never makes the host realign the track, and host bypass delays the input by the same amount. A change resets the incoming path, lets it settle unheard during a pre-roll, then crossfades it in. The pre-roll came from the code review, which found a click the earlier tests hid because they ran at a mid cutoff; a test with the filter wide open now covers it. Every golden reference changed, in a separate commit after Maxime listened. The task passed the task-verifier in one round and Maxime approved the final installer in Ableton Live on 2026-11-05 at about 09:30 CET. PR #15 was merged on 2026-11-05 (merge 5236723). The next item is Input drive and Drive curve.

## 2026-11-03 · MoodzFilter model changes without clicks

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/14

Task 0011 meets SPEC success criterion 3: a Model change, a Diode Ladder slope step or a Vintage variant change during playback no longer clicks. The filter variants moved into a crossfading filter bank in the dsp layer, tested without JUCE: the incoming variant starts from a clean state and the two outputs are crossfaded linearly over 20 ms, with at most two variants running at once. The slope wobbling across a Diode step passes with the crossfade alone, so no hysteresis was added, and no golden reference changed. The task passed the task-verifier in one round and Maxime approved the CI installer in Ableton Live on 2026-11-03 at 20:33 CET. The next item is input drive with 2x and 4x oversampling.

## 2026-11-03 · MoodzFilter per-model settings

Project: MoodzFilter
Link: docs/plugins/moodzfilter/choices/0008-per-model-settings-as-parameters.md

ADR 0008, chosen with Maxime, settles the per-model settings left open by ADRs 0006 and 0007 and amends SPEC v1: they are three separate parameters, not more Model list entries. Slope goes from 6 to 24 dB/oct (OB-Xd 4-pole continuous through its Morph mode, Diode Ladder at the nearest 6 dB step), K35 saturation from 0 to 100 % (25 % = Mild), and Vintage variant picks one of the 6 Vintage Ladder sub-models. Task 0010 delivered them with defaults that give back the task 0009 sound, passed the task-verifier in one round, and Maxime approved it in Ableton Live on 2026-11-03 at 16:32 CET (PR #13). The next item, the crossfade on a Model change, now also covers a Diode Ladder slope step and a Vintage variant change.

## 2026-11-03 · MoodzFilter scope: five filter models

Project: MoodzFilter
Link: docs/plugins/moodzfilter/choices/0007-model-and-passband-in-one-list.md

ADR 0006, chosen by Maxime after listening to the 7 low pass candidates in Ableton Live in task 0008, amends SPEC v1: MoodzFilter ships 5 filter models instead of 4 (Cytomic SVF, Vintage Ladder, OB-Xd 4-pole, Diode Ladder, K35). ADR 0007, chosen during task 0009 so a model shows only the passbands it has, replaces the Mode parameter of ADR 0006: the Model list holds the 9 model and passband pairs that exist, in a frozen order (Cytomic SVF Low-pass, High-pass, Band-pass, Notch; Vintage Ladder Low-pass; OB-Xd 4-pole Low-pass; Diode Ladder Low-pass; K35 Low-pass, High-pass), with no Mode parameter and no fallback. Task 0009 delivered that list and Maxime checked it in Live on 2026-11-03. Per-model settings (slope, Morph, K35 saturation, Vintage Ladder sub-model) stay v1 parameters, shaped by listening in task 0010. Model blending and a random cutoff curve stay out of v1.

## 2026-11-02 · MoodzFilter gate 1 passed

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/7

The skeleton is done. Task 0006 passed the task-verifier in one round: Gain out now goes from -inf to +6 dB (ADR 0004) and the plugin shows the JUCE generic editor. Maxime installed the VST3 from the CI installer of run 41524747297, loaded it in Ableton Live on Windows, set Gain out, saved the session and reloaded it with the value kept. CI is green on Linux, Linux RealtimeSanitizer and Windows, pluginval at strictness 10 passes, and the golden references were approved by ear. MoodzFilter moves to phase 2, the DSP core.

## 2026-11-02 · MoodzFilter runs in Ableton Live

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/6

For the first time the plugin runs in its target host: Maxime installed the VST3 from the CI installer, loaded it in Ableton Live on Windows and moved Gain out, which works. Task 0005 made CI green on Linux, Linux RealtimeSanitizer and Windows (run 41517663478). The phase 1 gate is not passed yet: a Live session still has to be saved and reloaded with the value kept.

## 2026-11-02 · MoodzFilter repo created, first green CI

Project: MoodzFilter
Link: https://github.com/Wieedze/MoodzFilter/pull/1

Task 0001 passed the task-verifier: the Pamplejuce template became MoodzFilter with the ADR 0002 identity, VST3 only, JUCE pinned to tag 9.0.5, AGPLv3 licence and the playbook layer copied in. CI is green on Linux and Windows (GitHub Actions run 41461476342) and pluginval at strictness 10 passes locally and in CI. The phase 1 gate is not passed yet: the VST3 still has to be loaded in Ableton Live.

## 2026-11-02 · Index website online

Project: Playbook
Link: https://wieedze.github.io/VstKnowledgeBase-/

PR #1 (playbook) and PR #2 (index website and English translation) are merged into main. The site in site/ (Bun, React, Vite) is built by GitHub Actions and published on GitHub Pages on every push to main. It reads the roadmaps, milestones, ADRs and post-mortems directly from the repo.

## 2026-11-02 · Phase 0 gate passed: MoodzFilter identity set

Project: MoodzFilter
Link: docs/plugins/moodzfilter/choices/0002-identity-and-platform.md

ADR 0002 accepted, chosen by Maxime: company name Radikal Moodz, manufacturer code Rdkm, plugin code Mzf1, VST3 only, Windows only for v1. With the SPEC frozen and the AGPL licence ADR, phase 0 is closed and MoodzFilter moves to phase 1, the skeleton.

## 2026-11-02 · MoodzFilter scope frozen

Project: MoodzFilter
Link: docs/plugins/moodzfilter/SPEC.md

Multi-model filter with drive and a tempo-synced LFO, for productions in Ableton Live. VST3, Windows, AGPL, JUCE generic editor. Four models in v1, oversampling, mix, gains, presets. The rest is in FUTURE.md.

## 2026-11-02 · Code study of 14 projects and libraries

Project: Playbook
Link: docs/references/README.md

Notes in docs/references/: licences checked in the files, file:line references, what we take and what we avoid. Several claims taken from the READMEs corrected (Drum Foundry, Gin, chowdsp, Cloud Seed). Nothing was compiled: the defects come from reading the code.

## 2026-11-02 · Creation of the VstKnowledgeBase playbook

Project: Playbook
Link: https://github.com/Wieedze/VstKnowledgeBase-/pull/1

Docs (references, toolchain, architecture, tests, agentic workflow, plan) and the Claude Code layer (CLAUDE.md router, rules by domain, task-verifier and rt-safety-reviewer agents, ADR and post-mortem templates).
