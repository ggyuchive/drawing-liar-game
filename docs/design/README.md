# Design Documents

New design documents should be based on [TEMPLATE.md](TEMPLATE.md).

## Contents

- [MVP Architecture](mvp-architecture.md): Yorkie document schema, game phase
  state machine, and presence model for a playable liar drawing game.
- [Roadmap](roadmap.md): Phases from scaffold to v1.0 release. The
  navigation doc for "what's next, in what order, and when are we done?"
- [Rules v1.0](rules-v1.md): Gameplay rule changes shipping with v1.0
  — brush quota with real-time meter, room chat, always-guess flow,
  finalised 2×2 (caught × guessed) scoring, explicit no-undo rule.
  Read before executing the quality-pass plan.

## Guidelines

For significant scope and complex new features, write a design document
before starting implementation. Small fixes and trivial tweaks don't need
one.

A good design doc:

- Frames the *problem* before the solution.
- States *goals* and explicit *non-goals* so scope is clear.
- Captures *design decisions* and their *reasons* so future readers
  understand why the current shape exists.
- Lists *alternatives considered* so the discarded paths are recorded.
