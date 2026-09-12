import { AXIS } from '../../config/theme'

/** The three world axes the joystick drives. */
export type JoystickAxis = 'x' | 'y' | 'z'

/** What a cone drag does. Arcs always rotate, so they are not listed here. */
export type ConeAction = 'move' | 'scale'

export const AXES: JoystickAxis[] = ['x', 'y', 'z']

export const AXIS_COLOR: Record<JoystickAxis, string> = {
    x: AXIS.x,
    y: AXIS.y,
    z: AXIS.z,
}

export const AXIS_LABEL: Record<JoystickAxis, string> = {
    x: 'X',
    y: 'Y',
    z: 'Z',
}

/**
 * Each arc spans two cone tips, so it lies in the plane those axes define and
 * turns the third. Its length follows how far apart the cones sit on screen.
 */
export const ARC_PAIRS: {
    from: JoystickAxis
    to: JoystickAxis
    axis: JoystickAxis
}[] = [
    { from: 'x', to: 'y', axis: 'z' },
    { from: 'y', to: 'z', axis: 'x' },
    { from: 'z', to: 'x', axis: 'y' },
]

/** Widget size in its own SVG user units. The viewBox scales it to fit. */
export const VIEW = 100
export const CENTRE = VIEW / 2

export const CONE_DISTANCE = 34
export const CONE_SIZE = 22
export const ARC_RADIUS = 30

/** One width, dragged or not: growing on press made the ring jump. */
export const ARC_STROKE = 7

/** Fixed grey, not a theme token, which would put a fourth colour beside the
    three axis colours. Reads on both grounds. */
export const ARC_COLOR = '#A8A8A8'

/** The hub's grab area, sized to swallow the cube: its corners reach
    CUBE_SIZE * sqrt(3). */
export const HUB_RADIUS = 17
export const CUBE_SIZE = 9

/** Half the rail's drawn length. Past the widget's outer circle on purpose, so
    the svg needs `overflow: visible` or the viewBox clips it. */
export const RAIL_LENGTH = 62

/** The drawn rail, less enough for the cone's body to stay on the line. Tied to
    RAIL_LENGTH so a handle can never stop short of its own track. */
const CONE_TRAVEL = RAIL_LENGTH - 6

/* Travel as an offset from the resting place, clamped by position rather than
   by drag distance: the cone rests well out from the centre, so it has far
   more room inwards than outwards. */
export const RAIL_MAX_OFFSET = CONE_TRAVEL - CONE_DISTANCE
export const RAIL_MIN_OFFSET = -CONE_TRAVEL - CONE_DISTANCE

/** Degrees of clearance left at each end of an arc, so it clears the cones. */
const ARC_GAP = 33

/** Handles are drawn pointing along screen right, then turned into place. */
export function rotateAbout(angle: number): string {
    return `rotate(${angle} ${CENTRE} ${CENTRE})`
}

const rad = (deg: number) => (deg * Math.PI) / 180

/** Wraps an angle difference to the short way round. */
function shortestDelta(from: number, to: number): number {
    let delta = (to - from) % 360
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    return delta
}

export interface ArcShape {
    d: string
    /** Degrees actually spanned, after the end gaps are removed. */
    span: number
}

/**
 * The arc between two cone tips, short way round, with a gap at each end.
 * Empty once the cones are close enough that nothing would be left to draw.
 */
export function pairArcPath(fromAngle: number, toAngle: number): ArcShape {
    const delta = shortestDelta(fromAngle, toAngle)
    const direction = Math.sign(delta) || 1
    const span = Math.abs(delta) - ARC_GAP * 2

    if (span <= 4) return { d: '', span: 0 }

    const start = fromAngle + direction * ARC_GAP
    const end = toAngle - direction * ARC_GAP

    const x0 = CENTRE + Math.cos(rad(start)) * ARC_RADIUS
    const y0 = CENTRE + Math.sin(rad(start)) * ARC_RADIUS
    const x1 = CENTRE + Math.cos(rad(end)) * ARC_RADIUS
    const y1 = CENTRE + Math.sin(rad(end)) * ARC_RADIUS

    const sweep = direction > 0 ? 1 : 0

    return {
        d: `M ${x0} ${y0} A ${ARC_RADIUS} ${ARC_RADIUS} 0 0 ${sweep} ${x1} ${y1}`,
        span,
    }
}

/**
 * An axis pointing nearly at the camera collapses to a point, so its cone is
 * ignored below this. Still drawn at full strength: a translucent cone reads
 * as a different colour, which the axis colours cannot afford.
 */
export const MIN_DEPTH = 0.22
