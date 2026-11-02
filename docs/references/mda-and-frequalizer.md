# mda-plugins-juce and Frequalizer

**mda-plugins-juce verdict: the whole repository is under the MIT licence (Paul Kellett 2008, Matthijs Hollemans 2021-2025), so it is reusable whether the plugin is AGPL or closed. The 24 plugins have a DSP core that uses almost nothing from JUCE (loops over `float*` with simple members) and extracts easily into `dsp/`, but these are twenty-year-old algorithms, without parameter smoothing, without declared latency or tail, sometimes with `rand()` on the audio thread. We take them as annotated starting algorithms, rewritten in our format (`prepare`/`reset`/`process`, `Params`, tests), not as production code as is.**

**Frequalizer verdict: BSD 3-Clause licence (Daniel Walz, Foleys Finest Audio, 2018), reusable everywhere. The repository has not been maintained since January 2022, it is pinned on JUCE 6.1.2 and does not compile on JUCE 9 without changes. The ideas (FFT analyser on a background thread fed by `AbstractFifo`, EQ curve through `getMagnitudeForFrequencyArray`, dragging bands in the graph) are good; the code violates several of our realtime rules (possible lock and allocation on the audio thread, editor access from `processBlock`). We take the structure and the plotting formulas, and rewrite the data transport. The evolved version of the analyser, in foleys_gui_magic (BSD 3, active), is a better starting point.**

Study done on 2026-11-02 on two shallow clones:

1. mda-plugins-juce, `master` at commit [`5527024`](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb) (2026-02-25, "add dither plug-in").
2. Frequalizer, `master` at commit [`c4b1b61`](https://github.com/ffAudio/Frequalizer/tree/c4b1b611c8d818107639c79f974bca6a414d672d) (2022-01-16, "Added notarization").

The `file:line` paths are relative to the root of each repository and are valid for these commits. The JUCE 9 API checks were done on the copy of JUCE 9.0.4 present in `study/TetraDrive/external/JUCE`.

---

# Part A: mda-plugins-juce

## A1. Licence

[`LICENSE.txt`](https://github.com/hollance/mda-plugins-juce/blob/552702479a9eac534f3abbf6e878a5eab473e0cb/LICENSE.txt): **MIT**, with two copyright lines: "Copyright (c) 2008 Paul Kellett" and "Copyright (c) 2021-2025 M.I. Hollemans (JUCE version)". The `README.markdown` confirms it ("This source code is licensed under the MIT license but keep in mind that JUCE has its own licensing terms").

| Point checked | Finding |
| --- | --- |
| File headers | No source file carries a licence or copyright header (search for `Copyright`, `License`, `GPL`, `MIT` in all `.h` and `.cpp`: no result). The root `LICENSE.txt` therefore covers everything. |
| Sample data | `Piano/Source/mdaPianoData.h` (3.3 MB) and `EPiano/Source/mdaEPianoData.h` (2.3 MB) are `short` arrays taken from the original plugins, without a separate licence: they fall under the repository's MIT. |
| Original MDA code | The repository says it builds on Paul Kellett's SourceForge `mda-vst` release; the `LICENSE.txt` reuses the 2008 MIT. The LV2 port `mda.lv2` (David Robillard) is, for its part, under GPL according to the upstream project (not verified here): **do not confuse the two sources**. |
| Sophia Poirier's AU ports | The README says they were "consulted". Their licence is not stated in the repository (*to verify* if we wanted to read them too); the code published here remains under MIT by its author. |

Consequence: usable in an AGPL plugin as well as in a closed plugin, provided the MIT notice (the two copyright lines) is kept in `docs/DEPENDENCIES.md` and in the binary's notices.

## A2. The 24 plugins

Size = lines of `PluginProcessor.cpp` + `PluginProcessor.h`. "Extractable" rates the effort to move the DSP into a `dsp/` class without JUCE. In all the plugins, the only JUCE symbols outside the skeleton (APVTS, buses, state, editor) are `juce::Decibels::decibelsToGain`, `juce::MathConstants` (RingMod) and `juce::Random` (TestTone); the synths also read a `juce::MidiBuffer`.

| Name | Type | DSP technique | Size | DSP extractable without JUCE | Interest for us |
| --- | --- | --- | --- | --- | --- |
| [Ambience](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Ambience) | Effect | Small reverb: one pole low pass then four Schroeder allpasses in series (direct gain 1, feedback 0.8) on 1024-sample buffers. | 303 + 70 | Easy | Low: lengths in samples not scaled to the sample rate (`Ambience/Source/PluginProcessor.cpp:105-111`), `new[]` without prior freeing if `prepareToPlay` is called again (`:44-47`). Idea only. |
| [Bandisto](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Bandisto) | Effect | 3-band distortion: crossover with three one pole low passes in series (exact reconstruction `l + m + h`), waveshaper `x / (1 + d·|x|)` per band, stereo side not distorted. | 367 + 57 | Easy | Medium: good example of a reconstructible band split and a simple waveshaper; aliasing not handled (no oversampling). |
| [BeatBox](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/BeatBox) | Effect | Drum replacement: envelope followers on three filtered bands triggering kick, snare and hi-hat sounds synthesised in `prepareToPlay` (damped sine, filtered noise). | 540 + 93 | Medium (`std::rand()` in `synth()`, `BeatBox/Source/PluginProcessor.cpp:112,144`) | Low, except the idea of a per band trigger. |
| [Degrade](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Degrade) | Effect | Bitcrusher: clipping, quantisation, sample rate reduction (sampling or averaging), power non linearity, then a chain of one pole low passes. | 379 + 79 | Easy | Medium: basis for a "lo-fi"; the `filterFreq` low pass is documented (`Degrade/Source/PluginProcessor.cpp:69-90`). |
| [Delay](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Delay) | Effect | Stereo delay with a single mono buffer, integer L and R delays (R as a ratio of L), one pole low pass or high pass tone filter in the feedback loop. | 372 + 87 | Easy | Medium: good annotated delay model, but integer delay (no interpolation, so no modulation possible), `getTailLengthSeconds` at 0. `juce::dsp::DelayLine` does better for the line itself. |
| [Detune](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Detune) | Effect | Delay line pitch shifter: two read heads at ±cents speed, linear interpolation, crossfade with a Hann window at half overlap. | 330 + 61 | Easy (fixed arrays `BUFMAX = 4096`, `Detune/Source/PluginProcessor.h:46-49`) | Good: low cost "doubler" effect, very well explained (`Detune/Source/PluginProcessor.cpp:137-161`). Latency not declared (`setLatencySamples` absent). |
| [Dither](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Dither) | Effect | Word length reduction: truncation, TPDF dither, high pass TPDF, second order noise shaping. | 313 + 74 | Easy, but `rand()` in the loop (`Dither/Source/PluginProcessor.cpp:171,176`) | Good for an output stage or a mastering tool; replace `rand()` with a seedable generator (`dsp.md` rule). |
| [DX10](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/DX10) | Instrument | Two-operator FM synth, 8 voices, exponential envelopes, LFO through a recursive oscillator updated every 100 samples. | 939 + 184 | Medium: the block split per MIDI event must be pulled out (`DX10/Source/PluginProcessor.cpp:389-530`) | Good as a basis for a minimal FM synth and voice management. |
| [Dynamics](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Dynamics) | Effect | Stereo linked peak compressor (one pole attack/release follower, gain `1/(1 + r·(env/threshold − 1))`), zero attack limiter and gate in the same loop. | 396 + 63 | Easy | Medium: readable, but `juce::dsp::Compressor`/`NoiseGate`/`Limiter` already cover the need. Useful for the "overcompression" curve. |
| [Envelope](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Envelope) | Effect | Envelope follower and VCA; L×|R| modes, envelope output as DC, dynamics flattening. | 243 + 55 | Easy | Low as a plugin, useful as a building block (one pole envelope follower). |
| [EPiano](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/EPiano) | Instrument | Rhodes sample playback by key groups, pseudo random per note detuning, tremolo or pan LFO, overdrive. | 866 + 207 + 2.3 MB data | Medium (MIDI, large data header) | Medium: good example of a very low cost multi zone sample player; heavy data to compile. |
| [Image](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Image) | Effect | M/S matrix: width and pan of the stereo component, level and pan of the centre, M/S encoding and decoding. | 233 + 49 | Easy | Good: ready stereo building block (ten lines of computation). |
| [JX10](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/JX10) | Instrument | 8-voice subtractive synth: two band limited saws by sinc impulse integration (`JX10/Source/PluginProcessor.cpp:697-785`), modified Chamberlin SVF with soft saturation (`:864-869`), one pole envelopes, reduced rate control (32 samples), glide, mono/legato modes. | 1610 + 274 | Medium | **High** for a synth: the best documented in the repository, and the author wrote a book based on it (link in `JX10/README.markdown`). |
| [Limiter](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Limiter) | Effect | Opto style limiter, hard or soft knee, attack/release smoothed gain; not a brickwall limiter (no look ahead). | 320 + 74 | Easy | Medium: educational explanation (`Limiter/Source/PluginProcessor.cpp:140-174`), but no look ahead. |
| [Loudness](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Loudness) | Effect | Equal loudness curve correction (Stevens-Davis) through an interpolated coefficient table and two one pole low passes in boost or cut. | 228 + 52 | Easy | Low to medium: niche (bass correction depending on listening level). |
| [Overdrive](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Overdrive) | Effect | Soft saturation `sign(x)·sqrt(|x|)` mixed with the clean signal, then a one pole low pass ("Muffle"). | 193 + 60 | Easy | Medium: the simplest possible saturation; no oversampling, so wrap it in `juce::dsp::Oversampling` or replace it with an ADAA clipper. |
| [Piano](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Piano) | Instrument | Piano sample playback by key groups, 32 voices, sustain pedal, stretched tuning, velocity linked "Muffle" filter. | 842 + 211 + 3.3 MB data | Medium | Medium: same remark as EPiano. |
| [RezFilter](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/RezFilter) | Effect | Resonant filter (variant of the Chamberlin SVF, unstable near Nyquist according to the author) modulated by an envelope follower and a sine or sample and hold LFO. | 407 + 70 | Easy, but `rand()` in the loop (`RezFilter/Source/PluginProcessor.cpp:166,241`) | Low: the author advises against this filter (`:178-182`); take `juce::dsp::StateVariableTPTFilter` or a Cytomic SVF. Keep the modulation idea. |
| [RingMod](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/RingMod) | Effect | Sine ring modulator, with output feedback. | 194 + 63 | Easy | Low: trivial; a good first TDD exercise. |
| [Shepard](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Shepard) | Generator | Risset tone (continuous Shepard) from two wavetables read with a crossfade, alone, ring modulated or mixed with the input. | 245 + 67 | Easy (tables generated once, `Shepard/Source/PluginProcessor.cpp:11-22`) | Low. |
| [Splitter](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Splitter) | Effect | Split by frequency (one pole crossover) and by level (envelope gate), normal, inverse and L/R split modes. | 327 + 57 | Easy | Low. |
| [Stereo](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/Stereo) | Effect | Mono to stereo widener: Haas panning or comb filtering, delay modulatable by LFO. | 395 + 75 | Easy (delay in samples, depends on the rate, `Stereo/Source/PluginProcessor.cpp:47-54`) | Medium: two classic widening techniques. |
| [SubSynth](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/SubSynth) | Effect | Sub bass synthesis: distortion of the filtered bass, octave division by flip-flop, phase inversion per cycle, or triggered oscillator ("Key Osc"). | 389 + 80 | Easy | Medium for a bass or drum plugin. |
| [TestTone](https://github.com/hollance/mda-plugins-juce/tree/552702479a9eac534f3abbf6e878a5eab473e0cb/TestTone) | Generator | Test generator: MIDI or third octave sine, impulse, white and pink noise, log and linear sweeps. | 718 + 130 | Medium (`juce::Random`, `std::rand()` line 313, parameter listener) | **Good for our tests**: reference signals for `tools render` and DSP tests; to be rewritten with a seedable generator. |

Original plugins not converted yet (README): Combo, De-ess, DubDelay, Leslie, Looplex, Multiband, Re-Psycho!, Round Panner, SpecMeter, Talkbox, Thru-Zero Flanger, Tracker, Vocoder, VocInput.

## A3. Common structure, quality, maintenance

### Structure

Each plugin is a folder with a `.jucer`, a `README.markdown` (parameters) and two files: `Source/PluginProcessor.h` and `.cpp`. No editor: `GenericAudioProcessorEditor` everywhere. The model, described in the root README (section "How the code is structured"), is as follows:

1. `createParameterLayout()` declares the APVTS parameters in natural units (dB, ms, Hz) with `ParameterID{ "Nom", 1 }`.
2. `prepareToPlay()` allocates the buffers then calls `resetState()`.
3. `resetState()` resets the rendering state; it is also called by `reset()`.
4. `update()` reads the APVTS and computes the "cooked" parameters (members prefixed with `_`).
5. `processBlock()` calls `update()`, copies members into locals, loops over the samples, and copies the state back.

Typical example: [`Delay/Source/PluginProcessor.cpp:76-271`](https://github.com/hollance/mda-plugins-juce/blob/552702479a9eac534f3abbf6e878a5eab473e0cb/Delay/Source/PluginProcessor.cpp#L76-L271).

This `update()` / state / loop split is already almost our `Params` + `process`. Extraction consists of moving the state and the loop into a `dsp/` class and replacing the APVTS reading in `update()` with reading a snapshot.

### Quality

| Aspect | Finding |
| --- | --- |
| Documentation | Excellent: each inherited formula is explained, with the bugs fixed (for example the factor 2 removed from Delay's dry, `Delay/Source/PluginProcessor.cpp:153-162`) and the author's doubts ("I didn't study this filter in detail"). |
| Allocation | Done in `prepareToPlay` only, none in `processBlock` (search for `new`, `resize`, `push_back`). Ambience uses bare `new[]`/`delete[]` (`Ambience/Source/PluginProcessor.cpp:44-57`). |
| Smoothing | None: the root README owns it ("did not add any new features such as parameter dezippering"). Parameter changes are audible as steps. |
| Parameter updates | `update()` is called on every block without change detection (except TestTone), although the README says "only when parameters have actually changed". Detune recomputes a Hann window of up to 4096 points there when the latency changes (`Detune/Source/PluginProcessor.cpp:106-116`). |
| Randomness | `rand()`/`std::rand()` in RezFilter, Dither, TestTone (audio loop) and BeatBox (`prepareToPlay`). Contrary to our `dsp.md` rule. |
| Latency and tail | No `setLatencySamples` (Detune would need it); `getTailLengthSeconds` returns 0 everywhere, including Delay and Ambience. |
| Sample rate | Several plugins reason in fixed samples (Ambience, Stereo): the sound changes at 48 or 96 kHz. |
| Buses | Stereo enforced at the output; the code always reads two input channels. |
| Style | Personal style (not JUCE), plain C++17, one monolithic `.cpp` per plugin. No tests, no CI. |
| Build | Projucer only, macOS Xcode exporter only, relative module paths `../../../../../JUCE/modules`. Tested by the author "with Xcode on a Mac using JUCE 7". No CMake: it will need rewiring into our Pamplejuce skeleton, which is effortless since we only keep the DSP. |

### Activity

Last commit on 2026-02-25 ("add dither plug-in"), previous one on 2025-12-15. Slow but steady pace since 2021 (a plugin added every few months). Single author: Matthijs Hollemans. The repository presents itself as educational "plugin archaeology", not as a library: no version, no tag, so we pin a commit if we vendor it.

## A4. The most useful to reuse

Ranked by interest for a first plugin, with what JUCE or an already chosen library already does (selection rule in `docs/07_REUSE.md`).

| Rank | Plugin | Why | Already chosen alternative |
| --- | --- | --- | --- |
| 1 | JX10 | Complete, annotated synth: band limited oscillators, SVF, envelopes, voices, glide, block split per MIDI event. The best starting point if we build a simple synth. | `gin_dsp` (BSD 3) has oscillators and ADSR, but not a whole synth this readable. |
| 2 | TestTone | Test signals (sine, noises, sweeps, impulse) for our reference renders and our DSP tests. | Nothing ready in the current list. |
| 3 | Detune | Low cost pitch shifter, ideal for a doubler or a "multi effects" chorus. | chowdsp has a pitch shifter, but under GPL. |
| 4 | Dither | Clean output stage (high pass TPDF, second order noise shaping). | Nothing in the current list. |
| 5 | Image | Complete M/S matrix, a few lines. | `dsp::Panner` does not do M/S. |
| 6 | Bandisto | Reconstructible 3-band split and per band waveshaper. | `dsp::LinkwitzRileyFilter` for the crossover if we want steeper slopes. |
| 7 | DX10 | Two-operator FM basis and minimal polyphony. | No FM synth in the current list. |
| 8 | Delay, Overdrive, Dynamics, Limiter | Useful as reading material and as a test reference, but JUCE provides `DelayLine`, `WaveShaper`, `Compressor`, `Limiter`, `NoiseGate` (selection rule no. 1). | `juce_dsp`, Airwindows (MIT) for richer saturations. |
| 9 | SubSynth, Stereo, Degrade | Keep in reserve for a bass, widening or lo-fi plugin. | Airwindows (MIT) also covers these areas. |

Not to reuse as DSP: RezFilter and Ambience's filter (instability and sample rate dependence, as the author himself admits), Piano and EPiano as long as we do not build a sample player (5.6 MB of data in headers).

---

# Part B: Frequalizer

## B1. Licence

[`LICENSE.md`](https://github.com/ffAudio/Frequalizer/blob/c4b1b611c8d818107639c79f974bca6a414d672d/LICENSE.md): **BSD 3-Clause**, "Copyright (c) 2018, Daniel Walz - Foleys Finest Audio UG". The sources have no licence header (only "Author: Daniel Walz" in `Source/Analyser.h:6`); the root file covers everything.

Caveat: `Resources/*.png` (Foleys Finest, Facebook, GitHub, LinkedIn logos) and `Source/SocialButtons.h` belong to the brand identity. Clause 3 forbids using the author's name to promote a derivative, and the third party logos are trademarks. We take none of these files.

## B2. Maintenance and JUCE version

| Point | Finding |
| --- | --- |
| JUCE | Submodule `External/JUCE` pinned on `e6ec181`, commit "Updated JUCE to 6.1.2" (2021-11-11). |
| Build | CMake 3.13 (`CMakeLists.txt:1`), `juce_add_plugin` with VST3, plus AU on macOS and AAX or VST2 if the SDKs are provided (`CMakeLists.txt:5-19`). Links `juce_opengl`. |
| CI | GitHub Actions macOS and Windows, signing, notarisation, InnoSetup (commits from January 2022). Linux removed. |
| Activity | Last commit 2022-01-16. Demonstration project from 2018, not maintained. |
| Size | 1590 lines in `Source/`: `Analyser.h` 144, processor 617 + 172, editor 438 + 124. |

### What breaks or grates with JUCE 8 and 9

Checked on JUCE 9.0.4.

1. **Compile error**: `startThread (5)` (`Source/Analyser.h:56`). Since JUCE 7, `Thread::startThread` no longer takes an integer but a `Thread::Priority` (`enum class`, `juce_Thread.h:65,286` in JUCE 9). Replace with `startThread (juce::Thread::Priority::low)` or switch to a `TimeSliceThread`.
2. **CMake**: JUCE 9 requires CMake 3.22; the `cmake_minimum_required(VERSION 3.13.0)` does not block but is no longer accurate. Not applicable for us (Pamplejuce skeleton).
3. **Deprecation warnings** (blocking with `-Werror`): the positional constructors of `AudioParameterFloat`, `AudioParameterBool` and `AudioParameterChoice` with label, category and lambdas (`Source/FrequalizerProcessor.cpp:74-131`) are marked `[[deprecated ("Prefer the signature taking an Attributes argument")]]` in JUCE 9 (`juce_AudioParameterFloat.h:97`).
4. **Unversioned IDs**: IDs as bare `juce::String`, so `ParameterID` at version 0; contrary to our `juce.md` rule (version incremented on every addition).
5. **OpenGL**: the editor attaches an `OpenGLContext` to the top level component (`Source/FrequalizerEditor.cpp:44-46`). JUCE 9 moves to EGL on Linux and OpenGL is deprecated by Apple; JUCE 8 has a Direct2D renderer on Windows. Useless for a 300-point plot: we remove OpenGL.
6. The rest of the API used (`IIR::Coefficients::make*`, `getMagnitudeForFrequencyArray`, `ProcessorChain`, `AbstractFifo`, `dsp::FFT`, `WindowingFunction`, `Graphics::setFont (float)`) still exists in JUCE 9.

## B3. The FFT analyser

Code: [`Source/Analyser.h`](https://github.com/ffAudio/Frequalizer/blob/c4b1b611c8d818107639c79f974bca6a414d672d/Source/Analyser.h), a template class `Analyser<Type>` that inherits from `juce::Thread`. Two instances (input and output) in the processor (`Source/FrequalizerProcessor.h:168-169`).

### Data transport from the audio thread

1. `processBlock` calls `inputAnalyser.addAudioData (buffer, ...)` before filtering and `outputAnalyser.addAudioData` after, **only if `getActiveEditor() != nullptr`** (`Source/FrequalizerProcessor.cpp:290-302`).
2. `addAudioData` (`Analyser.h:30-48`) writes into a `juce::AbstractFifo` (lock free, one producer and one consumer) backed by a mono `AudioBuffer`. The channels are **added** without division (sum, not average). If there is not enough room, the whole block is **dropped**.
3. Then `waitForData.signal()` (`Analyser.h:47`) wakes the analysis thread. **Problem**: in JUCE 9, `WaitableEvent` is a `std::mutex` plus a `std::condition_variable` (`juce_WaitableEvent.h:145-146`): `signal()` takes a lock on the audio thread. Contrary to `realtime-audio.md`.
4. The FIFO size is one second of audio (`setupAnalyser (int (sampleRate), ...)`, `Source/FrequalizerProcessor.cpp:264-265`), and `setupAnalyser` resizes `audioFifo` and restarts the thread on every `prepareToPlay` (`Analyser.h:50-57`). If the host calls `prepareToPlay` again without `releaseResources`, the buffer is resized while the thread reads it.

### Computation (background thread, priority 5)

1. When 4096 samples are ready (`dsp::FFT fft { 12 }`, `Analyser.h:131`), the thread copies them, then calls `finishedRead (n / 2)` (`Analyser.h:71`): **50 % overlap**, hop of 2048 samples.
2. **Windowing**: normalised Hann (`WindowingFunction ... hann, true`, `Analyser.h:132`).
3. `performFrequencyOnlyForwardTransform` gives the magnitudes of the first 2048 bins.
4. **Smoothing**: moving average over 4 frames. `averager` has 5 channels: channel 0 holds the sum, channels 1 to 4 form a ring; the oldest frame is subtracted, the new one is written scaled by `1 / (2048 × 4)`, and added (`Analyser.h:76-80`). No attack/release ballistics, no frequency smoothing.
5. Write protected by a `CriticalSection` shared with the UI thread (`Analyser.h:76`), then the atomic flag `newDataAvailable`.

### Rendering

1. The editor has a 30 Hz `Timer` (`Source/FrequalizerEditor.cpp:50`) that calls `checkForNewAnalyserData()` and only repaints the graph area if a frame has arrived (`:158-162`).
2. In `paint`, `createPath` (`Analyser.h:90-102`) builds a `juce::Path` under the same lock: one point per bin, x coordinate `log2 (f / 20 Hz) / 10` (ten octaves from 20 Hz), y coordinate in dB from −80 to 0 (`Analyser.h:113-124`). The lock is between the UI and the analysis thread, not the audio thread: acceptable.
3. Two overlaid plots (input in green, output in red), 1 px stroke, no fill (`Source/FrequalizerEditor.cpp:104-111`). No decimation of the high bins: about 2048 segments per plot, most of them packed into the last octave.

### Defects found

1. Lock on the audio thread through `WaitableEvent::signal` (`Analyser.h:47`).
2. Reading `getActiveEditor()` in `processBlock` (`Source/FrequalizerProcessor.cpp:290,301`), contrary to `juce.md` ("No access to the editor from the processor").
3. `checkForNewData` does `load` then `store` instead of `exchange` (`Analyser.h:104-109`): a frame can be missed, which is harmless.
4. `newDataAvailable` has no explicit initialiser (`Analyser.h:141`); value initialised in C++20, indeterminate before.

### The evolved version: foleys_gui_magic

The same author reused this analyser in `foleys_gui_magic` (BSD 3, last commit 2026-08-15, already cited in `07_REUSE.md`), file `modules/foleys_gui_magic/Visualisers/foleys_MagicAnalyser.{h,cpp}`. Useful differences:

1. No more `WaitableEvent`: the computation is a `TimeSliceClient` on a shared thread that polls the FIFO (`useTimeSlice`, `foleys_MagicAnalyser.cpp:159`). The audio thread now only writes into the `AbstractFifo`.
2. Ballistic smoothing: instant rise, multiplicative decay of 0.8 per frame (`:181-193`), commented `FIXME: calculate by fft size and sampleRate`.
3. Choice of the analysed channel, or sum.

Bug found along the way: the sum loop uses `audioFifo.getNumChannels()` (always 1) instead of the number of input channels (`foleys_MagicAnalyser.cpp:140`), then divides by the number of input channels: in stereo, only the left channel is analysed, attenuated by half.

## B4. The EQ response curves and interaction

### Computing the curves

1. Six fixed bands, each a `ProcessorDuplicator<IIR::Filter, IIR::Coefficients>` in a `ProcessorChain` followed by a `dsp::Gain` (`Source/FrequalizerProcessor.h:160-162`). Twelve types (`FilterType`, `:22-37`), all biquads or first order filters from the `IIR::Coefficients::make*` factories (`Source/FrequalizerProcessor.cpp:442-486`).
2. Grid of 300 frequencies `20 × 2^(i/30)`: ten octaves, 30 points per octave (`Source/FrequalizerProcessor.cpp:156-160`).
3. On each parameter change, `updateBand` computes the band's response with `Coefficients::getMagnitudeForFrequencyArray` (`:506-508`), then `updatePlots` multiplies the responses of the active bands (or of the single soloed band) by the output gain to get the total curve (`:516-532`), and `sendChangeMessage()` notifies the editor.

### Plotting

1. `createFrequencyPlot` (`Source/FrequalizerProcessor.cpp:550-559`): x linear in index (so logarithmic in frequency thanks to the grid), y = centre − `pixelsPerDouble × log2 (magnitude)`, which is a linear dB scale.
2. `pixelsPerDouble = 2 × height / decibelsToGain (24)` (`Source/FrequalizerEditor.cpp:266`): the ±24 dB scale is approximated by a roundabout formula, whereas the handles use an exact `jmap` in dB (`:294-302`). The two roughly coincide without being identical; they should be unified.
3. One curve per band in colour (dimmed if inactive), plus the total curve in grey; per band, a vertical line and a dot at (frequency, gain) (`Source/FrequalizerEditor.cpp:113-127`). Grid of 10 octaves and markers at ±12 and ±24 dB (`:79-99`).

### Interaction

1. `mouseMove` finds the band whose x coordinate is within 4 px (`clickRadius`) of the cursor; if the y coordinate is too, dragging also changes the gain (four arrow cursor), otherwise only the frequency (`Source/FrequalizerEditor.cpp:195-232`).
2. `mouseDrag` converts the position into frequency (`20 × 2^(10 × pos)`) and gain, then calls `Slider::setValue (..., sendNotification)` on the band's knobs (`:234-243`, `:418-426`): the parameter goes through the APVTS attachment.
3. Double click: toggles the band's "active" state through `setValueNotifyingHost` (`:245-262`).
4. Right click: filter type menu (`:164-193`).
5. Each band's panel (`BandEditor`) has type, frequency, Q, gain, solo and activation, greyed out depending on the type (`:367-411`).

### Defects found

1. **Realtime**: `parameterChanged` is called on the thread that changes the parameter, so sometimes the audio thread (automation). `updateBand` allocates `Coefficients` on the heap there (`Source/FrequalizerProcessor.cpp:445-486`), takes `getCallbackLock()` (`:492`), computes 300 magnitudes and calls `sendChangeMessage()` (`:531`), which posts a message. From the UI, the same lock blocks the audio thread.
2. **Data races**: `bands[i].magnitudes`, `magnitudes` and the fields of `Band` are written by the parameter's thread and read by `paint` without synchronisation; `setBandSolo` changes the `ProcessorChain` bypass flags from the UI while the audio thread reads them (`:390-415`).
3. **Gestures**: dragging does not call `beginChangeGesture`/`endChangeGesture`. Since the knob itself is not held, the attachment treats each `setValue` as a complete gesture: the host receives dozens of gestures per drag (automation writing and host undo polluted).
4. **Wrong hit test**: in `mouseDown`, the parenthesis is misplaced: `getPositionForFrequency (float (int (band->frequency)) * plotFrame.getWidth())` multiplies the frequency by the width before the logarithm (`Source/FrequalizerEditor.cpp:173`). The context menu almost never opens on the right band.
5. **State**: no version number; `setStateInformation` assigns `state.state` directly and can call `setSize` on the editor outside the message thread (`:585-600`); solo is not saved (acceptable, it is a session setting).
6. No coefficient smoothing: changing a parameter during playback replaces the coefficients at once (possible click on large gain or frequency jumps).

## B5. What we can extract

| Item | Where | What we keep | What we change |
| --- | --- | --- | --- |
| Analyser | `Source/Analyser.h` or better `foleys_MagicAnalyser.*` | Mono `AbstractFifo`, 4096 FFT, normalised Hann, 50 % overlap, `binToY` and `indexToX` mapping | No `signal()` on the audio side (polling by timer or `TimeSliceClient`), no `getActiveEditor()` (atomic "analyser visible" flag written by the editor), FIFO sized once for the worst case, average of the channels, ballistics depending on the rate and the FFT size, decimation of the high bins. Better still: a `farbot::fifo` or `AbstractFifo` and a background thread that produces an array of magnitudes, swapped with the UI through `farbot::RealtimeObject`. |
| EQ curve | `Source/FrequalizerProcessor.cpp:156-160, 506-532, 550-559` | Log frequency grid, `getMagnitudeForFrequencyArray`, product of the responses, plot in dB | Computation **in the UI** (message thread) from the parameter values read in the APVTS, never in `parameterChanged`. A single dB to pixel mapping function. |
| Interaction | `Source/FrequalizerEditor.cpp:195-302` | Handle detection, frequency/gain drag, double click, context menu, `getPositionForFrequency` formulas and their inverses | Gestures wrapped (`beginChangeGesture` on `mouseDown`, `endChangeGesture` on `mouseUp`), parameters written directly (`setValueNotifyingHost` on the normalised value) rather than through the knobs, the parenthesis at `:173` fixed, click radius scaled (150 %, 200 %). |
| Filter updates on the audio side | `Source/FrequalizerProcessor.cpp:442-514` | List of types and `make*` calls | In `processBlock`: `Params` snapshot, coefficients recomputed only on change, without allocation (coefficients computed as `std::array` in `dsp/`, or `IIR::ArrayCoefficients`, which returns an array by value), smoothing. |

---

# To reuse

Reminder: MIT and BSD 3 are compatible with both licence choices for our plugins. Any code reuse keeps the original notice and a line in the project's `docs/DEPENDENCIES.md`.

## 1. Code to extract

| No. | What | Source | Licence | Layer on our side | Remark |
| --- | --- | --- | --- | --- | --- |
| 1 | Band limited saw oscillator by sinc integration, SVF with soft saturation, one pole envelopes, 8-voice management and block split per MIDI event | `JX10/Source/PluginProcessor.cpp` | MIT | `dsp/` (oscillators, filter, envelopes, voices) and `plugin/` (reading the `MidiBuffer`) | For a simple synth. Rewritten with TDD, sample rate dependent coefficients, smoothing added. |
| 2 | Test signal generator (sine, white noise, filtered pink noise, log and linear sweeps, impulse) | `TestTone/Source/PluginProcessor.cpp` | MIT | `tools/` and `tests/dsp/` | For `tools render` and the tests; `rand()` replaced with a seedable generator. |
| 3 | Two-head pitch shifter with Hann window | `Detune/Source/PluginProcessor.cpp:70-251` | MIT | `dsp/` | Latency declared by `plugin/` through `setLatencySamples`; window precomputed for all sizes in `prepare`. |
| 4 | TPDF dither, high pass TPDF, second order noise shaping | `Dither/Source/PluginProcessor.cpp:67-220` | MIT | `dsp/` | Seedable generator. |
| 5 | M/S matrix and width controls | `Image/Source/PluginProcessor.cpp:69-163` | MIT | `dsp/` | Smoothed gains. |
| 6 | Reconstructible one pole 3-band crossover and waveshaper `x/(1 + d·|x|)` | `Bandisto/Source/PluginProcessor.cpp:69-223` | MIT | `dsp/` | Oversampling around the waveshaper (`dsp.md` rule). |
| 7 | Two-operator FM with recursive LFO | `DX10/Source/PluginProcessor.cpp` | MIT | `dsp/` and `plugin/` | If an FM synth is on the roadmap. |
| 8 | Analyser and curve mapping functions (`indexToX`, `binToY`, `getPositionForFrequency`, `getFrequencyForPosition`, `getPositionForGain`, `getGainForPosition`) | `Source/Analyser.h:113-124`, `Source/FrequalizerEditor.cpp:284-302` | BSD 3 | `ui/` | A single implementation shared by the analyser and the curve. |
| 9 | FFT analysis loop (window, FFT, magnitudes, ballistics) | `foleys_MagicAnalyser.cpp:159-197` (preferred to `Source/Analyser.h:59-88`) | BSD 3 | `ui/` (background thread on the editor side) with the FIFO write in `plugin/` | Fix the channel sum (`:140`) and the decay `FIXME`. |
| 10 | EQ curve computation (log grid, `getMagnitudeForFrequencyArray`, product of the bands) | `Source/FrequalizerProcessor.cpp:156-160, 506-532` | BSD 3 | `ui/` | Run on the message thread from the APVTS. |
| 11 | Band drag interaction in the graph | `Source/FrequalizerEditor.cpp:164-262` | BSD 3 | `ui/` | With wrapped gestures and the fix at `:173`. |

## 2. Ideas

| No. | Idea | Seen in | Licence | Layer on our side |
| --- | --- | --- | --- | --- |
| 1 | Separate "cooked" parameters (`update()`) from rendering state, copy into locals in the loop: this is our `Params` + the DSP class state. | mda, root README | MIT | `plugin/` (snapshot) and `dsp/` |
| 2 | Parameters in natural units with skew rather than formulas over 0..1. | mda, root README ("Parameter calculations") | MIT | `plugin/` |
| 3 | Reduced control rate (32 or 100 samples) for envelopes, LFO and glide. Compatible with our 32-sample internal chunks. | JX10, DX10 | MIT | `dsp/` |
| 4 | A "how this works" comment at the top of each DSP loop, with doubts and fixed bugs: our "the why and the source" rule in practice. | All of mda | MIT | `dsp/` |
| 5 | Input and output analyser overlaid on the EQ curve, repainted only when a frame arrives. | Frequalizer | BSD 3 | `ui/` |
| 6 | Feed the analyser only if the editor is visible, through an atomic flag written by the editor (and not `getActiveEditor()`). | Frequalizer, fixed | BSD 3 | `plugin/` and `ui/` |
| 7 | Greying out controls depending on the filter type (`updateControls`). | Frequalizer `Source/FrequalizerEditor.cpp:367-411` | BSD 3 | `ui/` |
| 8 | Band solo outside the saved state (session setting), to be listed under "what is not in the presets". | Frequalizer | BSD 3 | `plugin/` |

## 3. To avoid

| No. | To avoid | Where | Licence | Layer concerned | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | `WaitableEvent::signal()` from `processBlock` | `Source/Analyser.h:47` | BSD 3 | `plugin/` | Lock (`std::mutex`) on the audio thread. |
| 2 | `getActiveEditor()` in `processBlock` | `Source/FrequalizerProcessor.cpp:290,301` | BSD 3 | `plugin/` | Editor access from the processor, not thread safe. |
| 3 | Coefficient recomputation, allocation, `getCallbackLock()` and `sendChangeMessage()` in `parameterChanged` | `Source/FrequalizerProcessor.cpp:335-365, 442-532` | BSD 3 | `plugin/` | Possible allocation and lock on the audio thread, audio blocked by the UI. |
| 4 | Dragging without `begin/endChangeGesture` | `Source/FrequalizerEditor.cpp:234-243` | BSD 3 | `ui/` | Host automation and undo polluted. |
| 5 | `OpenGLContext` for a simple 2D plot | `Source/FrequalizerEditor.cpp:44-46` | BSD 3 | `ui/` | Useless, deprecated on macOS, EGL dependency on Linux with JUCE 9. |
| 6 | Logos, `SocialButtons.h`, the names "Frequalizer" and "Foleys Finest" | `Resources/`, `Source/SocialButtons.h` | BSD 3 (clause 3) and third party trademarks | `ui/` | Someone else's brand identity. |
| 7 | `rand()` / `std::rand()` in the DSP | `RezFilter/...:166,241`, `Dither/...:171,176`, `TestTone/...:313`, `BeatBox/...:112,144` | MIT | `dsp/` | Not seedable, not guaranteed realtime safe; `dsp.md` rule. |
| 8 | Unsmoothed parameters and a full `update()` on every block | All of mda | MIT | `dsp/` and `plugin/` | Zipper noise; coefficients to be recomputed only on change (`dsp.md` rule). |
| 9 | Delay lengths in fixed samples | `Ambience/...:105-111`, `Stereo/...:47-54` | MIT | `dsp/` | Sound depends on the sample rate. |
| 10 | Latency and tail not declared | Detune (latency), Delay and Ambience (tail) | MIT | `plugin/` | `juce.md` rule (`setLatencySamples`, `getTailLengthSeconds`). |
| 11 | RezFilter filters and Chamberlin SVF not protected near Nyquist | `RezFilter/Source/PluginProcessor.cpp:178-186` | MIT | `dsp/` | Unstable according to the author; take `juce::dsp::StateVariableTPTFilter` or a TPT SVF. |
| 12 | Bare `new[]`/`delete[]` in `prepareToPlay`/`releaseResources` | `Ambience/Source/PluginProcessor.cpp:44-57` | MIT | `dsp/` | Leak if `prepareToPlay` is called again; `cpp.md` rule (RAII). |
| 13 | `.jucer` projects | All of mda | MIT | build | We stay on CMake (Pamplejuce); we only take the DSP. |
