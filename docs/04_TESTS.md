# Tests

An agent cannot listen to the plugin. So everything that matters must be verifiable by a command that exits with 0 or non-zero.

## Pyramid

| Level | Tool | Target | When |
| --- | --- | --- | --- |
| 1. DSP unit | Catch2, without JUCE | `dsp/` | Every change, with TDD |
| 2. DSP properties | Catch2 + generators | `dsp/` | Every change |
| 3. Plugin | Catch2 with JUCE | `plugin/`: parameters, state, latency | Every change to `plugin/` |
| 4. Audio regression | `tools render` + comparison | Reference renders | Every PR |
| 5. Host validation | pluginval strictness 10 | VST3 binary | Every PR (CI) |
| 6. Performance | `Benchmarks` target, `tools bench` | CPU cost per block | Every PR touching `dsp/` |
| 7. Listening | You, in the DAW | The sound | End of phase, before merging sound changes |

## Levels 1 and 2: what we test on a DSP block

* Response to an impulse, a sine, a DC: expected values computed separately (Python, paper) and cited in the test.
* Frequency response of a filter: gain measured at a few frequencies against the formula, within ± 0.1 dB.
* `reset()` really sets the state back to zero (two successive renders are identical).
* No NaN/Inf over a sweep of the parameters at their bounds.
* Block size independence.
* Sample rate independence when expected (44.1 / 48 / 96 kHz).
* No allocation or lock in `process`: [RealtimeSanitizer](https://clang.llvm.org/docs/RealtimeSanitizer.html) (clang, `-fsanitize=realtime`, real-time functions marked `[[clang::nonblocking]]`) in a dedicated CI job. Nothing to code ourselves.

In the `plugin/` tests, [melatonin_audio_sparklines](https://github.com/sudara/melatonin_audio_sparklines) shows the signal shape as ASCII when a test fails. It depends on `juce_dsp`: not in the DSP tests without JUCE.

The block size independence test must **enable modulation** (LFOs routed): that is the case Drum Foundry misses.

## Level 3: plugin

* State round trip.
* Loading states from previous versions (files kept in `tests/plugin/states/`).
* Reported latency = measured latency (impulse in, position of the peak out).
* Supported and rejected bus layouts.
* Parameter IDs: a test freezes the list of IDs. A removed or renamed ID makes the test fail.

## Level 4: audio regression

Like `DrumFoundryTools render`:

1. `tools render --preset all --out build/renders` produces one WAV per preset and per test signal (impulse, sweep, pink noise, short drum loop).
2. `tools compare build/renders tests/golden` compares against the reference: max error, RMS of the difference, with a tolerance declared per file in `tests/golden/manifest.json`.
3. Changing a reference is an explicit act: a separate commit, message `golden: <reason>`, and one sentence in the post-mortem.

## Level 5: pluginval

```
pluginval --strictness-level 10 --validate build/<Plugin>_artefacts/Release/VST3/<Plugin>.vst3
```

In CI via Pamplejuce. Locally before any PR that touches `plugin/`.

## The `tools` binary

Minimum subcommands, to build from phase 1:

| Command | Role |
| --- | --- |
| `render` | WAV renders (+ optional spectrogram PNG) with the real engine |
| `compare` | Comparison with the references |
| `check` | Fast battery: NaN, round trip, block size, latency |
| `bench` | CPU cost per block, per configuration |

CMake option `-D<PLUGIN>_BUILD_TOOLS=ON`, disabled for release builds.

## Checking that `dsp/` stays free of JUCE

The `dsp` target is a CMake library with no link to JUCE. If someone adds an `#include <juce_...>`, compiling the DSP test target fails. Also add a grep check in CI:

```
! grep -rn "juce" source/dsp/
```

## GitHub Actions CI (starting from Pamplejuce)

Pamplejuce provides the build on 3 OSes, Catch2 and pluginval 10 (VST3). It does **not** provide `tools check`, `tools compare`, clang-format in CI, the benchmark budget or the RTSan job: we have to add them (steps in [`references/pamplejuce.md`](references/pamplejuce.md)). Without certificates, its signing steps make CI fail: make them conditional on the presence of the secrets.

On every PR, Linux + Windows + macOS:

1. Configure and build (Release).
2. `ctest` (levels 1 to 3).
3. `tools check` and `tools compare` (level 4).
4. pluginval strictness 10 (level 5).
5. Benchmarks, with an alert if a block exceeds the budget set in `benchmarks/budget.json`.
6. clang-format in check mode.

A red PR is not merged, including when an agent opened it.
