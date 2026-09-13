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

export interface ToolSnapshot {
    penActive: boolean
    eraserActive: boolean
    selectLines: boolean
    selectGuide: boolean
    drawGuide: boolean
    bendPlaneGuide: boolean
    loftGuidePlane: boolean

    openColorOptions: boolean
    openStrokeOptions: boolean
    openWidthSlider: boolean
    openOpacitySlider: boolean
    openStrokeStabler: boolean
    openDrawShapeOptions: boolean
    mirrorOptions: boolean

    strokeType: StrokeType
    drawShapeType: DrawShapeType

    transformMode: TransformMode
    axisMode: AxisMode
}

export interface RenderSnapshot {
    lightIntensity: number
    postProcess: boolean
    sequentialLoading: boolean
    canvasBackgroundColor: string
}

// Patches, not whole-document snapshots, so cost tracks what changed.
export type HistoryPatch =
    | { kind: 'lines-added'; lines: LineRecord[]; groupId: string }
    | {
          kind: 'lines-replaced'
          removed: LineRecord[]
          added: LineRecord[]
          groupId: string
      }
    // Erase flags records rather than dropping them.
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
    // The whole group list on each side, sharing `objects` with the live
    // document. Holding only the touched groups could not restore a deleted one.
    | {
          kind: 'groups-changed'
          before: Group[]
          after: Group[]
      }
    // Guides are never persisted, so this carries the meshes themselves.
    | {
          kind: 'guide-transformed'
          before: ObjectTransformSnapshot[]
          after: ObjectTransformSnapshot[]
      }
    | { kind: 'guide-changed'; before: string | null; after: string | null }
    | { kind: 'render-changed'; before: RenderSnapshot; after: RenderSnapshot }

// One user action. A mirrored stroke of four lines is one entry, not four.
export interface HistoryEntry {
    label: string
    patches: HistoryPatch[]
    toolBefore: ToolSnapshot
    toolAfter: ToolSnapshot
}
