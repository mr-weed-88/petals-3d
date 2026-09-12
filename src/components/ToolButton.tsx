import type { ReactNode } from 'react'

export interface ToolButtonProps {
    /** Click handling lives on a wrapping element, not here. */
    icon: ReactNode
    /** Whether the tool this button represents is currently active. */
    condition: boolean
}

/** The canonical panel button. Its classes define the app's hover and active look. */
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
