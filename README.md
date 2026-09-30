# Form Studio

An interactive 3D image, video and shape editor built with Three.js and Vite.

## Features

- Image and video surfaces: waving banners, particle flags, cylinders and spheres.
- Supernova explosions, reassembly, vortices, galaxies, glitches and shockwaves.
- Shape editor with editable JavaScript, materials and particle simulations.
- Local media storage and portable project files.
- React, Framer, Three.js and standalone HTML exports.
- Static GLB models, transparent PNG frames and six-second video captures.

## Run locally

Install Node.js and npm, then:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. To build and preview:

```sh
npm run build
npm run preview
```

Preview runs at http://127.0.0.1:4173. The production website is generated in `dist`.

See [STUDIO.md](./STUDIO.md) for controls, export instructions and limitations.

## Notes

Media and drafts stay in browser storage. Export project files for backups. Uploaded media is not included in this repository. HTML and Framer exports load Three.js from a CDN and need internet access. GLB contains the static base model rather than the particle simulation.

The code editor executes JavaScript in the page; use code you trust.

## Credits and license

Based on [Robin Payot's Vite / Three.js template](https://github.com/Robpayot/vite-threejs-template). The original MIT license and attribution are retained in [LICENSE](./LICENSE).
