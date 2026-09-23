# Phase 3 animation and asset architecture

## Original Blender source

The editable source is `assets/blender/aurelia-residence.blend`. Work continued in the named `Aurelia_Residence` scene; the original default Blender scene was preserved separately. `assets/blender/build-aurelia.py` records the initial construction and deliberately refuses to rebuild an existing Aurelia scene. `assets/blender/refine-existing.py` records the guarded canopy refinement. The saved `.blend` is the authoritative final source, including the later glazing, mullion, lighting and camera refinements.

The final self-contained export is `public/models/aurelia-residence.glb`: **2,067,668 bytes (2.07 MB), 25,216 triangles, 30 mesh objects and 12 materials**. Exact parsed measurements are in `assets/blender/metrics.json`. No bitmap textures are embedded or requested by the model. Vertex colors provide restrained foliage variation. Material groups consolidate repeated architecture rather than creating hundreds of draw calls.

The model includes stone floor plates, recessed glazing, transparent balcony guards, bronze fins/mullions, a stepped companion volume, a landscaped podium, private club, reflecting pool, planted roof terrace and timber pergola. Named `Floor_18_Highlight` / `Floor_22_Highlight` objects and four `Hotspot_*` anchors survive glTF export. Transform baking and Y-up conversion happen during Blender export. Regression tests parse the GLB with the actual Three.js loader, check normals, dimensions, names and geometry budgets.

The matching arrival render is `assets/blender/aurelia-arrival.png`; the optimized transparent web fallback is `public/models/aurelia-arrival.webp` (46,890 bytes). Its transparent background shares the scene's CSS atmosphere. Re-render from the saved arrival camera after intentionally changing the model; do not rerun initial construction over successful work.

## Scene ownership

- `components/sections/architecture-journey.tsx` owns accessible HTML copy, floor controls, feature panels, eligibility, loading and fallback state. It dynamically imports the WebGL component with SSR disabled.
- `hooks/use-scene-progress.ts` owns one GSAP/ScrollTrigger normalized value, from 0 to 1. It updates the camera clock and CSS masks without React rendering on every frame. React updates only when the chapter changes.
- `lib/scene-config.ts` defines the six camera checkpoints, interpolation, fictional floors and contextual hotspots. See [the camera storyboard](PHASE-3-STORYBOARD.md) for exact position, target and FOV values.
- `components/three/aurelia-scene.tsx` owns Canvas, the error boundary and canvas lifecycle. `camera-rig.tsx`, `building-model.tsx`, `scene-lighting.tsx`, `floor-highlight.tsx`, `scene-hotspot.tsx`, `scene-loader.tsx`, `scene-fallback.tsx` and `scene-performance.tsx` keep their responsibilities separate.
- `hooks/use-pointer-parallax.ts` adds a tightly bounded, damped fine-pointer offset. It does not create another camera timeline or free orbit controls.

**Camera sequence:** Arrival → Approach → Architecture → Residences → Lifestyle → Exit. Smoothstep interpolation eases into each checkpoint and runs identically in reverse. Camera position, target, FOV, lighting, floor visibility, contextual HTML, markers and entry/exit masks derive from the same progress source.

The hero's existing photograph continues into the entry bridge and masks away over the prepared scene. On exit, the first collection photograph wipes over the composition while its media frame narrows into the page margins. Discovery and the existing Featured Residences rail retain their positions and functionality. This is a composed photographic handoff; the fictional tower is not represented as the real subject of the existing villa photography.

## Interaction and accessibility

Level 18 shows the fictional 3 BHK / 1,845 sq.ft. / INR 1.18 Cr residence; Level 22 shows 4 BHK / 2,680 sq.ft. / INR 1.95 Cr. Hover or select either HTML button to change the restrained warm floor emphasis. Both controls remain available in fallback mode.

Private club, Sky terrace, Residences and Landscaped court have contextual projected HTML markers and equivalent HTML controls. Pointer hover and clicks reveal their information; keyboard activation and taps work without hover. Chapter changes dismiss information that is no longer contextual. Existing `data-cursor` states integrate with the Phase 2 cursor. The canvas is never the sole source of residence information.

## Responsive, loading and failure behavior

Desktop uses the full pinned sequence, bounded pointer depth and up to 1.5 DPR. At widths below 1,100px, shadow cost is removed and DPR is 1. Below 1,000px, native scrolling with a shorter CSS-sticky journey replaces the desktop pin. Tablet look targets make room for the HTML copy. The 768px mobile cutoff uses viewport width, matching CSS even when a scrollbar narrows the canvas; mobile framing is centered, with no custom cursor or pointer depth.

The asset/component begins loading within 600px of the section. The architectural still remains visible underneath the branded progress indicator. Save-data preference, low reported memory/CPU capability or unavailable WebGL selects the still presentation. Model errors, canvas errors, context loss and a 45-second loading timeout also select the fallback. Mobile fallback uses normal document flow, so floor controls, architecture information and expanded panels cannot crowd each other. Existing site CTAs stay usable.

System and in-app reduced motion disable the heavy camera scene and pinning. The still, floor data, chapter controls and feature information remain accessible. No backend, live AI, database, booking service, external model request or publishing step is involved.

## Performance and cleanup

Canvas uses demand rendering; offscreen rendering is suspended. Transform updates use refs. A bounded frame sample lowers DPR to 1 after sustained slow frames. One 128px environment capture supplies restrained reflections; there is no downloaded HDRI, bloom or post-processing pipeline. Desktop has one 1,024px shadow map. Three.js is pinned to 0.182.0 for compatibility with the installed Fiber/Drei versions; this avoids their Clock/shadow deprecation warnings on newer Three releases.

Canvas diagnostics expose a bounded frame-time sample, draw calls, triangles, geometry/texture counts, DPR, camera position and active floor as data attributes. A sample during the local audit reported 28 draws, roughly 26,000 rendered triangles and DPR 1 after adaptive reduction. These are observations from this machine, not a universal frame-rate guarantee.

GSAP media contexts revert their animations and triggers. Pointer/media/visibility/context listeners, observers and loading timers are removed on cleanup. Floor material clones are disposed. Fiber owns renderer disposal; the single immutable GLTF cache is intentionally retained for reuse, rather than repeatedly loading and allocating the asset. See [the quality audit](../QUALITY-AUDIT.md#phase-3-final-audit) for executed tests and verification limits.

## Repeatable failed-model check

Run the production preview (`npm start`) and then `node tests/serve-scene-failure.mjs`. Open `http://localhost:3002/`. This loopback-only fixture proxies the production page but deliberately returns 503 for GLB requests. The expected outcome is a loaded architectural still, no remaining canvas, working floor/feature controls and working visit/navigation actions. Expected errors belong only to this fault fixture; the ordinary preview remains at `http://localhost:3001/`.
