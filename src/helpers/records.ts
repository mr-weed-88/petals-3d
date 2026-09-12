import * as THREE from 'three'

import type { Group, LineRecord } from '../types/domain'

/**
 * Every deliberate copy of a line record goes through here.
 *
 * A mesh's `userData` is the record itself, not a copy, so a record has two
 * owners: the scene graph and the group it belongs to. Anything keeping a
 * record it did not clone will watch its own data change underneath it.
 */
export function cloneLineRecord(line: LineRecord): LineRecord {
    return {
        ...line,
        points: line.points.map((p) => p.clone()),
        normals: line.normals.map((n) => n.clone()),
        loft_points: line.loft_points.map((p) => p.clone()),
        pressures: [...line.pressures],
        position: line.position.clone(),
        rotation: line.rotation.clone(),
        scale: line.scale.clone(),
    }
}

/**
 * Finds a record anywhere in the document. Searching only the active group
 * returned nothing when there was none, so the operation persisted nothing and
 * recorded no history entry.
 */
export function findLineRecord(
    groups: Group[],
    uuid: string
): LineRecord | undefined {
    for (const group of groups) {
        const line = group.objects.find((item) => item.uuid === uuid)
        if (line) return line
    }
    return undefined
}

/** The transform of one line, which is all a move, rotate or scale changes. */
export interface TransformSnapshot {
    uuid: string
    position: [number, number, number]
    rotation: [number, number, number, number]
    scale: [number, number, number]
    /** Rewritten on every transform, so it travels with the rest. */
    loft_points: number[]
}

export function snapshotTransform(line: LineRecord): TransformSnapshot {
    const loft: number[] = []
    for (const p of line.loft_points) loft.push(p.x, p.y, p.z)

    return {
        uuid: line.uuid,
        position: [line.position.x, line.position.y, line.position.z],
        rotation: [
            line.rotation.x,
            line.rotation.y,
            line.rotation.z,
            line.rotation.w,
        ],
        scale: [line.scale.x, line.scale.y, line.scale.z],
        loft_points: loft,
    }
}

/** Writes a transform snapshot back onto a live record, in place. */
export function applyTransform(
    line: LineRecord,
    snapshot: TransformSnapshot
): void {
    line.position.set(...snapshot.position)
    line.rotation.set(...snapshot.rotation)
    line.scale.set(...snapshot.scale)

    const loft = line.loft_points
    for (let i = 0; i < loft.length; i++) {
        const base = i * 3
        if (base + 2 >= snapshot.loft_points.length) break
        loft[i].set(
            snapshot.loft_points[base],
            snapshot.loft_points[base + 1],
            snapshot.loft_points[base + 2]
        )
    }
}

/**
 * The transform of a scene object that has no stored record of its own.
 *
 * Guide surfaces are live meshes and nothing else, so a patch about one has to
 * hold the mesh itself. History is session-scoped, so the reference is always
 * still the object on screen.
 */
export interface ObjectTransformSnapshot {
    object: THREE.Object3D
    position: [number, number, number]
    rotation: [number, number, number, number]
    scale: [number, number, number]
}

const scratchPosition = new THREE.Vector3()
const scratchRotation = new THREE.Quaternion()
const scratchScale = new THREE.Vector3()

/** World transform, because a selected object is a child of the proxy group. */
export function snapshotObjectTransform(
    object: THREE.Object3D
): ObjectTransformSnapshot {
    object.updateMatrixWorld(true)
    object.matrixWorld.decompose(scratchPosition, scratchRotation, scratchScale)

    return {
        object,
        position: [scratchPosition.x, scratchPosition.y, scratchPosition.z],
        rotation: [
            scratchRotation.x,
            scratchRotation.y,
            scratchRotation.z,
            scratchRotation.w,
        ],
        scale: [scratchScale.x, scratchScale.y, scratchScale.z],
    }
}

/**
 * Writes one back. Only correct once the object is a direct child of the
 * scene again, which is why undo releases the selection first.
 */
export function applyObjectTransform(snapshot: ObjectTransformSnapshot): void {
    const { object } = snapshot
    object.position.set(...snapshot.position)
    object.quaternion.set(...snapshot.rotation)
    object.scale.set(...snapshot.scale)
    object.updateMatrixWorld(true)
}

/** True when a drag ended where it started, so nothing is worth recording. */
export function objectTransformsEqual(
    a: ObjectTransformSnapshot[],
    b: ObjectTransformSnapshot[]
): boolean {
    if (a.length !== b.length) return false

    return a.every((one, index) => {
        const other = b[index]
        if (!other || one.object !== other.object) return false
        return (
            one.position.every((v, i) => v === other.position[i]) &&
            one.rotation.every((v, i) => v === other.rotation[i]) &&
            one.scale.every((v, i) => v === other.scale[i])
        )
    })
}

/**
 * The whole group list, as copied wrappers.
 *
 * The `objects` arrays are shared with the live groups on purpose: a stroke
 * drawn after the patch was recorded lands in that same array, so it survives
 * the patch being reversed. Copying them would make undoing a rename delete
 * every stroke drawn since.
 */
export function snapshotGroups(groups: Group[]): Group[] {
    return groups.map((group) => ({ ...group }))
}

/**
 * A cheap identity for comparing two group lists. `JSON.stringify` would walk
 * every point of every stroke.
 */
export function groupsSignature(groups: Group[]): string {
    return groups
        .map((group) =>
            [
                group.uuid,
                group.name,
                group.visible,
                group.active,
                group.deleted_at ?? '',
                group.objects.length,
            ].join(' ')
        )
        .join('')
}
