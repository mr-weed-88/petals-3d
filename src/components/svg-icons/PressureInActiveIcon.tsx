import type { IconProps } from './iconProps'

const PressureInActiveIcon = ({ color, size }: IconProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
        >
            <rect
                x="-0.5"
                y="0.5"
                width="23"
                height="23"
                transform="matrix(-1 0 0 1 23 0)"
                stroke="none"
            />
            <rect x="6" y="2" width="12" height="20" rx="6" fill={color} />
        </svg>
    )
}

export default PressureInActiveIcon
