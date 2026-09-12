/*
 * Browser APIs missing from the DOM lib: the EyeDropper the colour picker
 * uses, and the prefixed fullscreen methods Safari still needs.
 */
interface EyeDropperOpenResult {
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

interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>
}

interface Document {
    webkitExitFullscreen?: () => Promise<void>
    webkitFullscreenElement?: Element | null
}
