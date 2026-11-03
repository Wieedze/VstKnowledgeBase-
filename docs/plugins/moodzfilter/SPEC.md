# MoodzFilter: SPEC v1

**Date**: 2026-11-02
**Status**: frozen (phase 0). Any change goes through `/grill-with-docs`, then an ADR, then this SPEC amended.
**Amended**: 2026-11-02, gain ranges (ADR 0004). 2026-11-03, five filter models, Mode fallback, per-model settings (ADR 0006).

## In one sentence

A multi-model filter with drive and a tempo-synced LFO, as a VST3 for Windows, made for Maxime's productions in Ableton Live.

## Frame

| Decision | Choice | Record |
| --- | --- | --- |
| Format | VST3 only | Playbook ADR 0003 |
| Platform | Windows only | MoodzFilter ADR 0002 |
| Reference host | Ableton Live (VST3, Windows) | |
| Licence | Open source AGPL v3 | MoodzFilter ADR 0001 |
| Audience | Personal productions | |
| Type | Stereo effect (stereo input and output, mono accepted) | |
| Stereo | Linked: the same filter and the same modulation on both channels | |
| Interface | JUCE generic editor | |

## Signal chain

```
input → gain in → drive (oversampled) → filter (chosen model) → dry/wet mix → gain out → output
                                  ↑
                         synced LFO (cutoff)
```

Oversampling surrounds the drive and the filter, the only non-linear stages. The dry path is delayed by the oversampling latency so that the mix does not create comb filtering.

## v1 parameters

| Parameter | Range | Default | Note |
| --- | --- | --- | --- |
| Model | 5 models (see below) | Model 1 (Cytomic SVF) | List frozen from task 0009, additions at the end of the list only (ADR 0006) |
| Mode | Low-pass, high-pass, band-pass, notch | Low-pass | A passband the model lacks plays low-pass (ADR 0006) |
| Model settings | Slope (OB-Xd 4-pole, Diode Ladder), slope Morph (OB-Xd 4-pole), saturation (K35), sub-model (Vintage Ladder) | The task 0008 audition settings | Exact parameters, ranges and defaults decided by listening in task 0010 (ADR 0006) |
| Cutoff | 20 Hz to 20 kHz, logarithmic scale | 1 kHz | Smoothed |
| Resonance | 0 to 100 % | 20 % | Smoothed |
| Drive | 0 to 24 dB | 0 dB | Smoothed |
| LFO shape | Sine, triangle, sawtooth, square | Sine | |
| LFO rate | Values synced to the host BPM, from 4 bars to 1/32, with triplets and dotted values | 1/4 | |
| LFO depth | 0 to ±4 octaves on the cutoff | 0 | Smoothed |
| Oversampling | Off, 2x, 4x | 2x | Fixed latency for a given setting, reported to the host |
| Mix | 0 to 100 % | 100 % | Smoothed |
| Gain in | −∞ to +12 dB | 0 dB | Smoothed; lowest value = silence (ADR 0004) |
| Gain out | −∞ to +6 dB | 0 dB | Smoothed; lowest value = silence (ADR 0004) |

## Filter models

Five models in v1, chosen by Maxime by listening in Ableton Live on 2026-11-03 (task 0008, ADR 0006) from those of [sst-filters](https://github.com/surge-synthesizer/sst-filters) (GPL v3, AGPL compatible). In this order:

| # | Model | Role | Passbands |
| --- | --- | --- | --- |
| 1 | Cytomic SVF | clean multimode | low, high, band, notch |
| 2 | Vintage Ladder | ladder | low |
| 3 | OB-Xd 4-pole | OB-X style | low |
| 4 | Diode Ladder | diode | low |
| 5 | K35 | Korg 35 style | low, high |

## Presets

A few factory presets and saving or reloading of user presets, with an existing module (`chowdsp_presets_v2` or equivalent) rather than in-house code. The session state is versioned from v1.

## Out of v1

All of this is noted in `FUTURE.md` and only comes in with an amended SPEC:

1. Envelope follower.
2. Stereo phase offset of the LFO.
3. Mid/side processing.
4. Modulation matrix, destinations other than the cutoff.
5. Custom-drawn interface, spectrum analyser.
6. MIDI note tracking, sidechain.
7. macOS, Linux, other formats.
8. More than 5 filter models; blending models; a random curve on the cutoff (ADR 0006).

## v1 success criteria

1. The 5 models sound right in Ableton Live, approved by listening.
2. Green CI: DSP tests, RealtimeSanitizer, pluginval strictness 10, reference renders.
3. No click or crackle when automating the cutoff, the model and the oversampling during playback.
4. An Ableton session saved with v1 reloads identically.
