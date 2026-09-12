import * as THREE from 'three'

import type { JoystickAxis } from '../components/joystick/joystickGeometry'

/** Where one world axis points on screen, and how much of it survives. */
export interface AxisScreen {
    /** Degrees clockwise from screen right. */
    angle: number
    /** 1 when the axis lies across the view, 0 when it points at the camera. */
    depth: number
    /** +1 when the axis points towards the viewer, -1 away. Flips spin direction. */
    facing: number
}

export type AxisScreenMap = Record<JoystickAxis, AxisScreen>

type Listener = (axes: AxisScreenMap) => void

/**
 * Deliberately not a zustand store. The camera publishes on every frame it
 * moves, and React state would re-render the joystick sixty times a second
 * during an orbit to change a few transform attributes. Subscribers write
 * those attributes directly instead.
 */
let current: AxisScreenMap = {
    x: { angle: 150, depth: 1, facing: 1 },
    y: { angle: -90, depth: 1, facing: 1 },
    z: { angle: 30, depth: 1, facing: 1 },
}

/* The camera's orientation, kept live by the bridge. Free rotation and the
   orientation cube both need the full rotation, not just where each axis
   lands on screen. */
export const cameraQuaternion = new THREE.Quaternion()

const listeners = new Set<Listener>()

export function getAxisScreen(): AxisScreenMap {
    return current
}

export function setAxisScreen(next: AxisScreenMap): void {
    current = next
    listeners.forEach((listener) => listener(next))
}

/** Returns the unsubscribe function, for use as an effect cleanup. */
export function subscribeAxisScreen(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
