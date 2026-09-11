import { set, get, del, createStore, type UseStore } from 'idb-keyval'
import * as THREE from 'three'

import type {
    Group,
    StoredGroup,
    StoredLineRecord,
    LineRecord,
    StoredVec3,
    StoredQuat,
} from '../types/domain'

const linesStore: UseStore = createStore('petals-3d', 'states')

/** The whole document lives under one key. */
const GROUPS_KEY = 0

/* ------------------------------------------------------------------ *
 * Stored <-> live conversion
 *
 * idb-keyval serializes with structured clone, which preserves an
 * object's own properties and discards its prototype. A THREE.Vector3
 * is written as a vector and read back as a bare {x, y, z}.
 *
 * Everything downstream calls Vector3 methods on these points, so they
 * have to be rebuilt exactly once, here, on the way out of the database.
 * Before this existed, `filterPoints` called `.distanceTo` on a plain
 * object and threw, which is why straight-line strokes did not survive a
 * reload: the throw was swallowed by a try/catch and the stroke was left
 * with empty geometry.
 * ------------------------------------------------------------------ */

const toVector3 = (v: StoredVec3): THREE.Vector3 =>
    new THREE.Vector3(v.x, v.y, v.z)

const toQuaternion = (q: StoredQuat): THREE.Quaternion =>
    new THREE.Quaternion(q.x, q.y, q.z, q.w)

const fromVector3 = (v: THREE.Vector3): StoredVec3 => ({
    x: v.x,
    y: v.y,
    z: v.z,
})

const fromQuaternion = (q: THREE.Quaternion): StoredQuat => ({
    x: q.x,
    y: q.y,
    z: q.z,
    w: q.w,
})

const rehydrateLine = (line: StoredLineRecord): LineRecord => ({
    ...line,
    points: line.points.map(toVector3),
    normals: line.normals.map(toVector3),
    loft_points: line.loft_points.map(toVector3),
    position: toVector3(line.position),
    rotation: toQuaternion(line.rotation),
    scale: toVector3(line.scale),
})

const dehydrateLine = (line: LineRecord): StoredLineRecord => ({
    ...line,
    points: line.points.map(fromVector3),
    normals: line.normals.map(fromVector3),
    loft_points: line.loft_points.map(fromVector3),
    position: fromVector3(line.position),
    rotation: fromQuaternion(line.rotation),
    scale: fromVector3(line.scale),
})

export const rehydrateGroups = (groups: StoredGroup[]): Group[] =>
    groups.map((group) => ({
        ...group,
        objects: group.objects.map(rehydrateLine),
    }))

export const dehydrateGroups = (groups: Group[]): StoredGroup[] =>
    groups.map((group) => ({
        ...group,
        objects: group.objects.map(dehydrateLine),
    }))

/* ------------------------------------------------------------------ *
 * Reads and writes
 * ------------------------------------------------------------------ */

export const saveGroupToIndexDB = async (
    groupData: Group[]
): Promise<boolean> => {
    try {
        await set(GROUPS_KEY, dehydrateGroups(groupData), linesStore)
        return true
    } catch (err) {
        console.error('Failed to save groups to IndexedDB', err)
        return false
    }
}

export const clearSceneFromIndexedDB = async (): Promise<void> => {
    try {
        await del(GROUPS_KEY, linesStore)
    } catch (err) {
        console.error('Failed to clear scene from IndexedDB', err)
    }
}

export interface LoadSceneResult {
    groupData: Group[]
    success: boolean
    error: string
}

export const loadSceneFromIndexedDB = async (): Promise<LoadSceneResult> => {
    try {
        const stored = await get<StoredGroup[]>(GROUPS_KEY, linesStore)

        if (stored && stored.length > 0) {
            return {
                groupData: rehydrateGroups(stored),
                success: true,
                error: 'Loaded scene from IndexedDB',
            }
        }

        return { groupData: [], success: false, error: 'No saved scene found' }
    } catch (err) {
        console.error('Failed to load from IndexedDB', err)
        return {
            groupData: [],
            success: false,
            error: 'Failed to load from IndexedDB',
        }
    }
}
