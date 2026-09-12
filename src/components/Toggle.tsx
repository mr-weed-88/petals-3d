export interface ToggleProps {
    checked: boolean
    onChange: (checked: boolean) => void
    /** True below the 768px breakpoint, matching the icon sizing elsewhere. */
    isSmall?: boolean
    /** Announced to assistive technology, since the switch carries no text. */
    label?: string
}

/**
 * A sliding on/off switch.
 *
 * It replaces a pair of droplet icons sitting side by side in a pill, one of
 * them painted transparent, which faked the knob moving. That could only ever
 * approximate a switch: the knob was a glyph rather than a shape, so its size
 * and position came from the icon font rather than the layout, and the track
 * had to be wide enough for two icons whether or not that suited the row.
 *
 * Both states carry their own track and knob colours, so neither depends on
 * the surface behind it and both survive a theme change.
 */
const Toggle = ({ checked, onChange, isSmall = false, label }: ToggleProps) => {
    const track = isSmall ? 'h-[16px] w-[28px]' : 'h-[20px] w-[36px]'
    const knob = isSmall ? 'size-[12px]' : 'size-[16px]'
    const travel = isSmall ? 'translate-x-[12px]' : 'translate-x-[16px]'

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`flex shrink-0 cursor-pointer items-center rounded-full border-[0px] p-[2px] transition-colors duration-200 ease-out ${track} ${
                checked ? 'bg-accent' : 'bg-line/25'
            }`}
        >
            <span
                className={`rounded-full transition-transform duration-200 ease-out ${knob} ${
                    checked
                        ? `bg-accent-ink ${travel}`
                        : 'translate-x-0 bg-ink-muted'
                }`}
            />
        </button>
    )
}

export default Toggle
