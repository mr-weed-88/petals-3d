import { canvasDrawStore } from '../hooks/useCanvasDrawStore'
import { canvasRenderStore } from '../hooks/useRenderSceneStore'
import { historyStore } from '../hooks/useHistoryStore'
import { groupsSignature, objectTransformsEqual } from './records'
import type {
    HistoryPatch,
    RenderSnapshot,
    ToolSnapshot,
} from '../types/history'

/** The tool in hand and the flyout under it, as undo will need to restore it. */
export function toolSnapshot(): ToolSnapshot {
    const s = canvasDrawStore.getState()
    return {
        penActive: s.penActive,
        eraserActive: s.eraserActive,
        selectLines: s.selectLines,
        selectGuide: s.selectGuide,
        drawGuide: s.drawGuide,
        bendPlaneGuide: s.bendPlaneGuide,
        loftGuidePlane: s.loftGuidePlane,

        openColorOptions: s.openColorOptions,
        openStrokeOptions: s.openStrokeOptions,
        openWidthSlider: s.openWidthSlider,
        openOpacitySlider: s.openOpacitySlider,
        openStrokeStabler: s.openStrokeStabler,
        openDrawShapeOptions: s.openDrawShapeOptions,
        mirrorOptions: s.mirrorOptions,

        strokeType: s.strokeType,
        drawShapeType: s.drawShapeType,

        transformMode: s.transformMode,
        axisMode: s.axisMode,
    }
}

/** Puts the tool panel back the way the snapshot found it. */
export function applyToolSnapshot(tool: ToolSnapshot): void {
    const s = canvasDrawStore.getState()

    s.setPenActive(tool.penActive)
    s.setEraserActive(tool.eraserActive)
    s.setSelectLines(tool.selectLines)
    s.setSelectGuide(tool.selectGuide)
    s.setDrawGuide(tool.drawGuide)
    s.setBendPlaneGuide(tool.bendPlaneGuide)
    s.setLoftGuidePlane(tool.loftGuidePlane)

    s.setOpenColorOptions(tool.openColorOptions)
    s.setOpenStrokeOptions(tool.openStrokeOptions)
    s.setOpenWidthSlider(tool.openWidthSlider)
    s.setOpenOpacitySlider(tool.openOpacitySlider)
    s.setOpenStrokeStabler(tool.openStrokeStabler)
    s.setOpenDrawShapeOptions(tool.openDrawShapeOptions)
    s.setMirrorOptions(tool.mirrorOptions)

    s.setStrokeType(tool.strokeType)
    s.setDrawShapeType(tool.drawShapeType)

    s.setTransformMode(tool.transformMode)
    s.setAxisMode(tool.axisMode)
}

export function renderSnapshot(): RenderSnapshot {
    const s = canvasRenderStore.getState()
    return {
        lightIntensity: s.lightIntensity,
        postProcess: s.postProcess,
        sequentialLoading: s.sequentialLoading,
        canvasBackgroundColor: s.canvasBackgroundColor,
    }
}

export function applyRenderSnapshot(snapshot: RenderSnapshot): void {
    const s = canvasRenderStore.getState()
    s.setLightIntensity(snapshot.lightIntensity)
    s.setPostProcess(snapshot.postProcess)
    s.setSequentialLoading(snapshot.sequentialLoading)
    s.setCanvasBackgroundColor(snapshot.canvasBackgroundColor)
}

/**
 * True when a patch would actually change something. An operation that ran but
 * touched nothing still produces a patch, and those fill the stacks with
 * entries that undo to no visible effect.
 */
function patchIsMeaningful(patch: HistoryPatch): boolean {
    switch (patch.kind) {
        case 'lines-added':
            return patch.lines.length > 0
        case 'lines-replaced':
            return patch.removed.length > 0 || patch.added.length > 0
        case 'lines-flagged':
            return patch.uuids.length > 0
        case 'lines-transformed':
            return patch.before.length > 0 && patch.after.length > 0
        case 'lines-recoloured':
            // A recolour that set every line to the colour it already had.
            return (
                patch.uuids.length > 0 &&
                patch.before.some((colour) => colour !== patch.after)
            )
        case 'groups-changed':
            return (
                groupsSignature(patch.before) !== groupsSignature(patch.after)
            )
        case 'guide-transformed':
            // The legacy gizmo fires its drag events on a click that never
            // moved, which would otherwise fill the stack with no-ops.
            return (
                patch.before.length > 0 &&
                !objectTransformsEqual(patch.before, patch.after)
            )
        case 'render-changed':
            return JSON.stringify(patch.before) !== JSON.stringify(patch.after)
        case 'guide-changed':
            return patch.before !== patch.after
    }
}

/**
 * Records one completed user action.
 *
 * `toolBefore` is only needed from operations that change the tool themselves,
 * such as finishing a guide, which switches the pen on. Everything else leaves
 * it alone, so before and after are the same.
 */
export function pushHistory(
    label: string,
    patches: HistoryPatch[],
    toolBefore?: ToolSnapshot
): void {
    const real = patches.filter(patchIsMeaningful)
    if (real.length === 0) return

    const toolAfter = toolSnapshot()
    historyStore.getState().push({
        label,
        patches: real,
        toolBefore: toolBefore ?? toolAfter,
        toolAfter,
    })
}

/** True while an undo or redo is being applied, when nothing else may act. */
export function historyBusy(): boolean {
    return historyStore.getState().busy
}

/* Sliders, toggles and the colour wheel fire onChange continuously, so one
   drag would otherwise be one entry per pixel of travel. */
let renderBurst: { label: string; before: RenderSnapshot } | null = null

/**
 * Opens a render burst, if one is not already open. Call it immediately before
 * writing a setting, so the snapshot is the value being replaced.
 *
 * A drag commits on its own release. A discrete click commits on the next
 * release anywhere, because onChange runs from the click handler, which fires
 * after that gesture's pointerup. Still in time for undo: the next release
 * always precedes the next click.
 */
export function noteRenderChange(label: string): void {
    // Refused while applying, or undo's own render writes would be recorded.
    if (historyBusy()) return
    if (renderBurst) return

    const burst = { label, before: renderSnapshot() }
    renderBurst = burst

    const commit = () => {
        window.removeEventListener('pointerup', commit)
        window.removeEventListener('keyup', commit)

        renderBurst = null

        pushHistory(burst.label, [
            {
                kind: 'render-changed',
                before: burst.before,
                after: renderSnapshot(),
            },
        ])
    }

    window.addEventListener('pointerup', commit)
    window.addEventListener('keyup', commit)
}
