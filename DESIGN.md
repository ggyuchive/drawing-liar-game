# Design Principles

The rules that govern how this game looks and behaves. They exist because
the alternative was tried and rejected. When a change conflicts with one of
these, the change is wrong — not the principle.

---

## 1. Shrink, never hide

Controls that don't fit a narrow viewport are made **smaller**, not removed.
A button the user can no longer see is a feature they no longer have.

- The room header (room code, copy, language, chat toggle/dock, leave) and
  the `?` help button reduce `font-size`/`padding` as width drops — none of
  them get `display: none`.
- The `ROOM` label shrinks to 12px; it is not dropped.

If something genuinely cannot stay, that is a layout failure to solve, not a
thing to hide.

## 2. Fit the content — don't shrink the content

Layout adapts *around* elements at their intended size. We do not quietly
degrade an element to win back space.

- Profile cards keep their height. The requirement "keep it to one line" is
  about **wrapping**, not about making each card shorter.
- When space runs out, reflow (side → bottom, column → row) or scroll the
  right container — never compress the thing the user is looking at.

## 3. The board never needs a scroll, and never distorts

The play area — keyword HUD → gauges → canvas — must be fully visible at
every width without a vertical scroll, and the canvas must always hold its
3:2 ratio.

- The canvas **fits** the space it's given (`min(100cqh, 100cqw·2/3)` with
  `aspect-ratio`), it is never sized by guessing viewport fractions.
- Exactly one axis is pinned and the other follows the ratio, so the ratio
  can never be violated. Two competing max-constraints on a replaced element
  is the bug, not the fix.

## 4. One line means one line

The top bar and the profile strip never wrap to a second row. At narrow
widths the profile strip becomes a single horizontal lane that scrolls
sideways; the header shrinks its controls (see #1). A second line is a
regression, full stop.

## 5. Keep the active element in view

When a list scrolls, whatever the player needs *right now* is scrolled into
view automatically. The current drawer's profile is centered in the strip on
each turn (`scrollIntoView`, nudging only the strip, never the page).

## 6. Prefer automatic flow over manual gates

The game advances on its own. Manual "continue"/"next" buttons that only the
host can press are removed in favor of timed auto-advance, and every wait is
shown as a visible countdown so the pause never feels like a freeze.

- vote result → guessing, and round result → next round, both auto-advance
  after 5s with an on-screen countdown.
- Host-owned writes stay host-owned (one writer, CRDT-safe), but the human
  doesn't have to click.

## 7. Determinism over guesswork

Prefer layout math that is provably correct over values tuned by eye.
Container-query units that measure the real box beat `vh`/`calc` magic
numbers that happen to work at the widths we checked. If a value only works
"around here," it's a guess and it will break somewhere else.

## 8. Every fix carries a regression check

Before shipping a change, state what else it could break and confirm it
doesn't. Fixing one axis by breaking another (e.g. removing a scroll by
distorting the canvas) is not a fix. When touching shared CSS or a component
used by multiple phases, the blast radius is part of the work.

---

### How to use this file

These are constraints, not suggestions. A PR that violates one should say so
explicitly and justify it. New UI work should be checked against this list
the same way code is checked against the tests.
