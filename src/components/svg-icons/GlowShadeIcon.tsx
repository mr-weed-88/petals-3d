import type { IconProps } from './iconProps'

const GlowShadeIcon = ({ color, size }: IconProps) => {
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
            <g filter="url(#filter0_f_682_54)">
                <circle cx="12" cy="12" r="6" fill={color} />
            </g>
            <defs>
                <filter
                    id="filter0_f_682_54"
                    x="2"
                    y="2"
                    width="20"
                    height="20"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="BackgroundImageFix"
                        result="shape"
                    />
                    <feGaussianBlur
                        stdDeviation="1"
                        result="effect1_foregroundBlur_682_54"
                    />
                </filter>
            </defs>
        </svg>
    )
}

export default GlowShadeIcon
