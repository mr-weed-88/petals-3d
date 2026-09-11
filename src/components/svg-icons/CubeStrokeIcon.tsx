import type { IconProps } from './iconProps'

const CubeStrokeIcon = ({ color, size }: IconProps) => {
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
            <rect
                x="21.5"
                y="6.5"
                width="11"
                height="16"
                transform="rotate(90 21.5 6.5)"
                stroke={color}
            />

            <mask id="path-3-inside-1_630_183" fill="#FFFFFF">
                <path d="M2 4H4C5.10457 4 6 4.89543 6 6V18C6 19.1046 5.10457 20 4 20H2V4Z" />
            </mask>
            <path
                d="M2 3H4C5.65685 3 7 4.34315 7 6H5C5 5.44772 4.55228 5 4 5H2V3ZM7 18C7 19.6569 5.65685 21 4 21H2V19H4C4.55228 19 5 18.5523 5 18H7ZM2 20V4V20ZM4 3C5.65685 3 7 4.34315 7 6V18C7 19.6569 5.65685 21 4 21V19C4.55228 19 5 18.5523 5 18V6C5 5.44772 4.55228 5 4 5V3Z"
                fill={color}
                stroke={color}
                mask="url(#path-3-inside-1_630_183)"
            />
            <rect
                x="17"
                y="8"
                width="8"
                height="10"
                transform="rotate(90 17 8)"
                fill={color}
            />
        </svg>
    )
}

export default CubeStrokeIcon
