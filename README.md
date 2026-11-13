# sarv

An interactive, 3D presentation of Sarvin — interior designer — in four chapters:

1. **Who am I?** — works appear as 3D point clouds, without a word about the person.
2. **The Multiverse of Me** — every experience is a planet; zoom out and their arrangement becomes the sarv mark.
3. **Connecting the Dots** — how the experiences shaped each other, on a line of time (with a guided story mode).
4. **All at Once** — every world in one picture, converging into the sarv mark.

Built with [three.js](https://threejs.org) (loaded from a CDN, so an internet connection is needed).

## Run locally

Double-click `start.bat` (Windows, needs Python), or:

```bash
python tools/serve.py 8766
```

then open http://localhost:8766.

## Controls

| Key | Action |
| --- | --- |
| `→` / `←`, PageDown / PageUp | next / previous section (clicker friendly) |
| `1`–`4` | jump to a section |
| `+` / `−` | zoom in / out (Multiverse) |
| `S` | play the story (Connecting the Dots) |
| `M` / `F` | sound / fullscreen |
| `Esc` | back |

## Editing

All text (English + Persian), years and connections live in `js/data.js`.
Media in `media/` is generated from the source folders by `tools/prep_media.py`.
