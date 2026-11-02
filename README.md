# VstKnowledgeBase

A knowledge base and rule set for developing VST3 plugins with JUCE, alone or with coding agents (Claude Code).

This repo contains no plugin. It contains what you need to know and decide **before** and **during** the development of a plugin: the open source projects to study, the toolchain, the architecture, the test strategy, the real-time rules, the anti-drift guardrails and the agentic method. A plugin project references it (or copies it into its `.claude/`) when it starts.

## Where to start

| Order | File | Content |
| --- | --- | --- |
| 1 | [`docs/00_SUMMARY.md`](docs/00_SUMMARY.md) | The base decisions on one page |
| 2 | [`docs/01_REFERENCES.md`](docs/01_REFERENCES.md) | Drum Foundry, TetraDrive, Pamplejuce and the other projects to read |
| 3 | [`docs/02_TOOLCHAIN.md`](docs/02_TOOLCHAIN.md) | JUCE, CMake, compilers, WSL2 versus native Windows |
| 4 | [`docs/03_ARCHITECTURE.md`](docs/03_ARCHITECTURE.md) | Separation of pure DSP, JUCE layer and UI; typical tree |
| 5 | [`docs/04_TESTS.md`](docs/04_TESTS.md) | Catch2, headless tool, pluginval, audio regression tests, CI |
| 6 | [`docs/05_AGENTIC_WORKFLOW.md`](docs/05_AGENTIC_WORKFLOW.md) | The ARP method adapted to audio C++, Matt Pocock skills |
| 7 | [`docs/06_START_PLAN.md`](docs/06_START_PLAN.md) | The first concrete steps of a new plugin |
| 8 | [`docs/07_REUSE.md`](docs/07_REUSE.md) | Everything we take ready-made (libraries, tools, patterns) instead of coding it |

The rules agents must apply are in [`.claude/rules/`](.claude/rules/00-INDEX.md). The router for Claude Code is [`CLAUDE.md`](CLAUDE.md).

## Using this playbook in a plugin project

1. Create the plugin from the [Pamplejuce](https://github.com/sudara/pamplejuce) template ("Use this template").
2. Copy `.claude/`, `CLAUDE.md`, `GLOSSARY.md` and `docs/tasks/TEMPLATE.md` from this repo into the new project.
3. Fill in the project's `docs/SPEC.md` (one page: what the plugin does, what it does not do).
4. Follow [`docs/06_START_PLAN.md`](docs/06_START_PLAN.md).

## Evolving the playbook

A lesson learned in a plugin project comes back here: rule changed in `.claude/rules/`, decision recorded in `.claude/choices/`, post-mortem in `.claude/learning/`. Rules never change silently.

## Index website

The site in `site/` renders this repo's Markdown, the roadmap (`docs/plugins/*/ROADMAP.md`) and the decision log (ADRs, post-mortems, `docs/MILESTONES.md`). It is deployed to GitHub Pages on every push to `main`.

## Licences of the references

Drum Foundry and TetraDrive are under AGPL v3. We read them and take inspiration from them; copying their code requires publishing the plugin under AGPL. JUCE itself is under AGPL v3 or a commercial licence. See [`docs/02_TOOLCHAIN.md`](docs/02_TOOLCHAIN.md#licenses).
