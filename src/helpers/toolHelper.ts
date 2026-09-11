import { canvasDrawStore } from '../hooks/useCanvasDrawStore'
import type {
    DrawShapeType,
    MirrorAxis,
    MirrorState,
    StrokeType,
} from '../types/domain'

/**
 * `'tube'` used to be accepted here, but `getAdaptiveStrokeWidth` has no
 * case for it and would have returned undefined dimensions. Nothing in the
 * UI could reach it, and the StrokeType union now rules it out.
 */
export function handleStroke(
    stroke: StrokeType,
    setStrokeType: (value: StrokeType) => void
): void {
    switch (stroke) {
        case 'taper':
        case 'cube':
        case 'paint':
        case 'belt':
            setStrokeType(stroke)
            break
        default:
            setStrokeType('cube')
            break
    }
}

export function handleShape(
    shape: DrawShapeType,
    setDrawShapeType: (value: DrawShapeType) => void
): void {
    switch (shape) {
        case 'free_hand':
        case 'straight':
        case 'circle':
        case 'arc':
            setDrawShapeType(shape)
            break
        default:
            break
    }
}

export function handleMirroring(
    axis: MirrorAxis | 'NONE',
    mirror: MirrorState,
    setMirror: (value: Partial<MirrorState>) => void
): void {
    switch (axis) {
        case 'X':
            setMirror({ x: !mirror.x })
            break
        case 'Y':
            setMirror({ y: !mirror.y })
            break
        case 'Z':
            setMirror({ z: !mirror.z })
            break
        default:
            canvasDrawStore
                .getState()
                .setMirror({ x: false, y: false, z: false })
            break
    }
}

/*
 * `handleGroupOperation` used to live here. It called `dashboardStore(
 * (state) => state)` at module scope, which is a React hook invoked
 * outside a component and would have thrown on first use. Nothing
 * imported it. SceneOptionsPanel has its own working version.
 */
