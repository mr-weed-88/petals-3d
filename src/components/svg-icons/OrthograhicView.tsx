import type { IconProps } from './iconProps'

const OrthograhicView = ({ color, size }: IconProps) => {
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
                d="M4 7.44451L11.6078 3.14755C11.7509 3.06674 11.8224 3.02634 11.8982 3.01051C11.9654 2.9965 12.0346 2.9965 12.1018 3.01051C12.1776 3.02634 12.2491 3.06674 12.3922 3.14755L20 7.44451M4 7.44451V16.0117C4 16.1828 4 16.2682 4.02499 16.3446C4.04711 16.4122 4.08326 16.4743 4.13106 16.5267C4.1851 16.586 4.25933 16.628 4.40779 16.7118L12 21M4 7.44451L12 11.461M20 7.44451V16.0117C20 16.1828 20 16.2682 19.975 16.3446C19.9529 16.4122 19.9167 16.4743 19.8689 16.5267C19.8149 16.586 19.7407 16.628 19.5922 16.7118L12 21M20 7.44451L12 11.461M12 21V11.461"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export default OrthograhicView
