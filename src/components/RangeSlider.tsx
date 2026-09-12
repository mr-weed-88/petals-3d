import type { ChangeEvent } from 'react'

/** Thumb diameter. The browser insets a native thumb by half its width at each
    end, and the fill must follow or the two drift apart at the extremes. */
const THUMB = 14

export interface RangeSliderProps {
    name?: string
    min: number
    max: number
    step: number
    value: number
    setUpdatingValue: (value: number) => void

    compact?: boolean
}

/** Matches readout precision to the step, so 0.05 shows 1.45 not 1.45000000002. */
function format(value: number, step: number): string {
    const decimals = (String(step).split('.')[1] ?? '').length
    return value.toFixed(decimals)
}

/**
 * The native control is present but invisible: it keeps keyboard support,
 * assistive-technology semantics and click-to-jump, while every visible pixel
 * is an ordinary div. Vendor pseudo-elements differ per engine, so painting
 * the track is the only way it looks the same on every OS.
 */
const RangeSlider = ({
    name,
    max,
    min,
    step,
    value,
    setUpdatingValue,
    compact = false,
}: RangeSliderProps) => {
    function handleValueChange(e: ChangeEvent<HTMLInputElement>) {
        setUpdatingValue(parseFloat(e.target.value))
    }

    const span = max - min
    const ratio =
        span === 0 ? 0 : Math.min(1, Math.max(0, (value - min) / span))

    // Where the thumb centre sits, allowing for the inset above. The fill
    // width and the thumb offset are both this, so the fill ends under it.
    const centre = `calc(${ratio * 100}% + ${(0.5 - ratio) * THUMB}px)`

    // Always full width; the row decides how much space it gets.
    const track = (
        <div className="gesture-allowed relative flex h-[20px] w-full min-w-0 items-center">
            <input
                onChange={handleValueChange}
                type="range"
                step={step}
                value={value}
                min={min}
                max={max}
                aria-label={name}
                className="peer absolute inset-0 size-full cursor-pointer appearance-none bg-transparent opacity-0"
            />

            {/* Painted layers sit above the input, so each must stay
                transparent to pointer events or it would swallow the drag. */}
            <div className="pointer-events-none absolute h-[6px] w-full rounded-full bg-line/25" />
            <div
                className="pointer-events-none absolute h-[6px] rounded-full bg-accent"
                style={{ width: centre }}
            />
            <div
                className="pointer-events-none absolute size-[14px] -translate-x-1/2 rounded-full border-[2px] border-accent bg-surface shadow-sm transition-transform peer-focus-visible:ring-[2px] peer-focus-visible:ring-accent/50 peer-active:scale-110"
                style={{ left: centre }}
            />
        </div>
    )

    if (compact) return track

    // One padded column owns the spacing, so label, track and readout share a
    // left edge whatever the surrounding panel does.
    return (
        <div className="flex w-full flex-col gap-[12px] p-[8px] font-funnel">
            <div className="text-left text-[8px] font-normal text-ink-muted md:text-[12px]">
                {name ?? ''}
            </div>

            {track}

            <div className="w-[72px] rounded-[8px] border-[1px] border-line/25 bg-surface-2 px-[8px] py-[6px] text-center text-[8px] font-semibold text-ink tabular-nums md:text-[12px]">
                {format(value, step)}
            </div>
        </div>
    )
}

export default RangeSlider
