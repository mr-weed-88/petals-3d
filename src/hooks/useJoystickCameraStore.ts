import * as THREE from 'three'

import type { JoystickAxis } from '../components/joystick/joystickGeometry'

export interface AxisScreen {
    // Degrees clockwise from screen right.
    angle: number
    // 1 across the view, 0 pointing at the camera.
    depth: number
    // +1 towards the viewer, -1 away. Flips spin direction.
    facing: number
}

export type AxisScreenMap = Record<JoystickAxis, AxisScreen>

type Listener = (axes: AxisScreenMap) => void

// Not a zustand store: the camera publishes every frame it moves, and React
// state would re-render the joystick sixty times a second during an orbit.
let current: AxisScreenMap = {
    x: { angle: 150, depth: 1, facing: 1 },
    y: { angle: -90, depth: 1, facing: 1 },
    z: { angle: 30, depth: 1, facing: 1 },
}

// Free rotation and the orientation cube need the camera's full rotation,
// not just where each axis lands on screen.
export const cameraQuaternion = new THREE.Quaternion()

const listeners = new Set<Listener>()

export function getAxisScreen(): AxisScreenMap {
    return current
}

export function setAxisScreen(next: AxisScreenMap): void {
    current = next
    listeners.forEach((listener) => listener(next))
}

export function subscribeAxisScreen(listener: Listener): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}
