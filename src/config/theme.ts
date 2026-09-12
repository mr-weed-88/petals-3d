/**
 * Both halves of the palette. UI chrome is coloured through the CSS variables
 * in App.css, which this file must stay in step with; the 3D scene cannot use
 * CSS, because three.js needs real colour values.
 */

/** What the user picked. `system` follows the OS. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** What is actually on screen once `system` has been resolved. */
export type ResolvedTheme = 'light' | 'dark'

export interface ScenePalette {
    /** Canvas clear colour, and the default for the background picker. */
    canvas: string
    /** Minor grid lines. Major axes keep their fixed AXIS colours. */
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
        // above the work area. Light enough that grey strokes stay visible.
        canvas: '#232326',
        // Lifted well off the background: a grid at light-theme lightness
        // disappears entirely against a dark ground.
        grid: '#3C3C42',
        guide: '#7A7A84',
        loftWire: '#5E5E68',
        ambient: '#FFFFFF',
        // Lower, because the light-theme value washes strokes out on dark.
        ambientIntensity: 6,
    },
}

/** Fixed across themes: X/Y/Z are signal, not decoration. */
export const AXIS = {
    x: '#DE3163',
    y: '#50C878',
    z: '#0096FF',
} as const

/**
 * The brand greens, darkest to lightest. The accent draws from opposite ends
 * per theme: an active control must be dark enough to read on white and light
 * enough to read on near-black, so unlike every other token it cannot hold one
 * value.
 */
const GREEN = {
    deepest: '#0A3C30',
    deep: '#00674F',
    mid: '#3EBB9E',
    light: '#73E6CB',
} as const

export const UI: Record<ResolvedTheme, Record<string, string>> = {
    light: {
        surface: '#FFFFFF',
        'surface-2': '#F2FBF8',
        'surface-3': '#E3F6EF',
        ink: GREEN.deepest,
        'ink-muted': '#247B67',
        line: GREEN.deep,
        accent: GREEN.deep,
        // Sits on top of `accent`, so it inverts with it.
        'accent-ink': '#FFFFFF',
        // The modal backdrop, and the only token deliberately outside the
        // greens: a tinted scrim washed the whole canvas in accent.
        overlay: '#9CA3AF',
    },

    /*
     * Surfaces stay neutral near-black. Tinting the panels green as well made
     * them compete with the accent, which is the one thing that should read as
     * colour. Nothing is pure black, so panels keep an edge against the
     * tooltip and against a black desktop.
     */
    dark: {
        surface: '#141417',
        'surface-2': '#1C1C20',
        'surface-3': '#26262B',
        ink: '#E6E6EA',
        'ink-muted': '#8A9A95',
        line: GREEN.mid,
        accent: GREEN.light,
        'accent-ink': GREEN.deepest,

        overlay: '#18181B',
    },
}

export function systemTheme(): ResolvedTheme {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
    return mode === 'system' ? systemTheme() : mode
}
