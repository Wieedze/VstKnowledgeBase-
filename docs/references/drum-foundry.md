# Drum Foundry: code reading

**Verdict.** A much larger instrument (about 47,000 lines excluding JUCE). Its best ideas are the headless tool that drives the real processor, the parameter snapshot sanitised on read, the fixed latency topped up by a delay at the end of the chain, and the non-blocking handoff through `try_lock` with a retire list. However, it has no DSP separated from JUCE, no tests in CI and no automated pluginval, and its 32-sample chunks give block size independence only in the Cloud reverb.

Studied at commit `b9541dd` (version 0.1.1, 2026-10-12). Line numbers refer to that commit; links point to `main` and may drift. Licence: AGPL v3 with additional terms (`NOTICE`). Nothing is copied here; only the ideas are described. The code was not compiled for this analysis.

## 1. Fact sheet

| Item | Finding |
| --- | --- |
| Language | C++20, CMake 3.22 minimum ([`CMakeLists.txt:1-6`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L1-L6)) |
| JUCE | 8.0.15; `libs/JUCE` is in `.gitignore` (neither a submodule nor a tracked copy); if the folder is empty, `FetchContent` downloads the tag ([`CMakeLists.txt:30-41`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L30-L41)) |
| Code | `src/` (processor, parameters, `dsp/`, `ui/`, presets, samples), `tools/` (11,000 lines, of which `Tools.cpp` is 8,973 lines) |
| Third-party code | Cloud Seed Core (MIT) vendored in `libs/CloudSeedCore` with `PATCHES.md` |
| Internal audit | [`Docs/Host-Compatibility-and-Release-Readiness.md`](https://github.com/donjmilligan/drum-foundary/blob/main/Docs/Host-Compatibility-and-Release-Readiness.md): local pluginval/auval results, bench, risks |

## 2. CMake structure

| Target | Contents | Depends on JUCE |
| --- | --- | --- |
| `DrumFoundryAssets` | Logo and fonts as binary resources ([`CMakeLists.txt:49-55`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L49-L55)) | Yes |
| `DrumFoundryCode` (`INTERFACE`) | **All** sources: processor, DSP, UI, presets, samples, Cloud Seed ([`CMakeLists.txt:62-119`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L62-L119)) | Yes |
| `DrumFoundry` | The plugin: VST3, AU and Standalone on macOS; VST3 and Standalone elsewhere ([`CMakeLists.txt:124-152`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L124-L152)) | Yes |
| `DrumFoundryTools` | `juce_add_console_app` that links `DrumFoundryCode` and adds `tools/*.cpp`; option `DRUMFOUNDRY_BUILD_TOOLS`, **ON** by default ([`CMakeLists.txt:13`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L13), [`:158-166`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L158-L166)) | Yes |

Findings:

1. **The DSP is not separated from JUCE.** 33 of the 37 files in `src/dsp/` include JUCE or use `juce::` (`AudioBuffer`, `SmoothedValue`, `dsp::Oversampling`, `dsp::Convolution`, `MidiBuffer`). The engine can be tested without a DAW, but not without JUCE.
2. The `INTERFACE` library makes every source compile twice (plugin and tool). It is simple, but a static library would be faster.
3. No `enable_testing()` and no `ctest`: checks only run through the tool.
4. Cloud Seed compiles with `-w` (warnings disabled for its files and for the single file that includes it) ([`CMakeLists.txt:57-60`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L57-L60)).
5. The MSVC runtime is linked statically to avoid depending on the redistributable ([`CMakeLists.txt:24-28`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L24-L28)); copying into the system folders is enabled by default on macOS only ([`:15-22`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L15-L22)).
6. The version is written by hand in `project(DrumFoundry VERSION 0.1.1)` ([`CMakeLists.txt:3`](https://github.com/donjmilligan/drum-foundary/blob/main/CMakeLists.txt#L3)) and propagated through `DRUMFOUNDRY_VERSION`.

## 3. Tests: the `DrumFoundryTools` tool

### Structure

Home-grown framework, no Catch2. Each check is an `int checkXxx()` function that prints `FAIL: ...` and returns the number of failures; `cmdCheck` adds them up and exits with 0 or 1 ([`tools/Tools.cpp:8624-8919`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8624-L8919)). `main` initialises JUCE with `ScopedJuceInitialiser_GUI` (needed for editor captures) and dispatches the subcommands ([`:8921-8973`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8921-L8973)). The checks build a real `DrumFoundryProcessor` and call `prepareToPlay`, `processBlock` and `getStateInformation` the way a host does.

| Subcommand | Role |
| --- | --- |
| `render <dir> [float]` | Every factory preset as a 24-bit or float WAV plus a waveform and spectrogram PNG |
| `snapshot <png> ...` | Editor capture, with preset, scale, tab and options |
| `check` | The full suite (below) |
| `check-eq`, `check-comp`, `check-order`, `check-clipper`, `check-undo`, `check-editor`, `check-samples` | A subset |
| `bench` | Average CPU cost |
| `measure`, `measure-presets`, `emit-preset`, `measure-clicks`, `styles`, `analyzer`, `samples-ui` | One-shot analysis, preset export as code, captures |

### What `check` verifies first

| Check | Method | Tolerance | Where |
| --- | --- | --- | --- |
| Factory presets | Each preset, at 44.1 and 96 kHz, notes 36, 60, 84: everything finite, peak ≤ clipper ceiling, not near silent | peak ≤ 1.001; peak ≥ 0.01 | [`tools/Tools.cpp:8630-8654`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8630-L8654) |
| State round trip | Change an envelope, `getStateInformation` then `setStateInformation` on another instance; compare envelopes, preset name, every parameter | relative 1e-5 | [`:8656-8676`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8656-L8676) |
| Corrupted state | Sessions with NaN, inf and invalid text, through `setStateInformation` and through `loadStateTree`: finite parameters, choices within bounds, finite tables, offline render and `processBlock` finite over 2 s | exact (finite or not) | [`:8678-8744`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8678-L8744) |
| `ParamReader` alone | NaN and inf written directly into the parameter atomics: the snapshot must be finite, choices bounded, the default used | exact | [`:8746-8774`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8746-L8774) |
| Non-finite envelopes | NaN/inf points: cleaned, baked tables finite, edits rejected | exact | [`:8776-8810`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8776-L8810) |
| `processBlock` before `prepareToPlay` | 8 blocks with stale host data: no crash, finite output | exact | [`:8812-8834`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8812-L8834) |
| Block size independence | 24,000 samples in one block against blocks of varying size (sequence `sz = sz % 700 + 37`), two notes, reverb off, on with gate, on without gate | max difference ≤ 1e-3 | [`:8836-8878`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8836-L8878) |

Then 34 specialised checks (sidechain, reverb, output filter, clipper, samples, styles, layers, solo, effects chain, LFO, undo, EQ, compressors, chain order, and several editor checks) ([`:8880-8913`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L8880-L8913)).

Limits:

1. **No compared audio references.** `render` writes WAVs and PNGs for listening and review, but nothing compares them with stored files. Our `tools compare` against `tests/golden/` has no equivalent there.
2. **The block size test routes no LFO**, even though that is exactly the path split into 32-sample chunks (section 5). The 1e-3 tolerance is loose for a comparison that should be almost exact.
3. **`bench` measures an average cost** (percentage of one core over 30 s) and prints numbers with no threshold and no failure ([`tools/Tools.cpp:686-820`](https://github.com/donjmilligan/drum-foundary/blob/main/tools/Tools.cpp#L686-L820)). The worst block, which is what causes dropouts, is not measured; their own audit measured it separately and found an overrun (section 9).
4. A single 8,973-line file mixes tests, renders and captures.
5. No CI runs the tool (section 7).

## 4. Audio thread

### From parameters to DSP: `DrumParams` and `ParamReader`

1. `DrumParams` is a struct of plain values (floats, ints, bools, `std::array` of sub-structs, the chain order `FxChain`), with no `std::vector` and no string ([`src/Parameters.h:287-289`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.h#L287-L289)). The comment explains why: the same engine runs live or offline.
2. At construction, `ParamReader` caches the `std::atomic<float>*` pointer of each parameter along with its range, default and skew ([`src/Parameters.h:478-537`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.h#L478-L537), [`src/Parameters.cpp:756-772`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L756-L772)).
3. Every read **sanitises**: a non-finite value gives the default, everything else is clamped to the range ([`src/Parameters.h:494-498`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.h#L494-L498)); choices are rounded and clamped to the number of items ([`src/Parameters.cpp:775-790`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L775-L790)).
4. In `processBlock`, a snapshot is taken once per block, completed with the host tempo, the chain order and the EQ Listen state, then passed to the engine ([`src/PluginProcessor.h:63-69`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L63-L69), [`src/PluginProcessor.cpp:228-233`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L228-L233)).
5. The effects chain order is not a parameter: it is serialised as text in the state and **packed into a `std::atomic<uint64_t>`** for the audio side ([`src/PluginProcessor.h:73`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L73), [`:264`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L264), [`src/dsp/FxChain.h:132-160`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/FxChain.h#L132-L160)).
6. The LFOs modulate a `modulated` copy of the snapshot, recomputed at the start of each chunk and on each note ([`src/dsp/DrumEngine.cpp:66-74`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L66-L74)).

### Heavy objects: three mechanisms

| Object | Mechanism | Where |
| --- | --- | --- |
| Envelope tables (12 tables of 4,096 floats, about 196 KB) | The message thread bakes the tables under a `CriticalSection`, then copies them into `publishedTables` under a `SpinLock` and raises an atomic flag. If the flag is raised, the audio thread tries `ScopedTryLockType`; if it gets the lock, it **copies** the tables into the engine, otherwise it retries on the next block | [`src/PluginProcessor.cpp:343-352`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L343-L352), [`:210-220`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L210-L220), [`src/dsp/DrumEngine.h:58`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.h#L58) |
| Imported samples | Decoding on a background thread; a table of raw pointers is published under a `SpinLock`; the audio thread takes it with `try_lock` in `beginBlock` and publishes the serial number it adopted; a replaced sample goes onto a `retired` list with the first serial number that no longer contains it, and a one-second `Timer` frees it once the audio thread has adopted that number. The audio thread never touches the `shared_ptr`s | [`src/samples/SampleBank.h:25-37`](https://github.com/donjmilligan/drum-foundary/blob/main/src/samples/SampleBank.h#L25-L37), [`src/samples/SampleBank.cpp:257-294`](https://github.com/donjmilligan/drum-foundary/blob/main/src/samples/SampleBank.cpp#L257-L294), [`:399-426`](https://github.com/donjmilligan/drum-foundary/blob/main/src/samples/SampleBank.cpp#L399-L426), [`src/dsp/SampleData.h:37-46`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/SampleData.h#L37-L46) |
| Impulse response of the Natural reverb | Built by a `TimeSliceClient` on a shared background thread; handed to `juce::dsp::Convolution::loadImpulseResponse`, and it is **JUCE's convolution that crossfades** to the new IR; when nothing is playing, `serviceWhileIdle` runs the convolution on one sample of silence so that it installs the new room | [`src/dsp/NaturalReverb.h`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.h), [`src/dsp/NaturalReverb.cpp:37`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.cpp#L37), [`:112`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.cpp#L112), [`:146`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/NaturalReverb.cpp#L146) |

The `try_lock` keeps the audio thread from waiting, but the 196 KB table copy happens on the audio thread. It is bounded; a pointer swap (`farbot::RealtimeObject` or a double buffer) would avoid the copy.

### Smoothing, denormals, guards

1. Smoothing with `juce::SmoothedValue`, 20 ms, on gains, drive, mix and the clipper ceiling ([`src/dsp/DriveStage.h:22-35`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DriveStage.h#L22-L35), [`src/dsp/MasterChain.h:130-132`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.h#L130-L132)). On the first block, values jump to their target instead of ramping up from zero.
2. `juce::ScopedNoDenormals` at the top of `processBlock` ([`src/PluginProcessor.cpp:186`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L186)) and in the tool.
3. `prepareToPlay` rejects a non-finite or zero sample rate and a block size ≤ 0; the engine then stays "not prepared" and `processBlock` outputs silence ([`src/dsp/DrumEngine.cpp:29-48`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L29-L48), [`src/PluginProcessor.cpp:188-194`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L188-L194)).
4. **NaN guard**: after each chunk, if the output contains a NaN or an inf, the block is cleared and the engine reset, so the value does not stay trapped in an IIR state. The comment notes that this silently breaks under `-ffast-math` ([`src/dsp/DrumEngine.cpp:14-26`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L14-L26), [`:234-241`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L234-L241)).
5. The sidechain shares memory with the output channels: the transient detector reads the whole block before the engine overwrites those channels ([`src/PluginProcessor.cpp:198-208`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L198-L208)).
6. The host's `reset()` touches nothing directly: it raises an atomic flag, and the audio thread does the reset ([`src/PluginProcessor.h:35`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L35), [`src/PluginProcessor.cpp:204-205`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L204-L205)).
7. MIDI events and sidechain hits are merged in time order to the sample, without allocation (a fixed array rather than `MidiBuffer`) ([`src/dsp/DrumEngine.cpp:196-227`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L196-L227)).

## 5. Oversampling, latency, chain, 32-sample chunks

### Oversampling

| Module | Method | Latency | Where |
| --- | --- | --- | --- |
| Drive (x2 in the chain) | `juce::dsp::Oversampling` 2x, polyphase IIR half-band, integer latency; always runs, even when off (Mix goes down to 0 in 20 ms) | constant | [`src/dsp/DriveStage.h:13-22`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DriveStage.h#L13-L22), [`:46`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DriveStage.h#L46) |
| Clipper (output, and x2 in the chain) | Factor depends on sample rate: 8x below 50 kHz, 4x below 100 kHz, 2x below 200 kHz, 1x above; linear-phase FIR with a Kaiser window, 70 dB attenuation, length chosen so that the round trip is a whole number of samples; then a look-ahead limiter (0.2 ms) that holds the ceiling despite Gibbs overshoot | depends only on the sample rate | [`src/dsp/Clipper.h:36-58`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/Clipper.h#L36-L58), [`src/dsp/Clipper.cpp:144-175`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/Clipper.cpp#L144-L175) |

**Notable clipper idea**: only the difference `shape(u) - u` goes through the oversampler, then it is added to the input delayed by the same whole number of samples. Below the knee, the difference is exactly zero, so the signal comes out bit-identical, only delayed ([`src/dsp/Clipper.h:42-46`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/Clipper.h#L42-L46)).

### Fixed latency whatever the chain

The reported latency is always two Drives + two chain Clippers + the output Clipper, whether or not those modules are in the chain ([`src/dsp/MasterChain.cpp:102-110`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L102-L110)). The difference between this maximum and the latency of the active chain is filled by a delay line placed after the output stage, allocated as a power of two in `prepare` ([`src/dsp/MasterChain.cpp:37-39`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L37-L39), [`:133`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L133), [`:320-328`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L320-L328)). `setLatencySamples` is called only in `prepareToPlay` ([`src/PluginProcessor.cpp:161`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L161)). `getTailLengthSeconds` adds this latency to the duration of the hit or of the reverb ([`:274-285`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L274-L285)).

### Changing the chain order

This is **not a crossfade** between the old and the new chain; it goes through silence ([`src/dsp/MasterChain.h:40-44`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.h#L40-L44), [`src/dsp/MasterChain.cpp:227-274`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L227-L274)):

1. a 10 ms linear fade-out (`kChainFadeSeconds`, [`src/dsp/MasterChain.cpp:12`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L12));
2. silence is held until whatever is still passing through the output stage and the delay line has come out (clipper latency + delay size + 16);
3. switch: each module of the new chain is reset, then the end delay is recomputed ([`:112-134`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/MasterChain.cpp#L112-L134));
4. a 10 ms fade-in.

A new order that arrives during the fade simply replaces the pending target.

### The 32-sample chunks

Two distinct uses, which must not be confused:

| Use | How | Block size independent? |
| --- | --- | --- |
| Cloud reverb | Cloud Seed has feedback loops whose behaviour depends on block size, so it always runs in chunks of 32 through a small internal FIFO, at the cost of 32 samples of delay on the wet signal (0.7 ms at 48 kHz) ([`src/dsp/CloudReverb.h:25-28`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/CloudReverb.h#L25-L28), [`:61-69`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/CloudReverb.h#L61-L69), [`:79`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/CloudReverb.h#L79)) | Yes |
| LFO modulation | When an LFO is routed, the engine splits the block into chunks of at most 32 and reapplies the LFOs at the start of each; otherwise it processes chunks of the maximum size ([`src/dsp/DrumEngine.h:36-38`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.h#L36-L38), [`src/dsp/DrumEngine.cpp:183-186`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.cpp#L183-L186)) | **No**: chunks start at the beginning of each host block, so the LFO update times depend on block size. The block size test routes no LFO |

## 6. State, presets, migration

| Topic | How | Where |
| --- | --- | --- |
| Contents | APVTS + drawn envelopes + absolute sample paths (even missing ones) + preset name + chain order as text | [`src/PluginProcessor.cpp:422-453`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L422-L453) |
| Version | Integer `format`, currently 10, with the history of every format documented in the same place | [`src/PluginProcessor.h:212-227`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.h#L212-L227) |
| Migration | A series of `if (format < N)` blocks in `loadStateTree`, each rewriting the affected values, then `format` set to the current version | [`src/PluginProcessor.cpp:539-684`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L539-L684) |
| Sanitising | Any parameter value from a session or a preset: non-finite gives the default, the rest is clamped | [`:50-72`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L50-L72), called at [`:686`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L686) |
| Missing parameters | Added at their default before `replaceState`, so an old patch does not keep the values of the previous patch | [`:79-98`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L79-L98), [`:687`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L687) |
| Session parameters | A single list (sidechain, solos, Master Out): recalled by the host, ignored by presets and by undo | [`src/Parameters.cpp:659-671`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L659-L671), [`src/PluginProcessor.cpp:466-486`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L466-L486) |
| UI state | `ui*` properties stored in the session, removed before loading a patch, clamped on read | [`:700-743`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L700-L743) |
| Undo | Snapshots of the whole patch (100 steps), one step per user gesture; automation and session recall only move the baseline; the host signals it through an atomic from any thread | [`src/UndoHistory.h:16-38`](https://github.com/donjmilligan/drum-foundary/blob/main/src/UndoHistory.h#L16-L38), [`:83`](https://github.com/donjmilligan/drum-foundary/blob/main/src/UndoHistory.h#L83), [`src/PluginProcessor.cpp:741`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L741) |
| JUCE parameter version | `ParameterID{id, 1}` for all | [`src/Parameters.cpp:124-134`](https://github.com/donjmilligan/drum-foundary/blob/main/src/Parameters.cpp#L124-L134) |

The cause of most migrations is **a choice that received new items in the middle of its list**: Body Style saw its Sample item move from index 6 to 11, then 16, then further; Click Type likewise ([`src/PluginProcessor.cpp:549-588`](https://github.com/donjmilligan/drum-foundary/blob/main/src/PluginProcessor.cpp#L549-L588)). Each insertion costs a migration rule and breaks automation recorded on that parameter.

## 7. CI

A single workflow: [`.github/workflows/build.yml`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml), triggered on push to `main`, on `v*` tags, on pull requests and manually; obsolete PR runs are cancelled ([`:28-40`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L28-L40)).

| Job | Platform | Steps | Where |
| --- | --- | --- | --- |
| `windows` | `windows-latest` | Reads the version from `CMakeLists.txt`; configures **with `DRUMFOUNDRY_BUILD_TOOLS=OFF`**; Release build; uploads the raw plugin **before** packaging so it stays downloadable if the rest fails; Inno Setup installer (installed through Chocolatey if missing or too old); zip of the VST3 | [`:43-156`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L43-L156) |
| `macos` | `macos-latest` | Reads the version; **fails if the README does not show `**Version X.Y.Z**`**; installs Ninja; `packaging/macos/make-pkg.sh` (universal arm64 + x86_64 build, tools OFF, unsigned `.pkg`) | [`:158-221`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L158-L221), [`packaging/macos/make-pkg.sh:59-65`](https://github.com/donjmilligan/drum-foundary/blob/main/packaging/macos/make-pkg.sh#L59-L65) |
| `release` | `ubuntu-latest`, tags only | Checks that Windows and macOS read the same version and that the tag matches it; downloads the installers; creates the GitHub release (or replaces its files if it exists); attaches each file twice, with and without the version in the name, so the README's `releases/latest/download/...` links stay valid | [`:223-291`](https://github.com/donjmilligan/drum-foundary/blob/main/.github/workflows/build.yml#L223-L291) |

Missing from CI: **Linux, the tests (`DrumFoundryTools check` is not even compiled), pluginval, auval, signing and notarisation**. pluginval strictness 10 and `auval` are manual commands listed in the README and in the internal audit, run on the developer's machine.

## 8. Vendored code

[`libs/CloudSeedCore/PATCHES.md`](https://github.com/donjmilligan/drum-foundary/blob/main/libs/CloudSeedCore/PATCHES.md) gives the upstream repository, the exact commit, the date, the licence, the files taken and, for each file, the change; every change is marked `[Drum Foundry patch]` in the source. The patches: modulation phases drawn from a seeded LCG instead of `std::rand()` (reproducible renders), overridable buffer sizes, line seeds cached so that a change of size or decay does not allocate, `strcpy_s` replaced with `snprintf`, setting a parameter directly in units. This is the right documentation model.

## 9. Weak points, not to copy

1. **No DSP without JUCE.** The README and our `01_REFERENCES.md` suggest a separation; in reality everything goes through an `INTERFACE` library linked to JUCE.
2. **No checks in CI**: no `check`, no pluginval, no auval. Quality relies on the developer's discipline.
3. **Unbounded pre-render on each note.** A layer with a negative Offset is rendered and then discarded in the audio callback on every note ([`src/dsp/DrumVoice.cpp:204-205`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumVoice.cpp#L204-L205)). Their own audit measures up to 4 times the budget of a 64-sample block at 96 kHz (section 5.1 of the `Docs/` document). The line numbers cited in that audit are already stale.
4. **196 KB of tables copied on the audio thread** on every envelope edit ([`src/dsp/DrumEngine.h:58`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/DrumEngine.h#L58)).
5. **32-sample chunks aligned to the host block** for LFOs: not block size independent, and not tested.
6. **Items inserted in the middle of choice lists**, hence four migration rules for Body Style alone.
7. **`ParameterID` always at version 1** despite parameters being added.
8. **`bench` with no worst case and no threshold.**
9. **No compared audio references**, only renders for listening.
10. **Order change through silence**: clean, but audible as a 20 to 25 ms gap. For an insert effect on a track, a real crossfade between two chains would be better.
11. No handling of out-of-memory in sample decoding (noted by their audit, section 6.1).
12. The reference to the Giannoulis, Massberg and Reiss paper is only in the README; the compressor code does not cite its source (the EQ code cites Vicanek and the RBJ cookbook: [`src/dsp/ParametricEq.h:84-97`](https://github.com/donjmilligan/drum-foundary/blob/main/src/dsp/ParametricEq.h#L84-L97)).

## To reuse in our plugins

1. **A headless tool that drives the real `AudioProcessor`.** A `<Plugin>Tools` target (JUCE console app) with `render`, `check`, `bench`, `snapshot`, plus what they lack: `compare` against `tests/golden/`. The `check` verifications are written as Catch2 tests (`Tests` target, `ctest`), and `check` only runs them or runs the checks that need the editor. CI builds the tool and runs it.
2. **Parameter snapshot sanitised on read.** A `ParamReader` in `plugin/` that caches the `std::atomic<float>*` from `getRawParameterValue` and fills our `Params` (plain struct, no allocation) once per block; non-finite gives the default, the rest is clamped, choices are rounded and clamped. Test: write NaN and inf into the atomics and check that the snapshot is finite.
3. **Sanitise and complete the state on load.** Before `replaceState`, clamp every value and add missing parameters at their default. Test: corrupted sessions (NaN, inf, text) loaded through `setStateInformation`, then a finite render.
4. **Integer state version and chained migrations.** An integer `format` in the state, the format history commented next to the constant, `if (format < N)` blocks in order, and a state file of each released version in `tests/plugin/states/`. An extra rule on our side: **new items of a choice are always appended at the end of the list**, which removes the main cause of their migrations.
5. **Fixed latency through an end-of-chain delay.** Report the worst-case latency once in `prepareToPlay`; a module with latency always runs, even when off; the difference with the active chain is filled by a delay line (`juce::dsp::DelayLine` or a pre-allocated circular buffer). Test: for each configuration, an impulse comes out at `getLatencySamples()`.
6. **Oversample only the non-linear difference.** For a clipper or a saturator with a knee: oversample `shape(u) - u` and add it to the delayed input, which makes the path bit-clean below the knee. Resampling through `juce::dsp::Oversampling` (integer latency); test: below the knee, output equal to the delayed input, bit-exact if the design allows it, otherwise within 1e-7.
7. **Oversampling factor chosen from the sample rate** (8x, 4x, 2x, 1x), decided in `prepare`, to keep latency constant during a session.
8. **Non-blocking handoff, but without heavy copies.** For tables and heavy objects: `farbot::RealtimeObject` (MIT) or an atomic pointer swap, rather than a `try_lock` followed by a copy. For shared resources (samples, IRs): raw pointers on the audio side, ownership as `shared_ptr` on the message thread side, a retire list indexed by a serial number that the audio thread publishes, emptied by a `juce::Timer`.
9. **IR built in the background and crossfade delegated to JUCE.** `juce::dsp::Convolution` with a shared `ConvolutionMessageQueue` already does background loading and the fade; do not rewrite this mechanism.
10. **NaN guard at the engine output.** After each block, a finiteness check; if a NaN appears, zero the output and reset the states. Forbid `-ffast-math` (or keep `-fno-finite-math-only`) in `build.md`, since the guard depends on it.
11. **Fixed-size chunks with an internal FIFO**, not aligned to the host block, for any algorithm sensitive to block size, and extend this to modulation: either a phase counter that continues across blocks, or a FIFO as for Cloud. The block size test covers every split path (routed LFO included) with a tight tolerance.
12. **Click-free topology changes.** For an instrument, their pass through silence is enough; for an effect, prefer a 10 to 20 ms crossfade between two chain instances. In both cases, modules that change position restart from a reset state.
13. **Non-parameter state carried by an atomic word.** A chain order or a small discrete configuration fits in a packed `std::atomic<uint64_t>`, and is serialised as readable text in the state.
14. **Session parameters listed once**, used by presets and by undo.
15. **Undo through snapshots and gestures**, only if a plugin needs it: automation and session recall move the baseline; JUCE `UndoManager` can hold the snapshots.
16. **Release CI reused almost as is in spirit**: read the version, upload artefacts before packaging, release on tag with a tag = version check, duplicate unversioned files for "latest" links. Add what they lack: Linux, `ctest`, `<Plugin>Tools check` and `compare`, pluginval 10 on each OS, `auval` on macOS, and a single version source (our `VERSION` or `CHANGELOG.md`) instead of `CMakeLists.txt` plus the README.
17. **Versioned host compatibility audit in `Docs/`** with the commands that reproduce each number, which our `workflow.md` rule already requires; add a worst-block measurement to it, not just the average.
18. **`PATCHES.md` for each modified dependency**, with upstream commit, licence, file by file, and a marker in the source.
