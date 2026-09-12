# Handoff: undo/redo scenario audit + joystick transform chooser

Start here. This file carries the problem statement and everything already
established, so a new session needs no prior context.

## Problem statement (from the user, verbatim)

> How do you think the `https://spline.design/` would have been handling these
> operations of entire Undo/Redo with respect to scenes and buttons lets first
> take all the scenarios with all the buttons and document every scenarios with
> respect to scene, buttons, db, three js limitations and lets create doc and
> handle all the cases add both normal and edge cases ?, create .md file under
> findings folder for it. Implement Joystick for the Transformation and give
> options to user to choose the Joystick or Legacy version handlers

Order of work the user insisted on: **write the document first**, in
`findings/`. Do not touch source files until the document exists and the cases
in it are agreed. An edit to `src/types/history.ts` was rejected with: "Wait i
told to add cases to be handled in findings folder".

Earlier scope from the same feature, still binding:

- Undo/redo wired to the 3D scene, IndexedDB, the active tool in `ToolPanel`
  and its sub-panels, both transform paths (joystick and legacy), and the
  active group in the scene options.
- Limit of 25 entries.
- Everything else in the app locked while one entry is applying.
- Operations batch their sub-operations: one eraser drag, one mirrored stroke
  or one multi-line transform is a single entry.

## Part 2 is already built

The joystick and the chooser exist and need no new work. Verify, do not rebuild:

- `src/hooks/useEditorPrefsStore.ts` holds `transformStyle` (`'joystick' |
'legacy'`), defaults to `'joystick'`, persists to localStorage.
- Burger menu row "Transform" in `src/components/canvas-operations/Editor.tsx`
  (`TRANSFORM_OPTIONS`, around line 57 and line 518) switches between them.
- `src/components/canvas-operations/TransformLine.tsx` attaches the three.js
  gizmo only when `transformStyle === 'legacy'` (line 330) and publishes the
  proxy group to the joystick only when `'joystick'` (line 344).
- `src/components/tools/ToolPanel.tsx` hides the move/rotate/scale buttons
  unless legacy (line 710).
- The joystick lives in `src/components/joystick/` and is mounted
  unconditionally in `Editor.tsx` (line 606).

Note: an earlier instruction said to comment the legacy chooser out of the UI.
This request supersedes it. The chooser stays.

## What undo/redo looks like today

Files, all already written and typechecking:

| File                                                 | Role                                                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/types/history.ts`                               | `ToolSnapshot`, `RenderSnapshot`, `HistoryPatch` (8 kinds), `HistoryEntry`                                                    |
| `src/hooks/useHistoryStore.ts`                       | stacks, `busy`, `pending`, `push`/`request`/`take`/`finish`, limit 25                                                         |
| `src/helpers/historyCapture.ts`                      | `toolSnapshot`/`applyToolSnapshot`, `renderSnapshot`/`applyRenderSnapshot`, `patchIsMeaningful`, `pushHistory`, `historyBusy` |
| `src/helpers/records.ts`                             | `cloneLineRecord`, `snapshotTransform`/`applyTransform`, `snapshotGroups`                                                     |
| `src/components/canvas-operations/HistoryBridge.tsx` | applies patches inside the canvas; calls `releaseSelection` first                                                             |
| `src/components/tools/ViewsPanel.tsx`                | the two buttons, disabled on `!canUndo`/`!canRedo` or `busy`                                                                  |

The buttons cannot reach the scene graph, so they set `pending` on the store
and `HistoryBridge` (inside the canvas) performs the work and calls `finish()`.
`Editor.tsx` renders a full-screen `cursor-wait` blocker while `busy`.

### Wired and believed working

| Action                        | Where it pushes         | Patch kind          |
| ----------------------------- | ----------------------- | ------------------- |
| Draw a stroke, with mirrors   | `DrawLine.tsx:1487`     | `lines-added`       |
| Eraser drag (batched)         | `EraseLine.tsx:100`     | `lines-flagged`     |
| Transform, legacy or joystick | `TransformLine.tsx:178` | `lines-transformed` |
| Recolour a selection          | `TransformLine.tsx:576` | `lines-recoloured`  |
| Duplicate a selection         | `TransformLine.tsx:675` | `lines-added`       |

`historyBusy()` guards exist in `DrawLine.tsx:776`, `EraseLine.tsx:61`,
`TransformLine.tsx:447`, `Joystick.tsx:267`, `ToolPanel.tsx:153`.

### Not wired

`groups-changed`, `guide-changed` and `render-changed` have types and apply
code in `HistoryBridge`, but **nothing pushes them**. Undoing a group rename or
a light-intensity change does nothing today.

Capture sites that still need writing:

- `src/components/groups/AddNewGroups.tsx` - create
- `src/components/groups/RenameGroups.tsx` - rename
- `src/components/groups/CopyGroups.tsx` - duplicate
- `src/components/groups/DeleteGroups.tsx` - delete
- `src/components/tools/SceneOptionsPanel.tsx:124` - group visibility
- `src/components/tools/SceneOptionsPanel.tsx:131` - active group
- `src/components/tools/SceneOptionsPanel.tsx:300-366` - light intensity, post
  process, sequential loading, background colour

## Findings from reading the code, to be written up in the document

Each of these is verified in the source, not a guess.

1. **`groups-changed` cannot restore a removed group.** `HistoryBridge.tsx:233`
   looks each snapshot up in the live `groupData` and drops any it cannot find.
   Undoing a group deletion, or redoing a group creation, therefore silently
   does nothing. Metadata-only snapshots are the wrong shape: carry copied
   `Group` wrappers (`{...group}`, sharing the `objects` array) on each side
   instead. Sharing the array is deliberate, so a stroke drawn after the patch
   was recorded survives its reversal.

2. **`patchIsMeaningful` compares groups with `JSON.stringify`**
   (`historyCapture.ts:109`). Harmless for metadata, ruinous if the patch
   starts carrying `Group[]`, because it would serialise every point of every
   stroke. Needs a cheap signature of uuid, name, visible, active, deleted_at
   and line count.

3. **Deleting a group leaves its strokes on screen.** The visibility effect at
   `CanvasOperations.tsx:159-173` only writes `child.visible` when it finds the
   group, so meshes of a deleted group keep their last value until reload.
   `child.visible = group ? group.visible : false` fixes it, and makes undo of
   a group deletion correct for free.

4. **Erase, then "Erase Guide", then undo restores the record but no mesh.**
   `ToolPanel.tsx:242` sets `eraseGuide`, and `ClearRemovedObjects`
   (`CanvasOperations.tsx:99-120`) disposes every mesh flagged `is_deleted`
   along with the guides. The `lines-flagged` branch only unhides an existing
   mesh, so it should fall back to `buildLineMesh` when the mesh is gone.

5. **Transform and erase only look in the active group.**
   `TransformLine.tsx:160` and `EraseLine.tsx:81` search
   `activeGroup?.objects`. Selection is filtered to the active group, so this
   is currently unreachable, but a null `activeGroup` yields an empty `moved`
   list, which means no persistence and no history entry.

6. **Merge persists nothing at all.** `TransformLine.tsx:687-845` disposes the
   source meshes, builds a `MERGED_LINE` record, adds it to the scene and never
   writes it or the index. The merge is lost on reload, the sources come back,
   and there is no history entry. Pre-existing; the `lines-replaced` patch kind
   exists for it. Also nothing in the UI currently sets `mergeGeometries`.

7. **Duplicating a group shares its line records.**
   `useRenderSceneStore.ts:121-135` copies the group wrapper but passes
   `objects: g.objects`, so both groups hold the same `LineRecord` objects with
   the same uuids. Transforming one moves the other, and the index writes the
   same line ids under two groups. Pre-existing data bug, worth documenting
   with a recommended fix even if it is out of scope.

8. **Guides are not persisted and are disposed on erase**, so a guide surface
   cannot be reconstructed after the fact. Decide explicitly whether
   `guide-changed` restores the drawing surface by holding the mesh references
   (feasible: three.js reuploads a disposed geometry on next use) or whether
   guide operations stay outside history. Do not ship a half-verified plane
   swap; `dynamicDrawingPlaneMesh` is mounted through `<primitive>` in
   `DrawLine.tsx:1500`, so manual `scene.add`/`remove` fights R3F.

9. **A non-uniform scale on a rotated multi-line selection loses accuracy.**
   `updateLineWorldPoints` stores position, rotation and scale from
   `getWorldPosition`/`getWorldQuaternion`/`getWorldScale`
   (`TransformLine.tsx:155-157`), and a sheared world matrix cannot be
   decomposed into those three. The loss happens when the transform is baked,
   before history sees it. Undo faithfully restores the approximated value.
   Fixing it means storing a full matrix per line, which changes the stored
   format.

10. **History is session-scoped, and must stay that way.**
    `loadSceneFromIndexedDB` calls `pruneOrphanLines` (`storage.ts:271-284`),
    which deletes any line key the index no longer mentions, and
    `CanvasOperations` rewrites the whole document on mount after
    `generateScene` filters out erased records. Nothing that predates a reload
    can be undone.

11. **Camera and view state is deliberately not undoable** (fullscreen,
    orthographic, FOV, grids, orbit lock in `ViewsPanel.tsx`), matching Spline,
    where camera moves are not history entries. Say so in the document rather
    than leaving it as an omission.

### Constraints worth stating in the document

- `combinedMesh.userData = line` (`drawHelper.ts:92`) means a mesh's userData
  **is** the record in `group.objects`. Every deliberate copy goes through
  `helpers/records.ts`. A patch that keeps an uncloned record watches its own
  data change.
- Stored transforms are world transforms, but a selected mesh is a child of the
  proxy group in `TransformLine`. Writing a world transform onto a still
  parented mesh composes the two. That is why `HistoryBridge.tsx:303` calls
  `releaseSelection()` before applying anything.
- IndexedDB's structured clone keeps an object's fields and discards its
  prototype, which is why points cross the boundary as `Float32Array` and are
  rehydrated on the way out (`storage.ts:62-133`). This was the original
  straight-line data-loss bug.
- Writes are per key with no cross-key transaction. Order is lines first, index
  second, so a crash in between leaves unreferenced records rather than
  dangling references.

## Design decisions already reached for the render settings

Sliders, toggles and the colour wheel all fire `onChange` continuously, so each
needs coalescing into one entry per interaction. The agreed mechanism avoids
timers:

`noteRenderChange(label)` is called immediately **before** a setting is
written. The first call of a burst captures the before-snapshot and registers
one-shot `pointerup` and `keyup` listeners on the window; whichever fires first
pushes a single `render-changed` patch. A drag commits on its own release. A
discrete click commits on the next pointer release, which always precedes the
next click handler, so an undo pressed afterwards still sees the entry.

## Verification expected before reporting done

`npx tsc --noEmit`, `npx eslint .` (baseline is 0 errors, 188 warnings) and
`npm run build`. Do not change the lint config to make a warning go away.

## Style notes for this repo

- Comments are succinct and explain why, in the places a human needs them. Not
  a comment per line.
- `src/components/canvas-operations/DrawLine.tsx` is excluded from comment
  cleanups by the user's instruction.
- LF line endings; the repo was normalised with
  `prettier --end-of-line lf`.
