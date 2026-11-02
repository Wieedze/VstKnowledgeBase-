# Plugin start plan

Phases are closed by a gate. We do not move on to the next one until the gate is green.

## Phase 0: decide (one session)

1. `/grill-me` on the plugin idea.
2. Write `docs/SPEC.md`: one page. What the plugin does, for whom, the 3 to 5 features of v1, and an **Out of v1** section at least as long.
3. ADR 0001: licence (AGPL or commercial) and therefore what we are allowed to copy.
4. ADR 0002: instrument or effect, plugin and manufacturer codes. The format is already fixed: VST3 only (playbook ADR 0003).

**Gate 0**: SPEC reviewed and frozen, two ADRs written.

## Phase 1: a skeleton that passes everything (1 to 2 sessions)

1. New repo from Pamplejuce. Pin JUCE to a tag.
2. Copy `.claude/`, `CLAUDE.md`, `GLOSSARY.md`, `docs/tasks/TEMPLATE.md` from this playbook.
3. Create the three targets `dsp`, `plugin`, `ui` and the `tools` target.
4. A "pass through" plugin with a single smoothed gain parameter.
5. Tests: exact gain in dB, NaN, block size, state round trip, frozen list of IDs.
6. `tools render`, `tools compare`, first golden reference.
7. Green CI on Windows, macOS, Linux, pluginval 10 included.
8. The plugin loads in your Windows DAW.

**Gate 1**: green CI, green pluginval 10, loaded in the DAW, `STATE.md` up to date.

## Phase 2: the DSP core

The main processing of the SPEC, without modulation, without a polished UI (JUCE generic editor).

**Gate 2**: DSP tests and golden references green, CPU budget set in `benchmarks/budget.json` and met, listening approved.

## Phase 3: parameters, presets, state

Final parameter layout (IDs frozen from here on), presets, versioned state migration.

**Gate 3**: migration tests green, IDs frozen by ADR.

## Phase 4: UI

Real editor. Headless captures via `tools snapshot` for review.

**Gate 4**: UI tested at several scales, no regression of the previous gates.

## Phase 5: release

Signing, installers, CHANGELOG, a `vX.Y.Z` tag that triggers the release.

**Gate 5**: installer tested on a clean machine.

## What comes after v1

Everything in `FUTURE.md`. A feature only leaves it through a new SPEC (or a SPEC amendment) and a pass through phase 0.
