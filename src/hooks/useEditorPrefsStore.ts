import { create } from 'zustand'

/** Legacy three.js gizmo, or the on-screen joystick. */
export type TransformStyle = 'legacy' | 'joystick'

const STORAGE_KEY = 'petals3d:editor-prefs'

/**
 * How far one step of a joystick drag moves, rotates or scales the selection:
 * world units, radians, and a scale factor respectively.
 *
 * Fixed steps are why the joystick needs nothing from the camera. Without them
 * a drag would have to be converted from pixels to world units, which differs
 * between perspective and orthographic cameras and changes with distance.
 */
export const STEP_MIN = 1
export const STEP_MAX = 1

interface StoredPrefs {
    transformStyle?: TransformStyle
    transformStep?: number
}

function readStored(): StoredPrefs {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) return JSON.parse(raw) as StoredPrefs
    } catch {
        // Blocked site data or malformed JSON. Fall through to the defaults.
    }
    return {}
}

function persist(prefs: StoredPrefs): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    } catch {
        // Not being able to remember the choice is not worth failing over.
    }
}

export interface EditorPrefsState {
    transformStyle: TransformStyle
    setTransformStyle: (style: TransformStyle) => void

    transformStep: number
    setTransformStep: (step: number) => void
}

const stored = readStored()

export const editorPrefsStore = create<EditorPrefsState>((set, get) => ({
    transformStyle: stored.transformStyle ?? 'joystick',
    setTransformStyle: (style) => {
        set({ transformStyle: style })
        persist({ transformStyle: style, transformStep: get().transformStep })
    },

    transformStep: stored.transformStep ?? STEP_MIN,
    setTransformStep: (step) => {
        const clamped = Math.min(STEP_MAX, Math.max(STEP_MIN, step))
        set({ transformStep: clamped })
        persist({
            transformStyle: get().transformStyle,
            transformStep: clamped,
        })
    },
}))
