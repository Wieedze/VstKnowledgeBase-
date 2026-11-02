# Pamplejuce: study and adaptation guide

Study done on 2026-11-02 from the code, not from the online documentation.

| Repository | Commit studied | Date |
| --- | --- | --- |
| [sudara/pamplejuce](https://github.com/sudara/pamplejuce/tree/ca3cae0b288a644d11bb64651f81c2e0a7e7b942) | `ca3cae0` | 2026-08-16 |
| [sudara/cmake-includes](https://github.com/sudara/cmake-includes/tree/8de22da65803144fcbb1185803f2e41a4b094c8b) (HEAD) | `8de22da` | 2026-10-26 |
| cmake-includes **pinned by Pamplejuce** (`cmake` submodule) | `5d75b1f` | between 2026-08-16 and 2026-10-10 |
| JUCE pinned by Pamplejuce (`JUCE` submodule, `develop` branch) | `620b879`, `project(JUCE VERSION 9.0.1)` | |

In this document, `PJ/` means the Pamplejuce repository and `CI/` the cmake-includes repository (which becomes the project's `cmake/` folder).

## Verdict

**We start from Pamplejuce, without hesitation, but not as is.** It provides for free the CMake project, Catch2, the `Benchmarks` target, three-OS CI with pluginval 10, signing, installers, the propagated `VERSION` file, and even the RealtimeSanitizer option (`WITH_REALTIME_SANITIZER`) already written in `cmake/Sanitizers.cmake`. Licence: MIT (`PJ/LICENSE`, Copyright 2022 Sudara Williams).

It needs adapting on six points, all detailed below:

1. The source glob (`PJ/CMakeLists.txt:115`) takes all of `source/`: it must be restricted to `source/plugin` and `source/ui`, and a separate `dsp` library without JUCE must be created.
2. The test glob (`CI/Tests.cmake:59`) takes all of `tests/` into a single target linked to JUCE: we need two targets, `DspTests` (without JUCE) and `PluginTests`.
3. `include(Sanitizers)` is not called in `PJ/CMakeLists.txt`: the RTSan option exists but is not wired in.
4. CI fails on the very first push without certificates (the README says so itself, `PJ/README.md:48-49`): the signing steps must be made conditional or commented out.
5. Nothing for `tools check`, `tools compare`, clang-format, the "no JUCE in dsp/" grep, or the benchmark budget: these are jobs to add.
6. The `cmake` submodule is behind cmake-includes HEAD, with a fast math setting that has since been fixed (see pitfall 4).

## 1. How the targets are created

The root `CMakeLists.txt` is 175 lines long and delegates almost everything to the `pamplejuce_*` functions in `cmake/`.

| Target | Created by | Contents | Link |
| --- | --- | --- | --- |
| `Pamplejuce` (+ `_VST3`, `_AU`, `_Standalone`, `_All`…) | `juce_add_plugin`, `PJ/CMakeLists.txt:70-96` | The plugin binaries | `PRIVATE SharedCode` (`:163`) |
| `Pamplejuce_CLAP` | `clap_juce_extensions_plugin`, `PJ/CMakeLists.txt:102-104` | The CLAP binary | same |
| `SharedCode` | `add_library(SharedCode INTERFACE)`, `PJ/CMakeLists.txt:100` | All sources in `source/` (`:115-116`), JUCE modules, `Assets`, `melatonin_inspector` (`:149-160`) | Linked to the plugin **and** to the tests |
| `Assets` | `pamplejuce_add_assets()`, `CI/Assets.cmake:4-24` | `juce_add_binary_data` of all of `assets/` | `INTERFACE` of `SharedCode` |
| `Tests` | `pamplejuce_add_tests()`, `CI/Tests.cmake:33-94` | Glob `tests/*.cpp`, `tests/*.h`; copies the plugin's definitions (`:72`); `JUCE_MODAL_LOOPS_PERMITTED=1`, `RUN_PAMPLEJUCE_TESTS=1`, `CI=1` | `SharedCode Catch2::Catch2` (without `WithMain`) |
| `Benchmarks` | `pamplejuce_add_benchmarks()`, `CI/Benchmarks.cmake:3-54` | **Only** `benchmarks/Catch2Main.cpp` and the `.h` files (`:28`) | same |

Why `SharedCode` is an `INTERFACE` library: each target that links it recompiles the sources with its own definitions (`JucePlugin_*` copied from the plugin target), which avoids ODR violations between the plugin and the test executable. Consequence: the code in `source/` is compiled twice (plugin, tests), three times with the benchmarks.

### Where each setting lives

| Setting | File:line | Template value |
| --- | --- | --- |
| `PROJECT_NAME` (internal name, no spaces) | `PJ/CMakeLists.txt:20` | `Pamplejuce` |
| `PRODUCT_NAME` (name shown in the DAW) | `PJ/CMakeLists.txt:28` | `Pamplejuce Demo` |
| `COMPANY_NAME`, `BUNDLE_ID` | `PJ/CMakeLists.txt:31`, `:34` | |
| `FORMATS` | `PJ/CMakeLists.txt:38` | `Standalone AU VST3 AUv3` (JUCE ignores AU/AUv3 outside Apple) |
| `PLUGIN_MANUFACTURER_CODE`, `PLUGIN_CODE` | `PJ/CMakeLists.txt:84`, `:89` | `Pamp`, `P001` |
| `COPY_PLUGIN_AFTER_BUILD` | `PJ/CMakeLists.txt:79` | `TRUE` (on Windows, admin rights required for `Common Files\VST3`) |
| CLAP: `CLAP_ID`, `CLAP_FEATURES` | `PJ/CMakeLists.txt:102-104` | `${BUNDLE_ID}`, `audio-effect` |
| `JUCE_DISPLAY_SPLASH_SCREEN` | `PJ/CMakeLists.txt:134` (commented out) | |
| Hard-coded `PRODUCT_NAME_WITHOUT_VERSION` | `PJ/CMakeLists.txt:141` | `"Pamplejuce"`, to change as well |
| Version | file `PJ/VERSION` (`0.0.1`, no trailing newline), read by `CI/PamplejuceVersion.cmake:11,55`; exposed as `CURRENT_VERSION`, then `project(... VERSION ...)` (`PJ/CMakeLists.txt:46`) and definition `VERSION="…"` (`:138`) | Option `PAMPLEJUCE_AUTO_BUMP_PATCH_LEVEL` (`CI/PamplejuceVersion.cmake:8`): patch = number of commits since the last change to `VERSION` |
| CPM | `include(CPM)` (`PJ/CMakeLists.txt:8`), `CI/CPM.cmake` downloads CPM 0.42.0 with a SHA256 hash; cache through `CPM_SOURCE_CACHE` | |
| Catch2 | `CPMAddPackage("gh:catchorg/Catch2@3.8.1")`, `CI/Tests.cmake:25` | |
| C++23, fast math | `pamplejuce_shared_code_defaults()` (`PJ/CMakeLists.txt:107`, `CI/SharedCodeDefaults.cmake`) | |
| ASan, TSan, RTSan sanitizers | `CI/Sanitizers.cmake`: options `WITH_ADDRESS_SANITIZER`, `WITH_THREAD_SANITIZER`, `WITH_REALTIME_SANITIZER` (`:3-5`) | **Not included** by `PJ/CMakeLists.txt` |
| macOS: minimum target 10.14, universal arm64 + x86_64 in Release CI | `CI/PamplejuceMacOS.cmake:10,15-18` | |
| Windows: static runtime | `CI/JUCEDefaults.cmake:11-13` | |
| Intel IPP | `include(PamplejuceIPP)`, `PJ/CMakeLists.txt:166` | Active if found |
| `.env` for CI (name, version, bundle) | `include(GitHubENV)`, `PJ/CMakeLists.txt:175`, `CI/GitHubENV.cmake` | Written only if `CI` is defined |

### Pitfalls found in the code

1. **The `source/` glob is recursive** (`PJ/CMakeLists.txt:115`). If `source/dsp/` is inside it and we also create a `dsp` library, the DSP code is compiled twice and linked twice: duplicate symbols.
2. **The test glob is recursive** (`CI/Tests.cmake:59`). `tests/dsp/*.cpp` would end up in the target linked to JUCE, which defeats the "DSP without JUCE" check.
3. **The `Benchmarks` target only compiles `Catch2Main.cpp`** (`CI/Benchmarks.cmake:28`), which does `#include "Benchmarks.cpp"` (`PJ/benchmarks/Catch2Main.cpp:23`). A new benchmark `.cpp` file is ignored until it is included there.
4. **Fast math.** The pinned submodule (`5d75b1f`) passes `-Ofast` in Release; cmake-includes HEAD replaces it with `-ffast-math -fno-finite-math-only` (`CI/SharedCodeDefaults.cmake:24-25`, CHANGELOG of 2026-10-26: "JUCE's -O3 was undoing -Ofast"). `-fno-finite-math-only` is what keeps `std::isnan` and `std::isinf` reliable: our "no NaN/Inf" tests depend on it. Under MSVC: `/fp:fast` (`:14`).
5. **Updating `cmake/` breaks IPP on Windows**: HEAD expects `intelipp.static.win-x64/2026.1.0.761` (`CI/PamplejuceIPP.cmake:3`) while the workflow installs `2026.0.0.712` (`PJ/.github/workflows/build_and_test.yml:76`), and the test `PJ/tests/PluginBasics.cpp:38` checks the exact version string `2026.0.0`. If we keep IPP, all three move together.
6. **`pamplejuce_shared_code_defaults(TARGET x)` sets its options as `INTERFACE`** (`CI/SharedCodeDefaults.cmake:14-38`). Applied to a `STATIC` library such as `dsp`, it does not compile `dsp` itself with those options: it only pushes them to consumers. For `dsp`, set the options by hand.
7. **`PluginProcessor.h` includes `ipps.h` under `#if (MSVC)`** (`PJ/source/PluginProcessor.h:5-7`). `MSVC` is not a preprocessor macro (that is `_MSC_VER`): the line is dead. Delete it.
8. **The build folder is called `Builds`**, and `PJ/packaging/installer.iss:38-40` hard-codes it (`..\Builds\…_artefacts\Release\…`). Our docs use `build`. One of the two must be chosen everywhere.
9. **`melatonin_inspector` ships in Release**: it is linked to `SharedCode` unconditionally (`PJ/CMakeLists.txt:152`) and the editor shows an "Inspect the UI" button (`PJ/source/PluginEditor.cpp:8-19`, `PJ/source/PluginEditor.h:5, 22-23`).
10. **cmake-includes has no LICENSE file** (whole repository checked; only `CI/CPM.cmake:1` carries `SPDX-License-Identifier: MIT`, for CPM's code). Pamplejuce is MIT, but the submodule that holds most of the CMake declares no licence. Low practical risk (same author, designed to be used this way), but note it in `docs/DEPENDENCIES.md` and, if the plugin is commercial, clarify it through an issue on the repository.

## 2. Adapting the template to `dsp/ plugin/ ui/ tools/`

Target tree: `docs/03_ARCHITECTURE.md`. The steps are in the order to do them, each one verifiable by a build.

### Step 0: create the repository and pin the dependencies

1. "Use this template" on GitHub (a copy, not a fork), then `git submodule update --init --recursive`.
2. Pin JUCE to a tag: `cd JUCE && git fetch --tags && git checkout <tag>`, then remove `branch = develop` from `.gitmodules` (`PJ/.gitmodules:4`). The commit pinned by the template is a `develop` at 9.0.1.
3. Update `cmake/` to cmake-includes HEAD (fast math fixed, pitfall 4) and record the commit in `docs/DEPENDENCIES.md`. Same for `modules/melatonin_inspector` and `modules/clap-juce-extensions` if they are kept.
4. Delete `PJ/.github/workflows/nightly.yml` (reserved for the template repository, `:13`) and `linux-ci-image.yml` + `.github/docker/` (pushes to `ghcr.io/sudara/…`, `linux-ci-image.yml:21-24`).

### Step 1: plugin identity

Edit `PJ/CMakeLists.txt:20, 28, 31, 34, 84, 89, 141` and the name test `PJ/tests/PluginBasics.cpp:18`. The 4-character codes are final (`docs/02_TOOLCHAIN.md`). For an instrument, add `IS_SYNTH TRUE` and `NEEDS_MIDI_INPUT TRUE` to `juce_add_plugin`, and change `CLAP_FEATURES`.

### Step 2: formats

Our decision is **VST3 only** (ADR 0003, `docs/02_TOOLCHAIN.md`). Replace `PJ/CMakeLists.txt:38` with:

```cmake
set(FORMATS VST3)
```

Also remove, in the workflow and the packaging, every step that signs, copies or packages AU, AUv3 and Standalone (identified in the CI table below). CLAP is removed as well: delete `PJ/CMakeLists.txt:60-61, 102-104` and the CLAP lines of the workflow (`build_and_test.yml:116, 143, 158, 163, 171`), of `packaging/installer.iss:16, 39` and of `packaging/distribution.xml.template` (the `clap` choice). If AUv3 is removed, nothing else to do: `AUV3_PATH` (`build_and_test.yml:115`) is used nowhere.

### Step 3: the `dsp` library without JUCE

Place after `include(PamplejuceFunctions)` (`PJ/CMakeLists.txt:52`):

```cmake
file(GLOB_RECURSE DspFiles CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/source/dsp/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/source/dsp/*.h")
add_library(dsp STATIC ${DspFiles})
target_include_directories(dsp PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/source")   # #include "dsp/Foo.h"
target_compile_features(dsp PUBLIC cxx_std_23)
set_target_properties(dsp PROPERTIES POSITION_INDEPENDENT_CODE ON)            # linked into a VST3 .so on Linux
set_target_properties(dsp PROPERTIES COMPILE_WARNING_AS_ERROR ON)             # CMake >= 3.24, cpp.md rule
if (MSVC)
    target_compile_options(dsp PRIVATE /W4)
else ()
    target_compile_options(dsp PRIVATE -Wall -Wextra)
endif ()
```

What guarantees the absence of JUCE: `dsp` links no JUCE target, so a `#include <juce_…>` fails when compiling `dsp` and `DspTests`. The CI grep from `docs/04_TESTS.md` remains useful as a second safety net, with the right path (`source/dsp/`).

Fast math for `dsp`: to be decided by ADR. Starting recommendation: **no fast math in `dsp`** until the golden references are stable, then measure with `tools bench`. Reason: `-ffast-math` changes results depending on the compiler and architecture, which makes `tools compare` fragile across platforms. Since `dsp` is a static library compiled once, the tests and the plugin run exactly the same object code, whatever the choice.

### Step 4: `SharedCode` = `plugin/` + `ui/`, linked to `dsp`

Replace `PJ/CMakeLists.txt:115-116` with:

```cmake
file(GLOB_RECURSE SourceFiles CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/source/plugin/*.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/source/plugin/*.h"
    "${CMAKE_CURRENT_SOURCE_DIR}/source/ui/*.cpp"     "${CMAKE_CURRENT_SOURCE_DIR}/source/ui/*.h")
target_sources(SharedCode INTERFACE ${SourceFiles})
target_include_directories(SharedCode INTERFACE "${CMAKE_CURRENT_SOURCE_DIR}/source")
```

and add `dsp` to the `target_link_libraries(SharedCode INTERFACE …)` list (`PJ/CMakeLists.txt:149-160`). The name `SourceFiles` is kept on purpose: `pamplejuce_xcode_prettify()` reads it by default (`CI/XcodePrettify.cmake:23-25`).

Move `PluginProcessor.*` into `source/plugin/` and `PluginEditor.*` into `source/ui/`. Fix the includes (`"plugin/PluginProcessor.h"`).

**Respect the `ui → plugin` direction.** In the template, `PluginProcessor.cpp` includes `PluginEditor.h` for `createEditor()` (`PJ/source/PluginProcessor.cpp:2, 161-164`). That is a `plugin → ui` dependency. Fix without coding anything new: define `PluginProcessor::createEditor()` in a file under `source/ui/` (for example `ui/CreateEditor.cpp`). The processor header no longer includes anything from `ui/`.

### Step 5: two test targets

Replace `pamplejuce_add_tests()` (`PJ/CMakeLists.txt:169`) with:

```cmake
# Tests with JUCE: plugin/, state, parameters, latency, editor
pamplejuce_add_tests(TARGET PluginTests DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/tests/plugin")

# DSP tests without JUCE
file(GLOB_RECURSE DspTestFiles CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/tests/dsp/*.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/tests/dsp/*.h")
add_executable(DspTests ${DspTestFiles})
target_link_libraries(DspTests PRIVATE dsp Catch2::Catch2WithMain)
catch_discover_tests(DspTests)
```

Catch2 and `catch_discover_tests` are available because `CI/Tests.cmake:2-31` runs when `PamplejuceFunctions` is included. Move `PJ/tests/Catch2Main.cpp` and `PJ/tests/helpers/` into `tests/plugin/` (the `main` there creates the `ScopedJuceInitialiser_GUI`). `tests/golden/` and `tests/plugin/states/` contain no `.cpp` or `.h` and are therefore not compiled.

### Step 6: benchmarks

Keep `pamplejuce_add_benchmarks()` for the cost of the full processor (with JUCE), and add a `DspBenchmarks` target if needed, modelled on `DspTests` (Catch2 v3 provides `BENCHMARK` through `catch2/benchmark/catch_benchmark.hpp`). Each new JUCE benchmark file must be included in `benchmarks/Catch2Main.cpp` (pitfall 3). The benchmarks are registered in ctest (`CI/Benchmarks.cmake:35`), so they run in the CI "Test & Benchmarks" step. There is no budget mechanism: the comparison with `benchmarks/budget.json` has to be written (in `tools bench`, not in Catch2).

### Step 7: the `tools` target

Same setup as `Tests` (a plain executable that links `SharedCode`), behind the option planned in `docs/04_TESTS.md`:

```cmake
option(MYPLUGIN_BUILD_TOOLS "Build the headless tools binary" OFF)
if (MYPLUGIN_BUILD_TOOLS)
    file(GLOB_RECURSE ToolFiles CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/tools/*.cpp" "${CMAKE_CURRENT_SOURCE_DIR}/tools/*.h")
    add_executable(MyPluginTools ${ToolFiles})
    target_compile_definitions(MyPluginTools PRIVATE $<TARGET_PROPERTY:${PROJECT_NAME},COMPILE_DEFINITIONS>)
    target_link_libraries(MyPluginTools PRIVATE SharedCode)
endif ()
```

Copying the compile definitions is the same as in `CI/Tests.cmake:72`: without it, the `JucePlugin_*` macros are missing. For `tools snapshot`, the `main` must create a `juce::ScopedJuceInitialiser_GUI` like `PJ/tests/Catch2Main.cpp:12`, and the capture is done as in the comment of `PJ/tests/helpers/test_helpers.h:10-19` (`createComponentSnapshot`).

### Step 8: wire in RealtimeSanitizer

Add `include(Sanitizers)` right after `include(PamplejuceLog)` (`PJ/CMakeLists.txt:49`). It must come after `project()`, otherwise the module stops with an error (`CI/Sanitizers.cmake:10-15`). Then `-DWITH_REALTIME_SANITIZER=ON` adds `-fsanitize=realtime` to compilation and linking (`:38-41`) and requires Clang 20 or later; AppleClang does not support it (`:34-37`, `:56`).

Two ways to mark real-time code:

* `[[clang::nonblocking]]` on the `process` functions in `dsp/` (our `realtime-audio.md` rule). Clang also analyses these functions at compile time and reports unmarked calls: to be checked with `COMPILE_WARNING_AS_ERROR` on `dsp`.
* In the processor tests, without touching the JUCE signature: wrap the `processBlock` call in a `__rtsan::ScopedSanitizeRealtime` (header `<sanitizer/rtsan_interface.h>`, guarded by `#if __has_feature(realtime_sanitizer)`).

### Step 9: IPP

With no identified need, remove IPP: `PJ/CMakeLists.txt:165-166`, `build_and_test.yml:21, 66-68` (Intel repository), `intel-oneapi-ipp-devel` in `:70`, `:73-76`, and `PJ/tests/PluginBasics.cpp:29-41`. Fewer dependencies, fewer CI breakages (pitfall 5).

### Step 10: inspector in Debug only

Keep the link (`PJ/CMakeLists.txt:66-67, 152`) but wrap the `inspector` member, the button and the editor's `#include` in `#if JUCE_DEBUG`. That way the shipped plugin carries neither the button nor the window.

### Step 11: JUCE patches

Pamplejuce has no patch mechanism. For `patches/` (`.claude/rules/build.md`), the simplest is a CI step `git -C JUCE apply ../patches/*.patch` right after "Checkout code" (`build_and_test.yml:86-89`), and the same script locally. Doing it in CMake (`execute_process`) would make configure non-idempotent.

### Step 12: build folder

Either keep `Builds` (CI, `installer.iss`, `.gitignore:14-15`, the template's CLAUDE.md), or switch to `build` and edit `build_and_test.yml:16`, `installer.iss:38-40`, `.gitignore`. Recommendation: keep `Builds` and fix our docs; that is three fewer files to maintain against the template.

## 3. The CI (`.github/workflows/build_and_test.yml`)

Triggers: `push`, `pull_request`, `workflow_dispatch`, `workflow_call` (`:3-7`). The job only runs on `pull_request` for PRs coming from a fork (`:32`); internal PRs are covered by the branch `push`. `concurrency` cancels the previous build of the same ref (`:10-12`). Variables: `BUILD_TYPE: Release`, `BUILD_DIR: Builds`, `DISPLAY: :0` for pluginval on Linux (`:14-21`).

### Matrix (`:38-50`)

| Name | Runner | Compiler | Options |
| --- | --- | --- | --- |
| Linux | `ubuntu-22.04` | Clang (`egor-tensin/setup-clang@v2`), lld | `-G Ninja`, lld |
| macOS | `macos-14` | AppleClang | `-G Ninja -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64"` |
| Windows | `windows-latest` | **clang-cl**, not `cl.exe` | `-G Ninja` |

### Steps, in order

| Lines | Step | OS | Secrets | Without certificates |
| --- | --- | --- | --- | --- |
| 54 | `ilammy/msvc-dev-cmd@v1` | all (useful on Windows) | no | keep |
| 57-59 | Set up Clang | Linux | no | keep |
| 62-71 | Linux JUCE dependencies, Intel repository, IPP, starting Xvfb | Linux | no | keep, remove IPP |
| 73-76 | IPP through nuget | Windows | no | remove if no IPP |
| 78-84 | Ninja (choco), Ninja + osxutils (brew) | Win, mac | no | keep |
| 86-89 | Checkout with `submodules: recursive` | all | no | keep |
| 91-92 | sccache | all | no | keep |
| 94-98 | Configure, Build (Release) | all | no | keep |
| 100-102 | `ctest --verbose --output-on-failure` (tests **and** benchmarks) | all | no | keep |
| 104-118 | Read the `.env` written by CMake, artefact paths | all | no | keep |
| 120-124 | **pluginval** | all | no | keep |
| 126-134 | Certificate import (`sudara/basic-macos-keychain-action@v1`) | macOS | `DEV_ID_APP_CERT`, `DEV_ID_APP_PASSWORD`, `DEV_ID_INSTALLER_CERT`, `DEV_ID_INSTALLER_PASSWORD` | **comment out** |
| 136-144 | codesign VST3, AU, CLAP, Standalone (`--options=runtime --timestamp`) | macOS | `DEVELOPER_ID_APPLICATION` | **comment out** |
| 146-163 | Custom icons (sips, DeRez, Rez, SetFile) | macOS | no | optional |
| 165-183 | pkgbuild, productbuild `--sign`, `notarytool`, `stapler` | macOS | `DEVELOPER_ID_INSTALLER`, `NOTARIZATION_USERNAME`, `NOTARIZATION_PASSWORD`, `TEAM_ID` | **comment out** (or keep `pkgbuild` and remove `--sign` and notarisation) |
| 185-188 | Zip of the artefacts (excludes the `SharedCode` lib) | Linux | no | keep |
| 190-194 | Inno Setup installer (`iscc packaging\installer.iss`) | Windows | no | keep |
| 196-220 | Azure Trusted Signing (`azure/artifact-signing-action@v2`, `.exe` files) | Windows | six `AZURE_*` secrets | **comment out** |
| 222-241 | Upload `.exe`, `.zip`, `.pkg` (`actions/upload-artifact@v7`) | per OS | no | keep; on macOS without `.pkg`, zip the artefacts folder as on Linux |
| 243-261 | `release` job on `v*` tag: downloads the artefacts, `softprops/action-gh-release@v3` as **prerelease** | Linux | implicit `GITHUB_TOKEN` | keep; set `prerelease: false` when actually publishing |

Rather than commenting out, a variant that avoids editing the workflow the day the certificates arrive: expose `HAS_MAC_SIGNING: ${{ secrets.DEV_ID_APP_CERT != '' }}` in the job's `env`, then `if: runner.os == 'macOS' && env.HAS_MAC_SIGNING == 'true'` on steps 126 to 183 (secrets cannot be read directly in `if`). Same for Azure.

### pluginval

```yaml
curl -LO "https://github.com/Tracktion/pluginval/releases/download/v1.0.4/pluginval_${{ runner.os }}.zip"
7z x pluginval_${{ runner.os }}.zip
${{ matrix.pluginval-binary }} --strictness-level 10 --verbose --validate "${{ env.VST3_PATH }}"
```

(`:120-124`). Pinned version 1.0.4, strictness 10, VST3 only, on the Release build, before any signing. CLAP is not validated. On Linux, pluginval needs the Xvfb virtual display started at `:71`. Useful addition: `--output-dir pluginval-logs` then an `if: failure()` upload to keep the log.

### Jobs to add

All in the same file, in parallel with the build job.

**`dsp-guard`** (a few seconds, Linux): `! grep -rn "juce" source/dsp/` and `clang-format --dry-run --Werror` on `source/ tests/ tools/`. Pamplejuce has no clang-format check in CI.

**`rtsan`** (Linux):

```yaml
  rtsan:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
        with: { submodules: recursive }
      - name: Install clang 20 and JUCE deps
        run: |
          wget https://apt.llvm.org/llvm.sh && chmod +x llvm.sh && sudo ./llvm.sh 20
          sudo apt-get update && sudo apt-get install -y ninja-build libasound2-dev libx11-dev libxi-dev libxinerama-dev libxext-dev libfreetype6-dev libglu1-mesa-dev xvfb
          sudo /usr/bin/Xvfb :0 &
      - name: Configure
        run: cmake -B Builds-rtsan -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_C_COMPILER=clang-20 -DCMAKE_CXX_COMPILER=clang++-20 -DWITH_REALTIME_SANITIZER=ON
      - name: Build tests only
        run: cmake --build Builds-rtsan --target DspTests PluginTests
      - name: Run
        env: { DISPLAY: ":0" }
        run: ./Builds-rtsan/DspTests && ./Builds-rtsan/PluginTests
```

Both executables are run directly rather than through `ctest`: since the `Benchmarks` target is not built, ctest would report its tests as not built. Only the tests are built: there is no point compiling the formats or running pluginval under the sanitizer. By default RTSan stops the program at the first violation, which makes ctest fail. Never enable `PERFETTO` in this job (see the melatonin_perfetto notes).

**`audio-regression`** (Linux only): configure in Release with `-DMYPLUGIN_BUILD_TOOLS=ON`, `cmake --build Builds --target MyPluginTools`, then `MyPluginTools check`, `MyPluginTools render --preset all --out Builds/renders`, `MyPluginTools compare Builds/renders tests/golden`. On failure, `upload-artifact` of `Builds/renders` (`if: failure()`) so the human can listen. A single OS because fast math and different compilers produce differences between platforms; the references are therefore produced by this job (downloaded artefact), listened to, then committed as `golden: <reason>`.

**Version / tag consistency**: in the `release` job (`:243`), check that `${GITHUB_REF_NAME#v}` equals the contents of `VERSION` before publishing (`.claude/rules/build.md`).

**Benchmark budget**: to be done in `tools bench` (non-zero exit above the budget), called by the `audio-regression` job.

## 4. `tests/` and `benchmarks/`

Provided contents:

* `PJ/tests/Catch2Main.cpp`: a custom `main` that creates `juce::ScopedJuceInitialiser_GUI` for the whole Catch2 session (`:12`), hence the link to `Catch2::Catch2` and not `Catch2WithMain`. Needed for the APVTS, `juce::Graphics`, `Timer`.
* `PJ/tests/PluginBasics.cpp`: a dummy test, a test that instantiates `PluginProcessor` and checks `getName()` and a non-empty program name (`:11-26`; the latter avoids a failure of Steinberg's VST3 validator), an IPP version test (`:29-41`).
* `PJ/tests/helpers/test_helpers.h`: `runWithinPluginEditor` creates the editor, runs a lambda, destroys it (`:22-31`). The comment at `:10-19` shows a JPEG screenshot of the editor.
* `PJ/benchmarks/Benchmarks.cpp`: cost of the constructor, the destructor, and opening/closing the editor (`BENCHMARK_ADVANCED`). **No `processBlock` benchmark**.

Test discovery: `catch_discover_tests(... DISCOVERY_MODE PRE_TEST)` (`CI/Tests.cmake:93`), so each `TEST_CASE` is a ctest test. `CI=1` is defined in CI (`:87-89`) to skip what must not run on a runner.

Testing the processor: nothing is provided beyond instantiation. The pattern, to be written ourselves in `tests/plugin/`:

```cpp
TEST_CASE ("reported latency = measured latency", "[plugin][latency]")
{
    PluginProcessor p;
    p.setPlayConfigDetails (2, 2, 48000.0, 512);
    p.prepareToPlay (48000.0, 512);

    juce::AudioBuffer<float> buffer (2, 512);
    juce::MidiBuffer midi;
    buffer.clear();
    buffer.setSample (0, 0, 1.0f); buffer.setSample (1, 0, 1.0f);   // impulse
    p.processBlock (buffer, midi);
    // peak position on channel 0 compared with p.getLatencySamples(), tolerance 0 samples
}
```

Same pattern for the state round trip (`getStateInformation` into a `juce::MemoryBlock`, `setStateInformation` on a second instance, parameter comparison) and for loading the files in `tests/plugin/states/`.

## 5. `CLAUDE.md` and `AGENTS.md`

`AGENTS.md` is a **symbolic link** to `CLAUDE.md` (`ls -la` of the repository). On Windows, if `core.symlinks` is `false` (Git for Windows' default), the file becomes a one-line text file containing `CLAUDE.md`.

Contents of `PJ/CLAUDE.md` (158 lines):

| Section | Lines | What it says | Where it goes on our side |
| --- | --- | --- | --- |
| First-Time Setup | 5-29 | Seven questions (name, company, type, IDE, CI, IPP, macOS and Windows signing), then editing `CMakeLists.txt` and the workflow, and deleting the section | A phase 0 task, `docs/tasks/0001-init-from-pamplejuce.md`, which takes over the questions and this guide; not in the router |
| About This Project | 31-35 | Template introduction | Delete |
| Build Commands | 37-61 | Configure Debug in `Builds`, build, `ctest`, `./Builds/Tests "[tag]"`, `./Builds/Benchmarks` | `.claude/rules/workflow.md` (verification commands), aligned with the chosen folder name (step 12) |
| Project Structure | 63-72 | Role of each folder | `docs/CODEMAP.md` |
| Architecture | 74-92 | `SharedCode`, `pamplejuce_*` functions, `include(Tests)` now without effect | `.claude/rules/build.md`, one line per fact |
| Key Configuration | 94-104 | Where to change names, codes, formats, version | Task 0001 |
| Code Quality | 106-110 | Warnings treated as errors; clangd errors on JUCE modules are often false | The first point already exists (`cpp.md`); add the second to `.claude/rules/juce.md` |
| Includes | 112-114 | JUCE modules already include the STL | Useless, and wrong for `dsp/`, which does not include JUCE |
| Threading Model, Realtime Safety | 116-134 | Audio thread and message thread, no allocation or locks | Already covered, more strictly, by `.claude/rules/realtime-audio.md`; do not duplicate |
| Adding Dependencies | 136-154 | JUCE modules as submodules linked to `SharedCode` as `INTERFACE`; non-JUCE libraries through `CPMAddPackage` | Mechanics in `.claude/rules/build.md`; the choice stays governed by `docs/07_REUSE.md` |
| Code Style | 156-158 | Allman `.clang-format`, 4 spaces, no column limit | `cpp.md` already cites the repo's clang-format |

Recommended merge: our router `CLAUDE.md` **replaces** the template's, `AGENTS.md` stays a link to it (so other agents read the same router), and each useful fact from the template is moved into the matching rule, in line with the instruction "the router contains no rules".

One divergence to settle: the template advises developing in Debug (`PJ/CLAUDE.md:21`), while our commands in `docs/02_TOOLCHAIN.md` configure in Release. Both have a role: Debug for JUCE assertions during the TDD loop, Release for pluginval and `tools bench`.

## Gaps with our documents

* `docs/04_TESTS.md:74` and `.claude/rules/build.md:8` present the CI as "based on Pamplejuce" with `tools check`, `tools compare`, benchmarks with a budget and clang-format. Pamplejuce only provides build, `ctest` and pluginval: the rest has to be added (section 3).
* `docs/02_TOOLCHAIN.md` plans for MSVC (Visual Studio) locally; Pamplejuce's Windows CI compiles with **clang-cl**. Warnings and some bugs differ. Either add an MSVC entry to the matrix, or use clang-cl locally (Visual Studio's "C++ Clang tools" component).
* `docs/02_TOOLCHAIN.md:61` and `docs/07_REUSE.md:20` say "Pamplejuce, MIT": true for the main repository, but the `cmake/` submodule has no licence (pitfall 10).
* We decided VST3 only (ADR 0003, `docs/02_TOOLCHAIN.md`); the template also builds Standalone, AU, AUv3 and CLAP by default, so step 2 removes them.
* Our docs use the `build` folder, the template `Builds` (step 12).
* `docs/04_TESTS.md:27` proposes melatonin_audio_sparklines for DSP test failures: the module depends on `juce_dsp`, so it is incompatible with DSP tests without JUCE (details in `melatonin-and-clap.md`).
* `docs/07_REUSE.md:78` says RTSan is "to be put in a CI job": the CMake option already exists in cmake-includes; only `include(Sanitizers)` and the job are missing.

## Links

* Template: https://github.com/sudara/pamplejuce
* CMake: https://github.com/sudara/cmake-includes (read the CHANGELOG before each update of the submodule)
* Documentation: https://melatonin.dev/manuals/pamplejuce/
* macOS signing: https://melatonin.dev/blog/how-to-code-sign-and-notarize-macos-audio-plugins-in-ci/
* Windows signing: https://melatonin.dev/blog/code-signing-on-windows-with-azure-trusted-signing/
* RealtimeSanitizer: https://clang.llvm.org/docs/RealtimeSanitizer.html
