# Silicon Photonics · Visual Companion

An interactive visual companion to *Silicon Photonics Design: From Devices to Systems* (Chrostowski & Hochberg).

**Live site:** https://jabezcharles420.github.io/silicon-photonics-companion/

## What it is

- **Every chunk of the book** — all 365 sections across 13 chapters (plus front and back matter), nothing skipped.
- **An explainer diagram for each** — computed from the physics in the text (equations solved, real dispersion,
  drawn to scale), then geometry-checked and independently vision-reviewed.
- **The verbatim source text** for every chunk, with its place in the book cited.
- **A dark, Apple-inspired UI** — Inter everywhere (figures included: fonts are embedded in each SVG), a
  zoomable figure viewer, full-text search with highlighted matches, and per-chapter reading progress.

## Structure

| path | what |
|---|---|
| `index.html` | landing page |
| `app.html` | the interactive companion (self-contained data) |
| `assets/` | stylesheet, scripts, favicon |
| `fonts/` | Inter + JetBrains Mono (self-hosted) |
| `figs/` | every figure as SVG with embedded font subsets |

## Notes

- 281 of 365 sections are live at the time of this build; the rest are marked *in production* and the site is
  rebuilt as the pipeline finishes them.
- Book text is reproduced verbatim for study purposes; it remains © its authors.
