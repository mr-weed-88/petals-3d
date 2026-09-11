/**
 * The EyeDropper API is not in TypeScript's DOM library yet. Declared here
 * so the colour picker can call it without reaching for `any`.
 *
 * Chromium only at the time of writing; `window.EyeDropper` is optional and
 * the caller checks for it before use.
 * https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper
 */
interface EyeDropperOpenResult {
    /** The picked colour as `#RRGGBB`. */
    sRGBHex: string
}

interface EyeDropperInstance {
    open(options?: { signal?: AbortSignal }): Promise<EyeDropperOpenResult>
}

interface EyeDropperConstructor {
    new (): EyeDropperInstance
}

interface Window {
    EyeDropper?: EyeDropperConstructor
}

/**
 * Vendor-prefixed Fullscreen API, still needed for Safari and older iPadOS,
 * which is a primary target for a stylus drawing tool. Optional, and the
 * caller falls back to the standard method first.
 */
interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>
}

interface Document {
    webkitExitFullscreen?: () => Promise<void>
    webkitFullscreenElement?: Element | null
}
