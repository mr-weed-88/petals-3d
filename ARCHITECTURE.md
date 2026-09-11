# Petals3D — Architecture & System Documentation

> Reference document for the petals-3d codebase, written from a full read of `src/` at commit `2459e6d`.
> Scope: what the project is, how it works, what exists today, and where the gaps are.

---

## 1. What this is

Petals3D is a **browser-based 3D drawing tool**. The user draws freehand strokes with a mouse, stylus, or finger, and those strokes become real 3D geometry in a scene they can orbit, transform, group, and export.

It is a solo project, roughly a year old, released open-source in `2171a67`. The reference product is [feather.art](https://www.feather.art/) — a team-built tool in the same category. The stated direction is to make Petals3D as immediately usable in a browser as Excalidraw: open a URL, start drawing, no account, no install, work persists locally.

**The hard problem it solves:** a pointer gives you two dimensions. A 3D drawing needs three. Petals3D's answer is the **guide plane** — the user first draws a surface, then draws _on_ that surface. Section 3 covers this in detail; it is the central idea of the whole codebase.

### Positioning

|             | Excalidraw  | Feather      | Petals3D                                 |
| ----------- | ----------- | ------------ | ---------------------------------------- |
| Dimensions  | 2D          | 3D           | 3D                                       |
| Input       | mouse       | stylus/mouse | pointer-type aware (pen / mouse / touch) |
| Persistence | local-first | cloud        | local-first (IndexedDB)                  |
| Aesthetic   | hand-drawn  | hand-drawn   | hand-drawn                               |
| Built by    | team        | team         | solo                                     |

---

## 2. Stack

| Layer                          | Choice                      | Version           |
| ------------------------------ | --------------------------- | ----------------- |
| Build                          | Vite (Rolldown, oxc minify) | 8.3               |
| UI                             | React                       | 19.2              |
| 3D renderer                    | three.js                    | 0.186.0           |
| React ↔ three bridge           | @react-three/fiber          | 9.7               |
| 3D helpers (controls, cameras) | @react-three/drei           | 10.7              |
| Post-processing (bloom)        | @react-three/postprocessing | 3.1               |
| State                          | zustand                     | 5.x               |
| Persistence                    | idb-keyval (IndexedDB)      | 6.x               |
| Styling                        | Tailwind CSS                | 4.3 (Vite plugin) |
| Icons                          | @tabler/icons-react         | 3.46              |
| Notifications                  | react-toastify              | 11.x              |
| Type face                      | Funnel Sans (Google Fonts)  | —                 |

**No backend.** There is no API layer, no auth, and no server. Earlier commits (`4dd500d`, `65dc457`, `9483c9d`) removed a sign-in flow deliberately to make the tool free and frictionless. `axios` and `react-router-dom` remain in `package.json` as leftovers from that era with zero imports.

### Two version constraints that are not free to change

- **React is pinned to `~19.2.8`, not `^19`.** `@react-three/fiber` declares `react >=19 <19.3`, so React 19.3 breaks the peer contract. Bumping React means waiting for R3F.
- **three.js must stay below 0.187.** `postprocessing` (pulled in by `@react-three/postprocessing`) declares `three >=0.168 <0.187`. The previously pinned 0.182.0 already violated the installed copy's range; 0.186.0 resolves it.

Vite 8 ships Rolldown and no longer bundles esbuild, so `build.minify` is `'oxc'`. Setting it to `'esbuild'` fails to resolve at build time.

**Scale:** ~11,800 lines across the application, plus 18 local SVG icon components. Generic icons come from Tabler; see section 7.

### Styling conventions

Tailwind v4 is configured in `tailwind.config.js`, which v4 does **not** auto-discover — it is loaded by the `@config` directive at the top of `src/App.css`, and must be ESM because the package is `"type": "module"`. The config holds the Funnel Sans family and the three keyframe animations.

`src/App.css` contains only what a utility cannot express: resets on `html`, `body` and `#root`, none of which React renders. Everything else is an inline utility, including range-slider thumbs and number-input spinners via arbitrary variants.

Two class names carry **no styles at all** and exist purely as JavaScript hooks: `custom-scrollbar` and `gesture-allowed`. `Editor.jsx` finds them with `closest()` to exempt those containers from the page-wide gesture and scroll suppression. They are listed in the ESLint ignore list for `no-unknown-classes`. Do not remove them from markup.

---

## 3. The core mechanic: how 2D input becomes 3D geometry

This is the concept everything else is built around. It runs in two stages.

### Stage 1 — Draw a guide surface

`DynamicGuidePlane.jsx` mounts an **invisible 4000×4000 plane** at the world origin. Every frame, `SyncCameraFromMain` copies the camera's rotation onto it, so the plane is always perfectly perpendicular to the viewer — a screen-aligned scratch surface.

```
pointer (2D screen)
    │  raycast against the screen-aligned plane
    ▼
3D world point + surface normal
```

The user draws a curve on it. On pointer-up, `createContinuousRibbonGeometry(points, width=100, planeNormal)` takes that flat curve and **extrudes it 100 units along the plane normal**, producing a curved wall — a translucent grey ribbon that follows the profile the user just drew.

That ribbon is tagged `userData.type = 'OG_GUIDE_PLANE'` and handed up via `onDrawingFinished(ribbonMesh)`.

### Stage 2 — Draw on that surface

`CanvasOperations.handleGuideDrawingFinished` receives the ribbon, stores it as `dynamicDrawingPlaneMesh`, activates the pen, and locks orbit controls.

`DrawLine.jsx` now raycasts the pointer **against the ribbon** instead of a flat plane. Every stroke lands on a curved surface positioned in 3D space. Because the ribbon carries real surface normals, strokes drawn on it are oriented correctly in three dimensions.

**That is the whole trick.** Draw a profile → it becomes a surface → draw on the surface. Repeat to build up a model.

### The three guide modes

| Mode           | Component                   | What it produces                                    | `userData.type`    |
| -------------- | --------------------------- | --------------------------------------------------- | ------------------ |
| **Draw guide** | `DynamicGuidePlane.jsx`     | Extrudes a drawn profile into a wall                | `OG_GUIDE_PLANE`   |
| **Bend guide** | `DynamicBendGuidePlane.jsx` | Sweeps the stored profile along a second drawn path | `BEND_GUIDE_PLANE` |
| **Loft guide** | `LoftGuidePlane.jsx`        | Skins a surface across several selected strokes     | `LOFT_SURFACE`     |

**Bend** is the most interesting of the three. The first profile a user draws is kept in the store as `ogGuidePoints` / `ogGuideNormals`. When bend mode is entered, the user draws a _second_ curve — a rail — and `bendOGGuide(ogGuidePoints, railPoints, ...)` (`helpers/bendGuideHelper.js:360`) sweeps the profile along it. This is a classic sweep operation, and it is how curved, organic guide surfaces get built without any numeric input.

**Loft** works from existing geometry rather than new strokes. The user selects drawn lines; `helpers/loftGuideHelper.js` aligns them (`alignCurvesForLofting`), detects closed loops (`detectAndCombineConnectedLoop`), resamples them to matching segment counts (`resampleCurveNoNormals`, `ensureEvenCount`), and skins a surface across them (`createControlledLoftedSurface`).

---

## 4. The stroke geometry pipeline

A stroke is not a line primitive. It is **solid tube geometry** built from scratch, which is what gives strokes real thickness, shading, and exportability.

### Building one stroke

1. **Sample.** Pointer positions are raycast onto the active guide surface, giving a world point, a surface normal, and (for a stylus) a pressure value.

2. **Smooth.** `smoothPoints` / `smoothArray` (`helpers/drawHelper.js`) apply a moving-average window sized by the _Stable Stroke_ slider. This is the jitter reduction that makes hand input look deliberate.

3. **Thin.** `filterPoints` drops samples closer together than a tolerance, so a slow hand does not generate thousands of redundant vertices.

4. **Frame.** For each point, a **parallel-transport frame** is propagated along the curve. Rather than recomputing an arbitrary "up" vector per point (which makes the tube twist unpredictably), each frame is rotated from the previous one by the quaternion between successive tangents. This is the standard fix for the tube-twisting problem and is what keeps the stroke's cross-section stable around curves.

5. **Extrude.** Each point gets four corners — top-left, top-right, bottom-right, bottom-left — offset along the frame's right and up vectors by half-width and half-height. Those dimensions come from `getAdaptiveStrokWidth(strokeType, pressure, width)`, which is what makes the four brush types differ:

    | Brush   | Cross-section                                 | Effect                                 |
    | ------- | --------------------------------------------- | -------------------------------------- |
    | `cube`  | square, scales with pressure                  | default solid stroke                   |
    | `taper` | square, scaled by `sin(t·π)` along the stroke | thin at both ends, thick in the middle |
    | `paint` | wide, fixed 0.01 height                       | flat brush ribbon                      |
    | `belt`  | fixed 0.01 width, tall                        | vertical strap                         |

6. **Index as four separate strips.** The four faces of the tube are built as **four independent meshes**, not one. There is a comment at `DrawLine.jsx:527` explaining why: generating all four strips in one geometry produces harsh visible seams at the shared edges, and the seams become obvious once opacity drops below 1.

7. **Merge on pointer-up.** The four strips are merged with `BufferGeometryUtils.mergeGeometries`, converted to non-indexed, and given computed vertex normals and bounds. The four temporaries are removed and disposed. The result is one mesh tagged `userData.type = 'LINE'`.

### Mirroring

When mirror X/Y/Z is enabled, every sampled point is transformed into the guide plane's local space, negated on the chosen axis, and transformed back (`getMirroredPoint`). Mirrored strokes are built in parallel with the primary one — four more strips per active axis — and saved as independent `LINE` records with `is_mirror: true`.

### Tension (press-and-hold)

Holding still for one second mid-stroke enters **tension mode**. Vertical pointer movement then lerps every interior point toward the straight line between the stroke's endpoints (`applyTensionToPoints`), letting a wobbly freehand curve be straightened by feel rather than redrawn. The pre-tension state is snapshotted so the effect is continuous rather than destructive.

### Primitive shapes

Freehand is one of four shape modes. `straight` snaps to angle increments within the plane; `circle` and `arc` generate their points analytically from a center, normal, and drag radius (`generateCirclePointsWorld`, `generateSemiCircleOpenArcWorld`) while keeping the same downstream tube pipeline.

---

## 5. State architecture

Four zustand stores, split by concern. None are persisted by zustand middleware — persistence is manual and explicit (section 6).

### `useCanvasDrawStore.js` — _what the pen is doing_

The largest store. Active tool flags (`penActive`, `eraserActive`, `selectLines`, `selectGuide`, `drawGuide`, `bendPlaneGuide`, `loftGuidePlane`, `eraseGuide`), brush settings (`strokeColor`, `strokeWidth`, `strokeOpacity`, `strokeType`, `drawShapeType`, `activeMaterialType`, `pressureMode`), the mirror axes, the active guide surface (`dynamicDrawingPlaneMesh`, `plane`), the stored bend profile (`ogGuidePoints`, `ogGuideNormals`), the selection set (`highlighted`), and the detected `pointerType`.

It also holds **slider background percentages** (`widthBackground`, `opacityBackground`, …) — CSS gradient strings used to paint the filled portion of each range input. These are presentation values living in the same store as scene state.

### `useRenderSceneStore.js` — _what the scene contains and how it renders_

`activeScene` (a live three.js `Scene` reference held in React state), `groupData` (the full document — see section 6), `activeGroup`, `selectedGroups`, and all group CRUD. Also render settings: `lightIntensity`, `canvasBackgroundColor`, `postProcess`, `sequentialLoading`, `dprValue`.

### `useCanvasViewStore.js` — _camera and viewport_

`orbitalLock` (disables orbit while drawing), `cameraFov`, `isOrthographic`, the three grid plane toggles, `fullScreen`.

### `useDashboardStore.js` — _modal visibility_

Booleans for the four group modals, plus `session`, `sortBy`, and several fields left over from the removed auth/dashboard era.

### One pattern used everywhere

Every consumer reads state as:

```js
const { penActive, strokeWidth } = canvasDrawStore((state) => state)
```

The selector returns the entire state object, so it is a new reference on every change. **Every component subscribed to a store re-renders whenever any field in that store changes** — 35 call sites across 18 files. Moving the width slider re-renders the draw layer, both tool panels, the views panel, and all four group modals. This is the single largest structural constraint on drawing responsiveness.

---

## 6. Persistence model

### Storage

IndexedDB via `idb-keyval`, database `petals-3d`, object store `states`. Everything lives under **one key: the integer `0`**, holding the entire document (`db/storage.js:36`). There is a commented-out string key (`groups-draft-note`) alongside it, and a second, entirely unused save path for raw lines.

### Document shape

```
groupData: Group[]
└── Group
    ├── uuid, name, created_at, deleted_at
    ├── visible, active           // exactly one group is active at a time
    └── objects: LineRecord[]
```

### `LineRecord`

Written at `DrawLine.jsx:1384` and read back by `generateScene`:

| Field                                                                     | Purpose                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------- |
| `type`                                                                    | `'LINE'`                                             |
| `points`, `normals`, `pressures`                                          | the raw sampled stroke — the source of truth         |
| `loft_points`                                                             | copy of `points`, consumed by the loft tool          |
| `color`, `width`, `opacity`, `stroke_type`, `shape_type`, `material_type` | appearance, replayed on load                         |
| `optimization_threshold`, `smooth_percentage`                             | **the exact smoothing parameters used at draw time** |
| `position`, `rotation`, `scale`                                           | transform, as plain objects                          |
| `is_mirror`, `mirror_mode`                                                | mirror provenance                                    |
| `uuid`, `group_id`                                                        | identity and ownership                               |
| `is_deleted`                                                              | soft-delete flag                                     |

### Why geometry is not stored

Only the **input samples** are persisted, never the generated vertex buffers. On load, `generateScene` (`helpers/drawHelper.js:4`) replays the entire pipeline from section 4 — smooth, thin, frame, extrude, merge — for every stroke in every group.

This is a genuinely good decision. It keeps stored documents small and makes strokes re-renderable at different qualities later. It also means `optimization_threshold` and `smooth_percentage` must be stored per stroke, because reproducing a stroke requires the exact parameters it was drawn with.

### The prototype problem

`idb-keyval` serializes with **structured clone**, which preserves an object's own properties but discards its prototype. A `THREE.Vector3` goes in as a vector and comes back as `{x, y, z}` with no methods on it. Any restore-path code that calls a `Vector3` method on a loaded point will throw. This is the root cause behind the reload failures noted in section 10.

### When saving happens

On discrete actions only: stroke completed, stroke erased, transform applied, group created / renamed / copied / deleted, group visibility or active-group changed. Each writes the whole `groupData` document.

There is **no autosave on interval, no `beforeunload`, and no `visibilitychange` flush.** A closed tab or a crash loses everything since the last completed action.

### Aliasing between scene and store

At `DrawLine.jsx:1408` one object literal is assigned to `combinedMesh.userData`; at `:1820` that same object is pushed into the group's `objects` array. **The mesh's userData and the persisted record are the same object in memory.** Mutating one mutates the other.

Some features rely on this: the eraser marks a stroke deleted by writing `obj.userData.is_deleted = true` and trusting the store to see it (`EraseLine.jsx:36`). It works, but it means there is currently no point in the data flow where an immutable snapshot could be taken — which is exactly what undo/redo requires. See section 10.

---

## 7. Component map

```
main.jsx
└── App.jsx                           toast container + editor
    └── canvas-operations/Editor.jsx  top-level chrome, load, GLTF export
        ├── tools/ToolPanel.jsx       left rail — mode selection
        │   ├── PenOptionsPanel.jsx   brush settings (shown when pen active)
        │   └── SceneOptionsPanel.jsx groups + render settings
        ├── Canvas3d.jsx              <Canvas>, cameras, lights, grids, orbit
        │   └── CanvasOperations.jsx  wires every interaction layer
        │       ├── DynamicGuidePlane.jsx       draw a guide surface
        │       ├── DynamicBendGuidePlane.jsx   sweep a guide along a rail
        │       ├── LoftGuidePlane.jsx          skin across selected strokes
        │       ├── TransformGuide.jsx          gizmo for guide surfaces
        │       ├── DrawLine.jsx                the stroke engine (1,844 lines)
        │       ├── TransformLine.jsx           gizmo, copy, merge, recolor
        │       └── EraseLine.jsx               raycast eraser
        ├── tools/ViewsPanel.jsx      right rail — camera, grids, fullscreen
        └── groups/*.jsx              four modals: add, rename, copy, delete
```

### Notable files

| File                         | Lines | Role                                                                                             |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------ |
| `DrawLine.jsx`               | 1,844 | The stroke engine. Pointer handling, tension mode, mirroring, all four shape types, merge, save. |
| `ToolPanel.jsx`              | 783   | Mode switching. Each mode is a `case` that sets ~10 store flags.                                 |
| `helpers/drawHelper.js`      | 776   | Geometry math and `generateScene` (the load path).                                               |
| `TransformLine.jsx`          | 700   | Selection gizmo, copy, geometry merge, recolor.                                                  |
| `DynamicGuidePlane.jsx`      | 691   | Guide surface creation.                                                                          |
| `GuidePlane.jsx`             | 661   | **Dead.** Imported nowhere. An earlier static-plane implementation.                              |
| `helpers/loftGuideHelper.js` | 595   | Curve alignment, resampling, loft surface construction.                                          |
| `helpers/bendGuideHelper.js` | 424   | The sweep operation.                                                                             |

### Icons

Generic icons come from `@tabler/icons-react`, imported by name at each call site. Tabler's props are `size` and `color`, which is what the old local components took, so usage is unchanged.

`src/components/svg-icons/` retains **18 components that Tabler has no faithful equivalent for**, all specific to this app's domain:

| Group            | Components                                                                          |
| ---------------- | ----------------------------------------------------------------------------------- |
| Brush profiles   | `CubeStrokeIcon`, `TaperStrokeIcon`, `PaintStrokeIcon`, `BeltStrokeIcon`            |
| Shading modes    | `FlatShadeIcon`, `GlowShadeIcon`, `RespondShadeIcon`                                |
| Guide operations | `GuideIcon`, `BendGuidePlaneIcon`, `LoftGuideIcon`, `SelectGuide`, `EraseGuideIcon` |
| Stylus pressure  | `PressureActiveIcon`, `PressureInActiveIcon`, `StableStrokIcon`                     |
| Transform / view | `LocalModeIcon`, `GlobalModeIcon`, `OrthograhicView`                                |

These depict brush cross-sections, material response, and guide-plane operations. A generic icon set cannot express them, so they stay hand-drawn. Add new domain icons here and take everything else from Tabler.

### Scene object taxonomy

Everything in the scene is identified by `userData.type`. `config/objectsConfig.js` defines which tools act on which:

| Type                 | Meaning                              | Erasable | Treated as a guide |
| -------------------- | ------------------------------------ | -------- | ------------------ |
| `LINE`               | a completed stroke                   | ✅       |                    |
| `MERGED_LINE`        | several strokes merged into one mesh | ✅       |                    |
| `OG_GUIDE_PLANE`     | extruded guide surface               |          | ✅                 |
| `BEND_GUIDE_PLANE`   | swept guide surface                  |          | ✅                 |
| `LOFT_SURFACE`       | lofted surface                       |          | ✅                 |
| `DYNAMIC_GUIDE_LINE` | the in-progress guide stroke preview |          | ✅                 |

Guide objects are transient scaffolding. They are cleared wholesale by `ClearRemovedObjects` in `CanvasOperations.jsx` and are never persisted.

---

## 8. Tool inventory

### Modes (`ToolPanel.handleDraw`)

Each mode sets a large set of mutually exclusive flags. There are ten:

`pen` · `eraser` · `selectLines` · `selectGuide` · `draw_guide` · `erase_guide` · `bend_guide` · `loft_guide` · `cancel_loft_guide` · `generate_loft_guide`

### Brush settings (`PenOptionsPanel`)

- **Color** — custom picker with hex input and eyedropper
- **Brush** — taper · cube · paint · belt
- **Shape** — free hand · straight · circle · arc
- **Material** — flat (unlit) · shaded (PBR) · emissive (glow, feeds bloom)
- **Opacity**, **Width**, **Stable Stroke** — sliders
- **Mirror** — independent X / Y / Z toggles

### View controls (`ViewsPanel`)

- **Full screen**
- **Perfect View** — snaps the camera to the nearest axis, preserving zoom distance
- **FOV slider** — eased toward the target each frame by `SmoothFOV`
- **Grids** — independent X / Y / Z grid planes, colored crimson / emerald / blue by axis
- **Orbit lock** — freezes rotation and pan so drag gestures draw instead of orbit
- **Undo / Redo** — **buttons present, no handlers attached**

### Pointer-type awareness

Distinctive to this codebase: the app resolves the user's input device on first contact (`Editor.jsx:69`), stores it as `pointerType`, and **every interaction handler gates on it** (`if (event.pointerType === pointerType)`). This prevents a palm resting on a tablet from drawing while the stylus is in use. It can be overridden manually from the burger menu.

### Export

GLTF via three.js `GLTFExporter`, ASCII `.gltf`, from the burger menu. Guide surfaces are included in the export because they live in the same scene — arguably they should be filtered out.

---

## 9. Rendering setup

- **Cameras** — perspective (default, FOV-adjustable) or orthographic, switchable. Orbit distance clamped 20–150.
- **Lighting** — one directional light with a 1024² shadow map, plus a fixed `ambientLight` at intensity 10. The user-facing "light intensity" slider drives only the directional light; the very high ambient means the scene stays readable at zero.
- **Bloom** — optional `EffectComposer` + `Bloom` pass. `SceneComposer` defers mounting until after the first frame, and enables camera layer 1 with `gl.autoClear = false` to composite a separate glow layer.
- **DPR** — capped at `[1, 2]`.
- **Sequential loading** — an optional reveal animation that hides every object and un-hides them at 100 ms intervals.

---

## 10. Current state

### Working

Drawing, the full guide-plane system, all four brushes and four shapes, mirroring, tension mode, the eraser, transform gizmos, copy, geometry merge, groups with visibility, GLTF export, local persistence, and a mobile-aware responsive layout with browser gesture suppression.

The build is healthy: `npm install` and `vite build` both succeed, producing a 425 kB gzipped bundle in about three seconds.

### Broken

Three defects destroy user work silently. All three were reproduced, not inferred.

1. **Straight-line strokes do not survive a reload.** `filterPoints` (`drawHelper.js:585`) calls `distanceTo` on restored points, which no longer have the `Vector3` prototype after structured clone. Freehand escapes only because `smoothPoints` rebuilds real vectors first; straight lines skip smoothing and go directly into the filter. The `try/catch` in `updateLine` swallows the throw into a `console.log`, leaving empty geometry and no visible error.

2. **Group visibility and active-group switches are never written to disk.** `SceneOptionsPanel.jsx:117` and `:124` call `saveGroupToIndexDB`, which is never imported in that file — of the ten files that call it, this is the only one missing the import. Both handlers are `async`, so the `ReferenceError` becomes an unhandled rejection rather than a visible crash. Both are wired to live controls.

3. **Recoloring a selected line throws.** `TransformLine.jsx:371–373` reference `object` inside a callback whose parameter is `obj`. With no error boundary anywhere in the tree, the throw blanks the editor.

Supporting problems: `setError` is undefined in the save-failure branches of three group modals, so the one path that could have reported failure #1 is itself broken.

### Fragile

- **`filterPoints` tolerance check is a malformed ternary** (`drawHelper.js:599`). At exactly three points the condition evaluates to a truthy object, so thinning is skipped entirely. This also happens to be why bug #1 does not fire at three points.
- **`generateScene` calls `createInitialLineMesh` with 7 arguments for 6 parameters** (`drawHelper.js:18` → `:625`). Every value shifts one slot left. It survives only because each corrupted value is overwritten or disposed downstream.
- **Guide-plane drawing state lives in plain `let` bindings**, not refs (`DynamicGuidePlane.jsx:37–43`). Any re-render mid-stroke wipes the in-progress stroke — and whole-store subscriptions make re-renders frequent.
- **`setRenderMode` writes to the wrong key** (`useRenderSceneStore.js:160`), assigning `renderOptions` instead of `renderMode`.
- **Six components are declared inside other components' render bodies** (`Editor.jsx:150`, `Canvas3d.jsx:41/80/93/115`, `CanvasOperations.jsx:82`). Each is a fresh function identity per render, so React remounts the subtree instead of updating it. The largest registers fourteen document-level listeners on mount — all fourteen churn on every editor render.

### Missing

- **Undo / redo.** Buttons exist without handlers. The blocker is architectural, not UI: a command history needs immutable snapshots, and the mesh-to-store aliasing in section 6 means no such snapshot point exists yet. This must be resolved first.
- **Tests and CI.** Zero tests, no `.github` directory. `lint-staged` is configured in `package.json` but no git hook ever invokes it.
- **Error boundary.** Any throw blanks the editor.
- **Crash-safe save.** No `visibilitychange` or `beforeunload` flush.
- **Code splitting.** One 1.5 MB JS chunk, past Vite's warning threshold.

### Signal-to-noise in tooling

`eslint` reports 130 problems: 103 errors and 27 warnings. But **93 of the 103 errors are unused `(e)` parameters on click handlers.** The 10 genuine undefined references — which include all three data-loss bugs above — are buried in that noise. Setting `args: 'none'` on the `no-unused-vars` rule takes the error count from 103 to 10, and every survivor is a real defect.

### Dead code

| Item                                                                                     | Lines |
| ---------------------------------------------------------------------------------------- | ----- |
| `canvas-operations/GuidePlane.jsx` — imported nowhere                                    | 661   |
| `toolHelper.handleGroupOperation` — calls a React hook outside a component               | 22    |
| `db/storage.js` — `saveSceneLinesToIndexDB`, `customReplacer`, `clearSceneFromIndexedDB` | ~40   |
| `getSnappedLinePointsInPlane` — builds an interpolated array, returns only the endpoint  | ~14   |
| `helpers/sceneActions.js` — a comment block assigned to an unread variable               | 9     |
| `axios`, `react-router-dom` — dependencies with zero imports                             | —     |

### Duplication

The parallel-transport ribbon builder from section 4 exists in **five near-identical copies**, roughly 150 lines each: `DrawLine.jsx:423` and `:620` (same file, sixty lines apart), `DynamicGuidePlane.jsx:207`, `DynamicBendGuidePlane.jsx:127`, and `drawHelper.js:188`. They have already drifted — only some populate the vertex color attribute.

Relatedly, every vertex carries **four color floats that nothing reads**: no material in `getActiveMaterial` sets `vertexColors`, so three.js never binds the attribute. The highlight-reset loop in `CanvasOperations.jsx:113` walks every vertex of every selected mesh rewriting colors that cannot render. Either enable `vertexColors` and get per-vertex tinting for free, or drop the attribute and reclaim the memory.

---

## 11. Notes toward the browser-friendly goal

The Excalidraw comparison implies specific properties the codebase does not have yet:

- **Never lose work.** Currently three known paths lose it silently, and there is no crash-safe flush. This is the gap between the current state and "as trustworthy as Excalidraw."
- **Instant, obvious first run.** The app currently opens with a blocking toast asking the user to pick a pointer type before anything else happens.
- **Shareable.** No URL-encoded scenes, no export/import of a document file, no collaboration. GLTF export is one-way and includes guide scaffolding.
- **Fast on mid-range hardware.** Whole-store subscriptions and per-render component remounting are the two structural ceilings here, and both are fixable without touching the geometry code.

---

_Document generated from a full read of the codebase. Line references are accurate as of commit `2459e6d`._
