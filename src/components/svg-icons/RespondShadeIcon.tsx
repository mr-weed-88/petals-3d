import type { IconProps } from './iconProps'

const RespondShadeIcon = ({ color, size }: IconProps) => {
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
            <path
                d="M20 11.9998C20 16.418 16.4183 19.9998 12 19.9998C7.58172 19.9998 4 16.418 4 11.9998C7.5 13.5 7.58172 15 12 15C16.4183 15 16 13.4999 20 11.9998Z"
                fill="#828282"
            />
        </svg>
    )
}

export default RespondShadeIcon
