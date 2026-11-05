# 0012 — Oversampling around the filter, with one constant latency

**Date**: 2026-11-05
**Verdict**: pass (1 round)

## What was delivered

The filter runs at Off, 2x or 4x according to a new Oversampling parameter, 2x by default. The plugin reports 40 samples of latency at every setting and sample rate (ADR 0009), so changing the setting never makes the host realign the track, and host bypass delays the input by the same 40 samples. The stages are Signalsmith DSP's linear phase FIR (MIT, v1.7.3); Off and 2x are completed to the 4x latency by a whole sample delay. Each factor owns a crossfading filter bank at its rate: a change resets the incoming path, runs it unheard for an 80-sample pre-roll, then ramps over the rest of the 20 ms. Blocks are split in chunks of at most 256 base samples, so no buffer depends on the host's block size. Every golden reference changed, in the separate commit f6ac96b after Maxime's listening. He approved the installer in Live on 2026-11-04 at 08:57 CET, and the final one, after the pre-roll, on 2026-11-05 at about 09:30 CET. Commits `43d5aa1`, `b41560f`, `a5171b2`, `f6ac96b`, `a2a5da6`, `aa25816`, `c3e7d78`, `cb312ac` and the closing commit on `task/0012-oversampling`, PR #15.

## What got stuck

The click tests passed at first, and Maxime heard nothing in Live, yet the code review found a click: all those tests ran with the cutoff at 5 kHz, which hid the incoming path's empty start. With the filter wide open, the measure reached 0.0070 at -12 dBFS and 0.028 at 0 dBFS. A wide-open test was seen red, the pre-roll was added, and the measure came down to the sine alone. Because this changed the sound of a change after the listening, Maxime tested a new installer.

`Gain out is applied to both channels` failed once 2x became the default, because of the FIR's pass band ripple; it now runs at Off, keeping its tolerance. The factor crossfade test's "one sample before" check failed because the two paths are nearly identical there; the change now also moves to Cytomic HP, so the two can be told apart.

The verifier found two figures that no command could reproduce (the one sample crossfade click and the ripple at DC). They were removed, as `workflow.md` requires. It also could not prove red before green from git for two commits that hold both tests and code.

Left open by decision (`FUTURE.md`): smooth bypass toggle, one crossfade helper, cutoff smoothing independent of the setting, `getTailLengthSeconds`, stereo chain tests, the pre-roll clamp at very low sample rates. `Oversampler::prepare (int)` and `WholeSampleDelay::prepare (int)` differ from the signature in `dsp.md` because neither depends on the rate.

## What we change next

* A click test runs at the setting that hides the least: filter wide open and full level, not only at a mid cutoff.
* A filter that starts from a reset state is not silent for free: a linear phase FIR needs its latency to fill before its output can be heard.
* A sound change after the listening means a new listening, on what will actually be merged, before the verifier closes the task.
* Write a red figure down with the change that produces it, or do not write it.

## Evidence

* `ctest --test-dir Builds --output-on-failure` (Debug, GCC, WSL2) on cb312ac: 97/97.
* `./Builds/MoodzFilterTools check`: `check: all passed`; `render` then `compare Builds/renders tests/golden`: `compare: all files within tolerance`.
* `./Builds/PluginTests "An Oversampling change does not click" -s | grep click`: 0.000171 at the three changes, bound 0.00025. Same command for `An Oversampling change does not click with the filter wide open`: 0.000171 at -12 dBFS, at most 0.000686 at 0 dBFS, bounds 0.000207 and 0.000828.
* TDD red, with `preRoll` forced to 0 in `OversampledFilterChain.cpp` and the same commands: 0.00160, 0.00170, 0.00122 at cutoff 5 kHz; 0.0068 to 0.0070 at -12 dBFS and 0.0271 to 0.0281 at 0 dBFS at cutoff 20 kHz.
* `./Builds/DspTests "[oversampling]" -s`: fold-back -84.33 dB at 2x (bound -80), largest response difference between settings 0.349 dB, 4 kHz at 4x (bound 0.5).
* CI run 41792830480 on a5171b2 failed only at `Compare with the golden references`, as the task expected, and went green with the `golden:` commit.
* CI run 41797476525 on c3e7d78: Linux, Windows (pluginval 10 on both) and Linux RealtimeSanitizer green, no sanitizer report.
