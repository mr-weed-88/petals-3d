import { create } from 'zustand'
import type * as THREE from 'three'

// The seam between the selection layer inside the canvas and the joystick
// outside it. The joystick moves the proxy Group and calls commit.
export interface TransformTarget {
    object: THREE.Object3D
    // Called as a drag starts: the records are rewritten during it.
    beginDrag: () => void
    commit: () => void
}

export interface TransformTargetState {
    target: TransformTarget | null
    setTarget: (target: TransformTarget | null) => void

    // Unparents the selection back into the scene. Undo needs it: a stored
    // world transform on a still-parented mesh composes with the group's.
    releaseSelection: (() => void) | null
    setReleaseSelection: (release: (() => void) | null) => void
}

export const transformTargetStore = create<TransformTargetState>((set) => ({
    target: null,
    setTarget: (target) => set({ target }),

    releaseSelection: null,
    setReleaseSelection: (release) => set({ releaseSelection: release }),
}))
