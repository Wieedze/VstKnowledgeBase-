# 0016 — Show every parameter without scrolling

**Date**: 2026-11-05
**Verdict**: pass (2 rounds, the first failed on one untested wiring and one wrong sentence)

## What was delivered

JUCE opens its generic editor at 400 pixels at most, so the 13 parameters needed a scroll, which Maxime found really uncomfortable after the task 0015 Live test. The editor now takes its height from the list JUCE builds, so Mix and Gain in will fit without another change. It stays the generic editor and stays resizable. On a screen too short for the list it is held to the tallest screen, with room for the host's title bar, and the scroll bar comes back only there. Maxime approved the installer of fb799f8 in Live on 2026-11-05 at about 16:50 CET. Commits `2afb28b`, `165a3c9`, `91e9b0f`, `fb799f8`, `ef69205` and the closing commit on `task/0016-editor-without-scroll`, PR #19.

## What got stuck

The first version took the primary display, left no room for the title bar, lost JUCE's minimum height, and its test depended on the machine's own screen. The code review found all four before the listening.

Commit `91e9b0f` does not compile, and it was pushed: the command piped the build through `grep`, so its failure did not stop the following commands, and the tests that looked green were the old binaries. `fb799f8` repairs it; force pushes being forbidden, it stays in the history.

The verifier found that no test could see which screen decides: this machine's screens are too tall for the limit to act, even with two of them. A test now replaces JUCE's public list of displays.

Left open by decision (`FUTURE.md`): the check at 150 % and 200 %, for the UI gate; the host's chosen screen, not known when the editor is created.

## What we change next

* A build piped through a filter hides its exit code: use `set -o pipefail` and read the exit code before reading test results.
* A test that reads the machine's screen tests the machine: inject the screen.
* A limit that does not act here is not tested here, however green.

## Evidence

* `ctest --test-dir Builds --output-on-failure` (Debug, GCC, WSL2) on ef69205: 186/186.
* `./Builds/MoodzFilterTools check`: `check: all passed`; `render` then `compare Builds/renders tests/golden`: `compare: all files within tolerance`.
* `./Builds/PluginTests "[ui]"`: all passed.
* `./Builds/MoodzFilterTools snapshot <path>`: 856 x 1080 at scale 2, all 13 parameters visible.
* CI run 42062930135 on ef69205: Linux, Windows (pluginval 10 on both) and Linux RealtimeSanitizer green.
