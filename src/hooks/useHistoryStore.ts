import { create } from 'zustand'

import type { HistoryEntry } from '../types/history'

export type HistoryDirection = 'undo' | 'redo'

export const HISTORY_LIMIT = 25

export interface HistoryState {
    past: HistoryEntry[]
    future: HistoryEntry[]

    // Set while an entry is applying. Every other action is refused, because a
    // half-applied entry leaves the scene, document and stacks disagreeing.
    busy: boolean

    canUndo: boolean
    canRedo: boolean

    // Set by the buttons, cleared by the bridge. The buttons are ordinary DOM
    // and cannot reach the scene graph, so they ask rather than perform.
    pending: HistoryDirection | null

    push: (entry: HistoryEntry) => void

    request: (direction: HistoryDirection) => void

    take: () => { entry: HistoryEntry; direction: HistoryDirection } | null

    // Must run even if applying threw.
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
        // Keeps undo's own writes out of the history.
        if (get().busy) return

        const past = [...get().past, entry].slice(-HISTORY_LIMIT)
        set({ past, future: [], canUndo: true, canRedo: false })
    },

    request: (direction) => {
        const { busy, past, future } = get()
        if (busy) return
        if (direction === 'undo' && past.length === 0) return
        if (direction === 'redo' && future.length === 0) return

        // Locked here, not when the bridge picks it up, so nothing lands between.
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
