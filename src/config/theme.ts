/**
 * The single source of truth for both themes.
 *
 * UI chrome is coloured through CSS custom properties, declared in App.css
 * and exposed to Tailwind as semantic names in tailwind.config.js, so a
 * component writes `bg-surface` rather than a hex value.
 *
 * The 3D scene cannot use CSS: three.js needs real colour values, so the
 * scene half of the palette lives here as plain strings and is read from
 * the theme store at render time.
 *
 * Both halves must stay in step with the `:root` and `.dark` blocks in
 * App.css. Change one, change the other.
 */

/** What the user picked. `system` follows the OS. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** What is actually on screen once `system` has been resolved. */
export type ResolvedTheme = 'light' | 'dark'

/* ------------------------------------------------------------------ *
 * Scene palette
 * ------------------------------------------------------------------ */

export interface ScenePalette {
    /** Canvas clear colour. Also the default for the background picker. */
    canvas: string
    /** Minor grid lines. The major axis lines keep their fixed axis colours. */
    grid: string
    /** Guide surfaces and the in-progress guide stroke. */
    guide: string
    /** Wireframe of the adjustable loft surface. */
    loftWire: string
    /** Ambient fill colour and strength. */
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
        // above the work area rather than cut out of it. Light enough that
        // dark grey strokes stay visible.
        canvas: '#232326',
        // Lifted well off the background: a grid at light-theme lightness
        // disappears entirely against a dark ground.
        grid: '#3C3C42',
        guide: '#7A7A84',
        loftWire: '#5E5E68',
        ambient: '#FFFFFF',
        // Lower, because strokes are drawn against a dark ground and the
        // light-theme value washes them out.
        ambientIntensity: 6,
    },
}

/**
 * Axis colours, shared by the world grids and the transform gizmo. Fixed
 * across themes: these are signal, not decoration, and X/Y/Z must stay
 * recognisable.
 */
export const AXIS = {
    x: '#DE3163',
    y: '#50C878',
    z: '#0096FF',
} as const

/* ------------------------------------------------------------------ *
 * UI palette
 * ------------------------------------------------------------------ */

/**
 * The brand mint. Bright enough to read on both grounds, so it is the one
 * colour that does not change between themes; everything else is built
 * around its hue.
 */
const ACCENT = '#00FFA5'

export const UI: Record<ResolvedTheme, Record<string, string>> = {
    light: {
        surface: '#FFFFFF',
        'surface-2': '#F0FBF6',
        'surface-3': '#DFF6EB',
        ink: '#08221A',
        'ink-muted': '#3D6154',
        line: '#2F5548',
        accent: ACCENT,
        // Sits on top of `accent`. Near-black in both themes: the mint is
        // bright enough that dark text is the only readable choice on it.
        'accent-ink': '#00160E',
        overlay: '#0B2A20',
    },
    /**
     * Neutral near-black, on the same faintly cool grey as the canvas. The
     * mint accent is the only colour in the dark theme; tinting the panels
     * green too made them compete with it. Nothing is pure #000000, so the
     * panels keep an edge against the tooltip and against a black desktop.
     */
    dark: {
        surface: '#141417',
        'surface-2': '#1C1C20',
        'surface-3': '#26262B',
        ink: '#E6E6EA',
        'ink-muted': '#8C8C96',
        line: '#3A3A42',
        accent: ACCENT,
        'accent-ink': '#00160E',
        overlay: '#0A0A0C',
    },
}

/** Reads the OS preference. Falls back to light where unavailable. */
export function systemTheme(): ResolvedTheme {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
    return mode === 'system' ? systemTheme() : mode
}
