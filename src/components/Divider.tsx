export interface DividerProps {
    /** Runs against the panel's axis: vertical in a row, horizontal in a column. */
    orientation?: 'vertical' | 'horizontal'
}

/**
 * Group boundary inside a tool panel.
 *
 * A hairline rather than a `|` character, which is what ToolPanel used to
 * carry: the pipe was drawn at full ink weight, so it competed with the icons
 * it was meant to be quieter than, and its height came from the font's glyph,
 * which left it sitting on the text baseline instead of centred against the
 * buttons. This matches the dividers already used in the burger menu and the
 * scene panel.
 *
 * Short on purpose. Running the full length of the button would read as a
 * container edge rather than as a pause between groups.
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
