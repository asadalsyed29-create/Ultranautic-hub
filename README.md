# Framewright

A free video editor that runs in the browser as one HTML file. Everything happens on your device: nothing is uploaded, there are no watermarks, and nothing is locked.

Open `index.html` in Chrome or Edge (computer or phone), or use the GitHub Pages link once Pages is turned on.

## What it does
- Multi-track timeline: import video, pictures, SVG, GIF and audio; split, trim, duplicate, freeze frame, extract audio, speed, layer order, snapping, undo/redo, voiceover.
- Text with any font (import your own), gradients, outline, shadow, glow, background box, curved text, title cards and letter animations.
- Hand-drawn stickers, arrows, callouts and shapes (many animated), your own PNG/SVG/GIF stickers.
- Transitions, filters, effects, color adjustments, masks, chroma key, blend modes.
- Keyframes for position, scale, rotation and opacity with Regular, Smooth (bezier curve editor) and Choppy modes, a 0 to 99999x speed multiplier per keyframe gap (Clamp, Loop, Ping-Pong), and rotation that never wraps (up to ±99,999 turns).
- MP4 export at 720p, 1080p or 4K, 24/30/60 fps, chosen bitrate. Uses WebCodecs and a built-in MP4 writer.
- Projects save automatically on the device, or as a `.fwproj` file.

## Editing the code
Edit the files in `src/`, then run `sh build.sh` to rebuild `index.html`.
