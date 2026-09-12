import { canvasDrawStore } from '../hooks/useCanvasDrawStore'
import type {
    DrawShapeType,
    MirrorAxis,
    MirrorState,
    StrokeType,
} from '../types/domain'

/** Switches brush profile and closes the flyout. */
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

/** Switches the shape the pen draws and closes the flyout. */
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

/** Toggles one mirror axis, leaving the others alone. */
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
