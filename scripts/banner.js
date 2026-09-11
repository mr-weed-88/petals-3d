#!/usr/bin/env node
/**
 * The Petals3D dev banner.
 *
 * Exports a Vite plugin so the banner is reprinted every time the dev server
 * starts *or* restarts. Vite clears the screen on restart, which would wipe
 * a banner printed once before `vite` was spawned.
 *
 * Also runs standalone: `node scripts/banner.js`.
 *
 * Cosmetic only, dependency-free, and it never throws: a decorative banner
 * must not be able to stop the dev server.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

/* ------------------------------------------------------------------ *
 * Colour
 *
 * Truecolor where the terminal advertises it, 256-colour otherwise, and
 * nothing at all when piped to a file or when NO_COLOR is set. Resolved on
 * every call rather than at import, because the plugin prints long after
 * this module is first loaded.
 * ------------------------------------------------------------------ */

const useColor = () =>
    Boolean(process.stdout.isTTY) &&
    !process.env.NO_COLOR &&
    process.env.TERM !== 'dumb'

const truecolor = () =>
    process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit'

/** Sage green, the app's own accent. */
const SAGE = [92, 163, 103]
/** A brighter leaf green, for the artwork. */
const LEAF = [124, 200, 120]
/** Muted text. */
const MUTED = [120, 134, 124]

const rgb = ([r, g, b], fallback256) => {
    if (!useColor()) return ''
    return truecolor()
        ? `\x1b[38;2;${r};${g};${b}m`
        : `\x1b[38;5;${fallback256}m`
}

/* ------------------------------------------------------------------ *
 * Artwork
 *
 * Braille block characters (U+2800..U+28FF), padded with U+2800 BRAILLE
 * PATTERN BLANK rather than ordinary spaces. Do not "tidy" the whitespace:
 * those blanks hold the shape together, and an editor that trims trailing
 * space will break the drawing.
 *
 * This is a half-scale rendering of the original 49x21 drawing. Each glyph
 * carries a 2x4 dot grid, so the full-size art was decoded to a dot bitmap,
 * downsampled 2x, and re-encoded.
 * ------------------------------------------------------------------ */

const BRAILLE_BLANK = '⠀'

const LEAF_SOURCE = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣾⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⢀⡏⡇⣧⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀
⠀⠀⠀⢻⣷⣤⡀⠀⠀⠀⢸⡃⡇⣻⠀⠀⠀⢀⣠⢶⣿⠁⠀⠀⠀
⠀⠀⠀⠀⢻⡳⡙⢦⡀⠀⢸⡇⡇⣽⠀⠀⣰⢟⡵⣹⠃⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢳⡝⢦⠹⣆⢸⣇⡇⣿⢀⡾⣡⠎⡼⠃⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠙⢦⡳⣌⣷⣇⣇⣷⣏⡔⣡⠞⠁⠀⠀⠀⠀⠀⠀
⠙⠻⢿⣯⠻⣟⣒⡾⢿⣮⣮⣿⢸⣯⣫⣾⡥⢖⣒⡺⠟⣗⡶⠒⠂
⠀⠀⠀⠈⠙⠓⠶⠭⠭⢾⣻⣿⣾⣟⣛⣚⣭⠽⠖⠛⠋⠁⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣠⣾⣟⡽⠋⡏⠻⣝⡿⣲⣄⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠚⠛⠉⠁⠀⠀⠃⠀⠀⠉⠙⠛⠓⠀⠀⠀⠀⠀⠀`
    .split('\n')
    .slice(1)

/** Drops rows and columns that carry nothing but Braille blanks. */
function cropArt(rows) {
    const isBlank = (s) => [...s].every((c) => c === BRAILLE_BLANK)

    let top = 0
    let bottom = rows.length
    while (top < bottom && isBlank(rows[top])) top++
    while (bottom > top && isBlank(rows[bottom - 1])) bottom--

    const body = rows.slice(top, bottom)
    if (body.length === 0) return []

    const cols = Math.max(...body.map((r) => [...r].length))
    const columnBlank = (x) =>
        body.every((r) => ([...r][x] ?? BRAILLE_BLANK) === BRAILLE_BLANK)

    let left = 0
    let right = cols
    while (left < right && columnBlank(left)) left++
    while (right > left && columnBlank(right - 1)) right--

    return body.map((r) =>
        [...r]
            .slice(left, right)
            .join('')
            .padEnd(right - left, BRAILLE_BLANK)
    )
}

const LEAF_ART = cropArt(LEAF_SOURCE)
const LEAF_WIDTH = LEAF_ART.length ? [...LEAF_ART[0]].length : 0

const WORDMARK = [
    '██████╗ ███████╗████████╗ █████╗ ██╗     ███████╗   ██████╗ ██████╗ ',
    '██╔══██╗██╔════╝╚══██╔══╝██╔══██╗██║     ██╔════╝   ╚════██╗██╔══██╗',
    '██████╔╝█████╗     ██║   ███████║██║     ███████╗    █████╔╝██║  ██║',
    '██╔═══╝ ██╔══╝     ██║   ██╔══██╗██║     ╚════██║    ╚═══██╗██║  ██║',
    '██║     ███████╗   ██║   ██║  ██║███████╗███████║   ██████╔╝██████╔╝',
    '╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝   ╚═════╝ ╚═════╝ ',
]

/** Falls back to a plain wordmark on terminals too narrow for the blocks. */
const NARROW_WORDMARK = ['P E T A L S - 3 D']

function readVersion() {
    try {
        const here = dirname(fileURLToPath(import.meta.url))
        const pkg = JSON.parse(
            readFileSync(join(here, '..', 'package.json'), 'utf8')
        )
        return typeof pkg.version === 'string' ? pkg.version : ''
    } catch {
        return ''
    }
}

/** Renders the banner as a string. */
export function renderBanner() {
    const width = process.stdout.columns ?? 80
    const version = readVersion()

    const RESET = useColor() ? '\x1b[0m' : ''
    const BOLD = useColor() ? '\x1b[1m' : ''
    const sage = rgb(SAGE, 71)
    const leaf = rgb(LEAF, 114)
    const muted = rgb(MUTED, 245)

    const wordmark = width >= WORDMARK[0].length ? WORDMARK : NARROW_WORDMARK
    const wordmarkWidth = Math.max(...wordmark.map((line) => line.length))

    const out = ['']

    // A clipped leaf looks worse than no leaf.
    if (LEAF_WIDTH > 0 && width >= LEAF_WIDTH) {
        // Centred over the wordmark rather than the terminal, so the two stay
        // visually attached at any window size.
        const pad = ' '.repeat(
            Math.max(0, Math.floor((wordmarkWidth - LEAF_WIDTH) / 2))
        )
        for (const line of LEAF_ART) out.push(`${leaf}${pad}${line}${RESET}`)
        out.push('')
    }

    for (const line of wordmark) out.push(`${sage}${BOLD}${line}${RESET}`)

    out.push('')
    out.push(
        `${muted}  An open source 3D hand-drawn whitebox` +
            (version ? `${RESET}${sage}  v${version}${RESET}` : RESET)
    )
    out.push('')

    return out.join('\n') + '\n'
}

export function printBanner() {
    try {
        process.stdout.write(renderBanner())
    } catch {
        // A broken banner must never stop the dev server.
    }
}

/**
 * Survives a config reload, which re-imports this module inside the same
 * process, so the plugin can tell a cold start from a restart.
 */
const state = (globalThis.__petals3dBanner ??= { started: false })

/**
 * Vite plugin. Prints the banner on a cold start and again on every restart.
 *
 * The two cases need different hooks:
 *
 * - Cold start: Vite clears the screen, logs its version, then calls
 *   `printUrls`. Anything printed earlier is wiped, so the only place the
 *   banner survives is inside a wrapped `printUrls`.
 *
 * - Restart (editing vite.config.ts): Vite logs "server restarted" and does
 *   *not* clear the screen or call `printUrls` again, so the banner has to
 *   be printed directly from `configureServer`.
 *
 * HMR updates on a normal file save deliberately do not reprint: a 22-line
 * banner on every keystroke-to-save would bury Vite's own output.
 */
export function bannerPlugin() {
    return {
        name: 'petals3d-banner',
        apply: 'serve',
        configureServer(server) {
            if (state.started) {
                printBanner()
                return
            }

            state.started = true

            const printUrls = server.printUrls.bind(server)
            server.printUrls = () => {
                printBanner()
                printUrls()
            }
        },
    }
}

export default bannerPlugin

// Standalone: `node scripts/banner.js`
if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    printBanner()
}
