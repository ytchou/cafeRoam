# favicon.ico as PNG bytes — format mismatch trap

**Date:** 2026-03-16
**Context:** PWA Tier 1 installability — icon generation script using @napi-rs/canvas

**What happened:** The icon generation script wrote `canvas.toBuffer('image/png')` to a file named `favicon.ico`. The result is a file with PNG magic bytes (`89 50 4E 47`) and an `.ico` extension. Modern Chrome/Safari/Firefox accept this silently, but strict ICO parsers (some OS-level favicon pickers, IE, older Android WebViews) reject it.

**Root cause:** `@napi-rs/canvas` (and the HTML Canvas API generally) only outputs PNG or JPEG — it has no ICO encoder. The `.ico` extension was chosen by convention without verifying the output format.

**Prevention:** When generating favicons with a canvas library, use `.png` as the extension. Reference it as `/favicon.png` in metadata with `type: 'image/png'`. Browsers with `<link rel="icon">` in the `<head>` use that instead of the default `/favicon.ico` auto-fetch. If a true multi-resolution `.ico` is needed, use a dedicated ICO encoder library (`png-to-ico`, `sharp` with ICO output, etc.).
