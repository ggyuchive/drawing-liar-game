# Contributing to drawing-liar-game

Thanks for your interest! This is a small, friendly project — a
multiplayer liar drawing game built on the
[Yorkie JS SDK](https://yorkie.dev). Contributions of all sizes are
welcome.

## Getting set up

```sh
pnpm install
cp .env.example .env
# fill in VITE_YORKIE_API_KEY from https://yorkie.dev
pnpm dev          # http://localhost:5173
```

Other commands:

```sh
pnpm lint         # ESLint
pnpm build        # tsc -b && vite build (must pass before a PR)
pnpm preview      # serve the production build
```

`pnpm lint && pnpm build` must be green before you open a PR — CI runs
exactly these on every pull request.

## How we work

This repo plans non-trivial work up front and reflects on it after:

- **Design docs** live in [`docs/design/`](docs/design/) — read
  [`mvp-architecture.md`](docs/design/mvp-architecture.md) and
  [`rules-v1.md`](docs/design/rules-v1.md) before changing gameplay.
- **Task plans** live in [`docs/tasks/active/`](docs/tasks/active/);
  finished ones move to [`docs/tasks/archive/`](docs/tasks/archive/).
- **Lessons** live in [`docs/lessons/`](docs/lessons/), paired 1:1
  with archived tasks — capture anything non-obvious you learned.

Before starting, skim the active tasks and relevant lessons. Small
fixes don't need a plan; new features generally do.

## Commit messages

The full rules live in [`CLAUDE.md`](CLAUDE.md). In short:

- Subject: `[prefix] <imperative subject>`, ≤ 70 chars.
- Allowed prefixes: `[init]`, `[feat]`, `[fix]`.
- Blank line, then a body that explains **why** (not what), wrapped
  at 80 chars. Prefer short paragraphs / bullets over a wall of prose.
- One commit per feature task.

Run `./scripts/setup.sh` (if present) to install the commit-msg hook
that validates this format.

## Translating

Adding a language is a drop-in: copy
[`src/i18n/lang/en.ts`](src/i18n/lang/en.ts) to `<code>.ts`, translate
the strings and keyword decks, and the language auto-registers via the
glob in `src/i18n/core.ts` — no other edits needed. TypeScript enforces
that every UI string exists in your file.

## Reporting bugs / ideas

Open an issue describing what you expected and what happened. For
gameplay ideas, check the "Out-of-scope" sections of the task plans
first — some things are deliberately deferred.

By contributing, you agree your work is licensed under the project's
[MIT License](LICENSE), and you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).
