import { useState, useRef, useEffect, type ChangeEvent } from 'react'

import { IconColorPicker } from '@tabler/icons-react'

interface Rgb {
    r: number
    g: number
    b: number
}

interface Hsv {
    h: number
    s: number
    v: number
}

const hsvToRgb = (h: number, s: number, v: number): Rgb => {
    const c = v * s
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = v - c

    let r: number
    let g: number
    let b: number

    if (h < 60) [r, g, b] = [c, x, 0]
    else if (h < 120) [r, g, b] = [x, c, 0]
    else if (h < 180) [r, g, b] = [0, c, x]
    else if (h < 240) [r, g, b] = [0, x, c]
    else if (h < 300) [r, g, b] = [x, 0, c]
    else [r, g, b] = [c, 0, x]

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
    }
}

const rgbToHex = (r: number, g: number, b: number): string =>
    '#' +
    [r, g, b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()

const hexToHsv = (hex: string): Hsv => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min

    let h = 0
    const s = max === 0 ? 0 : d / max
    const v = max

    if (d !== 0) {
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
    }

    return { h, s, v }
}

const normalizeHex = (v: string | null | undefined): string | null => {
    if (!v) return null
    const s = (v.startsWith('#') ? v : `#${v}`).toUpperCase()
    return /^#([0-9A-F]{6})$/i.test(s) ? s : null
}

const WHEEL_SIZE = 200
const SQUARE_SIZE = 100
const WHEEL_SIZE_M = 160
const SQUARE_SIZE_M = 72

interface PointerPosition {
    clientX: number
    clientY: number
}

export interface ColorPickerProps {
    value: string
    onChange?: (hex: string) => void
    isSmall: boolean
}

const ColorPicker = ({ value, onChange, isSmall }: ColorPickerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const squareCanvasRef = useRef<HTMLCanvasElement>(null)

    const [hue, setHue] = useState(0)
    const [sat, setSat] = useState(0)
    const [val, setVal] = useState(1)

    const [inputHex, setInputHex] = useState('#000000')
    const [typing, setTyping] = useState(false)

    // Hue/sat/val and the hex string are two views of one colour, and each
    // effect writes the other's state. This marks a write as an echo, so the
    // pair cannot loop.
    const syncingRef = useRef(false)
    const [draggingWheel, setDraggingWheel] = useState(false)
    const [draggingSquare, setDraggingSquare] = useState(false)

    // Incoming `value` wins, unless the user is mid-edit in the hex field.
    useEffect(() => {
        const src = normalizeHex(value)
        if (!src) return
        if (typing) return
        if (src === inputHex) return

        syncingRef.current = true
        const { h, s, v } = hexToHsv(src)
        setHue(h)
        setSat(s)
        setVal(v)
        setInputHex(src)
        queueMicrotask(() => {
            syncingRef.current = false
        })
    }, [value, inputHex, typing])

    // Deps are the wheel/square values only: adding inputHex or onChange would
    // re-fire this on its own output.
    useEffect(() => {
        if (syncingRef.current) return
        const { r, g, b } = hsvToRgb(hue, sat, val)
        const nextHex = rgbToHex(r, g, b)
        if (!typing && nextHex !== inputHex) setInputHex(nextHex)
        onChange?.(nextHex)
    }, [hue, sat, val])

    const handleHexFocus = () => setTyping(true)

    const handleHexBlur = () => {
        setTyping(false)
        if (!normalizeHex(inputHex)) {
            const { r, g, b } = hsvToRgb(hue, sat, val)
            setInputHex(rgbToHex(r, g, b))
        }
    }

    const handleHexInput = (e: ChangeEvent<HTMLInputElement>) => {
        let text = e.target.value.toUpperCase()
        if (!text.startsWith('#')) text = '#' + text.slice(0, 6)
        setInputHex(text)

        const valid = normalizeHex(text)
        if (!valid) return

        const { h, s, v } = hexToHsv(valid)
        syncingRef.current = true
        setHue(h)
        setSat(s)
        setVal(v)
        queueMicrotask(() => {
            syncingRef.current = false
            onChange?.(valid)
        })
    }

    const handleEyedropper = async () => {
        const EyeDropperCtor = window.EyeDropper
        if (!EyeDropperCtor) {
            alert('EyeDropper API not supported in this browser.')
            return
        }

        try {
            const { sRGBHex } = await new EyeDropperCtor().open()
            const src = normalizeHex(sRGBHex)
            if (!src) return

            setTyping(false)
            setInputHex(src)
            const { h, s, v } = hexToHsv(src)
            syncingRef.current = true
            setHue(h)
            setSat(s)
            setVal(v)
            queueMicrotask(() => {
                syncingRef.current = false
                onChange?.(src)
            })
        } catch {
            // The user dismissed the eyedropper. Nothing to report.
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const w = canvas.width
        const h = canvas.height
        const cx = w / 2
        const cy = h / 2
        const radius = Math.min(w, h) / 2 - 5

        ctx.clearRect(0, 0, w, h)

        for (let angle = 0; angle < 360; angle++) {
            const rad = (angle * Math.PI) / 180
            const x1 = cx + (radius - 15) * Math.cos(rad)
            const y1 = cy + (radius - 15) * Math.sin(rad)
            const x2 = cx + radius * Math.cos(rad)
            const y2 = cy + radius * Math.sin(rad)
            const { r, g, b } = hsvToRgb(angle, 1, 1)
            ctx.strokeStyle = `rgb(${r},${g},${b})`
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        }

        const rad = (hue * Math.PI) / 180
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(
            cx + (radius - 8) * Math.cos(rad),
            cy + (radius - 8) * Math.sin(rad),
            8,
            0,
            Math.PI * 2
        )
        ctx.stroke()
    }, [hue, isSmall])

    useEffect(() => {
        const canvas = squareCanvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const w = canvas.width
        const h = canvas.height
        const imgData = ctx.createImageData(w, h)
        const data = imgData.data

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const { r, g, b } = hsvToRgb(hue, x / w, 1 - y / h)
                const idx = (y * w + x) * 4
                data[idx] = r
                data[idx + 1] = g
                data[idx + 2] = b
                data[idx + 3] = 255
            }
        }

        ctx.putImageData(imgData, 0, 0)

        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(sat * w, (1 - val) * h, 5, 0, Math.PI * 2)
        ctx.stroke()
    }, [hue, sat, val, isSmall])

    const updateHueFromEvent = (e: PointerPosition) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        let angle = Math.atan2(y, x) * (180 / Math.PI)
        if (angle < 0) angle += 360
        setHue(Math.round(angle))
    }

    const updateSatValFromEvent = (e: PointerPosition) => {
        const canvas = squareCanvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setSat(Math.max(0, Math.min(1, x / rect.width)))
        setVal(Math.max(0, Math.min(1, 1 - y / rect.height)))
    }

    const handleWheelMouseDown = (e: PointerPosition) => {
        setDraggingWheel(true)
        updateHueFromEvent(e)
    }

    const handleSquareMouseDown = (e: PointerPosition) => {
        setDraggingSquare(true)
        updateSatValFromEvent(e)
    }

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (draggingWheel) updateHueFromEvent(e)
            if (draggingSquare) updateSatValFromEvent(e)
        }
        const up = () => {
            setDraggingWheel(false)
            setDraggingSquare(false)
        }

        window.addEventListener('mousemove', move)
        window.addEventListener('mouseup', up)
        return () => {
            window.removeEventListener('mousemove', move)
            window.removeEventListener('mouseup', up)
        }
    }, [draggingWheel, draggingSquare])

    const wheelSize = isSmall ? WHEEL_SIZE_M : WHEEL_SIZE
    const squareSize = isSmall ? SQUARE_SIZE_M : SQUARE_SIZE
    const squareLeft = (wheelSize - squareSize) / 2

    return (
        <div className="gesture-allowed mx-auto w-full max-w-xs font-sans select-none">
            <div className="gesture-allowed relative m-[4px] flex items-center justify-between">
                <input
                    type="text"
                    value={inputHex}
                    onChange={handleHexInput}
                    onFocus={handleHexFocus}
                    onBlur={handleHexBlur}
                    maxLength={7}
                    className="w-28 rounded-[8px] border-[1px] border-line/25 bg-surface-2 px-[8px] py-[6px] text-[8px] font-bold text-ink tabular-nums focus:border-ink focus:outline-0 md:text-[12px]"
                    placeholder="#000000"
                />
                <button
                    type="button"
                    onClick={handleEyedropper}
                    className="cursor-pointer rounded-full border-[1px] border-line/25 p-[4px] hover:bg-surface-3"
                    title="Pick color from screen"
                    tabIndex={0}
                >
                    <IconColorPicker
                        color="currentColor"
                        size={20}
                        stroke={1.5}
                    />
                </button>
            </div>

            <div
                className="gesture-allowed relative mx-auto"
                style={{ width: wheelSize, height: wheelSize }}
            >
                <canvas
                    ref={canvasRef}
                    width={wheelSize}
                    height={wheelSize}
                    onMouseDown={handleWheelMouseDown}
                    className="gesture-allowed absolute top-0 left-0 block rounded-full"
                    style={{
                        pointerEvents: 'auto',
                        zIndex: 1,
                        background: 'transparent',
                        touchAction: 'none',
                    }}
                />
                <canvas
                    ref={squareCanvasRef}
                    width={squareSize}
                    height={squareSize}
                    onMouseDown={handleSquareMouseDown}
                    className="gesture-allowed absolute block rounded-sm border border-surface"
                    style={{
                        left: squareLeft,
                        top: squareLeft,
                        pointerEvents: 'auto',
                        background: 'transparent',
                        zIndex: 2,
                        touchAction: 'none',
                    }}
                />
            </div>
        </div>
    )
}

export default ColorPicker
