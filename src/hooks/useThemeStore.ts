import { create } from 'zustand'

import {
    resolveTheme,
    systemTheme,
    type ResolvedTheme,
    type ThemeMode,
} from '../config/theme'

const STORAGE_KEY = 'petals3d:theme'

function readStoredMode(): ThemeMode {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
    } catch {
        // Blocked site data or a private window. Fall through to the default.
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

/** The `.dark` class on <html> is what flips the CSS variables in App.css. */
function applyToDocument(resolved: ResolvedTheme): void {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export interface ThemeState {
    /** What the user picked. `system` follows the OS. */
    mode: ThemeMode
    /** What is on screen once `system` has been resolved. */
    resolved: ResolvedTheme
    setMode: (mode: ThemeMode) => void
    /** Re-reads the OS preference. No-op unless mode is `system`. */
    syncSystem: () => void
}

// Applied before the store is created, so the first paint is already themed.
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

// Module scope, so one listener serves every component.
if (typeof window !== 'undefined' && window.matchMedia) {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => themeStore.getState().syncSystem()

    if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', onChange)
    } else {
        // Safari below 14.
        query.addListener(onChange)
    }
}
