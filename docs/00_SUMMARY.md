# Summary: the base decisions

State as of 2026-11-02. Each line points to the document that justifies it.

| Topic | Decision | Why | Details |
| --- | --- | --- | --- |
| Starting point | [Pamplejuce](https://github.com/sudara/pamplejuce) template | Build, Catch2, pluginval, CI, signing already set up; it even provides a `CLAUDE.md`/`AGENTS.md` | [01](01_REFERENCES.md) |
| Framework | JUCE 9.x as a git submodule, version pinned to a tag | JUCE 9 is out, TetraDrive is already on 9.0.4, Pamplejuce follows JUCE 9 | [02](02_TOOLCHAIN.md) |
| Language | C++23 (C++20 minimum) | The template's standard | [02](02_TOOLCHAIN.md) |
| Format | VST3 only (no AU, no CLAP, no Standalone) | A single format to build, validate and support | [ADR 0003](../.claude/choices/0003-vst3-only.md) |
| Build | CMake ≥ 3.25 + Ninja, dependencies via CPM | One system for Windows, macOS, Linux and CI | [02](02_TOOLCHAIN.md) |
| Dev machine | Native Windows build (MSVC) to test in the DAW; WSL2/Linux for fast DSP tests and CI | A Linux VST3 does not load in a Windows DAW | [02](02_TOOLCHAIN.md) |
| Architecture | Three layers: `dsp/` without JUCE, `plugin/` (processor, parameters, state), `ui/` | The DSP is tested without a host and without a DAW | [03](03_ARCHITECTURE.md) |
| Unit tests | Catch2 v3 on `dsp/` and `plugin/`, with TDD | Red green refactor loop, feedback for the agent | [04](04_TESTS.md) |
| System tests | A headless `tools` binary (render, check, bench) like Drum Foundry | The agent verifies without opening a DAW | [04](04_TESTS.md) |
| Validation | pluginval strictness 10 in CI, on every PR | Catches what a real host would crash on | [04](04_TESTS.md) |
| Audio regression | Reference renders compared with a tolerance | A refactor must not change the sound silently | [04](04_TESTS.md) |
| Real-time rules | No allocation, lock, I/O or exception in `processBlock` | Otherwise: crackles, host crashes | [rules/realtime-audio](../.claude/rules/realtime-audio.md) |
| Anti-drift | One-page SPEC, atomic tasks with "Out of scope", `FUTURE.md`, phases with gates | A plugin's scope blows up fast (see the modulation matrix) | [rules/scope](../.claude/rules/scope.md) |
| Agentic method | `CLAUDE.md` router + rules + ADRs + post-mortems + `task-verifier` (ARP method); Matt Pocock skills for alignment and TDD | Already works on ARP; Pocock adds grilling, glossary, TDD | [05](05_AGENTIC_WORKFLOW.md) |

## The three ideas to remember

1. **The DSP must be able to run without JUCE and without a DAW.** This is what Drum Foundry (headless tool) and TetraDrive (tests without JUCE) do. It is also what makes agentic work possible: an agent cannot listen, but it can run a test.
2. **The audio thread is sacred.** The whole coding discipline revolves around it, and it is the class of bugs an agent most easily introduces without noticing. A dedicated review agent checks it.
3. **Scope is defended in writing.** A one-page SPEC, tasks with an "Out of scope" list, and a `FUTURE.md` for everything else.
