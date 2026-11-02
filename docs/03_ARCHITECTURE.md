# Architecture

## Three layers, one direction of dependency

```
ui/  ──►  plugin/  ──►  dsp/
(JUCE GUI)  (JUCE audio_processors)  (standard C++, no JUCE dependency)
```

| Layer | Content | Depends on | Tested by |
| --- | --- | --- | --- |
| `dsp/` | Filters, oscillators, envelopes, engine. Classes with `prepare(sampleRate, maxBlockSize)`, `reset()`, `process(span)` | Nothing but the STL | Catch2, without JUCE |
| `plugin/` | `AudioProcessor`, parameter layout (APVTS), parameter snapshot, state and migration, latency | `dsp/`, JUCE | Catch2 with JUCE, pluginval |
| `ui/` | `AudioProcessorEditor`, components, LookAndFeel | `plugin/` (read only via attachments) | Headless captures, manual review |
| `tools/` | Headless binary: render, check, bench, snapshot | `dsp/`, `plugin/` | Itself a test |

Rule: `dsp/` contains no `#include <juce_...>`. A CMake test checks it (see [04_TESTS](04_TESTS.md)).

## Parameter flow

1. The host and the UI write into the APVTS (atomics).
2. At the start of each `processBlock`, the `plugin/` layer reads the values and fills a plain `Params` structure (a copy, not a reference).
3. The DSP only receives `Params`. It knows neither the APVTS nor the IDs.
4. Smoothing (`SmoothedValue` or an in-house equivalent in `dsp/`) for every parameter that produces zipper noise.

Data larger than an atomic (wavetable, IR, sample): built on a background thread, delivered to the audio thread by atomic pointer or lock-free FIFO, freed outside the audio thread.

## Typical tree (starting from Pamplejuce)

```
myplugin/
├── CMakeLists.txt
├── VERSION
├── CHANGELOG.md
├── CLAUDE.md, GLOSSARY.md, FUTURE.md
├── JUCE/                    submodule, pinned tag
├── cmake/                   Pamplejuce's cmake-includes submodule
├── patches/                 versioned JUCE patches
├── source/
│   ├── dsp/                 pure C++
│   ├── plugin/              PluginProcessor, Parameters, State
│   └── ui/                  PluginEditor, components
├── tests/
│   ├── dsp/                 unit tests without JUCE
│   ├── plugin/              tests with JUCE (state, parameters)
│   └── golden/              reference renders (WAV) + manifest
├── tools/                   headless binary
├── benchmarks/
├── docs/
│   ├── SPEC.md              one page
│   ├── CODEMAP.md           path → role, like Drum Foundry
│   └── tasks/
└── .claude/
```

## Invariants to set from the start

* **Fixed and reported latency** via `setLatencySamples`, tested.
* **Block size independence**: same output for blocks of 1, 32, 512 and 4096 samples (test).
* **Finite output**: no NaN or Inf, whatever the parameters (test sweeping the extremes).
* **Silence in = silence out** for an effect with no self-noise, after the tail.
* **State round trip**: `getStateInformation` then `setStateInformation` gives back the same parameters.
* **State migration**: each saved state carries a version; an old state reloads with documented fallback values.
* **Explicit parameter invariants** (e.g. ordered crossovers in TetraDrive), tested.
