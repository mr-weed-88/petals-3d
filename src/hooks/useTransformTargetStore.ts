import { create } from 'zustand'
import type * as THREE from 'three'

/**
 * The seam between the selection layer inside the canvas and the joystick,
 * which is ordinary DOM outside it.
 *
 * TransformLine collects the selected meshes into one proxy Group and bakes
 * that Group's world matrix back into the records when a drag ends. The
 * joystick needs nothing else: it moves the Group and calls commit.
 */
export interface TransformTarget {
    /** The proxy Group every selected mesh has been reparented into. */
    object: THREE.Object3D
    /** Called as a drag starts: the records are rewritten during it, so the
        previous values are gone by the time commit runs. */
    beginDrag: () => void
    /** Bakes the Group's transform into the line records and persists. */
    commit: () => void
}

export interface TransformTargetState {
    target: TransformTarget | null
    setTarget: (target: TransformTarget | null) => void

    /**
     * Unparents the selection back into the scene and drops the gizmo.
     * Registered in both transform styles. Undo needs it because a stored
     * world transform written onto a still-parented mesh composes with the
     * proxy group's and puts the line somewhere else.
     */
    releaseSelection: (() => void) | null
    setReleaseSelection: (release: (() => void) | null) => void
}

export const transformTargetStore = create<TransformTargetState>((set) => ({
    target: null,
    setTarget: (target) => set({ target }),

    releaseSelection: null,
    setReleaseSelection: (release) => set({ releaseSelection: release }),
}))
