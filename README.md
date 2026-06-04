# drawing-liar-game

A web-based multiplayer **liar drawing game** built on the [Yorkie JS SDK](https://yorkie.dev).

One noun keyword is shared with every player except one — the liar. Players take
turns drawing on a shared canvas (one continuous stroke per turn). After a few
rounds, everyone votes on who the liar is. If caught, the liar gets a chance to
guess the keyword.

## Status

Early scaffold. What works today:

- A lobby where one player creates a game (gets a 6-char room code) and others join with that code.
- A shared whiteboard inside the room that syncs strokes between all participants in real time via Yorkie.

Game rules, turn rotation, voting, and scoring will be layered in next.

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
