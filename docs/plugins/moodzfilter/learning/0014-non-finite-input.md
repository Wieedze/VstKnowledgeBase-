# 0014 — Keep one bad input sample from silencing a channel

**Date**: 2026-11-05
**Verdict**: pass (2 rounds; the last item, a figure without a command, removed at closing)

## What was delivered

One NaN, infinite or absurdly large input sample used to leave the filter state non-finite, so that channel stayed non-finite until the plugin was reset. A check at the top of `OversampledFilterChain::process`, the input guard, now counts anything beyond ±256 as 0, NaN and infinities included. A sample within the bound is never written, so every golden reference stays identical and no listening was needed. Commits `3fcf991`, `b26a27f`, `17616d9`, `7835353` and the closing commit on `task/0014-non-finite-input`, PR #17.

## What got stuck

The first version clamped a huge sample to the bound. The output stayed finite, which is what the task asked, but the code review measured a loud click: the guard had traded a silent channel for a danger to the monitors. The task's own reason for zeroing infinity, that it is not a signal, applied just as well to 3e38. Zeroing everything beyond the bound also made the code one comparison.

A test written to be red passed before the guard: `std::max` skips a NaN, so `largestDifference` reported 0 on a non-finite output. Every test that compares now also checks the output is finite.

The verifier's mutants found the negative side of the bound and -FLT_MAX untested, and a stress test that did not match its row. Figures again: a click size and a resonance gain with no command.

Left open by decision (`FUTURE.md`): non-finite output while bypassed, which reaches no filter state; a second instance after a resonant one, which can see samples beyond the bound.

## What we change next

* "Stays finite" is not "stays safe": a guard's replacement value is an output too, so measure what it sounds like.
* A comparison helper that uses `std::max` hides NaN: check finiteness next to it, or make the helper fail on it.
* A bound has two sides: test both.
* A task with few lines of code still needs its table rows read against its tests before the verifier does it.

## Evidence

* `ctest --test-dir Builds --output-on-failure` (Debug, GCC, WSL2) on 7835353: 135/135.
* `./Builds/MoodzFilterTools check`: `check: all passed`; `render` then `compare Builds/renders tests/golden`: `compare: all files within tolerance`.
* `./Builds/DspTests "The chain plays on after a bad input sample" -s | grep "difference"`: 0 for all seven kinds of bad sample.
* `./Builds/DspTests "A bad sample counts as 0" -s | grep "peak"`: +47.31 dBFS for a sample at the bound, Cytomic SVF High-pass.
* CI run 42024729546 on 7835353: Linux, Windows (pluginval 10 on both) and Linux RealtimeSanitizer green.
