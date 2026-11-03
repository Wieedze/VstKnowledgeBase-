# 0011 — Crossfade between filter variants

**Date**: 2026-11-03
**Verdict**: pass (1 round)

## What was delivered

A Model change, a Diode Ladder slope step and a Vintage variant change no longer click (SPEC success criterion 3). The 17 filter variants moved from the processor into one dsp class tested without JUCE, the **crossfading filter bank**: when the choice moves to another variant, the incoming one starts from a clean state and the two outputs are crossfaded linearly (equal gain, since both filter the same input) over 20 ms, the Gain out ramp time. The outgoing variant renders into a fixed 256-sample scratch, in chunks, so a block of any length is processed without allocation. A choice made during a crossfade is held until it ends, so at most two variants run at once; a new extra value on the same variant (OB-Xd Morph, K35 saturation) does not crossfade, sst-filters smooths it. The slope wobbling across a Diode step passes with the crossfade alone, so the hysteresis idea left `FUTURE.md`. No golden reference changed. Maxime approved the CI installer in Live on 2026-11-03 at 20:33 CET. Commits `a8eb764`, `15b67b8`, `6101e66`, `796b5e7` and the closing commit on `task/0011-model-crossfade`, PR #14.

## What got stuck

The rt-safety review found that `prepare` let an infinite sample rate through to the crossfade length and the filters; `MultimodeFilter` only checked `> 0`. Fixed with an `isfinite` check and a test seen red on infinity.

The code review, run after Maxime's listening, found two real defects: a held choice started at the next process call after the crossfade, so its timing depended on the host block size; and a new extra value on the incoming variant was frozen for the whole crossfade. Both were hidden by the test helper itself, which computed the block split before applying the change at that sample, so a second change was never placed where the test said. The helper is fixed, and the tests now run two changes at block sizes 1 to 16384. One finding was a false positive: sst-filters snaps the coefficients on the first computation after a reset (`FirstRun`), so the incoming variant starts at its target.

Left open by decision (`FUTURE.md`): reversing a crossfade when the choice comes back (A to B to A plays two full crossfades), and one shared sample-rate fallback for every dsp processor.

## What we change next

* A test helper that schedules events is code too: check it places them where the test claims, with a case where two events fall in one host block.
* The block-size independence test of anything with a queue covers at least two queued events, not one.
* Read the library's reset path before trusting or dismissing a "state after reset" review finding.

## Evidence

* `ctest --test-dir Builds --output-on-failure` (Debug, GCC, WSL2) on 6101e66: 75/75.
* `./Builds/MoodzFilterTools check`: `check: all passed`; `render` then `compare Builds/renders tests/golden`: `compare: all files within tolerance`, max error 0.
* `./Builds/PluginTests "[crossfade]" -s | grep click`: 3.6e-4 Cytomic SVF to Diode Ladder, 1.5e-4 Diode slope 12 to 18 dB, 1.6e-4 Vintage Runge-Kutta compensated to Huovilainen, 2.6e-4 slope wobble over 1 s; bound 1e-3; the sine alone gives about 1.7e-4.
* TDD red: before the bank, the click measures were 0.208, 0.128, 0.091, 0.106 and 0.151; the crossfade length test failed with the length forced to 1; on 15b67b8 the held-crossfade test failed at block sizes 512 and 16384 and the extra-during-crossfade test failed (`./Builds/DspTests "[crossfade]"`).
* CI run 41674954975 on 15b67b8: Linux, Windows (pluginval 10) and Linux RealtimeSanitizer green.
