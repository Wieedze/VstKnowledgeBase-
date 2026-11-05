# 0015 — An LFO locked to the host tempo

**Date**: 2026-11-05
**Verdict**: pass (3 rounds, 2 failed on test coverage and evidence, none on behaviour)

## What was delivered

LFO shape, LFO rate and LFO depth parameters move the cutoff by up to ±4 octaves, in time with the host: while Live plays, the song position sets the phase, so the LFO is where the song says after a stop or a loop; stopped, it runs on at the last tempo. While the LFO has a depth, the cutoff follows on a grid of 32 base samples counted across blocks, so the output does not depend on the block size. A 2 ms slew turns square edges, sawtooth resets and jumps into short curves. At depth 0 the plugin runs as before, and no golden reference changed. Maxime approved the installer of 135d6b0 in Live on 2026-11-05 at about 14:50 CET. Commits `ce1cf56`, `cc33e83`, `aceb6c5`, `135d6b0`, `e5cacdf`, `5e8c000`, `4aaade9` and the closing commit on `task/0015-synced-lfo`, PR #18.

## What got stuck

The block size test caught a real defect: a square edge falling exactly on a step of the grid landed on either side depending on the rounding of the phase, and so on the block size. A hair of phase in `value()` settles it.

Running mutations before the verifier found that the song position test passed without a sync: beat 8 on a 1/2 is phase 0 anyway. The verifier still found more, since all mutations of ours ran at 48 kHz and on the shapes we thought of: nothing tested another sample rate, the frozen list beyond three entries, the transitions into and out of rest, or a negative depth, where the sawtooth reset measures like a square edge.

The code review found the loop test never jumped, because the helper overwrote the position; the LFO started from phase 0's value when playback started mid-cycle; and every block ran through 8 times more render calls at depth 0, for no sound. The rt-safety review found a finite but extreme song position overflowing into a NaN that stayed in the slew.

The maker of a test can hide a NaN too: a square reads a NaN phase as its second half, so the extreme position test passed until it ran on a sine.

Left open by decision (`FUTURE.md`): the grid not anchored on the beat, so two bounces may not null; the slew seeded before the block's song position when the depth leaves 0 during a loop jump; a third ramp type. Maxime asked after the listening for an editor without the scroll, next task, and an LFO matrix, for after v1 and a SPEC change.

## What we change next

* Mutations cover a sample rate other than 48 kHz, both signs of a bipolar parameter, and the state transitions, not only each call.
* A test position chosen by round numbers can coincide with the default state: pick one that a broken sync would get wrong.
* Check a test helper does what the scenario says: a jump the helper overwrites is no jump.
* An idle feature costs nothing and changes nothing: write the rest state first.

## Evidence

* `ctest --test-dir Builds --output-on-failure` (Debug, GCC, WSL2) on 4aaade9: 181/181.
* `./Builds/MoodzFilterTools check`: `check: all passed`; `render` then `compare Builds/renders tests/golden`: `compare: all files within tolerance`.
* `./Builds/PluginTests "The LFO moves the plugin output" -s | grep swing`: 43.99 dB at +2 octaves, -43.99 dB at -2 octaves.
* `./Builds/PluginTests "The LFO is locked to the song position" -s | grep largest`: 3.5e-6 from beat 9 against beat 0.
* `./Builds/PluginTests "LFO edges and jumps stay curves" -s | grep -A1 "click depth"`: at most 0.00233 x peak, upward edges; a sine alone gives 0.00069 x peak.
* CI run 42035122020 on the listened 135d6b0: Linux, Windows (pluginval 10 on both) and Linux RealtimeSanitizer green.
