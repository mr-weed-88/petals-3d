import {
    createStore,
    del,
    delMany,
    get,
    getMany,
    keys,
    set,
    setMany,
    type UseStore,
} from 'idb-keyval'
import * as THREE from 'three'

import type {
    Group,
    LineRecord,
    StoredGroup,
    StoredLineRecord,
    StoredQuat,
    StoredVec3,
} from '../types/domain'

const linesStore: UseStore = createStore('petals-3d', 'states')

/**
 * The scene index: group metadata and the ids of each group's lines. Small
 * enough to rewrite on any change, because it holds no point data.
 */
const META_KEY = 'scene-meta'

/** One key per line, so a stroke can be written without touching the others. */
const lineKey = (uuid: string) => `line:${uuid}`

/**
 * The original format: the entire document under the integer key 0. Read once
 * on load and converted, then deleted.
 */
const LEGACY_KEY = 0

interface LegacyStoredLine {
    points: StoredVec3[]
    normals: StoredVec3[]
    loft_points: StoredVec3[]
    pressures: number[]
    position: StoredVec3
    rotation: StoredQuat
    scale: StoredVec3
}

interface LegacyStoredGroup {
    objects: LegacyStoredLine[]
}

interface SceneMeta {
    groups: StoredGroup[]
}

/* ------------------------------------------------------------------ *
 * Conversion
 * ------------------------------------------------------------------ */

/*
 * Structured clone keeps an object's fields but discards its prototype, so a
 * THREE.Vector3 comes back as a bare {x,y,z} with no methods. Points therefore
 * cross as flat Float32Arrays and are given their classes back on the way out;
 * the Stored* types mark which side of that line a value is on.
 */
const packVectors = (vectors: THREE.Vector3[]): Float32Array => {
    const out = new Float32Array(vectors.length * 3)
    for (let i = 0; i < vectors.length; i++) {
        const v = vectors[i]
        out[i * 3] = v.x
        out[i * 3 + 1] = v.y
        out[i * 3 + 2] = v.z
    }
    return out
}

const unpackVectors = (packed: Float32Array | undefined): THREE.Vector3[] => {
    if (!packed) return []
    const out: THREE.Vector3[] = []
    for (let i = 0; i + 2 < packed.length; i += 3) {
        out.push(new THREE.Vector3(packed[i], packed[i + 1], packed[i + 2]))
    }
    return out
}

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

/** Plain data from the database back into three.js classes. */
export const rehydrateLine = (line: StoredLineRecord): LineRecord => ({
    ...line,
    points: unpackVectors(line.points),
    normals: unpackVectors(line.normals),
    loft_points: unpackVectors(line.loft_points),
    pressures: Array.from(line.pressures ?? []),
    position: toVector3(line.position),
    rotation: toQuaternion(line.rotation),
    scale: toVector3(line.scale),
})

/** three.js classes down to plain data the database can hold. */
export const dehydrateLine = (line: LineRecord): StoredLineRecord => ({
    ...line,
    points: packVectors(line.points),
    normals: packVectors(line.normals),
    loft_points: packVectors(line.loft_points),
    pressures: new Float32Array(line.pressures ?? []),
    position: fromVector3(line.position),
    rotation: fromQuaternion(line.rotation),
    scale: fromVector3(line.scale),
})

const toGroupMeta = (group: Group): StoredGroup => ({
    uuid: group.uuid,
    name: group.name,
    created_at: group.created_at,
    deleted_at: group.deleted_at,
    visible: group.visible,
    active: group.active,
    lineIds: group.objects.map((line) => line.uuid),
})

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

/**
 * The scene index only. Use this for anything that does not change a stroke:
 * renaming a group, toggling visibility, switching the active group.
 */
export const saveSceneMeta = async (groups: Group[]): Promise<boolean> => {
    try {
        const meta: SceneMeta = { groups: groups.map(toGroupMeta) }
        await set(META_KEY, meta, linesStore)
        return true
    } catch (err) {
        console.error('Failed to save the scene index', err)
        return false
    }
}

/** Writes only the lines given. Everything else on disk is left alone. */
export const saveLines = async (lines: LineRecord[]): Promise<boolean> => {
    if (lines.length === 0) return true
    try {
        await setMany(
            lines.map((line) => [lineKey(line.uuid), dehydrateLine(line)]),
            linesStore
        )
        return true
    } catch (err) {
        console.error('Failed to save lines', err)
        return false
    }
}

export const deleteLines = async (uuids: string[]): Promise<boolean> => {
    if (uuids.length === 0) return true
    try {
        await delMany(uuids.map(lineKey), linesStore)
        return true
    } catch (err) {
        console.error('Failed to delete lines', err)
        return false
    }
}

/**
 * Index and every line together. Only for wholesale writes: the first save of
 * a new document, and the legacy migration.
 */
export const saveWholeScene = async (groups: Group[]): Promise<boolean> => {
    const lines = groups.flatMap((group) => group.objects)
    const meta = await saveSceneMeta(groups)
    const written = await saveLines(lines)
    return meta && written
}

export const clearSceneFromIndexedDB = async (): Promise<void> => {
    try {
        const meta = await get<SceneMeta>(META_KEY, linesStore)
        const ids = meta?.groups.flatMap((group) => group.lineIds) ?? []
        await deleteLines(ids)
        await del(META_KEY, linesStore)
        await del(LEGACY_KEY, linesStore)
    } catch (err) {
        console.error('Failed to clear the scene', err)
    }
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

export interface LoadSceneResult {
    groupData: Group[]
    success: boolean
    error: string
}

/**
 * Reads a document in the original single-key format. The caller writes it
 * back in the new shape and drops the old key, so this runs once per browser.
 */
const readLegacyScene = async (): Promise<Group[] | null> => {
    const legacy = await get<(LegacyStoredGroup & StoredGroup)[]>(
        LEGACY_KEY,
        linesStore
    )
    if (!legacy || legacy.length === 0) return null

    return legacy.map((group) => ({
        uuid: group.uuid,
        name: group.name,
        created_at: group.created_at,
        deleted_at: group.deleted_at,
        visible: group.visible,
        active: group.active,
        objects: (group.objects ?? []).map((line) => {
            const record = line as unknown as StoredLineRecord & {
                points: StoredVec3[]
                normals: StoredVec3[]
                loft_points: StoredVec3[]
                pressures: number[]
            }
            return {
                ...(record as unknown as LineRecord),
                points: record.points.map(toVector3),
                normals: record.normals.map(toVector3),
                loft_points: record.loft_points.map(toVector3),
                pressures: [...(record.pressures ?? [])],
                position: toVector3(record.position),
                rotation: toQuaternion(record.rotation),
                scale: toVector3(record.scale),
            }
        }),
    }))
}

/**
 * Deletes line records the index no longer mentions. Erasing leaves a record
 * behind until the next scene rebuild, so keys outlive the document that
 * referenced them. Sweeping at load is safer than deleting during a write,
 * where a crash between the two writes would take live data with it.
 */
const pruneOrphanLines = async (referenced: Set<string>): Promise<void> => {
    try {
        const all = await keys<string>(linesStore)
        const orphans = all.filter(
            (key) =>
                typeof key === 'string' &&
                key.startsWith('line:') &&
                !referenced.has(key)
        )
        if (orphans.length > 0) await delMany(orphans, linesStore)
    } catch (err) {
        console.error('Failed to prune orphaned lines', err)
    }
}

export const loadSceneFromIndexedDB = async (): Promise<LoadSceneResult> => {
    try {
        const meta = await get<SceneMeta>(META_KEY, linesStore)

        if (!meta || meta.groups.length === 0) {
            const legacy = await readLegacyScene()
            if (!legacy) {
                return {
                    groupData: [],
                    success: false,
                    error: 'No saved scene found',
                }
            }

            await saveWholeScene(legacy)
            await del(LEGACY_KEY, linesStore)

            return {
                groupData: legacy,
                success: true,
                error: 'Migrated the saved scene to the per-line format',
            }
        }

        // One batched read, then each group is reassembled in its stored order.
        const ids = meta.groups.flatMap((group) => group.lineIds)
        const stored = await getMany<StoredLineRecord>(
            ids.map(lineKey),
            linesStore
        )

        const byId = new Map<string, LineRecord>()
        ids.forEach((id, index) => {
            const record = stored[index]
            if (record) byId.set(id, rehydrateLine(record))
        })

        void pruneOrphanLines(new Set(ids.map(lineKey)))

        const groupData: Group[] = meta.groups.map((group) => ({
            uuid: group.uuid,
            name: group.name,
            created_at: group.created_at,
            deleted_at: group.deleted_at,
            visible: group.visible,
            active: group.active,
            // A missing line is skipped, so a partial write cannot break
            // the load.
            objects: group.lineIds
                .map((id) => byId.get(id))
                .filter((line): line is LineRecord => line !== undefined),
        }))

        return {
            groupData,
            success: true,
            error: 'Loaded scene from IndexedDB',
        }
    } catch (err) {
        console.error('Failed to load from IndexedDB', err)
        return {
            groupData: [],
            success: false,
            error: 'Failed to load from IndexedDB',
        }
    }
}
