import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import {
    cameraQuaternion,
    setAxisScreen,
    type AxisScreen,
} from '../../hooks/useJoystickCameraStore'

const WORLD_AXES = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1),
} as const

/**
 * Lives inside the canvas and publishes where each world axis points on
 * screen, so the joystick can turn with the scene from outside it.
 *
 * Only the camera's orientation is used. Direction is independent of field of
 * view, of distance, and of whether the camera is perspective or orthographic,
 * which is why this needs none of the pixel-to-world conversion that stepped
 * dragging was introduced to avoid.
 */
const JoystickCameraBridge = () => {
    const { camera } = useThree()

    const lastQuaternion = useRef(new THREE.Quaternion(0, 0, 0, 0))
    const inverse = useRef(new THREE.Quaternion())
    const working = useRef(new THREE.Vector3())

    useFrame(() => {
        // Nothing is published while the camera is still, so an idle scene
        // costs one quaternion comparison per frame and no writes.
        if (lastQuaternion.current.equals(camera.quaternion)) return
        lastQuaternion.current.copy(camera.quaternion)
        cameraQuaternion.copy(camera.quaternion)

        inverse.current.copy(camera.quaternion).invert()

        const next = {} as Record<'x' | 'y' | 'z', AxisScreen>

        for (const axis of ['x', 'y', 'z'] as const) {
            const view = working.current
                .copy(WORLD_AXES[axis])
                .applyQuaternion(inverse.current)

            /*
             * Screen Y grows downward, hence the negation. `depth` is how much
             * of the axis survives the projection: 1 when it lies across the
             * view, 0 when it points straight at the camera and the handle
             * would collapse to a point.
             */
            next[axis] = {
                angle: (Math.atan2(-view.y, view.x) * 180) / Math.PI,
                depth: Math.hypot(view.x, view.y),
                facing: view.z >= 0 ? 1 : -1,
            }
        }

        setAxisScreen(next)
    })

    return null
}

export default JoystickCameraBridge
