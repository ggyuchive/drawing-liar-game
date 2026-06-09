# 🎨 Drawing Liar Game

A web-based multiplayer **liar drawing game** on a shared canvas,
built on the [Yorkie JS SDK](https://yorkie.dev). Everyone draws the
same secret keyword — except one player, the **liar**, who has no idea
what it is and has to bluff. Spot the liar before they slip away.

> **Play:** https://drawing-liar-game.vercel.app/

<!-- Add a screenshot or GIF of a round in progress here. -->

## How to play

- One player **creates a room** and shares the link (the room code
  lives in the URL, so the URL *is* the invite).
- Everyone else **joins** with the link or the 8-character code.
  You need **3+ players** to start.
- Each round, everyone sees a **keyword** — except the randomly
  chosen **liar**, who only knows they're the liar.
- Players take turns **drawing** on the shared canvas. Each turn has a
  **brush budget** and a **10-second timer**; whichever runs out first
  ends your turn.
- After the turns, everyone **votes** on who they think the liar is.
- The accused is revealed, then the **liar always takes one guess** at
  the keyword.
- **Scoring** rewards both sides: the room scores for catching the
  liar, the liar scores for bluffing and for actually knowing the
  word. Highest score after the final round wins.
- **Chat** is open the whole game — banter, accuse, mislead.

## Run locally

```sh
pnpm install
cp .env.example .env
# fill in VITE_YORKIE_API_KEY from https://yorkie.dev
pnpm dev          # http://localhost:5173
```

Create a room, then open the URL in a second browser window (or send
it to friends) to play together.

Other commands:

```sh
pnpm build        # tsc -b && vite build
pnpm preview      # serve the production build
pnpm lint         # ESLint
```

## Translating

The UI ships in **English** and **Korean**, and adding a language is a
drop-in: copy [`src/i18n/lang/en.ts`](src/i18n/lang/en.ts) to
`<code>.ts`, translate the strings and keyword decks, and it
auto-registers via the glob in `src/i18n/core.ts`. TypeScript enforces
that every string is present, so you can't ship a half-translated
file by accident.

## Tech

- **React 19 + Vite + TypeScript** — SPA, dev server, type safety.
- **`@yorkie-js/sdk` + `@yorkie-js/react`** — CRDT-based real-time
  sync; each room is a Yorkie document.
- **HTML5 Canvas** — strokes stored as `{ id, color, size, points }`
  arrays in the document, so every peer renders the same drawing as
  it happens.

## Contributing

Issues and pull requests are welcome — see
[`CONTRIBUTING.md`](CONTRIBUTING.md) for setup, the commit-message
convention, and how the project plans work in
[`docs/`](docs/). Be excellent to each other:
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
