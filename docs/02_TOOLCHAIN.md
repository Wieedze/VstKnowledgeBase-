# Toolchain

## Versions

| Tool | Version | Note |
| --- | --- | --- |
| JUCE | 9.x, pinned to a tag (e.g. `9.0.4`) | Git submodule. Pamplejuce follows `develop`; we pin a tag before the first release |
| C++ | C++23 | C++20 minimum |
| CMake | ≥ 3.25 | |
| Generator | Ninja | Visual Studio or Xcode only to debug in the IDE |
| Dependencies | CPM | Catch2 and third-party modules |
| Tests | Catch2 v3 | |
| Validation | pluginval 1.x | Strictness 10 |
| Formatting | clang-format | File provided by Pamplejuce |
| Analysis | clang-tidy | Optional at first, mandatory in CI from phase 2 |

## Dev machine: native Windows and WSL2

A VST3 compiled under Linux (WSL2) does not load in a Windows DAW. So two paths are needed.

| Need | Where | How |
| --- | --- | --- |
| Test in Ableton / the DAW | Native Windows | Visual Studio 2022 or 2026, workload "Desktop development with C++", from the "x64 Native Tools Command Prompt" |
| Fast DSP tests, the agent's TDD loop | WSL2 or Windows | The `Tests` target does not depend on the DAW |
| CI | GitHub Actions | Linux, Windows, macOS |

Basic commands (Windows, x64 prompt):

```
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
ctest --test-dir build --output-on-failure
```

Known pitfalls, taken from the Drum Foundry and TetraDrive READMEs:

* Use the **x64** prompt, not x86, otherwise the plugin does not load.
* Keep the repo in a short path (`C:\dev\myplugin`): the Windows 260-character limit breaks the build.
* Copying the `.vst3` folder into `C:\Program Files\Common Files\VST3` requires admin rights. Option: `COPY_PLUGIN_AFTER_BUILD` from an admin prompt.
* In Ableton: Preferences, Plug-ins, enable "Use VST3 Plug-in System Folders" then Rescan.

## JUCE: settings to decide at the start

| Setting | Decision | Why |
| --- | --- | --- |
| `PLUGIN_MANUFACTURER_CODE`, `PLUGIN_CODE` | 4 unique characters, fixed once and for all | Changing them breaks sessions |
| `FORMATS` | `VST3` only (ADR 0003) | No AU, no AUv3, no CLAP, no Standalone. To debug outside a DAW: JUCE's AudioPluginHost (`extras/AudioPluginHost`) loads the VST3 |
| `IS_SYNTH`, `NEEDS_MIDI_INPUT` | Depending on instrument or effect | |
| Sample-accurate automation | Evaluate TetraDrive's patch (`patches/juce-vst3-sample-accurate.patch`) | JUCE's VST3 wrapper only passes the last value per block |
| `JUCE_DISPLAY_SPLASH_SCREEN` | Depending on the licence | Tied to the JUCE licence |

## Licenses

| Component | Licence | Consequence |
| --- | --- | --- |
| JUCE | AGPL v3 or commercial | Closed plugin that is sold = commercial JUCE licence |
| VST3 SDK | MIT | No particular constraint |
| Drum Foundry, TetraDrive | AGPL v3 | Read and take inspiration; copying = publishing the plugin under AGPL |
| Surge, Vital, Dexed… | GPL v3 | Same |
| chowdsp_utils | BSD | Reusable with attribution |
| Pamplejuce | MIT | Free base |

Decision to make and record in an ADR at the start of each plugin: open source (AGPL) or commercial. It determines what we are allowed to copy.
