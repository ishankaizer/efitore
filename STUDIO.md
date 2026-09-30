# Form Studio

A local Three.js editor built on Robpayot's Vite template.

## Run

- `npm run dev`: live development at http://127.0.0.1:5173.
- `npm run build`: production files in `dist`.
- `npm run preview`: built app at http://127.0.0.1:4173.

## Shape lab

Choose an element, edit its material and transform, or write JavaScript. The editor supplies `THREE` and `material`; return a Mesh or Group. Run / Ctrl+Enter applies your code. Errors retain the last working object. Code runs in the page, so use code you trust.

The particle engine samples your mesh surface. Choose Supernova, Vortex, Galaxy, Wavefield or Morph. Adjust particle count, size, force, speed, turbulence, gravity, colors and pointer repulsion. Explode triggers a burst, Reassemble brings it back, and the phase slider pauses at an exact point. Loop controls repeating explosions. These are procedural visual simulations, not a collision or fluid physics solver.

Each element keeps its draft and settings locally. Exports use the last successfully applied code.

## Media studio

Import images or videos (up to 100 MB each). Assets persist in this browser's IndexedDB. Choose Supernova, Vortex, Galaxy, Glitch slices, Shockwave, Flat card, Silk banner, Particle flag, Cylinder or Sphere.

Drag to orbit, scroll to zoom and hover to distort. Controls adjust deformation, particles, transforms and simulation strength. Pause video and Pause motion are separate in the editor. Videos loop and start muted. Image files are still textures; use MP4/WebM for animation.

## Export / code

- **React component**: install `three@0.149.0`, copy or download `FormEffect.jsx`, import it, then render `<FormEffect style={{ width: '100%', height: 500 }} />`. It mounts and cleans up its own canvas. Supports `autoPlay` and `interactive` props.
- **Framer component**: paste `FormEffect-Framer.jsx` into a new Framer Code file, then drag FormEffect onto the canvas. It uses an isolated iframe with the complete scene. No Three.js package installation is required. `showControls` displays replay/pause buttons. The wrapper was tested in a React browser harness; publishing within Framer itself was not tested.
- **Three.js module**: install `three@0.149.0`; import `mountEffect`, then call `await mountEffect(container)`. Give the container an explicit height. Returned controls: `trigger()`, `reassemble()`, `pause(true/false)`, `dispose()`.
- **Interactive HTML**: a standalone scene with orbit, zoom and effect controls. Media is embedded. HTML and Framer exports load pinned Three.js modules from jsDelivr, so internet access is required.
- **Project file**: saves settings, applied shape code or embedded media as JSON. Use Open project to reopen. Imported shape code is staged for review; press Run to apply it.
- **GLB**: static base geometry and material for compatible 3D apps. Does not contain the particle simulation or animated shaders. Video surfaces use a still frame.
- **Transparent PNG**: current rendered frame at the viewport resolution.
- **Record 6-second clip**: captures the rendered canvas at 30 FPS, without audio or editor UI. Output is WebM or MP4 according to browser support. It records the current play/pause state.

Media is embedded by default. React, Framer and JavaScript exports also accept a hosted media URL; the server must permit cross-origin loading. Large embedded videos create large code files. Browser autoplay policies may require a click before video playback.

## Storage and source

Storage belongs to the exact URL/port. Clearing site data removes saved media and drafts; download project files for portable backups. The app is a local editor, not a full filesystem IDE.

- `src/js/index.js`: scene, shape factories and editor.
- `src/js/shape-fx.js` / `particle-runtime.js`: shape particle controls and simulation.
- `src/js/media-studio.js` / `media-runtime.js`: media library, effects and shaders.
- `src/js/export-hub.js` / `export-generator.js`: exports and reusable runtimes.
- `src/index.html` / `src/scss/style.scss`: workspace layout and styling.

The original template's MIT license and source files are retained. This is an original implementation of the general particle-banner technique, not a reproduction of the reference portfolio's full choreography or branding.

Framer code files have a 1 MB limit. Oversized Framer exports are blocked before copying. Upload the original media to a host that permits cross-origin loading, paste its direct image/video URL in the export panel, and copy the smaller component. A sharing-page URL is not a direct media URL.
