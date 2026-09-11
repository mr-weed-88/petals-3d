import type { IconProps } from './iconProps'

const FlatShadeIcon = ({ color, size }: IconProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
        >
            <path d="M0.5 0.5V23.5H23.5V0.5H0.5Z" stroke="none" />
            <circle cx="12" cy="12" r="9.5" stroke={color} />
            <circle cx="12" cy="12" r="8" fill={color} />
        </svg>
    )
}

export default FlatShadeIcon
