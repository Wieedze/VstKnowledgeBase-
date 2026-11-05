# 0013 — Input drive and Drive curve

**Date**: 2026-11-05
**Verdict**: pass (4 rounds, 3 failed on test coverage and evidence, none on behaviour)

## What was delivered

A Drive parameter (0 to 24 dB) saturates the signal before the filter, inside each oversampling path, with a Drive curve parameter: Symmetric by default, Asymmetric for even harmonics too (ADR 0009). At 0 dB nothing is computed and every golden reference stays identical, so no `golden:` commit. tanh alone is not transparent, so the dry signal blends into the saturated one between 0 and 6 dB. Gain, blend and curve ramp over 20 ms. A DC blocker removes the asymmetric offset from the even part of the curve only, so neither the dry signal nor the limiting odd part is filtered. Maxime approved the CI installer of b2901d9 in Live on 2026-11-05 at about 10:25 CET. Commits `41cbd19`, `7b173fb`, `5bc766b`, `b2901d9`, `89fc247`, `b21a164`, `ccfb835` and the closing commit on `task/0013-input-drive`, PR #16.

## What got stuck

The first asymmetric curve did not give exactly 0 at 0: two floats of the same tanh differed by one unit. Rewriting it with the tanh addition formula fixed that and gave one tanh per sample for both curves.

An alias test showed 4x no better than 2x. A spectrum showed why: the largest alias sat at 23 kHz, the 25 kHz harmonic in the last stage's transition band, above the pass band. The measure was wrong, not the oversampling; below 20 kHz, 4x is far ahead.

The code review found what the click tests could not see: a cold DC blocker let the whole offset through on a curve or Oversampling change, a low-frequency bump the click measure ignores. A new bump measure saw it red. The blocker now keeps running on Symmetric, and an incoming path takes the outgoing path's estimate.

The review also proposed filtering the whole curve instead of the difference with the dry signal. Tried and measured, it overshot in the bass, worse than before. Splitting the curve into odd and even parts, and filtering only the even one, gave a flat span from 20 Hz up.

The verifier then failed three rounds, on tests. Its mutations showed that nothing failed if a Drive change never reached the DSP during playback, because the click tests only set upper bounds; also that the right channel, the gain ramp, the curve ramp's length and the order of drive and filter were unguarded. All were tests written after the code, so mutations are their only proof.

Left open by decision (`FUTURE.md`): one non-finite input sample leaves the filter state non-finite until a reset, which predates this task and is more serious than it looked; the Asymmetric tail when a signal stops abruptly; one ramp type; benchmarks of the chain; the combined Drive jump and factor change.

## What we change next

* A bound alone does not prove an effect: a "does not click" test also needs a check that the change arrives.
* Run mutations on your own tests before the verifier does: remove each call and each ramp, and see one test go red.
* A click measure sees only one kind of defect: low-frequency transitions need their own measure.
* When a review proposes a fix, measure it before adopting it.
* A surprising measure gets a spectrum before anyone changes the code or the bound.

## Evidence

* `ctest --test-dir Builds --output-on-failure` (Debug, GCC, WSL2) on ccfb835: 127/127.
* `./Builds/MoodzFilterTools check`: `check: all passed`; `render` then `compare Builds/renders tests/golden`: `compare: all files within tolerance`.
* `./Builds/DspTests "The asymmetric curve adds even harmonics\, the symmetric one does not" -s | grep second`: -238 dB Symmetric, -19.7 dB Asymmetric.
* `./Builds/DspTests "The asymmetric curve leaves no DC offset" -s | grep mean`: -6.9e-7; -0.29 with `blocked = even` in `InputDrive.cpp`.
* `./Builds/DspTests "Oversampling lowers the aliases of the drive" -s | grep alias`: Off -20.2, 2x -38.7, 4x -71.8 dB, Symmetric.
* `./Builds/DspTests "The asymmetric curve limits as much in the bass" -s | grep span`: 2.20 at 20 Hz, 2.19 at 40 Hz and 1 kHz; 3.32 and 2.86 at 20 and 40 Hz with the blocker on the whole curve.
* `./Builds/PluginTests "[drive]" -s | grep bump`: at most 0.0065 on a curve change, 0.0024 on an Oversampling change, 0.16 on a Drive jump in one block; 0.07 to 0.09 on the first two without the fix.
* CI run 42010306741 on b21a164, same source as ccfb835: Linux, Windows (pluginval 10 on both) and Linux RealtimeSanitizer green. CI run 42000855084 on the listened b2901d9: green after a rerun of the Linux job, which had failed on an HTTP error downloading CPM.
