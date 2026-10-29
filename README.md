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
assets/js/campaign/turn-sequence.js  Continuous sampling of the prepared yaw poses
assets/js/campaign/turn-atlas.js     Shared frame dimensions, scale and pivot
assets/js/campaign/paper-bite.js     Tooth-pinned paper mesh and progressive tearing
assets/js/campaign/headline.js       Measured title ink, bite masks and gradual letter repair
assets/images/               Original extracted character assets and favicon
prototype.html               Unmodified reference prototype
```

No build, package installation, external font, API, or runtime dependency is needed. The original side and front character PNGs are extracted byte-for-byte from the prototype. The turn atlas is new artwork generated with the built-in ImageGen tool from those two references; its prompt is saved alongside the PNG. The original supplied JPG is retained unchanged. Novel links preserve the prototype's destination.

The header icon and browser favicons use resized copies of the existing side-view fish artwork, preserving its proportions and transparency. `favicon.ico` includes 16, 32, 48, and 64 pixel versions; `favicon-32.png` supplies a PNG alternative.

The phone's two gallery cards show a family birthday and a two-character selfie at Hafezieh in Shiraz. Both are fantasy cartoon illustrations with exaggerated, non-photorealistic faces and uncovered hair; they were generated with the built-in ImageGen tool from text only. The WebP assets and exact prompts are in `assets/images/phone-photos/`. Both images load before the scene starts, use proportional crops, and form part of the card textures, including their torn and swallowed pieces.

The animation completes a loop in 24.4 seconds. The original 13.8-second phone visit and return retain their path, scale, bite timing and charge reset. Entry takes 1.2 seconds; eighteen bites take 5.4 seconds, with another 2.4 seconds reserved for five turns between cards. `No Charge Left` appears when the simulated charge reaches zero. Rendering uses uniform scaling to keep the phone and fish proportions consistent.

After its first escape and return, the fish hunts the real `THE / FUCHSIAFISH / ARE COMING.` headline. It tears off three transparent pieces of ink per visual row, using the same tooth-pinned mesh as the phone documents. Desktop has three rows; the compact layout has five. The extra hunt takes 8.1 seconds, with travel before and after it. The first phone visit leaves the heading intact. On subsequent visits, the heading remains eaten through entry, then repairs over 3.25 seconds while the fish feeds inside the phone. Letters grow from their baselines with staggered opacity and clipping; no whole-title visibility toggle is used. Seeking, pausing and resizing preserve the appropriate headline state. The drawing canvas extends over the title without moving the phone or changing the existing page composition.

A continuous, periodic swim path carries position, speed, and facing through entry, feeding, escape, and return. Turns now sample `fuchsiafish-turn-smooth.webp`: 129 registered yaw views prepared locally with [RIFE motion-compensated interpolation](https://github.com/nihui/rife-ncnn-vulkan). The source atlas contains inconsistent side profiles, so preparation uses its consistent right-to-front poses and mirrored body views; the asymmetric lure is projected separately before interpolation. The two endpoints come from the actual side rig. Every sample shares one fixed pivot and uniform scale; no runtime bounding-box fitting or side/front/side switching is used. Adjacent prepared samples are interpolated continuously with premultiplied alpha, without rounding the yaw to an integer frame.

The travelling tail wave continues through turns and the transition back to the articulated biting jaw. The five feeding turns no longer have an artificial scale dip. Both return turns keep a constant scale; foreground depth is recovered during the straight section between them. The fish stays behind the phone until its larger foreground silhouette clears it. Turn durations, eighteen bite contacts, and the original 13.8-second phone path are preserved. Motion is sampled from time, so refresh rate does not change playback speed ([requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)).

To check timing and scale regressions, run `node tests/animation.cjs` and `node tests/headline.cjs`. To rebuild the prepared atlas offline, use `python3 tools/bake-turn-sequence.py --rife /path/to/rife-ncnn-vulkan`; this needs Pillow, NumPy, pycairo, Node, and the official RIFE 20221029 executable with its `rife-v4.6` model beside it. Preparation uses two background mattes to recover transparency. These are asset preparation dependencies only; visitors download a 3.6 MB WebP and run the normal Canvas renderer. The source PNGs remain unchanged. The build script makes no network calls.

Inside the screen, each 0.30-second bite now has a visible contact, tug, tear and swallow. `paper-bite.js` deforms a mesh textured from the actual card; its bitten point follows a lower-jaw tooth, while the opposite edge stays pinned until the crack reaches both corners. The fish eats from the approaching edge, keeping the remaining paper in front of its face. The same mesh is rendered outside the fish and behind its teeth, with a moving lower-mouth mask, folds, paper fibres and printed fragments. Paper slides behind the throat before removal. Charge changes when the paper tears (64% of the bite), and the last piece is swallowed before the fish begins its next turn. The eighteen phone bites and the duration of the phone visit remain unchanged.

At widths up to 850px, the headline sits behind the animated scene. The phone is aligned toward the right, while the headline wraps into a readable stack on the left. The fish crosses the words and reveals them when it enters the phone. The shared stage fits small portrait viewports starting at 320 × 568; wider screens retain the side-by-side composition.

The pause control and Space key on the canvas control playback. Reduced-motion preferences start the scene paused. Rendering stops when the page is hidden or the scene is off-screen. If WebGL is unavailable, the scene uses its Canvas fallback; if the frontal asset is unavailable, the side view remains usable.

`window.fuchsiafish` provides `pause()`, `resume()`, `toggle()`, `seek(seconds)`, `state`, `timings`, and `destroy()`. The scene is separate from the page so future routes can mount and unmount it. A future forum can use separate feature scripts/styles and its own server/API; no forum, accounts, storage, or backend is implemented here.

The site and source remain local. No hosting configuration, publishing, or repository push is part of this version. Only the two character reference PNGs were sent to ImageGen, with explicit user permission, to create the new turn artwork.
