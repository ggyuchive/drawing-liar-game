# Media assets

Drop the demo clip here and the root [`README.md`](../../README.md) Demo
section renders it automatically — no edits needed.

## Autoplay (recommended) — GIF

- **File:** `docs/media/demo.gif` (exactly this name)
- **Plays:** autoplays + loops, no sound — the classic README demo.
- **Content:** multi-tab play (one keyword, one liar, several browser tabs).
- **Keep it small:** GIFs balloon fast. Aim for **< 10 MB**: ~10–20 s,
  ≤ 720p, ~12–15 fps. GitHub warns above 50 MB and blocks above 100 MB.

Quick convert from a screen recording (needs `ffmpeg`):

```sh
# mp4 -> optimized gif
ffmpeg -i demo.mp4 -vf "fps=15,scale=960:-1:flags=lanczos" docs/media/demo.gif
```

## Alternative — MP4 (higher quality, click-to-play)

GitHub strips `autoplay`/`loop` from `<video>`, so an MP4 shows a play
button instead of autoplaying. If that's fine, name it `docs/media/demo.mp4`
and switch the root README's image line to the `<video>` snippet noted in
the comment there.
