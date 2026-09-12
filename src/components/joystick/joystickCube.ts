import * as THREE from 'three'

/** One face of the orientation cube. Always six, in a stable order. */
export interface CubeFace {
    key: string
    d: string
    /** False for faces turned away from the viewer. */
    visible: boolean
}

const CORNERS: THREE.Vector3[] = [
    new THREE.Vector3(-1, -1, -1),
    new THREE.Vector3(1, -1, -1),
    new THREE.Vector3(1, 1, -1),
    new THREE.Vector3(-1, 1, -1),
    new THREE.Vector3(-1, -1, 1),
    new THREE.Vector3(1, -1, 1),
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(-1, 1, 1),
]

const FACES: { key: string; corners: number[]; normal: THREE.Vector3 }[] = [
    { key: 'front', corners: [4, 5, 6, 7], normal: new THREE.Vector3(0, 0, 1) },
    { key: 'back', corners: [1, 0, 3, 2], normal: new THREE.Vector3(0, 0, -1) },
    { key: 'right', corners: [5, 1, 2, 6], normal: new THREE.Vector3(1, 0, 0) },
    { key: 'left', corners: [0, 4, 7, 3], normal: new THREE.Vector3(-1, 0, 0) },
    { key: 'top', corners: [7, 6, 2, 3], normal: new THREE.Vector3(0, 1, 0) },
    {
        key: 'bottom',
        corners: [0, 1, 5, 4],
        normal: new THREE.Vector3(0, -1, 0),
    },
]

/** Stable order, so each face keeps one DOM node for its whole life. */
export const CUBE_FACE_KEYS = FACES.map((face) => face.key)

const rotated = CORNERS.map(() => new THREE.Vector3())
const faceNormal = new THREE.Vector3()

/**
 * The orientation cube, projected orthographically. A sphere gives no clue
 * which way it has turned, so the trackball is a cube.
 *
 * Faces come back in a fixed order rather than sorted by depth: under
 * orthographic projection the visible faces of a convex solid never overlap,
 * so hiding the back ones is enough and the DOM order can stay put.
 */
export function cubeFaces(
    quaternion: THREE.Quaternion,
    size: number,
    cx: number,
    cy: number
): CubeFace[] {
    CORNERS.forEach((corner, i) => {
        rotated[i].copy(corner).applyQuaternion(quaternion).multiplyScalar(size)
    })

    return FACES.map((face) => {
        faceNormal.copy(face.normal).applyQuaternion(quaternion)

        const points = face.corners.map((i) => {
            const v = rotated[i]
            // Screen Y grows downward.
            return `${cx + v.x} ${cy - v.y}`
        })

        return {
            key: face.key,
            d: `M ${points.join(' L ')} Z`,
            visible: faceNormal.z > 0.001,
        }
    })
}
