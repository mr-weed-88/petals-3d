# Undo / Redo: the complete case list

Companion to `findings/undo-redo.md`, which carries the problem statement and
the audit. This file is the specification: every control in the editor, what
one undo of it must do, and what the scene, the database and three.js allow.

Written against the source at `528d46d`. Every claim about current behaviour
was read out of the code, not inferred.

---

## 1. What a history entry is here

One user action is one entry, no matter how many objects it touched. A mirrored
stroke that produced four lines, an eraser drag that crossed nine strokes, a
transform of a twelve-line selection: each is a single undo.

An entry is a **patch pair**, not a document snapshot. It stores what the
operation replaced and what it produced, so the cost of history is proportional
to what changed rather than to the size of the drawing. This is the same choice
Spline, Figma and Blender make, and it is what keeps a 25-entry stack cheap when
a single stroke can carry fifty thousand points.

An entry also carries the tool state on both sides (`ToolSnapshot`), because an
undo that leaves you in a different tool than the one you acted in feels like
the editor moved under you.

### The pieces

| File                                                 | Role                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/types/history.ts`                               | patch kinds, `HistoryEntry`, the two snapshot shapes                    |
| `src/hooks/useHistoryStore.ts`                       | the two stacks, `busy`, `pending`, limit 25                             |
| `src/helpers/historyCapture.ts`                      | snapshot/apply tool and render state, `pushHistory`, `noteRenderChange` |
| `src/helpers/records.ts`                             | every deliberate copy of a record or a group                            |
| `src/components/canvas-operations/HistoryBridge.tsx` | applies patches inside the canvas                                       |
| `src/components/tools/ViewsPanel.tsx`                | the two buttons                                                         |

The buttons are ordinary DOM and cannot reach the scene graph. They set
`pending` on the store; the bridge, which is mounted inside the `<Canvas>`,
picks it up, applies every patch and calls `finish()`. While that runs,
`Editor.tsx` covers the app with a `cursor-wait` blocker at `z-20`, and nothing
in the tree renders above that layer.

---

## 2. Invariants every case has to respect

These are properties of the codebase, not of the history feature. A case that
violates one of them is a bug regardless of what undo does.

**I1 - A mesh's `userData` is the record.** `drawHelper.ts:92` assigns the
record object itself to `combinedMesh.userData`, and the same object is pushed
into `group.objects`. One object, two owners. Any patch that keeps a record it
did not clone will watch its own stored data change. Every deliberate copy goes
through `helpers/records.ts`.

**I2 - Stored transforms are world transforms.** A selected mesh is a child of
the proxy `Group` in `TransformLine`, so writing a world transform onto it while
it is still parented composes the two. `HistoryBridge` calls `releaseSelection()`
before applying anything, which hands every selected mesh back to the scene with
its world transform as its own.

**I3 - IndexedDB discards prototypes.** Structured clone keeps an object's
fields and drops its class, so a `THREE.Vector3` comes back as a bare `{x,y,z}`.
Points cross the boundary as `Float32Array` and are rehydrated on the way out
(`storage.ts:72-133`). This was the original straight-line data-loss bug.

**I4 - There is no cross-key transaction.** Writes go lines first, index second,
so a crash between them leaves unreferenced records rather than dangling
references. Orphans are swept at the next load by `pruneOrphanLines`
(`storage.ts:271-284`).

**I5 - Geometry is never stored.** Only the input samples are. `buildLineMesh`
replays the whole smooth/thin/frame/extrude/merge pipeline from `points`,
`normals`, `pressures` and the per-stroke smoothing parameters. A record with an
empty `points` array cannot be rebuilt into a mesh. This single fact decides
case **M-1** below.

**I6 - History is session-scoped.** `loadSceneFromIndexedDB` prunes orphans, and
`CanvasOperations` rewrites the whole document on mount after `generateScene`
has filtered out erased records. Nothing that predates a reload can be undone,
and the stack starts empty every time. This matches Spline, where history does
not survive a reload either.

**I7 - One action at a time.** `busy` is set when a request is made, not when
the bridge picks it up, so nothing can land in the gap. `push` is refused while
`busy`, which is what stops undo's own writes from being recorded as new
actions.

---

## 3. The case matrix

Each case states the normal path, what one undo must do, the edge cases, and the
status. **Wired** means it works today. **Gap** means it must be built. **Out of
scope** means a deliberate decision not to.

---

### D - Drawing

#### D-1 Draw one stroke · _wired_

Pointer-up builds the mesh, pushes the record into `activeGroup.objects`, writes
the line and then the index, and pushes one `lines-added` patch carrying cloned
records (`DrawLine.tsx:1487`).

Undo removes the records from the group, removes and disposes the meshes, and
deletes the line keys. Redo clones the stored records again, rebuilds meshes
with `buildLineMesh` and rewrites them.

_Why redo clones a second time:_ handing the scene the same record object the
history entry is still holding would recreate I1 between the scene and the undo
stack, and a subsequent transform would rewrite the stack's own copy.

**Edge cases**

- _Mirrored stroke._ One to four records in a single patch, so one undo takes
  the whole gesture. Already batched.
- _Stroke drawn with no active group._ `activeGroup` is null, the records are
  never pushed, and the patch carries `groupId: ''`. `applyPatch` finds no
  group and returns. Nothing to undo, correctly.
- _Zero-length stroke._ A tap produces no record, so `patchIsMeaningful` rejects
  the patch and no entry is pushed. This is what stopped the buttons from
  looking live while doing nothing.
- _Undo after the stroke's group was deleted._ The group is gone from
  `groupData`, so `applyPatch` returns early and the entry is consumed with no
  effect. Acceptable: the group deletion is itself the more recent entry, and
  undoing that first restores the group.
- _Tension mode._ Press-and-hold reshapes the in-progress stroke before
  pointer-up. It is part of drawing the stroke, not a separate action, so it is
  inside the same entry. Correct as is.

#### D-2 Draw a guide surface · _out of scope, see §4_

---

### E - Eraser

#### E-1 One eraser drag · _wired_

Every stroke the drag crossed is flagged `is_deleted`, its mesh hidden, and one
`lines-flagged` patch is pushed on pointer-up (`EraseLine.tsx:100`). The records
are kept, not dropped, which is what makes the strokes recoverable at all.

Undo clears the flag, shows the mesh again, and restores the material's opacity
and colour from the record. That last part matters: the eraser fades what it is
about to remove to 0.5, and showing the mesh without resetting opacity left an
already-faint stroke looking as if undo had done nothing.

**Edge cases**

- _Pointer-up with the eraser in hand but nothing crossed._ Pointer-up is bound
  to the window, so releasing anywhere used to write the index and record an
  erase of zero lines. Guarded at `EraseLine.tsx:67`.
- _Erase, then "Erase Guide", then undo._ **Gap.** `ToolPanel.tsx:241` sets
  `eraseGuide`, and `ClearRemovedObjects` (`CanvasOperations.tsx:97-126`)
  disposes every mesh flagged `is_deleted` along with the guide surfaces. The
  record survives but the mesh does not, so the undo branch has nothing to
  unhide. It must fall back to `buildLineMesh` when the mesh is missing. I5 is
  satisfied here because an erased `LINE` still holds its points.
- _Erase, then reload, then undo._ Impossible by I6, and correct: the scene
  rebuild on mount purges erased records from the document.
- _Erase a stroke in a hidden group._ Cannot happen. The eraser only tests
  meshes whose `group_id` matches the active group, and a hidden group's meshes
  are not visible to raycast the user into hitting them.
- _No active group._ `EraseLine.tsx:145` reads `activeGroup!.uuid` inside
  `useFrame`. With no active group this throws on every frame of a drag. Not a
  history bug, but it is on the path, and it is listed in §5.

---

### T - Selection and transform

Both transform styles commit through the same function
(`updateLineWorldPoints`), so everything below applies to the legacy gizmo and
the joystick equally. That is the whole point of the split: `TransformLine`
owns selection and commit; the style only decides who moves the proxy group.

#### T-1 Move, rotate or scale a selection · _wired_

`beginDrag` snapshots every selected record's transform before the drag, because
the records are rewritten in place during it. On release, the proxy group's
world matrix is baked into each record and one `lines-transformed` patch is
pushed (`TransformLine.tsx:178`).

Undo releases the selection (I2), writes the stored position, rotation, scale
and `loft_points` back onto each record, and copies them onto the meshes.
Geometry is untouched by a transform, so only the matrix has to be restored.

**Edge cases**

- _Multi-line selection._ One entry for the whole selection. Already batched.
- _Several drags without deselecting._ Each release is its own entry, because
  each has its own before-snapshot. Correct: they are separate actions.
- _Undo while the selection is still held._ `releaseSelection()` runs first, so
  the meshes are unparented, the gizmo detaches and the proxy group returns to
  identity. Without it the transform would compose and the lines would scatter.
- _Joystick nudge with no selection._ `setTarget(null)` while nothing is
  attached, so the joystick has nothing to move and no commit fires.
- _Transform then undo then redo then undo._ The patch holds both sides
  explicitly, so it is symmetric and repeatable.
- _A line that is not in the active group._ **Gap.** `TransformLine.tsx:160`
  only searches `activeGroup?.objects`. Selection is filtered to the active
  group so this is currently unreachable, but a null `activeGroup` yields an
  empty `moved` list, which means no persistence _and_ no history entry - the
  drag silently does not exist. The search should cover every group.
- _Non-uniform scale on a rotated multi-line selection._ **Known limitation,
  not fixable here.** See §5, L-1.

#### T-2 Recolour a selection · _wired_

Pushed at `TransformLine.tsx:576` as `lines-recoloured`, holding the previous
colour per line and the one new colour.

**Edge cases**

- _Recolour to the colour everything already had._ `patchIsMeaningful` rejects
  it, so no entry.
- _The effect also fires when `selectLines` changes._ Guarded by the
  `highlighted.current.size >= 1` check, so merely entering select mode does not
  record a recolour.
- _Recolour, then erase, then undo twice._ The erase undo runs first and
  restores the material colour from the record, which by then holds the new
  colour. The recolour undo then sets it back. Order is preserved because undo
  walks the stack, and within an entry walks the patches in reverse.

#### T-3 Duplicate a selection · _wired_

Clones records deeply (`cloneLineRecord`) with fresh uuids, pushes them into the
active group, writes lines then index, and records `lines-added`
(`TransformLine.tsx:675`) - the same patch kind as a draw, with the same undo.

**Edge cases**

- _Duplicate with nothing selected._ Returns before any record is made.
- _Duplicate, move, undo, undo._ Two entries in the right order: the move is
  reversed first, then the copies are removed.

---

### M - Merge

#### M-1 Merge several strokes into one mesh · _out of scope, and a pre-existing data-loss bug_

`TransformLine.tsx:687-845` disposes the source meshes, merges their geometry,
builds a `MERGED_LINE` record and adds the mesh to the scene. It **never writes
anything**: not the merged record, not the index, and it never removes the
source records from the group. The merge is lost on reload and the sources come
back. There is no history entry.

The `lines-replaced` patch kind exists for exactly this, and wiring it looks
easy. It is not, and the reason is I5:

> `buildLineMesh` replays a stroke from its `points`. The merged record is built
> with `points: []`, `normals: []`, `loft_points: []` (`TransformLine.tsx:824`).
> Its geometry exists only as vertex buffers in the live mesh.

So undo of a merge could work - it would drop the merged mesh and rebuild the
sources, which do have points - but **redo could not**, because there is nothing
to rebuild the merged mesh from. A patch kind that is reversible in one
direction only is worse than none.

Making merge undoable requires storing baked geometry for `MERGED_LINE`, which
changes the persisted format and the load path. That is a separate piece of
work. It is also currently unreachable: nothing in the UI sets
`mergeGeometries`.

**Decision:** merge stays outside history until `MERGED_LINE` is persistable.
Recorded here so it is a known gap rather than an omission.

---

### G - Groups

Group patches are the largest change this specification asks for. The current
`groups-changed` implementation cannot restore a group that is not already in
`groupData` (`HistoryBridge.tsx:233-246` looks each snapshot up in the live
array and drops any it cannot find), which makes undo of a deletion and redo of
a creation both silent no-ops.

**The fix:** patches carry copied `Group` wrappers - `{...group}`, sharing the
`objects` array - on each side, and apply replaces `groupData` wholesale from
the snapshot rather than patching what it finds.

Sharing the `objects` array is deliberate, not an oversight. A stroke drawn
after the patch was recorded lands in that same array, so it survives the
patch's reversal. Copying the array instead would make undoing a group rename
delete every stroke drawn since.

The wrappers are copied again on apply, so the live store never holds the
object the history entry is holding (I1 again, one level up).

`patchIsMeaningful` currently compares groups with `JSON.stringify`
(`historyCapture.ts:109`). Harmless for metadata; ruinous once the patch carries
`Group[]`, because it would serialise every point of every stroke on every push.
It needs a cheap signature: uuid, name, visible, active, `deleted_at` and line
count.

#### G-1 Create a group · _gap_

A new group is empty, so only the index is written (`AddNewGroups.tsx:54`).
Undo removes it from `groupData`; redo puts it back. No meshes are involved,
which makes this the simplest group case.

**Edge cases**

- _Create, make active, undo._ The creation patch carries both sides of the
  whole group array, so restoring the before side restores whichever group was
  active before. `activeGroup` is set from the restored array, never
  independently.
- _Create with an empty name._ Refused before anything is recorded.
- _Create, draw into it, undo the creation._ The group disappears with the
  strokes still in its shared `objects` array, and their meshes are still in the
  scene. The visibility effect must therefore hide meshes whose group is gone -
  see G-6. Redo brings the group and the strokes back together.

#### G-2 Rename a group · _gap_

Metadata only (`RenameGroups.tsx:37`). Undo restores the previous names for
every selected group in one entry.

**Edge case:** renaming several selected groups at once is one action and must
be one entry. The whole-array snapshot gives that for free.

#### G-3 Duplicate a group · _gap, plus a pre-existing data bug_

`copySelectedGroups` (`useRenderSceneStore.ts:121-135`) copies the group wrapper
but passes `objects: g.objects` - **the same `LineRecord` objects, with the same
uuids, in two groups.** Transforming one moves the other, and the index writes
the same line ids under two group entries. On reload both groups point at one
set of records.

This must be fixed before the case can be recorded honestly: a duplicate has to
deep-clone each record with a fresh uuid and the new `group_id`. Once it does,
the group patch's shared-array rule keeps working and undo simply drops the new
group.

**Edge cases**

- _Undo a group duplicate._ The copy leaves `groupData`; its line keys stay on
  disk unreferenced and are swept at the next load (I4). Nothing visible
  remains, because the copied records have no meshes until a reload rebuilds
  them.
- _Duplicate, then draw into the copy, then undo the duplicate._ The stroke is
  in the copy's `objects` array, which the patch shares, so redo brings both
  back. The stroke's own `lines-added` entry sits above the duplicate on the
  stack and is undone first in the normal order.

#### G-4 Delete a group · _gap_

`DeleteGroups.tsx:36` writes only the index; the line records are left on disk
and swept at the next load. That is precisely what makes undo possible.

Undo restores the group wrappers, and with them the strokes, because the
`objects` array travelled with the wrapper. The meshes were never removed from
the scene - nothing in the delete path touches the scene graph - so they only
need to be shown again, which G-6 handles.

**Edge cases**

- _Delete the active group._ The before side carries `active: true` on it, so
  undo restores both the group and its activeness. Deleting it must also hand
  activeness to the first survivor, or `activeGroup` is left pointing at a group
  no longer in the document: strokes drawn afterwards go into an array nothing
  persists, and the paths in L-3 throw. Handled in `deleteSelectedGroups`, so
  the promotion is inside the same patch as the deletion.
- _Delete several groups at once._ One entry.
- _Delete, reload, undo._ Impossible by I6, and the records are gone by then.
- _Delete a group, then draw._ The new stroke goes into whatever group is active
  afterwards, in its own entry. Undoing the delete does not move it.

#### G-5 Toggle group visibility · _gap_

`SceneOptionsPanel.tsx:124`. Metadata only, index only. Undo flips it back.

**Edge case:** toggling twice produces two entries, each meaningful on its own.
No coalescing - unlike the render sliders, this is a discrete click with a
discrete result.

#### G-6 Deleted groups leave their strokes on screen · _gap, and the reason G-4 works_

`CanvasOperations.tsx:162-173` writes `child.visible` **only when it finds the
group**, so the meshes of a deleted group keep whatever value they last had
until a reload. Delete a visible group and its strokes stay on screen.

`child.visible = group ? group.visible : false` fixes it, and makes undo of a
group deletion correct for free: restoring the group makes the effect find it
again and show its meshes.

This is a pre-existing bug that undo exposes rather than causes.

#### G-7 Switch the active group · _gap_

`SceneOptionsPanel.tsx:131`. Changes which group the pen draws into and which
one the eraser and selection tools see. It is a document edit in the same sense
a visibility toggle is, and Spline records selection-scope changes, so it is
undoable.

**Edge case:** switching active group is the one group operation that changes
what a _subsequent_ operation will do. Undoing a draw does not restore the
active group it was drawn into - that is a separate entry, correctly, because
the two are separate user actions.

---

### R - Render settings

All four live in the render tab of the scene options panel: light intensity,
post-process, sequential loading, background colour. None of them are persisted
to IndexedDB; they are store state only, so their patches touch no database.

#### R-1 Drag the light-intensity slider · _gap_

`onChange` fires continuously, so a single drag would otherwise produce one
entry per pixel of travel. The agreed mechanism avoids timers entirely:

`noteRenderChange(label)` is called immediately **before** a setting is written.
The first call of a burst captures the before-snapshot and registers one-shot
`pointerup` and `keyup` listeners on the window; whichever fires first pushes a
single `render-changed` patch and clears the burst.

A drag commits on its own release. A keyboard arrow on a focused slider commits
on key-up.

#### R-2 Click a toggle · _gap_

Post-process and sequential loading are discrete clicks. `onChange` runs from
the `click` handler, which fires _after_ that gesture's `pointerup` - so the
burst commits on the **next** pointer release anywhere in the app.

That is deliberate and safe: the next release always precedes the next click
handler, so pressing undo after toggling still sees the entry on the stack
before the button's own handler runs. Verified against the event order:
`pointerdown` → `pointerup` (commit fires here, on the window, during bubble) →
`click` → `request('undo')`.

#### R-3 Pick a background colour · _gap_

The wheel and the square both drag, so they behave like R-1. The hex input
commits on key-up. The eyedropper resolves asynchronously and writes once, which
commits on the next release like R-2.

**Edge cases**

- _Slider dragged and released without moving._ Before and after are equal, so
  `patchIsMeaningful` rejects the patch.
- _Two settings changed in one burst._ Not possible - a burst ends at the first
  pointer or key release, and no gesture can reach two controls without one.
- _A burst still open when undo is pressed._ The commit listener fires on the
  undo button's own `pointerup`, before its `click`, so the entry is on the
  stack in time. The burst is cleared, so it cannot commit twice.
- _A burst still open when an undo is applied from elsewhere._ `noteRenderChange`
  refuses to open a burst while `busy`, and `push` is refused while `busy`, so
  an in-flight burst cannot record undo's own render writes.

---

### U - The undo and redo buttons themselves

#### U-1 Press undo · _wired_

`request('undo')` sets `busy` and `pending`. The bridge takes the entry, moves
it between the stacks, releases the selection, applies each patch in **reverse
order** within the entry, restores `toolBefore`, forces a `groupData` identity
change so subscribers re-render, invalidates the frame, and calls `finish()` in
a `finally` so a throw cannot leave the editor locked.

**Edge cases**

- _Press undo twice quickly._ The second press is refused: the button is
  disabled on `busy`, and `request` refuses while `busy` anyway.
- _Press undo with an empty stack._ Both guarded - the button is disabled and
  `request` returns.
- _Do anything else mid-apply._ Refused three ways: the full-screen blocker at
  `z-20` (nothing renders above it), `historyBusy()` guards in `DrawLine`,
  `EraseLine`, `TransformLine`, `Joystick` and `ToolPanel`, and `push` itself
  refusing while `busy`.
- _An entry throws halfway._ Logged, the lock is released, and the entry has
  already moved to the other stack. The document is then half-applied - the
  cost of having no cross-key transaction (I4). Accepted: the alternative is a
  rollback journal, which is a much larger feature.
- _Undo past the 25-entry limit._ The oldest entry is dropped when the 26th is
  pushed. The button disables when the stack empties.
- _Reload._ Both stacks start empty (I6).

#### U-2 Press redo · _wired_

Symmetric. Redo applies patches in **forward** order. The redo stack is cleared
by any new action, as every editor does.

**Edge case:** undo, then draw, then look for redo. The stack was cleared by the
draw. Correct and expected.

#### U-3 Tooltips · _wired_

Each button names the entry it will apply - "Undo Erase", "Redo Transform" -
from the entry's `label`, so a 25-deep stack stays legible.

---

### S - Select Guide

The guide selection tool mirrors the line one: it collects what the drag crossed
into a proxy `Group` and transforms that. Both transform styles drive it through
the same path, so the joystick moves a guide exactly as it moves a selection of
strokes, and the legacy gizmo still attaches when that style is chosen.

#### S-1 Move, rotate or scale a guide surface · _wired_

`beginDrag` snapshots each selected guide's world transform; the release pushes
one `guide-transformed` patch. Undo releases the selection first, which hands
each mesh back to the scene with its world transform as its own, and then writes
the stored transform straight onto the mesh.

This is the one patch kind that touches **nothing but the scene**. A guide has
no `LineRecord`, no group and no key on disk, so the patch carries the meshes
themselves. That is only sound because history is session-scoped (I6): the
reference is always still the object on screen.

**Edge cases**

- _Several guides in one drag._ One entry, because the patch carries an array
  and the proxy group moves all of them together.
- _A click on the gizmo that never moved._ The legacy gizmo fires its drag
  events anyway, so `patchIsMeaningful` compares the two sides component by
  component and rejects the entry. The joystick does not commit at all unless a
  whole step was applied.
- _Undo while the guide is still selected._ `releaseSelection` runs first, the
  same as for lines, so the stored world transform is not composed with the
  proxy group's.
- _Undo after switching to another tool._ `TransformGuide` is unmounted, so the
  registered `releaseSelection` is gone and the call is a no-op. Its unmount
  already returned the meshes to the scene, so the transform applies correctly
  anyway.
- _Move a guide, then "Erase Guide", then undo._ The mesh has been disposed and
  removed. The patch still holds the reference, so the write lands on a detached
  object and changes nothing visible. The entry is consumed. Accepted: the guide
  itself is not restorable, which is the decision recorded in §4.
- _Move the active drawing plane, then draw._ Strokes land on the surface where
  it now is. That is the point of the tool, not an edge case.

**Caveat inherited, not introduced.** The active drawing plane is mounted
through `<primitive>`, so reparenting it into the proxy group takes it out from
under R3F. This was already true of the guide selection tool before the joystick
reached it; the joystick only makes it easier to get to.

---

## 4. Deliberately not undoable

Stated here so each is a decision rather than an omission. All of these match
Spline, where camera and viewport state are not history entries.

| Control                             | Where                        | Why                                                                           |
| ----------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Full screen                         | `ViewsPanel`                 | viewport, not document                                                        |
| Perfect view / camera orbit         | `ViewsPanel`, orbit controls | camera moves are never history entries                                        |
| Orthographic toggle                 | `ViewsPanel`                 | viewport                                                                      |
| FOV slider                          | `ViewsPanel`                 | viewport                                                                      |
| X / Y / Z grid toggles              | `ViewsPanel`                 | viewport scaffolding                                                          |
| Orbit lock                          | `ViewsPanel`                 | input mode                                                                    |
| Brush settings                      | `PenOptionsPanel`            | they affect the _next_ stroke; the stroke that used them carries its own copy |
| Mirror axes                         | `PenOptionsPanel`            | same - the stroke records `is_mirror` and `mirror_mode`                       |
| Transform style (joystick / legacy) | burger menu                  | a preference, persisted to localStorage                                       |
| Pointer type                        | burger menu                  | a device setting                                                              |
| Theme                               | burger menu                  | a preference                                                                  |
| GLTF export                         | burger menu                  | reads, writes nothing                                                         |

Tool and panel state _is_ restored, but only as part of an entry - it is never
an entry of its own. Switching from the pen to the eraser is not undoable; it is
just what you did next.

### Creating and erasing a guide - out of scope, explicitly

Moving a guide **is** undoable; see S-1 below. Creating one and erasing one are
not, for a reason worth writing down rather than leaving as a to-do:

- Guide surfaces are never persisted. They exist only as live meshes.
- `ClearRemovedObjects` disposes every guide mesh wholesale.
- `dynamicDrawingPlaneMesh` is mounted through `<primitive>` in `DrawLine`, so
  manual `scene.add`/`remove` fights React Three Fiber for ownership.

Restoring a guide would mean holding mesh references across the dispose - which
three.js does tolerate, since it re-uploads a disposed geometry on next use -
and then swapping the plane under R3F. That is a plausible design and a
half-verified one. It is not shipping until it is tested on its own.
`guide-changed` keeps its patch kind and apply branch, and still nothing pushes
it.

**Consequence to accept:** drawing a guide, or erasing one, is not undoable.
Undo reaches back past a guide change to the strokes on either side of it, and
the guide itself is where it was left.

---

## 5. Limitations undo cannot fix

These are properties of the surrounding code. They are listed so that a bug
report about them is not mistaken for a history bug.

**L-1 - A non-uniform scale on a rotated multi-line selection loses accuracy.**
`updateLineWorldPoints` stores position, rotation and scale from
`getWorldPosition` / `getWorldQuaternion` / `getWorldScale`
(`TransformLine.tsx:155-157`). A sheared world matrix cannot be decomposed into
those three, so the stored values are an approximation. The loss happens when
the transform is baked, _before_ history sees it - undo faithfully restores the
approximated value. Fixing it means storing a full matrix per line, which
changes the persisted format.

**L-2 - `MERGED_LINE` cannot be rebuilt.** See M-1 and I5.

**L-3 - Several paths assume an active group exists.** `EraseLine.tsx:145` and
`TransformLine.tsx:516` both read `activeGroup!.uuid` inside `useFrame`. With no
active group these throw once per frame. Group restore must therefore never
leave the document with zero active groups if it had one before - which the
whole-array snapshot guarantees, since it carries the `active` flag on every
group.

**L-4 - A half-applied entry cannot be rolled back.** I4. Accepted.

**L-5 - Nothing predating a reload is undoable.** I6. By design.

---

## 6. Implementation checklist

In dependency order. Each line is one change with a case number beside it.

1. `records.ts` - group snapshots carry copied `Group` wrappers sharing
   `objects`; add a cheap group signature. _(G)_
2. `types/history.ts` - `groups-changed` carries those wrappers. _(G)_
3. `historyCapture.ts` - signature comparison instead of `JSON.stringify`;
   add `noteRenderChange`. _(G, R)_
4. `HistoryBridge.tsx` - `groups-changed` restores wholesale; `lines-flagged`
   rebuilds a missing mesh with `buildLineMesh`. _(G, E-1)_
5. `CanvasOperations.tsx` - hide meshes whose group is gone. _(G-6)_
6. `useRenderSceneStore.ts` - `copySelectedGroups` deep-clones records with
   fresh uuids. _(G-3)_
7. `AddNewGroups` · `RenameGroups` · `CopyGroups` · `DeleteGroups` - capture and
   push. _(G-1, G-2, G-3, G-4)_
8. `SceneOptionsPanel` - visibility, active group, and the four render settings
   through `noteRenderChange`. _(G-5, G-7, R-1, R-2, R-3)_
9. `TransformLine` · `EraseLine` - search every group, not just the active one.
   _(T-1)_

Not in this pass, and why: merge (M-1, needs a format change), guides (§4,
needs its own verification), full-matrix transforms (L-1, needs a format
change).

### Verification

`npx tsc --noEmit`, `npx eslint .` (baseline 0 errors, 188 warnings) and
`npm run build`. The lint config is not to be changed to make a warning go away.
