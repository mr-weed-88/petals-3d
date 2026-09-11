import { useState, useRef, useEffect, type ReactNode } from 'react'

/** Where the bubble sits relative to the element it wraps. */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

const POSITION_CLASSES: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-[4px]',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-[4px]',
    left: 'right-full top-1/2 -translate-y-1/2 mr-[4px]',
    right: 'left-full top-1/2 -translate-y-1/2 ml-[4px]',
}

export interface ToolTipProps {
    children: ReactNode
    /** Bubble text. Nothing renders when empty. */
    text: string
    position?: TooltipPosition
    /** Hover time in milliseconds before the bubble appears. */
    delay?: number
    className?: string
}

const ToolTip = ({
    children,
    text,
    position = 'top',
    delay = 300,
    className = '',
}: ToolTipProps) => {
    const [isVisible, setIsVisible] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true)
        }, delay)
    }

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        setIsVisible(false)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
        >
            {children}
            {isVisible && text && (
                <div
                    className={`pointer-events-none absolute z-[9999] animate-tooltip-fade-in rounded-[8px] bg-[#000000]/75 p-[8px] text-[12px] font-medium whitespace-nowrap text-white transition-opacity duration-200 ${POSITION_CLASSES[position]}`}
                >
                    {text}
                </div>
            )}
        </div>
    )
}

export default ToolTip
