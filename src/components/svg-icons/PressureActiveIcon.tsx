import type { IconProps } from './iconProps'

const PressureActiveIcon = ({ color, size }: IconProps) => {
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
            <path
                d="M12 2L16.6875 15.393C17.8177 18.622 15.4211 22 12 22C8.57893 22 6.1823 18.622 7.31245 15.393L12 2Z"
                fill={color}
            />
        </svg>
    )
}

export default PressureActiveIcon
