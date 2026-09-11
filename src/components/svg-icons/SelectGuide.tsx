import type { IconProps } from './iconProps'

const SelectGuide = ({ color, size }: IconProps) => {
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
                d="M13.6234 4.35V11.1V5.25C13.6234 4.50441 14.2252 3.9 14.9676 3.9C15.7099 3.9 16.3117 4.50441 16.3117 5.25V11.1V7.95C16.3117 7.20441 16.9135 6.6 17.6559 6.6C18.3982 6.6 19 7.20441 19 7.95V15.6C19 18.5823 16.5928 21 13.6234 21H12.6132C11.2472 21 9.9325 20.4778 8.93597 19.5395L4.49259 15.3557C3.85027 14.7509 3.83392 13.7321 4.45649 13.1068C5.06514 12.4955 6.05196 12.4955 6.66061 13.1068L8.24684 14.7V7.05C8.24684 6.30441 8.84864 5.7 9.59099 5.7C10.3333 5.7 10.9351 6.30441 10.9351 7.05V11.1V4.35C10.9351 3.60441 11.5369 3 12.2793 3C13.0216 3 13.6234 3.60441 13.6234 4.35Z"
                stroke={color}
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default SelectGuide
