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
 * Each arc spans between two cone tips, so it lies in the plane those two axes
 * define and therefore turns the third. Its length is not fixed: it follows
 * how far apart the two cones happen to sit on screen, so orbiting stretches
 * and shrinks it.
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

/**
 * One width, whether or not the arc is being dragged. Growing on press made
 * the whole ring jump at the moment of grabbing it.
 */
export const ARC_STROKE = 7

/**
 * A fixed neutral grey rather than a theme token. The muted ink carries the
 * brand green, which put a third colour beside the axis reds and blues; this
 * reads as plain grey on white and as light grey on near-black.
 */
export const ARC_COLOR = '#A8A8A8'
/**
 * The hub's grab area, sized to swallow the cube whole. A cube of half-width
 * `CUBE_SIZE` reaches `CUBE_SIZE * sqrt(3)` at its corners, so a smaller disc
 * would leave the corners of the box unclickable.
 */
export const HUB_RADIUS = 17
export const CUBE_SIZE = 9

/**
 * Half the drawn length of the rail a cone slides along. Deliberately past the
 * widget's outer circle, so the rail reads as a track the joystick sits on
 * rather than something contained by it. Needs overflow to stay visible on the
 * svg, which would otherwise clip at the viewBox edge.
 */
export const RAIL_LENGTH = 62

/**
 * How far from the centre a cone may travel: the whole drawn rail, less enough
 * for the cone's body to stay on the line rather than hang off the end. Tied
 * to the rail length so the two can never drift apart, since a handle that
 * stops short of its own track reads as broken.
 */
const CONE_TRAVEL = RAIL_LENGTH - 6

/*
 * The cone's travel, as an offset from where it rests.
 *
 * Clamped by position, not by drag distance. Clamping the drag treated the
 * cone's resting place as the middle of its range, which it is not: the cone
 * sits well out from the centre, so there is far more room inwards than
 * outwards. That stopped the cone before the cube while the selection kept
 * moving.
 */
export const RAIL_MAX_OFFSET = CONE_TRAVEL - CONE_DISTANCE
export const RAIL_MIN_OFFSET = -CONE_TRAVEL - CONE_DISTANCE

/** Degrees of clearance left at each end of an arc, so it clears the cones. */
const ARC_GAP = 33

/** Handles are drawn pointing along screen right, then turned into place. */
export function rotateAbout(angle: number): string {
    return `rotate(${angle} ${CENTRE} ${CENTRE})`
}

const rad = (deg: number) => (deg * Math.PI) / 180

/** Wraps a difference of angles into the range that describes the short way round. */
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
 * The arc between two cone tips, taking the short way round and leaving a gap
 * at each end. Returns an empty path once the two cones are close enough that
 * nothing would be left to draw.
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
 * An axis pointing nearly at the camera collapses to a point, so its cone
 * cannot be dragged meaningfully and is ignored below this. The cone is still
 * drawn at full strength: fading it was clearer, but a translucent cone reads
 * as a different colour, which the axis colours cannot afford.
 */
export const MIN_DEPTH = 0.22
