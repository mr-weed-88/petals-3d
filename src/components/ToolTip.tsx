import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

/** Gap in pixels between the trigger and the bubble. */
const OFFSET = 6

export interface ToolTipProps {
    children: ReactNode
    /** Bubble text. Nothing renders when empty. */
    text: string
    position?: TooltipPosition
    /** Hover time in milliseconds before the bubble appears. */
    delay?: number
    className?: string
}

interface BubbleStyle {
    left: number
    top: number
    transform: string
}

/** Places the bubble against the trigger's on-screen rectangle. */
function placeBubble(rect: DOMRect, position: TooltipPosition): BubbleStyle {
    switch (position) {
        case 'top':
            return {
                left: rect.left + rect.width / 2,
                top: rect.top - OFFSET,
                transform: 'translate(-50%, -100%)',
            }
        case 'bottom':
            return {
                left: rect.left + rect.width / 2,
                top: rect.bottom + OFFSET,
                transform: 'translate(-50%, 0)',
            }
        case 'left':
            return {
                left: rect.left - OFFSET,
                top: rect.top + rect.height / 2,
                transform: 'translate(-100%, -50%)',
            }
        case 'right':
            return {
                left: rect.right + OFFSET,
                top: rect.top + rect.height / 2,
                transform: 'translate(0, -50%)',
            }
    }
}

/**
 * Not themed on purpose: always black on white, so it never blends into the
 * panel behind it. It portals to <body> because the panels create their own
 * stacking contexts, and a bubble left inside one can be covered by the next
 * panel however high its z-index.
 */
const ToolTip = ({
    children,
    text,
    position = 'top',
    delay = 300,
    className = '',
}: ToolTipProps) => {
    const [style, setStyle] = useState<BubbleStyle | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            const el = wrapperRef.current
            if (!el) return
            setStyle(placeBubble(el.getBoundingClientRect(), position))
        }, delay)
    }

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setStyle(null)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    return (
        <div
            ref={wrapperRef}
            className={`relative inline-block ${className}`}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
        >
            {children}
            {style &&
                text &&
                createPortal(
                    /*
                     * Two elements, because each needs its own transform and
                     * an element only gets one. The outer carries the
                     * translate that anchors the bubble; the inner runs the
                     * scale animation. Shared, the animation overrode the
                     * inline translate and the bubble only jumped into place
                     * once the animation finished.
                     */
                    <div
                        style={{
                            position: 'fixed',
                            left: style.left,
                            top: style.top,
                            transform: style.transform,
                            zIndex: 2147483647,
                        }}
                        className="pointer-events-none"
                    >
                        <div
                            role="tooltip"
                            className="animate-tooltip-fade-in rounded-[6px] bg-[#000000] px-[8px] py-[4px] text-[12px] font-medium whitespace-nowrap text-[#FFFFFF] shadow-lg"
                        >
                            {text}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    )
}

export default ToolTip
