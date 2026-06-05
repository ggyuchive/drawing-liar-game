# Changelog

All notable changes to this project are documented here. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [1.0.0] — unreleased

First public release: a playable, shareable liar drawing game.

### Gameplay

- Shared-canvas drawing synced in real time through a Yorkie
  document (each room is a document).
- Round flow: keyword + liar assignment → turn-by-turn drawing →
  voting → reveal → liar's guess → scoring, across multiple rounds
  with a running scoreboard and final ranking.
- **Brush quota** — each turn has a pixel budget that drains in real
  time and is visible to every peer; the turn ends when it empties.
- **Turn timer** — a 10 s wall-clock limit per turn with shared
  countdown and auto-advance (host covers a disconnected drawer).
- **Always-guess + 2×2 scoring** — the liar always guesses; the four
  outcomes (caught × guessed) drive a tunable scoring table.
- **Room chat** — synced through the document, with typing
  indicators (suppressed for the liar while guessing).
- **Colour picker**, **host-only clear board**, and **keyword decks**
  (general / food / nature per language).

### Internationalization

- English and Korean out of the box. Languages are drop-in: add one
  `src/i18n/lang/<code>.ts` file and it auto-registers.

### Reliability & release prep

- Host auto-promotion when the current host disconnects.
- Mid-round joiners become spectators until the next round.
- "Reconnecting…" badge on watch-stream loss; friendlier room-attach
  error with a back-to-lobby action.
- Code-split bundle (app / React / Yorkie SDK), keyboard focus rings,
  reduced-motion support, and responsive layout for narrow viewports.
- CI (lint + build on every PR), MIT license, contributing guide, and
  code of conduct.

[1.0.0]: https://github.com/ggyuchive/drawing-liar-game
