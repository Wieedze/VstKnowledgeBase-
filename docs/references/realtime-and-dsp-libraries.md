# Realtime and DSP libraries: verified licences and verdicts

Study of 2026-11-02. The repositories were shallow cloned into `/home/claude/study/`. Each licence below was read in the repository file whose path is cited. Last commit dates come from `git log -1 --format=%cd` on the clone.

## Verdict

We take **farbot** and **readerwriterqueue** for realtime work, **Signalsmith DSP** as a DSP toolbox without JUCE, **HIIR** for oversampling around non linearities, and **RTSan** in a Linux clang 20 CI job. **Cloud Seed Core** is usable for a reverb, but only vendored and patched (it allocates on parameter change, uses `std::rand()` and weighs about 64 MB per instance). **Airwindows** is taken through the `airwin-registry` target of the airwin2rack repository (MIT, no VST2 SDK and no JUCE) rather than through the original repository or through airwindows-juce. **foleys_gui_magic** is BSD 3-clause, maintained and adapted to JUCE 9; it remains an option for the UI, not a default choice.

## Summary table

| Library | Verified licence (file) | Header only | Without JUCE | Last commit | Verdict |
| --- | --- | --- | --- | --- | --- |
| [farbot](https://github.com/hogliux/farbot) | MIT (`LICENSE`) | Yes | Yes | 2026-09-08 | Take (`RealtimeObject`, `fifo` in single mode) |
| [readerwriterqueue](https://github.com/cameron314/readerwriterqueue) | BSD 2-clause "Simplified BSD" (`LICENSE.md`), plus zlib for Jeff Preshing's semaphore in `atomicops.h` | Yes (2 files) | Yes | 2026-09-07 | Take, pinned on a commit later than v1.0.7 |
| [CloudSeedCore](https://github.com/GhostNoteAudio/CloudSeedCore) | MIT (`LICENSE`) | No (3 `.cpp`) | Yes | 2024-09-22 | Take vendored and patched |
| [Signalsmith DSP](https://github.com/Signalsmith-Audio/dsp) | MIT (`LICENSE.txt`) | Yes | Yes | 2026-10-13 | Take |
| [Airwindows](https://github.com/airwindows/airwindows) | MIT (`LICENSE`) | No | Yes, but depends on the VST2 SDK | 2026-10-31 | Take via airwin2rack |
| [airwin2rack](https://github.com/baconpaul/airwin2rack) (Airwindows Consolidated) | MIT (`LICENSE.md`), de facto restriction on `src-juce` and `src-rack` | No (static library) | Yes for `src/` | 2026-10-31 | Take `airwin-registry` |
| [airwindows-juce](https://github.com/hollance/airwindows-juce) | No LICENSE file; the README refers to the Airwindows MIT licence | No | No | 2024-01-26 | Reading only |
| HIIR (Laurent de Soras) | WTFPL v2 (`src/external/hiir/license.txt` in the sfizz mirror, and at the top of each header) | Almost (one `.cpp`: the designer) | Yes | sfizz copy: 2025-03-17 | Take |
| [foleys_gui_magic](https://github.com/ffAudio/foleys_gui_magic) | BSD 3-clause (`LICENSE.md`) | No (JUCE module) | No | 2026-08-15 | UI option, not default |
| [RealtimeSanitizer](https://clang.llvm.org/docs/RealtimeSanitizer.html) | LLVM (Apache 2.0 with LLVM exception) | Not applicable | Not applicable | Clang 20 | Take in CI |

## farbot

MIT licence, `farbot/LICENSE`, copyright Fabian Renn 2019. Header only: `include/farbot/RealtimeObject.hpp`, `fifo.hpp`, `AsyncCaller.hpp`, `RealtimeTraits.hpp`, with the implementations in `include/farbot/detail/*.tcc`. No dependency on JUCE, only the standard library: usable in `dsp/`.

Main API:

```cpp
#include <farbot/RealtimeObject.hpp>
using Coeffs = std::array<float, 5>;
using Shared = farbot::RealtimeObject<Coeffs, farbot::RealtimeObjectOptions::nonRealtimeMutatable>;
Shared coeffs;

void process (std::span<float> io) noexcept            // audio thread
{
    Shared::ScopedAccess<farbot::ThreadType::realtime> c (coeffs);
    applyBiquad (*c, io);
}

void setCoeffs (const Coeffs& n)                       // message thread
{
    Shared::ScopedAccess<farbot::ThreadType::nonRealtime> c (coeffs);
    *c = n;
}
```

Quality: googletest tests in `test/test.cpp`, disabled by default (`FARBOT_ENABLE_TESTS`, added in June 2026). Low but living maintenance: two commits in 2026 after a pause since 2023.

Realtime pitfalls verified in the code:

1. On the non realtime side, `nonRealtimeMutatable` takes a `std::mutex` and does `new T` (`detail/RealtimeObject.tcc`, lines 59 to 82), then spins until the audio thread hands back the pointer. This is correct as long as only the message thread writes, but it must never be called from the audio thread.
2. The `concurrency::multiple` mode of `fifo` registers each thread in a fixed array of `MAX_THREADS = 64` entries that are never freed (`detail/fifo.tcc`, lines 18 to 46). Beyond that, an `assert` and then wrong behaviour. A host that runs audio on a thread pool can get close to it. Prefer `concurrency::single` wherever possible.
3. `AsyncCaller::callAsync` takes a `std::function<void()>&&`. Building a `std::function` from a lambda that captures more than the small internal buffer allocates, and RTSan will see it. Capture at most one pointer, or use a FIFO of typed commands.

Verdict: take `RealtimeObject` and `fifo` (single/single), keep `AsyncCaller` for lambdas without heavy captures.

## readerwriterqueue

Licence verified in `readerwriterqueue/LICENSE.md`: "Simplified BSD License" (BSD 2-clause), copyright Cameron Desrochers 2013 to 2021. The same file states that Jeff Preshing's semaphore implementation, used by the blocking queues and embedded in `atomicops.h`, is under the zlib licence, and that `benchmarks/ext` has its own licences. Both licences are permissive; the BSD notice must appear in the binary's documentation.

Header only: `readerwriterqueue.h` and `atomicops.h` (plus `readerwritercircularbuffer.h` as an option). Without JUCE, C++11.

```cpp
#include "readerwriterqueue.h"
moodycamel::ReaderWriterQueue<MeterFrame> q (256);   // allocates here, off the audio thread

// audio thread
q.try_enqueue (frame);                               // never allocates, returns false if full

// UI timer
MeterFrame f;
while (q.try_dequeue (f)) draw (f);
```

Quality: unit tests and a stability test in `tests/unittests` and `tests/stabtest`, benchmarks. Active maintenance in 2026, including a memory barrier ordering fix on AArch64 in `inner_enqueue()` (commit `9ffc91d`, September 2026) and a PPC64 cache line fix. The last tag, `v1.0.7`, is older: pin commit `6867b5645235` via CPM.

Realtime pitfalls: `enqueue` and `emplace` allocate when the queue is full (`malloc` in `make_block`, line 737). On the audio thread, use only `try_enqueue` and `try_emplace`. The `BlockingReaderWriterQueue` and `wait_dequeue` variants use a semaphore and are forbidden on the audio side. `try_dequeue` on the audio side destroys the element: the stored type must have a trivial destructor or one that does not free memory.

Verdict: take for audio to UI streams (meters, analyser). For use inside JUCE, `AbstractFifo` remains an alternative with no extra dependency.

## Cloud Seed Core

MIT licence, `CloudSeedCore/LICENSE`, copyright Ghost Note Audio 2024; the file headers say "Ghost Note Engineering Ltd". The `Readme.md` adds non binding requests: credit Ghost Note Audio, and do not use the name "Cloud Seed" in a way that suggests the product comes from them.

Structure: `DSP/` contains eleven headers and two `.cpp` files (`Biquad.cpp`, `RandomBuffer.cpp`), and `Parameters.cpp` at the root defines `ParameterLabel`. So it is not header only. `DSP/ReverbController.h` includes `../Parameters.h`: the directory tree must be kept. No dependency on JUCE. Two preprocessor definitions are mandatory: `BUFFER_SIZE` (sub-block size, 1024 in the example project) and `MAX_STR_SIZE`. `PluginProcessor.cpp` is a console demo program, not a plugin.

Integration:

```cpp
// prepareToPlay (off the audio thread): object of about 64 MB, never on the stack
reverb = std::make_unique<Cloudseed::ReverbController> ((int) sampleRate);
for (int i = 0; i < Cloudseed::Parameter::COUNT; ++i)
    reverb->SetParameter (i, ProgramDarkPlate[i]);   // normalised values 0..1
reverb->ClearBuffers();

// processBlock
reverb->Process (inL, inR, outL, outR, numSamples);  // splits into sub-blocks of BUFFER_SIZE
```

Problems cited by Drum Foundry, verified in the upstream code:

1. **Allocation on parameter change: confirmed.** `ReverbChannel::UpdateLines()` (`DSP/ReverbChannel.h`, line 393) calls `RandomBuffer::Generate`, which builds three `std::vector<float>` with `push_back` (`DSP/RandomBuffer.cpp`). `UpdateLines()` is called for `LateLineSize`, `LateLineDecay`, `LateLineModAmount`, `LateLineModRate`, `LateDiffuseModAmount`, `LateDiffuseModRate`, `EqCrossSeed` and `SeedDelay`. `AllpassDiffuser::SetSeed` and `MultitapDelay::SetSeed` also reassign a `std::vector` (`UpdateSeeds`). Turning the Decay knob during playback therefore allocates on the audio thread.
2. **Non deterministic modulation: confirmed.** The constructors of `ModulatedDelay` (line 61) and `ModulatedAllpass` (line 63) draw the initial phase with `std::rand()`. The result depends on the global `rand` state, shared with the host and other plugins: two renders of the same patch are not identical, which breaks golden tests.
3. **Huge buffers: confirmed.** `ModulatedDelay` and `MultitapDelay` each have a member array of `192000 * 2` floats, `ModulatedAllpass` one of 19200 floats. With 12 lines of 12 allpass stages per channel, the calculation from these constants gives about 32 MB per channel, so about 64 MB per `ReverbController`. Command to check it (not run here): compile `printf("%zu", sizeof(Cloudseed::ReverbController))` with `-DBUFFER_SIZE=1024 -DMAX_STR_SIZE=32`.

Other pitfalls: no internal parameter smoothing (`SetDelay` takes an integer, size jumps are audible); `std::sinf` and `M_PI` used in `ModulatedDelay.h` and `ModulatedAllpass.h`, not portable (Drum Foundry replaced `std::sinf` with `std::sin`, and MSVC requires `_USE_MATH_DEFINES`); several arrays of `BUFFER_SIZE` floats on the stack at each level of `Process`.

The Drum Foundry patch (`/home/claude/study/drum-foundary/libs/CloudSeedCore/`, see `PATCHES.md`) makes the buffer sizes configurable (`CLOUDSEED_DELAY_BUFFER_SIZE`, `CLOUDSEED_ALLPASS_BUFFER_SIZE`, `CLOUDSEED_TAP_BUFFER_SIZE`), replaces `std::rand()` with a seedable `thread_local` LCG (`Utils::NextPhaseRandom`), and caches the seeds of `UpdateLines()`. **This patch does not remove all allocations**: changing `SeedDelay` or `EqCrossSeed` still regenerates the vectors, and the diffusers' `SetSeed` is untouched. For us, the complete fix is to replace `RandomBuffer::Generate` with a version that fills a fixed size `std::array` (`TotalLineCount * 3`, `MaxStageCount * 3`).

Quality: no tests, six commits in total, inactive since September 2024. The code is short (2336 lines in `DSP/`) and readable.

Verdict: take, vendored in `third_party/` with a `PATCHES.md`, starting from the Drum Foundry patch and completing the removal of allocations. Seed parameters are not automatable.

## Signalsmith DSP

MIT licence, `dsp/LICENSE.txt`, copyright Geraint Luff / Signalsmith Audio Ltd 2021. The README states: "If you'd prefer something else, get in touch." The GitHub repository is a mirror; the reference source is `https://signalsmith-audio.co.uk/code/dsp.git`.

Header only, C++11, without JUCE or any other dependency: `delay.h`, `filters.h`, `envelopes.h`, `rates.h`, `fft.h`, `spectral.h`, `curves.h`, `mix.h`, `windows.h`, `perf.h`, with redirects in `include/signalsmith-dsp/`. Version 1.7.0 (`common.h`), checkable with `SIGNALSMITH_DSP_VERSION_CHECK(1, 7, 0)`.

```cpp
#include "signalsmith-dsp/filters.h"
#include "signalsmith-dsp/delay.h"

signalsmith::filters::BiquadStatic<float> lp;
signalsmith::delay::Delay<float, signalsmith::delay::InterpolatorCubic> dly;

void prepare (double sr, int) { dly.resize ((int) (2.0 * sr)); }            // allocates
void setCutoff (double hz, double sr) { lp.lowpass (hz / sr); }             // normalised frequency
float tick (float x, float delaySamples) { return lp (dly.write (x).read (delaySamples)); }
```

Quality: the tests live in a separate repository (`dsp-doc`) that measures frequency responses and aliasing; they are not in the clone. Regular maintenance (fixes in January, August and October 2026).

Realtime pitfalls: `resize()` of the delays and of `Oversampler2xFIR` allocates (`std::vector`), so call it only in `prepare`. `InterpolatorKaiserSincN` builds its coefficients with `std::vector` and an FFT at construction. `CubicLfo()` without an argument seeds itself with `std::random_device` (`envelopes.h`, line 53): use the `CubicLfo(long seed)` constructor to respect the determinism rule in `dsp.md`. `BiquadStatic` is "not guaranteed stable if modulated at audio rate" according to its own comment.

Verdict: take as the default DSP library in `dsp/`.

## Airwindows and airwindows-juce

MIT licence, `airwindows/LICENSE`, copyright Chris Johnson 2018. The same text is in `plugins/LinuxVST/LICENSE`, and each source file says "Airwindows uses the MIT license".

Structure: `plugins/` contains six ports of the same code (`LinuxVST`, `MacAU`, `MacSignedAU`, `MacSignedVST`, `MacVST`, `WinVST`), 532 algorithms in `plugins/LinuxVST/src/`, about 43,000 files in total (sparse clone recommended). Each algorithm has three files, for example `plugins/LinuxVST/src/Density/`: `Density.h` (class derived from `AudioEffectX`, state in `double` members, parameters `A`, `B`, `C`, `D` normalised 0..1), `Density.cpp` (VST2 plumbing) and `DensityProc.cpp` (`processReplacing` and `processDoubleReplacing`, the per sample loop). The DSP can be extracted by copying the state members and the loop from `*Proc.cpp`, but porting each algorithm by hand is tedious.

Pitfalls: dependency on the VST2 SDK (`audioeffectx.h`) in the original repository; noise seed `fpdL`/`fpdR` drawn with `rand()` in the constructor (`Density.cpp`, line 24), which makes the output dither non deterministic; floating point dither added at the end of each loop; no parameter smoothing; sample rate handled through an `overallscale` relative to 44.1 kHz; fixed size reverb buffers (for example `Galactic.h`) and internal downsampling limited to a factor of 4. No tests.

[airwin2rack](https://github.com/baconpaul/airwin2rack) (Paul Walker, "Airwindows Consolidated") solves the extraction problem: MIT licence (`LICENSE.md`, copyright 2019 to 2026). The CMake target `airwin-registry` compiles all algorithms into a static library, without the VST2 SDK: `src/airwin_consolidated_base.h` replaces `AudioEffectX` with a minimal base, and `src/AirwinRegistry.h` provides a by-name registry that creates `std::unique_ptr<AirwinConsolidatedBase>`. The README states that `src`, `libs/airwindows` and `res/awdoc` can be used in closed source code, but that the `src-juce` and `src-rack` targets combined with JUCE, the VST3 SDK or the VCV Rack SDK can bring in GPL3. Updated every week from upstream (last commit 2026-10-31). Caution: the registry uses `std::string`, `std::map` and `std::function`; it is only used at construction, never in `processBlock`.

[airwindows-juce](https://github.com/hollance/airwindows-juce) (Matthijs Hollemans) contains only four ports (`BitShiftGain`, `ClipOnly`, `ClipOnly2`, `ClipSoftly`) as Projucer projects, with no LICENSE file (the README refers to the Airwindows MIT licence), last commit 2024-01-26. It is annotated study material, not a library.

Verdict: for a given Airwindows algorithm, start from the matching file in airwin2rack (`src/autogen_airwin/`), wrap it in a `dsp/` class with smoothing and a deterministic seed, and credit Airwindows and airwin2rack.

## HIIR

No official GitHub repository from Laurent de Soras was found; the page `http://ldesoras.free.fr/prod.html` could not be read (access denied during the study). The licence was verified on the copy vendored by [sfizz](https://github.com/sfztools/sfizz): `src/external/hiir/license.txt` is the text of the WTFPL version 2 (Sam Hocevar, December 2004), and each header carries Laurent de Soras's notice, for example `src/external/hiir/hiir/Downsampler2xFpu.h`: "You can redistribute it and/or modify it under the terms of the Do What The Fuck You Want To Public License, Version 2". The WTFPL is permissive but not OSI approved; some legal departments reject it. Note this in the ADR if the plugin is commercial.

Structure: `.h`/`.hpp` headers templated on the number of coefficients, in FPU, SSE and NEON variants (`Upsampler2xFpu<NC>`, `Downsampler2xFpu<NC>`), plus `PolyphaseIir2Designer.cpp`, the only `.cpp`, which computes the coefficients. Without JUCE. The sfizz copy is an old version (no AVX or double precision variants); for the latest version, download the archive from the author's site.

```cpp
#include "hiir/PolyphaseIir2Designer.h"
#include "hiir/Upsampler2xFpu.h"
#include "hiir/Downsampler2xFpu.h"
constexpr int NC = 8;
hiir::Upsampler2xFpu<NC> up;  hiir::Downsampler2xFpu<NC> down;

void prepare()
{
    double c[NC];
    hiir::PolyphaseIir2Designer::compute_coefs_spec_order_tbw (c, NC, 0.04);  // transition band
    up.set_coefs (c);  down.set_coefs (c);
}
// processBlock: up.process_block (os, in, n); saturate os[0..2n); down.process_block (out, os, n);
```

Pitfalls: IIR filters, so non linear phase; the group delay is not an integer and is computed with `compute_group_delay` to report it to the host (`dsp.md`). No allocation, no global state.

Verdict: take for cascaded 2x oversampling around non linearities.

## foleys_gui_magic

BSD 3-clause licence, `foleys_gui_magic/LICENSE.md`, copyright Foleys Finest Audio, Daniel Walz, 2019 to 2023. `VERSION.md` states that in 1.4.0 (July 2023) the commercial licence and dual licensing were removed for all projects. The module declaration (`modules/foleys_gui_magic/foleys_gui_magic.h`) says "BSD V2 3-clause", version 1.5.0.

It is a JUCE module (depends on `juce_gui_basics`, `juce_audio_processors`, `juce_dsp`, `juce_cryptography`, etc.): it lives in `ui/`, never in `dsp/`. Catch2 tests in `Tests/`, pluginval on the examples in CI.

Maintenance and JUCE compatibility: last commit 2026-08-15, preceded by "Adapt to changes in juce 9" on 2026-08-14. The code uses `juce::FontOptions`, so JUCE 8 at minimum. `CMakeIncludes/Juce.cmake` fetches JUCE without `GIT_TAG` (the `7.0.9` line is commented out), so the CI compiles against the head of JUCE's default branch; for us, pin JUCE and commit `d53d998e2bc3`. The README announces the removal of the `develop` branch.

Verdict: a valid option if we want a UI described in XML with a live editor and ready made analysers, but it replaces the APVTS with its own state (`MagicProcessorState`), which touches `juce.md`. A decision to make through an ADR, not by default.

## RealtimeSanitizer (RTSan)

Source: [Clang documentation](https://clang.llvm.org/docs/RealtimeSanitizer.html), [realtime-sanitizer/rtsan repository](https://github.com/realtime-sanitizer/rtsan), [Function Effect Analysis](https://clang.llvm.org/docs/FunctionEffectAnalysis.html).

Version: RTSan is part of LLVM from version 20 onwards ("starting from v20.0.0", README of realtime-sanitizer/rtsan; Clang 20.1.0 released in March 2025). AppleClang does not ship it: as of November 2025, Apple had announced nothing ([Apple forum](https://developer.apple.com/forums/thread/807360)). Windows is not supported. Usable platforms: Linux and macOS with an LLVM clang 20 or later (x86_64 and arm64 appear in the examples). For GCC or AppleClang, there is a `rtsan-standalone` library that its own authors describe as a hack that may stop working; a `realtimesanitizer/rtsan-clang` Docker image also exists.

Attributes: `[[clang::nonblocking]]` marks a realtime function; at run time RTSan reports any intercepted call (`malloc`, `free`, `pthread_mutex_lock`, etc.) made from it or its callees. `[[clang::blocking]]` marks one of our functions as forbidden in that context. The same attribute drives Clang's static analysis (`-Wfunction-effects`, and `-Wperf-constraint-implies-noexcept`, which requires `noexcept`); there is also `[[clang::nonallocating]]`. The static analysis reports unannotated virtual calls and calls through function pointers, and treats `std::function` as incompatible: enable it on `dsp/` only, it would be too noisy on JUCE.

Usage: compile and link with `-fsanitize=realtime`. On the first violation, the program exits with an error (`halt_on_error=true` by default). Options through `RTSAN_OPTIONS` (`halt_on_error`, `print_stats_on_exit`, `suppressions=<file>`, `verify_interceptors`, `symbolize`). Suppression file: lines `function-name-matches:<pattern>` or `call-stack-contains:<pattern>`. Local disabling: `__rtsan::ScopedDisabler` (`#include <sanitizer/rtsan_interface.h>`), with no effect outside an RTSan build. Compile time detection: `__has_feature(realtime_sanitizer)`.

Feedback from the JUCE community:

1. [JUCE forum, October 2024](https://forum.juce.com/t/memory-allocation-deep-inside-vst3plugininstance-processblock/63717): RTSan found a `push_back` on `std::vector<float*>` in `HostBufferMapper::associateBufferTo` (`juce_VST3Common.h`), called by `VST3PluginInstance::processBlock`, so on the plugin hosting side. The JUCE team fixed it on `develop` ("VST3: Avoid potential memory allocations during buffer remapping"). This matters if our tests host the plugin through JUCE.
2. [JUCE forum, December 2024](https://forum.juce.com/t/using-realtimesanitizer-inside-daws/64557): to test inside a DAW on macOS, launch the host with `DYLD_INSERT_LIBRARIES=.../libclang_rt.rtsan_osx_dynamic.dylib`. Without preloading, the interceptors do not work: either RTSan sees nothing, or (recent versions) the host stops on SIGABRT; `verify_interceptors=false` works around the scanner problem, at the cost of the check.
3. The JUCE 9.0.0 to 9.0.4 release notes mention neither RTSan nor `nonblocking`: JUCE does not annotate its code, and it is up to us to mark our functions.

Consequence for us: run RTSan in **our own test executables** (Catch2, `Tools`), compiled and linked with `-fsanitize=realtime`, which call `prepareToPlay` then `processBlock` directly. Do not rely on pluginval, which is not linked against the RTSan runtime.

CMake flags:

```cmake
option(ENABLE_RTSAN "Build with RealtimeSanitizer (clang >= 20, Linux or macOS)" OFF)

if(ENABLE_RTSAN)
  if(NOT CMAKE_CXX_COMPILER_ID STREQUAL "Clang" OR CMAKE_CXX_COMPILER_VERSION VERSION_LESS 20)
    message(FATAL_ERROR "RTSan requires LLVM clang >= 20 (AppleClang not supported)")
  endif()
  add_compile_options(-fsanitize=realtime -fno-omit-frame-pointer)
  add_link_options(-fsanitize=realtime)
  target_compile_options(dsp PRIVATE -Wfunction-effects -Wperf-constraint-implies-noexcept)
endif()
```

Portable attribute (build configuration macro, allowed by `cpp.md`):

```cpp
#if defined(__clang__) && __clang_major__ >= 20
  #define RT_NONBLOCKING [[clang::nonblocking]]
#else
  #define RT_NONBLOCKING
#endif

void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) noexcept RT_NONBLOCKING override;
```

The attribute goes after `noexcept`, in the position of function type attributes.

GitHub Actions job:

```yaml
rtsan:
  runs-on: ubuntu-24.04
  steps:
    - uses: actions/checkout@v4
      with: { submodules: recursive }
    - name: Install clang 20
      run: |
        wget -qO llvm.sh https://apt.llvm.org/llvm.sh
        sudo bash llvm.sh 20
        sudo apt-get install -y ninja-build libasound2-dev libx11-dev libxrandr-dev \
          libxinerama-dev libxcursor-dev libfreetype6-dev libfontconfig1-dev
    - name: Configure
      run: >
        cmake -B build-rtsan -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo
        -DCMAKE_C_COMPILER=clang-20 -DCMAKE_CXX_COMPILER=clang++-20
        -DENABLE_RTSAN=ON
    - name: Build
      run: cmake --build build-rtsan --target Tests
    - name: Test under RTSan
      env:
        RTSAN_OPTIONS: halt_on_error=true:print_stats_on_exit=true:suppressions=${{ github.workspace }}/tests/rtsan.supp
      run: ctest --test-dir build-rtsan --output-on-failure
```

The X11 and ALSA packages are only needed if the test target links JUCE's GUI modules. The `tests/rtsan.supp` file starts empty; every line added is justified in a comment and a task.

Verdict: take. RTSan replaces the instrumented allocator planned in `docs/04_TESTS.md`, provided the tests really exercise `processBlock`, including parameter changes during playback, which is exactly the Cloud Seed Core case.
