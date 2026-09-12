import type {
    ObjectTransformSnapshot,
    TransformSnapshot,
} from '../helpers/records'
import type {
    AxisMode,
    DrawShapeType,
    Group,
    LineRecord,
    StrokeType,
    TransformMode,
} from './domain'

/** Which tool was in hand, so undo can put the panel back as it was. */
export interface ToolSnapshot {
    penActive: boolean
    eraserActive: boolean
    selectLines: boolean
    selectGuide: boolean
    drawGuide: boolean
    bendPlaneGuide: boolean
    loftGuidePlane: boolean

    /** Which flyout under the tool panel was open. */
    openColorOptions: boolean
    openStrokeOptions: boolean
    openWidthSlider: boolean
    openOpacitySlider: boolean
    openStrokeStabler: boolean
    openDrawShapeOptions: boolean
    mirrorOptions: boolean

    strokeType: StrokeType
    drawShapeType: DrawShapeType

    /** Both belong to the transform tool, so an undo that did not restore them
        would drop you into a different mode from the one you acted in. */
    transformMode: TransformMode
    axisMode: AxisMode
}

/** Render settings, which are undoable but are not document edits. */
export interface RenderSnapshot {
    lightIntensity: number
    postProcess: boolean
    sequentialLoading: boolean
    canvasBackgroundColor: string
}

/**
 * One reversible change, stored as what it replaced and what it produced.
 *
 * Patches rather than whole-document snapshots: cost is proportional to what
 * the operation touched, so history stays cheap as the drawing grows.
 */
export type HistoryPatch =
    /** Strokes drawn, or a selection duplicated. Undo removes them. */
    | { kind: 'lines-added'; lines: LineRecord[]; groupId: string }
    /** A merge, which replaces several lines with one. */
    | {
          kind: 'lines-replaced'
          removed: LineRecord[]
          added: LineRecord[]
          groupId: string
      }
    /** Erase, which flags records rather than dropping them. */
    | { kind: 'lines-flagged'; uuids: string[]; deleted: boolean }
    | {
          kind: 'lines-transformed'
          before: TransformSnapshot[]
          after: TransformSnapshot[]
      }
    | {
          kind: 'lines-recoloured'
          uuids: string[]
          before: string[]
          after: string
      }
    /**
     * Create, rename, duplicate, delete, visibility, active group. The whole
     * list on each side, as wrappers sharing their `objects` arrays with the
     * live document: a patch holding only the groups it touched could not put
     * a deleted one back.
     */
    | {
          kind: 'groups-changed'
          before: Group[]
          after: Group[]
      }
    /**
     * A guide surface moved, rotated or scaled. Guides are never persisted, so
     * the patch carries the meshes themselves rather than any record, and
     * applying it touches the scene and nothing else.
     */
    | {
          kind: 'guide-transformed'
          before: ObjectTransformSnapshot[]
          after: ObjectTransformSnapshot[]
      }
    /** Guide surfaces are scaffolding, so only their presence is tracked. */
    | { kind: 'guide-changed'; before: string | null; after: string | null }
    | { kind: 'render-changed'; before: RenderSnapshot; after: RenderSnapshot }

/**
 * One user action. A single undo reverses every patch in it, so a mirrored
 * stroke that produced four lines is one entry, not four.
 */
export interface HistoryEntry {
    /** Shown in the tooltip, so the button can say what it will undo. */
    label: string
    patches: HistoryPatch[]
    toolBefore: ToolSnapshot
    toolAfter: ToolSnapshot
}
