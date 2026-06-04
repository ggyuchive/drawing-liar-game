#!/usr/bin/env bash
# Pre-commit gate for drawing-liar-game.
#
# Runs `pnpm lint && pnpm build` before any `git commit` in this repo.
# Blocks the commit (exit 2) if either fails.
#
# Wired in drawing-liar-game/.claude/settings.json as a PreToolUse hook on
# Bash with `if: Bash(git commit*)`.

set -uo pipefail

# CLAUDE_PROJECT_DIR is set by Claude Code when this hook fires. Fall
# back to walking up two levels from the script's location so the hook
# is still runnable from a plain shell during pipe-tests.
PROJECT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Only gate commits whose git repo root is drawing-liar-game. A `git commit`
# run from a sibling repo (dashboard/, syncup/, etc.) inside the same
# Claude Code session is allowed through untouched.
TOPLEVEL="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ "$TOPLEVEL" != "$PROJECT" ]; then
  exit 0
fi

cd "$PROJECT" || exit 0

if ! pnpm lint; then
  echo "[pre-commit] Blocked: \`pnpm lint\` failed. Fix lint errors and retry." >&2
  exit 2
fi

if ! pnpm build; then
  echo "[pre-commit] Blocked: \`pnpm build\` failed. Fix build errors and retry." >&2
  exit 2
fi

exit 0
