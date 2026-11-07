# Mediarr branding

## App icon

The mark is a bold geometric **M** in an indigo→violet gradient
(`#6366F1` → `#8B5CF6`) on the app background `#0A0A0F`.

Generated with an image model via OpenRouter (2026-11-07). Note: OpenRouter has
no "muse" *image* model — the Meta Muse family there is text-only — so
`google/gemini-2.5-flash-image` produced the mark while
`google/gemini-3-pro-image` timed out mid-response.

Prompt:

> Design a premium app icon for a self-hosted home cinema app called Mediarr.
> Square 1:1, flat vector, extremely simple and BOLD so it reads at 48x48
> pixels. Subject: one thick chunky capital M built from two upward chevron
> strokes, and the centre V of the M is a solid upward play triangle. No inner
> holes, no cutouts, no thin lines. Solid indigo-to-violet gradient (#6366F1 to
> #8B5CF6) emblem on a near-black (#0A0A0F) background. Symmetrical, crisp
> edges, ~16% safe margin. No text, no mockup, no 3D, no shadows.

Processed locally: the generated art was cropped to the emblem, re-composed on
the exact background at 76% width, and exported to:

| Asset | Where |
|---|---|
| `mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher.png` | 48/72/96/144/192 px square |
| `mipmap-*/ic_launcher_foreground.png` | adaptive icon foreground (108..432 px, 62% safe zone) |
| `mipmap-anydpi-v26/ic_launcher.xml` + `values/colors.xml` | adaptive icon |
| `mipmap-xhdpi/tv_banner.png` | 320×180 Android TV banner with wordmark |
| `app/public/favicon-*.png`, `apple-touch-icon.png`, `mediarr-icon-192/512.png`, `site.webmanifest` | web app |

`mediarr-icon-master.png` is the 1024×1024 master for future regeneration.
