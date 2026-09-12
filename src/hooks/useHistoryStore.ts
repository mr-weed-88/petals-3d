import { create } from 'zustand'

import type { HistoryEntry } from '../types/history'

/** Which way an entry is being applied. */
export type HistoryDirection = 'undo' | 'redo'

/** How many actions can be undone. */
export const HISTORY_LIMIT = 25

export interface HistoryState {
    past: HistoryEntry[]
    future: HistoryEntry[]

    /**
     * Set from the moment undo or redo starts until the entry is applied and
     * written. Every other action is refused while it is set: a half-applied
     * entry leaves the scene, the document and the stacks disagreeing.
     */
    busy: boolean

    canUndo: boolean
    canRedo: boolean

    /**
     * Set by the buttons, cleared by the bridge inside the canvas. The buttons
     * are ordinary DOM and cannot reach the scene graph, so they ask for an
     * undo rather than performing one.
     */
    pending: HistoryDirection | null

    /** Records a completed action. Clears the redo stack, as any editor does. */
    push: (entry: HistoryEntry) => void

    /** Asks for an undo or redo. Locks the editor if there is work to do. */
    request: (direction: HistoryDirection) => void

    /** Moves one entry between the stacks. Called by the bridge only. */
    take: () => { entry: HistoryEntry; direction: HistoryDirection } | null

    /** Releases the lock. Must run even if applying threw. */
    finish: () => void

    clear: () => void
}

export const historyStore = create<HistoryState>((set, get) => ({
    past: [],
    future: [],
    busy: false,
    canUndo: false,
    canRedo: false,
    pending: null,

    push: (entry) => {
        // Refusing while applying is what keeps undo's own writes out of
        // the history.
        if (get().busy) return

        const past = [...get().past, entry].slice(-HISTORY_LIMIT)
        set({ past, future: [], canUndo: true, canRedo: false })
    },

    request: (direction) => {
        const { busy, past, future } = get()
        if (busy) return
        if (direction === 'undo' && past.length === 0) return
        if (direction === 'redo' && future.length === 0) return

        // Locked here rather than when the bridge picks it up, so nothing can
        // land in the gap between asking and applying.
        set({ busy: true, pending: direction })
    },

    take: () => {
        const { pending, past, future } = get()
        if (!pending) return null

        if (pending === 'undo') {
            const entry = past[past.length - 1]
            if (!entry) return null

            const remaining = past.slice(0, -1)
            set({
                past: remaining,
                future: [entry, ...future].slice(0, HISTORY_LIMIT),
                canUndo: remaining.length > 0,
                canRedo: true,
            })
            return { entry, direction: 'undo' }
        }

        const entry = future[0]
        if (!entry) return null

        const remaining = future.slice(1)
        set({
            past: [...past, entry].slice(-HISTORY_LIMIT),
            future: remaining,
            canUndo: true,
            canRedo: remaining.length > 0,
        })
        return { entry, direction: 'redo' }
    },

    finish: () => set({ busy: false, pending: null }),

    clear: () =>
        set({
            past: [],
            future: [],
            canUndo: false,
            canRedo: false,
            pending: null,
            busy: false,
        }),
}))
