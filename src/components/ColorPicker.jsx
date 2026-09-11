import React, { useState, useRef, useEffect } from 'react'

import { IconColorPicker } from '@tabler/icons-react'

const hsvToRgb = (h, s, v) => {
    let c = v * s,
        x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
        m = v - c
    let r, g, b
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
const rgbToHex = (r, g, b) =>
    '#' +
    [r, g, b]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
const hexToHsv = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b),
        min = Math.min(r, g, b),
        d = max - min
    let h = 0,
        s = max === 0 ? 0 : d / max,
        v = max
    if (d !== 0) {
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
        else if (max === g) h = (b - r) / d + 2
        else h = (r - g) / d + 4
        h *= 60
    }
    return { h, s, v }
}
const normalizeHex = (v) => {
    if (!v) return null
    const s = v.startsWith('#') ? v.toUpperCase() : ('#' + v).toUpperCase()
    return /^#([0-9A-F]{6})$/i.test(s) ? s : null
}

const WHEEL_SIZE = 200,
    SQUARE_SIZE = 100
const WHEEL_SIZE_M = 160,
    SQUARE_SIZE_M = 72

const ColorPicker = ({ value, onChange, isSmall }) => {
    const canvasRef = useRef(null)
    const squareCanvasRef = useRef(null)

    const [hue, setHue] = useState(0)
    const [sat, setSat] = useState(0)
    const [val, setVal] = useState(1)

    const [inputHex, setInputHex] = useState('#000000')
    const [typing, setTyping] = useState(false)

    const syncingRef = useRef(false)
    const [draggingWheel, setDraggingWheel] = useState(false)
    const [draggingSquare, setDraggingSquare] = useState(false)

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
        const cur = normalizeHex(inputHex)
        if (!cur) {
            const { r, g, b } = hsvToRgb(hue, sat, val)
            setInputHex(rgbToHex(r, g, b))
        }
    }
    const handleHexInput = (e) => {
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
        if (!('EyeDropper' in window)) {
            alert('EyeDropper API not supported in this browser.')
            return
        }
        try {
            const { sRGBHex } = await new window.EyeDropper().open()
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
            // user canceled
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const w = canvas.width,
            h = canvas.height
        const ctx = canvas.getContext('2d')
        const cx = w / 2,
            cy = h / 2,
            radius = Math.min(w, h) / 2 - 5
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
        const ix = cx + (radius - 8) * Math.cos(rad)
        const iy = cy + (radius - 8) * Math.sin(rad)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(ix, iy, 8, 0, Math.PI * 2)
        ctx.stroke()
    }, [hue, isSmall])

    useEffect(() => {
        const canvas = squareCanvasRef.current
        if (!canvas) return
        const w = canvas.width,
            h = canvas.height
        const ctx = canvas.getContext('2d')
        const imgData = ctx.createImageData(w, h)
        const data = imgData.data
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const s = x / w
                const v = 1 - y / h
                const { r, g, b } = hsvToRgb(hue, s, v)
                const idx = (y * w + x) * 4
                data[idx] = r
                data[idx + 1] = g
                data[idx + 2] = b
                data[idx + 3] = 255
            }
        }
        ctx.putImageData(imgData, 0, 0)
        const cx = sat * w,
            cy = (1 - val) * h
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, 5, 0, Math.PI * 2)
        ctx.stroke()
    }, [hue, sat, val, isSmall])

    const handleWheelMouseDown = (e) => {
        setDraggingWheel(true)
        updateHueFromEvent(e)
    }
    const updateHueFromEvent = (e) => {
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const cx = rect.width / 2,
            cy = rect.height / 2
        const x = e.clientX - rect.left - cx
        const y = e.clientY - rect.top - cy
        let angle = Math.atan2(y, x) * (180 / Math.PI)
        if (angle < 0) angle += 360
        setHue(Math.round(angle))
    }
    const handleSquareMouseDown = (e) => {
        setDraggingSquare(true)
        updateSatValFromEvent(e)
    }
    const updateSatValFromEvent = (e) => {
        const canvas = squareCanvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setSat(Math.max(0, Math.min(1, x / rect.width)))
        setVal(Math.max(0, Math.min(1, 1 - y / rect.height)))
    }
    useEffect(() => {
        const move = (e) => {
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
                    className="w-28 rounded-[4px] border-[1px] border-[#4B5563]/25 px-[8px] py-[4px] text-base text-[8px] font-bold text-[#000000] outline-none md:text-[12px]"
                    placeholder="#000000"
                />
                <button
                    type="button"
                    onClick={handleEyedropper}
                    className="cursor-pointer rounded-full border-[1px] border-[#4B5563]/25 p-[4px]"
                    title="Pick color from screen"
                    tabIndex={0}
                >
                    <IconColorPicker color="#000000" size={20} stroke={1} />
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
                    className="gesture-allowed absolute block rounded-sm border border-white"
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
