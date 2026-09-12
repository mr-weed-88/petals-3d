import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { deleteLines, saveLines, saveSceneMeta } from '../../db/storage'
import { buildLineMesh } from '../../helpers/drawHelper'
import {
    applyObjectTransform,
    applyTransform,
    cloneLineRecord,
} from '../../helpers/records'
import {
    applyRenderSnapshot,
    applyToolSnapshot,
} from '../../helpers/historyCapture'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'
import { transformTargetStore } from '../../hooks/useTransformTargetStore'
import {
    historyStore,
    type HistoryDirection,
} from '../../hooks/useHistoryStore'
import { isLineMesh, type LineRecord } from '../../types/domain'
import type { HistoryPatch } from '../../types/history'

/** Every line mesh in the scene, indexed by the record it carries. */
function meshesByUuid(scene: THREE.Scene): Map<string, THREE.Mesh> {
    const found = new Map<string, THREE.Mesh>()
    scene.traverse((child) => {
        if (isLineMesh(child)) found.set(child.userData.uuid, child)
    })
    return found
}

function removeMesh(scene: THREE.Scene, mesh: THREE.Mesh): void {
    scene.remove(mesh)
    mesh.geometry.dispose()
    const material = mesh.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else material.dispose()
}

/**
 * Applies one patch in one direction. Records are mutated in place rather than
 * replaced: a mesh's userData is the record itself, so swapping the object
 * would leave the scene holding the old one.
 */
async function applyPatch(
    patch: HistoryPatch,
    direction: HistoryDirection,
    scene: THREE.Scene
): Promise<void> {
    const render = canvasRenderStore.getState()
    const groups = render.groupData
    const meshes = meshesByUuid(scene)

    const groupOf = (id: string) => groups.find((group) => group.uuid === id)

    switch (patch.kind) {
        case 'lines-added': {
            const adding = direction === 'redo'
            const group = groupOf(patch.groupId)
            if (!group) return

            if (adding) {
                // Clones, so a redo cannot hand the scene the record object
                // the history is still holding.
                const restored = patch.lines.map(cloneLineRecord)
                group.objects.push(...restored)
                restored.forEach((line) =>
                    scene.add(buildLineMesh(scene, line))
                )
                await saveLines(restored)
            } else {
                const ids = new Set(patch.lines.map((line) => line.uuid))
                group.objects = group.objects.filter(
                    (line) => !ids.has(line.uuid)
                )
                ids.forEach((id) => {
                    const mesh = meshes.get(id)
                    if (mesh) removeMesh(scene, mesh)
                })
                await deleteLines([...ids])
            }

            await saveSceneMeta(canvasRenderStore.getState().groupData)
            break
        }

        case 'lines-replaced': {
            const group = groupOf(patch.groupId)
            if (!group) return

            const gone = direction === 'undo' ? patch.added : patch.removed
            const back = direction === 'undo' ? patch.removed : patch.added

            const goneIds = new Set(gone.map((line) => line.uuid))
            group.objects = group.objects.filter(
                (line) => !goneIds.has(line.uuid)
            )
            goneIds.forEach((id) => {
                const mesh = meshes.get(id)
                if (mesh) removeMesh(scene, mesh)
            })

            const restored = back.map(cloneLineRecord)
            group.objects.push(...restored)
            restored.forEach((line) => scene.add(buildLineMesh(scene, line)))

            await deleteLines([...goneIds])
            await saveLines(restored)
            await saveSceneMeta(canvasRenderStore.getState().groupData)
            break
        }

        case 'lines-flagged': {
            // Erase flags the record and hides the mesh, so coming back is a
            // matter of clearing the flag rather than rebuilding.
            const deleted =
                direction === 'undo' ? !patch.deleted : patch.deleted
            const touched: LineRecord[] = []

            for (const group of groups) {
                for (const line of group.objects) {
                    if (!patch.uuids.includes(line.uuid)) continue
                    line.is_deleted = deleted
                    touched.push(line)

                    const mesh = meshes.get(line.uuid)
                    if (!mesh) {
                        // "Erase Guide" disposes every mesh flagged deleted, so
                        // there may be nothing left to unhide. The record still
                        // holds the samples, so replay the stroke from them.
                        if (!deleted) scene.add(buildLineMesh(scene, line))
                        continue
                    }

                    mesh.visible = !deleted

                    // The eraser fades what it is about to remove. Showing the
                    // mesh without restoring the record's own appearance leaves
                    // it at half opacity.
                    const materials = Array.isArray(mesh.material)
                        ? mesh.material
                        : [mesh.material]
                    materials.forEach((material) => {
                        material.opacity = line.opacity
                        material.transparent = line.opacity < 1
                        if ('color' in material) {
                            ;(material as THREE.MeshBasicMaterial).color.set(
                                line.color
                            )
                        }
                        material.needsUpdate = true
                    })
                }
            }

            await saveLines(touched)
            break
        }

        case 'lines-transformed': {
            const wanted = direction === 'undo' ? patch.before : patch.after
            const touched: LineRecord[] = []

            for (const snapshot of wanted) {
                for (const group of groups) {
                    const line = group.objects.find(
                        (item) => item.uuid === snapshot.uuid
                    )
                    if (!line) continue

                    applyTransform(line, snapshot)
                    touched.push(line)

                    // Geometry is unchanged by a transform, so the mesh only
                    // needs its matrix put back.
                    const mesh = meshes.get(line.uuid)
                    if (mesh) {
                        mesh.position.copy(line.position)
                        mesh.quaternion.copy(line.rotation)
                        mesh.scale.copy(line.scale)
                        mesh.updateMatrixWorld(true)
                    }
                }
            }

            await saveLines(touched)
            break
        }

        case 'lines-recoloured': {
            const touched: LineRecord[] = []

            patch.uuids.forEach((uuid, index) => {
                const colour =
                    direction === 'undo' ? patch.before[index] : patch.after
                if (colour === undefined) return

                for (const group of groups) {
                    const line = group.objects.find(
                        (item) => item.uuid === uuid
                    )
                    if (!line) continue

                    line.color = colour
                    touched.push(line)

                    const mesh = meshes.get(uuid)
                    if (!mesh) continue
                    const materials = Array.isArray(mesh.material)
                        ? mesh.material
                        : [mesh.material]
                    materials.forEach((material) => {
                        if ('color' in material) {
                            ;(material as THREE.MeshBasicMaterial).color.set(
                                colour
                            )
                        }
                        material.needsUpdate = true
                    })
                }
            })

            await saveLines(touched)
            break
        }

        case 'groups-changed': {
            const wanted = direction === 'undo' ? patch.before : patch.after

            /*
             * The whole list is replaced, not patched in place: a group that
             * is no longer in the document could not otherwise come back.
             *
             * Copies, so the store never holds the wrapper the entry holds.
             * Their `objects` arrays stay shared, and line records outlive a
             * group deletion on disk until the next load sweeps them, so a
             * deleted group returns with its strokes intact.
             */
            const restored = wanted.map((group) => ({ ...group }))

            render.setGroupData(restored)
            render.setActiveGroup(
                restored.find((group) => group.active) ?? null
            )

            await saveSceneMeta(restored)
            break
        }

        case 'render-changed': {
            applyRenderSnapshot(
                direction === 'undo' ? patch.before : patch.after
            )
            break
        }

        case 'guide-transformed': {
            // Nothing to write: a guide lives only in the scene. The selection
            // has already been released, so each object is a direct child of
            // the scene and its stored world transform is its local one.
            const wanted = direction === 'undo' ? patch.before : patch.after
            wanted.forEach(applyObjectTransform)
            break
        }

        case 'guide-changed':
            // Guides are not persisted, so there is nothing to restore beyond
            // the tool state the entry already carries.
            break
    }
}

/**
 * Performs undo and redo. It lives inside the canvas because applying a patch
 * touches the scene graph, which the buttons cannot reach. They set a request
 * on the store; this applies it and releases the lock.
 */
const HistoryBridge = () => {
    const { scene, invalidate } = useThree()
    const pending = historyStore((state) => state.pending)

    useEffect(() => {
        if (!pending) return

        const run = async () => {
            const taken = historyStore.getState().take()
            if (!taken) {
                historyStore.getState().finish()
                return
            }

            const { entry, direction } = taken

            try {
                /*
                 * The selection goes back to the scene first. While it is held
                 * every selected mesh is a child of the proxy group, so its
                 * transform composes with the group's; stored transforms are
                 * world transforms, so writing one onto a still-parented mesh
                 * puts the line somewhere else entirely.
                 */
                transformTargetStore.getState().releaseSelection?.()

                // Undo unwinds the patches in the reverse order they applied.
                const ordered =
                    direction === 'undo'
                        ? [...entry.patches].reverse()
                        : entry.patches

                for (const patch of ordered) {
                    await applyPatch(patch, direction, scene)
                }

                applyToolSnapshot(
                    direction === 'undo' ? entry.toolBefore : entry.toolAfter
                )

                canvasRenderStore.setState({
                    groupData: [...canvasRenderStore.getState().groupData],
                })
                invalidate()
            } catch (error) {
                console.error('Failed to apply a history entry', error)
            } finally {
                // Released even on failure, or the editor would stay locked.
                historyStore.getState().finish()
            }
        }

        void run()
    }, [pending, scene, invalidate])

    return null
}

export default HistoryBridge
