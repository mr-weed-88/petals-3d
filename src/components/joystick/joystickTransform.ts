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

/**
 * One step means a different unit in each mode, so a single setting reads
 * sensibly everywhere: whole world units to move, whole degrees to rotate, and
 * whole percent to scale. A step of 1 is then 1 unit, 1 degree, or 1 percent.
 */
export const DEG_PER_STEP = Math.PI / 180
export const SCALE_PER_STEP = 0.01

/**
 * The axis to act on. In world space that is the plain unit vector; in local
 * space it is that vector turned by the object's own rotation, which is the
 * same distinction the legacy gizmo draws with setSpace().
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

/**
 * Scales one axis by `steps` whole percent. Scale is always stored relative to
 * an object's own axes, so unlike move and rotate it has no world variant.
 */
export function scaleByStep(
    object: THREE.Object3D,
    axis: JoystickAxis,
    step: number,
    steps: number
): void {
    const next = object.scale[axis] * (1 + step * steps * SCALE_PER_STEP)
    object.scale[axis] = Math.max(MIN_SCALE, next)
}

/** Scales all three axes together, keeping their proportions. */
export function scaleUniformByStep(
    object: THREE.Object3D,
    step: number,
    steps: number
): void {
    const factor = 1 + step * steps * SCALE_PER_STEP
    object.scale.set(
        Math.max(MIN_SCALE, object.scale.x * factor),
        Math.max(MIN_SCALE, object.scale.y * factor),
        Math.max(MIN_SCALE, object.scale.z * factor)
    )
}

const screenAxis = new THREE.Vector3()

/**
 * Trackball rotation, turning about the screen's axes rather than the world's.
 *
 * Horizontal drag spins about the camera's up vector and vertical about its
 * right vector, which is how orbiting a camera behaves. Using world axes
 * instead made the ball fight the viewer: after orbiting, dragging sideways
 * would tumble the selection rather than spin it.
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
