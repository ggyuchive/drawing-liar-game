# drawing-liar-game

A web-based multiplayer **liar drawing game** built on the [Yorkie JS SDK](https://yorkie.dev).

One noun keyword is shared with every player except one — the liar. Players take
turns drawing on a shared canvas (one continuous stroke per turn). After a few
rounds, everyone votes on who the liar is. If caught, the liar gets a chance to
guess the keyword.

## Status

MVP playable end-to-end. What works today:

- Join lobby with a 6-char room code (also embedded in the URL hash, so the URL is the share link).
- In-room waiting screen with host config (rounds, turns per player). Start button gates on 3+ players.
- Round flow: keyword + liar assignment → turn-by-turn drawing (one continuous stroke per turn) → voting → reveal → optional liar guess → scoring.
- Multiple rounds with running scoreboard, final ranking, "Play again" to reset within the same room.

Out of scope for MVP and intentionally not built: host auto-promotion on disconnect, server-side keyword secrecy, drawing-tool palette, mobile-specific layout.

## Setup

```sh
pnpm install
cp .env.example .env
# fill in VITE_YORKIE_API_KEY from https://yorkie.dev
pnpm dev
```

To play with friends locally, share the URL after creating a room — the room
code is in the URL hash (`#room=ABC123`).

## Tech

- React 19 + Vite + TypeScript
- `@yorkie-js/sdk` + `@yorkie-js/react` for real-time sync
- HTML5 Canvas, strokes stored as `{ color, points: [{x,y}] }` arrays in the Yorkie doc
