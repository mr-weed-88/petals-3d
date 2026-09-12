import * as THREE from 'three'

import type { AxisMode } from '../../types/domain'
import type { JoystickAxis } from './joystickGeometry'

/** Below this the selection would invert or collapse, so scale stops here. */
const MIN_SCALE = 0.05

const UNIT: Record<JoystickAxis, THREE.Vector3> = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1),
}

const workingAxis = new THREE.Vector3()
const workingQuat = new THREE.Quaternion()

/** A step is a world unit to move and a degree to rotate, so one setting reads
    sensibly in all three modes. */
export const DEG_PER_STEP = Math.PI / 180

/** Ten percent per step, compounding. A percent was too fine to resize by hand. */
export const SCALE_PER_STEP = 0.1

/**
 * The axis to act on: the plain unit vector in world space, or that vector
 * turned by the object's rotation in local space. Same distinction the legacy
 * gizmo draws with setSpace().
 */
function resolveAxis(
    object: THREE.Object3D,
    axis: JoystickAxis,
    space: AxisMode
): THREE.Vector3 {
    workingAxis.copy(UNIT[axis])
    if (space === 'local') workingAxis.applyQuaternion(object.quaternion)
    return workingAxis
}

/** Moves by `steps` whole increments of `step` world units along one axis. */
export function moveByStep(
    object: THREE.Object3D,
    axis: JoystickAxis,
    space: AxisMode,
    step: number,
    steps: number
): void {
    const direction = resolveAxis(object, axis, space)
    object.position.addScaledVector(direction, step * steps)
}

/** Rotates by `steps` whole increments of `step` degrees about one axis. */
export function rotateByStep(
    object: THREE.Object3D,
    axis: JoystickAxis,
    space: AxisMode,
    step: number,
    steps: number
): void {
    const direction = resolveAxis(object, axis, space).clone().normalize()
    workingQuat.setFromAxisAngle(direction, step * steps * DEG_PER_STEP)

    // The resolved axis is already in world terms in both spaces, so turning
    // about it is always a pre-multiply.
    object.quaternion.premultiply(workingQuat).normalize()
}

/** Steps one event may apply, so a flick or a dropped frame cannot resize the
    selection by orders of magnitude at once. */
const MAX_STEPS_PER_EVENT = 20

/**
 * What one move event multiplies the scale by.
 *
 * Compounding rather than `1 + steps * rate`, for three reasons: the same drag
 * gives the same result however it is split across events, shrinking is the
 * exact inverse of growing, and the factor can never reach zero and turn the
 * selection inside out. The linear form only held while a step was one percent.
 */
function scaleFactor(step: number, steps: number): number {
    const applied = Math.max(
        -MAX_STEPS_PER_EVENT,
        Math.min(MAX_STEPS_PER_EVENT, step * steps)
    )
    return (1 + SCALE_PER_STEP) ** applied
}

/**
 * Scales one axis. Scale is always stored relative to an object's own axes, so
 * unlike move and rotate it has no world variant.
 */
export function scaleByStep(
    object: THREE.Object3D,
    axis: JoystickAxis,
    step: number,
    steps: number
): void {
    const next = object.scale[axis] * scaleFactor(step, steps)
    object.scale[axis] = Math.max(MIN_SCALE, next)
}

/** Scales all three axes together, keeping their proportions. */
export function scaleUniformByStep(
    object: THREE.Object3D,
    step: number,
    steps: number
): void {
    const factor = scaleFactor(step, steps)
    object.scale.set(
        Math.max(MIN_SCALE, object.scale.x * factor),
        Math.max(MIN_SCALE, object.scale.y * factor),
        Math.max(MIN_SCALE, object.scale.z * factor)
    )
}

const screenAxis = new THREE.Vector3()

/**
 * Trackball rotation about the screen's axes rather than the world's:
 * horizontal drag spins about the camera's up vector, vertical about its
 * right. World axes made the ball fight the viewer after an orbit.
 */
export function freeRotateByStep(
    object: THREE.Object3D,
    camera: THREE.Quaternion,
    step: number,
    stepsX: number,
    stepsY: number
): void {
    if (stepsX !== 0) {
        screenAxis.copy(UNIT.y).applyQuaternion(camera)
        workingQuat.setFromAxisAngle(screenAxis, step * stepsX * DEG_PER_STEP)
        object.quaternion.premultiply(workingQuat)
    }
    if (stepsY !== 0) {
        screenAxis.copy(UNIT.x).applyQuaternion(camera)
        workingQuat.setFromAxisAngle(screenAxis, step * stepsY * DEG_PER_STEP)
        object.quaternion.premultiply(workingQuat)
    }
    object.quaternion.normalize()
}
