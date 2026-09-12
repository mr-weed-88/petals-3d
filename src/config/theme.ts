/**
 * Scene colours. UI chrome is themed by the CSS variables in App.css; this
 * file exists because three.js needs real colour values, not variables.
 */

/** What the user picked. `system` follows the OS. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** What is actually on screen once `system` has been resolved. */
export type ResolvedTheme = 'light' | 'dark'

export interface ScenePalette {
    /** Canvas clear colour, and the default for the background picker. */
    canvas: string
    /** Minor grid lines. Major axes keep the fixed AXIS colours. */
    grid: string
    /** Guide surfaces and the in-progress guide stroke. */
    guide: string
    /** Wireframe of the adjustable loft surface. */
    loftWire: string
    ambient: string
    ambientIntensity: number
}

export const SCENE: Record<ResolvedTheme, ScenePalette> = {
    light: {
        canvas: '#FFFFFF',
        grid: '#D3D3D3',
        guide: '#C0C0C0',
        loftWire: '#F2F2F2',
        ambient: '#FFFFFF',
        ambientIntensity: 10,
    },
    dark: {
        // A shade lighter than the panels, so the chrome reads as floating
        // above the work area, but light enough to keep grey strokes visible.
        canvas: '#232326',
        // A grid at light-theme lightness disappears against a dark ground.
        grid: '#3C3C42',
        guide: '#7A7A84',
        loftWire: '#5E5E68',
        ambient: '#FFFFFF',
        // Lower: the light-theme value washes strokes out on dark.
        ambientIntensity: 6,
    },
}

/** Fixed across themes: X/Y/Z are signal, not decoration. */
export const AXIS = {
    x: '#DE3163',
    y: '#50C878',
    z: '#0096FF',
} as const

export function systemTheme(): ResolvedTheme {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
    return mode === 'system' ? systemTheme() : mode
}
