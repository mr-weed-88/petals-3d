import type { IconProps } from './iconProps'

const BendGuidePlaneIcon = ({ color, size }: IconProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
        >
            <rect x="0.5" y="0.5" width="23" height="23" stroke="none" />
            <path
                d="M11.7774 19.8695C7.1663 11.9999 16.3886 11.9999 12.2559 3.60571"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
            />
            <path
                d="M5.11703 3.60566C12.8023 1.50734 12.8023 5.70426 19.4629 3.60565"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
            />
            <path
                d="M5.11703 20.3942C12.8023 18.2958 12.8023 22.4928 19.4629 20.3942"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
            />
            <path
                d="M4.88948 20.3942C-1.25872 11.9999 10.0131 11.9999 4.88964 3.60571"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
            />
            <path
                d="M19.6221 20.3942C13.474 11.9999 24.7458 11.9999 19.6223 3.60571"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
            />
        </svg>
    )
}

export default BendGuidePlaneIcon
