import { create } from 'zustand'
import type * as THREE from 'three'

/**
 * The seam between the selection layer inside the canvas and the joystick,
 * which is ordinary DOM outside it.
 *
 * TransformLine already collects the selected meshes into a single proxy Group
 * and bakes that Group's world matrix back into the line records when a drag
 * ends. The joystick needs nothing else: it moves the Group and calls commit.
 * That is why it can be added without touching the selection logic.
 */
export interface TransformTarget {
    /** The proxy Group every selected mesh has been reparented into. */
    object: THREE.Object3D
    /** Bakes the Group's transform into the line records and persists. */
    commit: () => void
}

export interface TransformTargetState {
    target: TransformTarget | null
    setTarget: (target: TransformTarget | null) => void
}

export const transformTargetStore = create<TransformTargetState>((set) => ({
    target: null,
    setTarget: (target) => set({ target }),
}))
