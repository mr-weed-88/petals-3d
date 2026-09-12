export interface DividerProps {
    /** Runs against the panel's axis: vertical in a row, horizontal in a column. */
    orientation?: 'vertical' | 'horizontal'
}

/**
 * Group boundary inside a tool panel. Deliberately shorter than the buttons
 * it sits between: a full-length rule reads as a container edge rather than a
 * pause between groups.
 */
const Divider = ({ orientation = 'vertical' }: DividerProps) => (
    <div
        className={`shrink-0 self-center bg-line/25 ${
            orientation === 'vertical'
                ? 'mx-[4px] h-[20px] w-[1px]'
                : 'my-[4px] h-[1px] w-[20px]'
        }`}
    />
)

export default Divider
