# 0001 — Playbook structure taken from ARP, enriched with Matt Pocock's skills

**Date**: 2026-11-02
**Status**: accepted

## Context

ARP's agentic method (`CLAUDE.md` router, rules per domain, ADRs, post mortems, mandatory `task-verifier`) works. Developing plugins in C++ adds a class of bugs that unit tests do not see (real time) and a high risk of scope drift.

## Options considered

1. Take ARP as is.
2. Adopt only Matt Pocock's skills (grilling, spec, tickets, TDD).
3. Combine: ARP structure for the repo, Pocock skills for the workflow, plus audio-specific additions.

## Decision

Option 3: ARP structure for the repo, Pocock skills for the workflow, plus audio-specific additions: `rt-safety-reviewer` agent, `task-verifier` that runs build, tests, headless tool and pluginval, protected golden references, phases closed by gates, `GLOSSARY.md` instead of letting the vocabulary emerge.

## Consequences

A bit more ceremony per task, offset by short tasks. The playbook must remain the source: a lesson learned in a plugin is brought back here.
