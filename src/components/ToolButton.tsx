import type { ReactNode } from 'react'

export interface ToolButtonProps {
    /** The icon element to render. Click handling lives on a wrapping element. */
    icon: ReactNode
    /** Whether the tool this button represents is currently active. */
    condition: boolean
}

const ToolButton = ({ icon, condition }: ToolButtonProps) => {
    return (
        <button
            className={`flex cursor-pointer justify-center rounded-[8px] border-[0px] p-[8px] font-bold ${
                condition ? 'bg-accent text-accent-ink' : 'hover:bg-accent/25'
            }`}
        >
            {icon}
        </button>
    )
}

export default ToolButton
