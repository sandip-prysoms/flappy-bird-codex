# Flappy Bird Classic

A polished browser-based Flappy Bird clone with keyboard/mouse/touch support and persistent local best score.

## Features

- Smooth canvas rendering loop with frame-time clamping.
- Classic flap physics with gravity and jump impulse.
- Procedural pipe generation with gradual difficulty scaling.
- Collision detection for pipes, ceiling, and ground.
- Score + persistent best score via `localStorage`.
- Pause/resume support (`P` key or button).
- Sound toggle (`M` key or button) with Web Audio API effects.
- Accessible controls with semantic labels and visible focus states.
- Mobile-friendly input (`pointerdown`) and responsive layout.

## Run locally

Because this project is plain HTML/CSS/JS, use any static file server:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

- **Flap**: `Space`, `Arrow Up`, Click, Tap
- **Pause/Resume**: `P` or Pause button
- **Mute/Unmute**: `M` or Sound button

## Production-readiness notes

- Code is organized and documented for maintainability.
- Input handling supports desktop + touch devices.
- Save-state settings (`best score`, `mute preference`) persist safely.
- Works without build tooling for easy deployment on static hosting.

## Deploy on GitHub Pages

1. Push this repository to GitHub.
2. Ensure your default branch is `main` (or update the workflow branch filter).
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. Push to `main` (or trigger the workflow manually under **Actions**).
5. Your game will be published at `https://<your-user>.github.io/<repo-name>/`.

A ready-to-use workflow is included at `.github/workflows/deploy-pages.yml`.
