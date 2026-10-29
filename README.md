# Fuchsiafish campaign

The local campaign starts at `main.html`. Open it directly, or serve this directory:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8080/main.html`.

## Structure

```text
main.html                     Campaign entry and semantic content
assets/css/base.css           Shared theme, header, footer, accessibility
assets/css/campaign.css       Campaign composition and responsive layout
assets/js/main.js             Page initialization and playback control
assets/js/campaign/scene.js   Isolated Canvas/WebGL animation and lifecycle
assets/images/               Original extracted character assets and favicon
prototype.html               Unmodified reference prototype
```

No build, package installation, external font, API, or runtime dependency is needed. Character PNGs are extracted byte-for-byte from the prototype. The original supplied JPG is retained unchanged. Novel links preserve the prototype's destination.

The animation completes a loop in 9.6 seconds. Entry takes one second, and the eighteen bites take five seconds; cards and charge restore during the final part of the return so the next attack begins immediately. `No Charge Left` appears when the simulated charge reaches zero. Rendering uses uniform scaling to keep the phone and fish proportions consistent.

At widths up to 850px, the headline sits behind the animated scene. The phone is aligned toward the right, while the headline wraps into a readable stack on the left. The fish crosses the words and reveals them when it enters the phone. The shared stage fits small portrait viewports starting at 320 × 568; wider screens retain the side-by-side composition.

The pause control and Space key on the canvas control playback. Reduced-motion preferences start the scene paused. Rendering stops when the page is hidden or the scene is off-screen. If WebGL is unavailable, the scene uses its Canvas fallback; if the frontal asset is unavailable, the side view remains usable.

`window.fuchsiafish` provides `pause()`, `resume()`, `toggle()`, `seek(seconds)`, `state`, `timings`, and `destroy()`. The scene is separate from the page so future routes can mount and unmount it. A future forum can use separate feature scripts/styles and its own server/API; no forum, accounts, storage, or backend is implemented here.

Everything is local. No hosting configuration, cloud upload, publishing, or repository push is part of this version.
