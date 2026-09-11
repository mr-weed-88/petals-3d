import { create } from 'zustand'

import {
    resolveTheme,
    systemTheme,
    type ResolvedTheme,
    type ThemeMode,
} from '../config/theme'

const STORAGE_KEY = 'petals3d:theme'

/** Reads the stored choice. Anything unrecognised falls back to `system`. */
function readStoredMode(): ThemeMode {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
    } catch {
        // Private windows and blocked site data both throw here.
    }
    return 'system'
}

function persistMode(mode: ThemeMode): void {
    try {
        localStorage.setItem(STORAGE_KEY, mode)
    } catch {
        // Not being able to remember the choice is not worth failing over.
    }
}

/** Tailwind reads `.dark` on the root element to flip every token at once. */
function applyToDocument(resolved: ResolvedTheme): void {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export interface ThemeState {
    /** What the user picked. */
    mode: ThemeMode
    /** What is actually on screen, with `system` already resolved. */
    resolved: ResolvedTheme
    setMode: (mode: ThemeMode) => void
    /**
     * Re-resolves from the OS. Called by the `prefers-color-scheme` listener
     * and ignored unless the mode is `system`.
     */
    syncSystem: () => void
}

const initialMode = readStoredMode()
const initialResolved = resolveTheme(initialMode)

applyToDocument(initialResolved)

export const themeStore = create<ThemeState>((set, get) => ({
    mode: initialMode,
    resolved: initialResolved,

    setMode: (mode) => {
        const resolved = resolveTheme(mode)
        persistMode(mode)
        applyToDocument(resolved)
        set({ mode, resolved })
    },

    syncSystem: () => {
        if (get().mode !== 'system') return
        const resolved = systemTheme()
        if (resolved === get().resolved) return
        applyToDocument(resolved)
        set({ resolved })
    },
}))

/**
 * Keeps `system` mode following the OS while the app is open.
 *
 * Registered at module scope rather than in an effect so it survives React
 * remounts, and because there is exactly one document to track.
 */
if (typeof window !== 'undefined' && window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => themeStore.getState().syncSystem()

    if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', onChange)
    } else {
        // Safari below 14 only has the deprecated form.
        query.addListener(onChange)
    }
}
