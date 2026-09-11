import type * as THREE from 'three'

/* ------------------------------------------------------------------ *
 * Tool vocabulary
 *
 * Every union below is derived from the literal values the UI actually
 * sets, so an unhandled case is a compile error rather than a silent
 * `undefined` at runtime.
 * ------------------------------------------------------------------ */

/** Brush cross-section. Drives `getAdaptiveStrokeWidth`. */
export type StrokeType = 'cube' | 'taper' | 'paint' | 'belt'

/** What a pointer drag produces. */
export type DrawShapeType = 'free_hand' | 'straight' | 'circle' | 'arc'

/** Material a finished stroke is given. `glow` feeds the bloom pass. */
export type MaterialType = 'flat' | 'shaded' | 'glow'

export type TransformMode = 'translate' | 'rotate' | 'scale'

/** Gizmo space. Matches `TransformControls.setSpace`. */
export type AxisMode = 'local' | 'world'

/**
 * Input device the editor is bound to. Every pointer handler compares
 * `event.pointerType` against this, so a resting palm cannot draw while
 * a stylus is in use.
 */
export type PointerType = 'mouse' | 'pen' | 'touch'

/** Mirror axes, as used by `getActiveMirrorModes`. */
export type MirrorAxis = 'X' | 'Y' | 'Z'

export interface MirrorState {
    x: boolean
    y: boolean
    z: boolean
}

/* ------------------------------------------------------------------ *
 * Scene object taxonomy
 *
 * Everything in the scene is identified by `userData.type`.
 * ------------------------------------------------------------------ */

/** Strokes. Erasable, selectable, persisted. */
export type LineObjectType = 'LINE' | 'MERGED_LINE'

/** Scaffolding. Never persisted, cleared wholesale. */
export type GuideObjectType =
    | 'OG_GUIDE_PLANE'
    | 'BEND_GUIDE_PLANE'
    | 'LOFT_SURFACE'
    | 'DYNAMIC_GUIDE_LINE'

export type SceneObjectType = LineObjectType | GuideObjectType

/* ------------------------------------------------------------------ *
 * Geometry: stored vs live
 *
 * This split is the important one.
 *
 * `idb-keyval` serializes with structured clone, which keeps an object's
 * own properties and discards its prototype. A `THREE.Vector3` goes into
 * IndexedDB as a vector and comes back as a bare `{x, y, z}` with no
 * methods on it.
 *
 * Modelling both shapes separately means the compiler refuses to let a
 * loaded point be used where a live one is expected. `rehydrateGroups`
 * in db/storage is the single place the conversion happens.
 * ------------------------------------------------------------------ */

/** A vector as it survives IndexedDB: plain data, no prototype. */
export interface StoredVec3 {
    x: number
    y: number
    z: number
}

/** A quaternion as it survives IndexedDB. */
export interface StoredQuat {
    x: number
    y: number
    z: number
    w: number
}

/**
 * Fields shared by the stored and live forms of a stroke.
 *
 * Only the drawn input is persisted, never the generated vertex buffers.
 * `generateScene` replays the whole geometry pipeline on load, which is
 * why the smoothing parameters have to travel with the stroke.
 */
interface LineRecordBase {
    type: LineObjectType
    uuid: string
    group_id: string
    is_deleted: boolean

    is_mirror: boolean
    /** `'NA'` when the stroke is not a mirror copy. */
    mirror_mode: MirrorAxis | 'NA'

    color: string
    width: number
    opacity: number
    stroke_type: StrokeType
    shape_type: DrawShapeType
    material_type: MaterialType

    /** Exact parameters the stroke was drawn with. Required to reproduce it. */
    optimization_threshold: number
    smooth_percentage: number

    /** Per-sample stylus pressure, 0..1. Always 1 when pressure is off. */
    pressures: number[]

    visible: boolean
}

/** A stroke as written to, and read back from, IndexedDB. */
export interface StoredLineRecord extends LineRecordBase {
    points: StoredVec3[]
    normals: StoredVec3[]
    loft_points: StoredVec3[]
    position: StoredVec3
    rotation: StoredQuat
    scale: StoredVec3
}

/** A stroke in memory, with real three.js instances. */
export interface LineRecord extends LineRecordBase {
    points: THREE.Vector3[]
    normals: THREE.Vector3[]
    loft_points: THREE.Vector3[]
    position: THREE.Vector3
    rotation: THREE.Quaternion
    scale: THREE.Vector3
}

/* ------------------------------------------------------------------ *
 * Groups
 * ------------------------------------------------------------------ */

interface GroupBase {
    uuid: string
    name: string
    /** ISO 8601. */
    created_at: string
    deleted_at: string | null
    visible: boolean
    /** Exactly one group is active at a time. New strokes join it. */
    active: boolean
}

export interface StoredGroup extends GroupBase {
    objects: StoredLineRecord[]
}

export interface Group extends GroupBase {
    objects: LineRecord[]
}

/* ------------------------------------------------------------------ *
 * Mesh userData
 *
 * three.js types `Object3D.userData` as `Record<string, unknown>`, so
 * reading it needs a narrowing step rather than a cast.
 * ------------------------------------------------------------------ */

/** A scene mesh whose `userData` carries a full stroke record. */
export interface LineMesh extends THREE.Mesh {
    userData: LineRecord
}

/** A scene mesh that is guide scaffolding rather than a stroke. */
export interface GuideMesh extends THREE.Mesh {
    userData: { type: GuideObjectType }
}

const LINE_TYPES: readonly string[] = ['LINE', 'MERGED_LINE']

const GUIDE_TYPES: readonly string[] = [
    'OG_GUIDE_PLANE',
    'BEND_GUIDE_PLANE',
    'LOFT_SURFACE',
    'DYNAMIC_GUIDE_LINE',
]

export function isLineMesh(obj: THREE.Object3D): obj is LineMesh {
    return (
        (obj as THREE.Mesh).isMesh === true &&
        typeof obj.userData.type === 'string' &&
        LINE_TYPES.includes(obj.userData.type)
    )
}

export function isGuideMesh(obj: THREE.Object3D): obj is GuideMesh {
    return (
        (obj as THREE.Mesh).isMesh === true &&
        typeof obj.userData.type === 'string' &&
        GUIDE_TYPES.includes(obj.userData.type)
    )
}

/* ------------------------------------------------------------------ *
 * Stroke sampling
 * ------------------------------------------------------------------ */

/** One point sampled from the pointer onto the active guide surface. */
export interface StrokeSample {
    point: THREE.Vector3
    normal: THREE.Vector3
}

/** Half-extents of the brush cross-section at a single sample. */
export interface StrokeWidth {
    w: number
    h: number
}

/** The four faces of a stroke tube, built separately then merged. */
export type StripId = 0 | 1 | 2 | 3

/** Points, pressures and normals for one mirrored copy of a stroke. */
export interface MirrorStrokeData {
    points: THREE.Vector3[]
    pressures: number[]
    normals: THREE.Vector3[]
}
