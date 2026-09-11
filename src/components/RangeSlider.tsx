import type { ChangeEvent } from 'react'

/**
 * Thumb diameter in pixels. The browser insets a native thumb by half its
 * width at each end so it never overhangs the track, and the fill has to
 * follow the same rule or the two drift apart at the extremes.
 */
const THUMB = 14

export interface RangeSliderProps {
    /** Label above the track. Omitted in compact mode. */
    name?: string
    min: number
    max: number
    step: number
    value: number
    setUpdatingValue: (value: number) => void
    /** Bare track with no label or readout, for sliders sitting inline. */
    compact?: boolean
}

/**
 * Matches the readout's precision to the step, so a step of 0.05 shows 1.45
 * rather than the 1.4500000000000002 that floating-point addition produces.
 */
function format(value: number, step: number): string {
    const decimals = (String(step).split('.')[1] ?? '').length
    return value.toFixed(decimals)
}

/**
 * The native control is present but invisible: it keeps keyboard support,
 * assistive-technology semantics, and click-to-jump, while every pixel on
 * screen is an ordinary div.
 *
 * That is deliberate. `input[type=range]` is styled through vendor
 * pseudo-elements that differ per engine, and the parts a page cannot reach
 * are drawn by the platform, so the same markup renders differently on
 * Windows, macOS and Linux. Painting the track ourselves is the only way the
 * slider looks identical everywhere.
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

    /*
     * Where the thumb centre actually sits, accounting for the inset above.
     * The fill width and the thumb offset are both this value, so the fill
     * always ends underneath the thumb rather than beside it.
     *
     * This replaces the `backgroundSize` string that each caller used to keep
     * in its store next to the value. It is derived from the value, so there
     * is no second copy to fall out of step.
     */
    const centre = `calc(${ratio * 100}% + ${(0.5 - ratio) * THUMB}px)`

    const track = (
        <div
            className={`gesture-allowed relative flex h-[20px] items-center ${
                compact ? 'w-[80px] md:w-[120px]' : 'w-full'
            }`}
        >
            {/* First in the DOM so the layers below can react to its focus
                and press states through `peer-*`. */}
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

            {/* Painted layers. They sit above the input, so each has to stay
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

    /*
     * One padded column owns the spacing for all three rows, so the label,
     * the track and the readout share a single left edge no matter what
     * padding the surrounding panel happens to use. Previously each row
     * carried its own margins and they lined up differently per panel.
     */
    return (
        <div className="flex w-full flex-col gap-[12px] p-[8px] font-funnel">
            <div className="text-left text-[8px] font-normal text-ink-muted md:text-[12px]">
                {name ?? ''}
            </div>

            {track}

            {/* `tabular-nums` keeps every digit the same width, so the box
                does not twitch as the value changes while dragging. */}
            <div className="w-[72px] rounded-[8px] border-[1px] border-line/25 bg-surface-2 px-[8px] py-[6px] text-center text-[8px] font-semibold text-ink tabular-nums md:text-[12px]">
                {format(value, step)}
            </div>
        </div>
    )
}

export default RangeSlider
