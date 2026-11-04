# 0009 — Constant latency across oversampling settings, a Drive curve parameter

**Date**: 2026-11-04
**Status**: accepted (amends SPEC v1)

## Context

The SPEC gives Oversampling (Off, 2x, 4x) "a fixed latency for a given setting, reported to the host", and its success criterion 3 asks for no click when automating the oversampling during playback. These pull apart: when the reported latency changes, the host has to realign the track during playback. `.claude/rules/juce.md` asks to keep latency constant as much as possible, and the playbook (`docs/07_REUSE.md`) records the two known approaches: Drum Foundry reserves the worst-case latency and completes it with a delay; TetraDrive lets it vary, listed as the one to avoid.

The SPEC also gives Drive (0 to 24 dB) no curve. A symmetric curve adds odd harmonics; an asymmetric one adds even harmonics too, and a DC offset to remove.

## Options considered

Latency:

1. Constant: always report the 4x latency, delay Off and 2x to match.
2. Variable, per setting, as the SPEC says: no latency at Off, a realignment by the host at each change.

Drive curve:

1. Symmetric tanh only.
2. Asymmetric only.
3. Both, with a parameter to choose.

## Decision

Chosen by Maxime on 2026-11-04.

* **Latency: option 1.** The plugin reports one latency whatever the Oversampling setting. Off and 2x are delayed to the 4x latency, so an Oversampling change crossfades two aligned signals and the host never realigns. The bypass path is delayed by the same amount.
* **Drive curve: option 3.** A new parameter, **Drive curve**: Symmetric (default), Asymmetric. Drive at 0 dB is transparent with either curve.

Oversampling uses `signalsmith::rates::Oversampler2xFIR` from Signalsmith DSP (MIT, pinned tag v1.7.3), the playbook's default library for `dsp/`: linear phase, a whole number of samples of latency, no JUCE, no allocation after `resize`. 4x is two 2x stages. `juce::dsp::Oversampling` would keep the chain out of the JUCE-free `dsp` layer. Linear phase matters for the future Mix: dry and wet sum without phase comb once aligned.

## Consequences

* Off has a small latency too: the price of a clean automation. The exact figure is measured and reported by task 0012.
* Oversampling surrounds the filter as the SPEC says, so the filter is prepared at each rate: one crossfading filter bank per factor.
* The default is 2x: the reference renders change with task 0012, through a `golden:` commit after Maxime's listening.
* Drive curve adds a parameter ID, frozen after the first release. Its DC offset removal and its crossfade or smoothing are decided in the Drive task.
* The roadmap item splits in two: oversampling first (nothing non-linear is added without it, `.claude/rules/dsp.md`), then Drive. The delayed dry path comes with the Mix task, on top of this constant latency.
