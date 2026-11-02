# Agentic workflow

We start from the method that works on [ARP](https://github.com/Wieedze/ARP) and adapt it to real-time C++, adding the skills of [Matt Pocock](https://github.com/mattpocock/skills).

## What we keep from ARP

| ARP element | Role | VST adaptation |
| --- | --- | --- |
| `CLAUDE.md` router, with no rules | Says what to load depending on the task | Routing table dsp / plugin / ui / build |
| `.claude/rules/` by domain + `00-INDEX.md` | Load only the useful rules | `realtime-audio`, `cpp`, `dsp`, `juce`, `ui`, `testing`, `build`, `scope`, `workflow` |
| `.claude/STATE.md` | Where the project stands in one read | Added: current phase, CPU budget, known sound defects |
| Atomic `docs/tasks/` with "Do not do in this task" | Anti-drift | Added: test signal and measurable criterion in the Definition of done |
| `.claude/choices/` ADRs | Record of decisions | Same |
| `.claude/learning/` post-mortems | Reused lessons | Same |
| Mandatory `task-verifier` | Nobody grades their own work | It runs build, tests, `tools check`, pluginval |
| `FUTURE.md` | Requested, not built | Same, essential for a plugin |
| `claims.md` (one numeric claim = one source) | Avoids false sentences | Becomes: one audio figure (dB, ms, % CPU) = one command that reproduces it |

## What we improve

1. **A real-time review agent** (`rt-safety-reviewer`) that does one thing only: search the diff for anything that can block or allocate on the audio thread. It is the most frequent mistake of an agent in audio C++, and it does not show up in unit tests.
2. **The `task-verifier` runs instead of reading.** On ARP it reads the deliverables; here it runs `cmake --build`, `ctest`, `tools check`, `tools compare` and pluginval, and pastes the outputs.
3. **A shared glossary (`GLOSSARY.md`)**, Matt Pocock style: the words of the audio domain (voice, layer, modulation slot, block, snapshot) with one definition each. Class and file names follow them.
4. **Phases with gates** rather than a frozen 16-week plan: a phase only starts when the previous one passes its gate (see [`rules/scope.md`](../.claude/rules/scope.md)).
5. **The router stays short.** ARP's `CLAUDE.md` is over 20 KB and carries paragraphs of history; here the history goes into the ADRs.

## The Matt Pocock skills to use

Installation in Claude Code:

```
claude plugin install mattpocock-skills@claude-plugins-official
```

Then once per repo: `/setup-matt-pocock-skills` (ticket tracker, labels, docs location).

| Moment | Skill | Use in a plugin project |
| --- | --- | --- |
| Before any feature | `/grill-with-docs` | The agent questions you until every branch is settled, and updates `GLOSSARY.md` and the ADRs |
| Idea still vague | `/grill-me` | Same thing without touching the code |
| Fix the scope | `/to-spec` | Turns the discussion into a spec |
| Split | `/to-tickets` | Tickets as vertical slices, with dependencies |
| Implement | `/implement`, `tdd` | Red, green, refactor, one slice at a time |
| Bug or performance regression | `diagnosing-bugs` | Loop that starts with a test that fails on the bug |
| Review | `code-review` | Two axes: repo standards and faithfulness to the spec |
| Every few days | `/improve-codebase-architecture` | Spots modules to deepen |
| End of session | `/handoff`, `retro` | Handover and improvement of the agent environment |

## The loop of a task

1. **Align**: `/grill-with-docs` on the idea. Output: ADR if a decision is made, glossary up to date.
2. **Specify**: `/to-spec` then `/to-tickets`. Each ticket becomes a `docs/tasks/NNNN-slug.md` file in the format of [`tasks/TEMPLATE.md`](tasks/TEMPLATE.md).
3. **Implement with TDD**: a red test that describes the expected audio behaviour, the minimal code, the refactor.
4. **Check yourself**: build, `ctest`, `tools check`.
5. **Real-time review**: `rt-safety-reviewer` on the diff if `dsp/` or `plugin/` is touched.
6. **General review**: `code-review`.
7. **Verdict**: `task-verifier`. Pass = post-mortem + `STATE.md`. Fail = back to 3.
8. **Listening**: if the sound changes, you in the DAW, before merging.

## What an agent must never do alone

* Change an audio reference (`tests/golden/`) to make a test pass.
* Rename or remove a parameter ID.
* Change `PLUGIN_CODE` or `PLUGIN_MANUFACTURER_CODE`.
* Update JUCE.
* Copy code from a GPL/AGPL project.
* Add a feature that is not in the task.

Each of these cases: stop, ask, ADR.
