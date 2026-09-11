import type { ChangeEvent } from 'react'

export interface RangeSliderProps {
    /** Label above the track. Omitted renders an empty line, as before. */
    name?: string
    min: number
    max: number
    step: number
    value: number
    /**
     * CSS `background-size` painting the filled portion of the track,
     * e.g. `"30% 100%"`. Held in the store alongside the value.
     */
    backgroundSize: string
    setUpdatingValue: (value: number) => void
    setUpdatingBackground: (value: string) => void
}

const RangeSlider = ({
    name,
    max,
    min,
    step,
    value,
    backgroundSize,
    setUpdatingValue,
    setUpdatingBackground,
}: RangeSliderProps) => {
    function handleValueChange(e: ChangeEvent<HTMLInputElement>) {
        e.preventDefault()

        const nextValue = parseFloat(e.target.value)
        setUpdatingValue(nextValue)

        // The DOM hands these back as strings. The original relied on `-`
        // coercing them, which TypeScript rejects.
        const minValue = Number(e.target.min)
        const maxValue = Number(e.target.max)
        const span = maxValue - minValue

        const filled = span === 0 ? 0 : ((nextValue - minValue) / span) * 100
        setUpdatingBackground(`${filled}% 100%`)
    }

    return (
        <>
            <div className="p-[12px] font-funnel text-[8px] font-normal md:text-[12px]">
                {name ?? ''}
            </div>
            <div className="gesture-allowed m-[4px] flex flex-col bg-[#FFFFFF]">
                <div className="flex size-full items-center justify-start gap-[15px] bg-[#FFFFFF]">
                    {/* backgroundSize is driven from the store and paints the
                        filled portion of the track, so it stays inline. */}
                    <input
                        onChange={handleValueChange}
                        type="range"
                        name="range"
                        id="range-slider"
                        step={step}
                        value={value}
                        min={min}
                        max={max}
                        className="h-[5px] w-full cursor-pointer appearance-none rounded-[50px] bg-[#A7A7A7] bg-[linear-gradient(#5CA367,#5CA367)] bg-no-repeat [&::-moz-range-thumb]:h-[15px] [&::-moz-range-thumb]:w-[15px] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-[#D5D4D8] [&::-webkit-slider-thumb]:h-[15px] [&::-webkit-slider-thumb]:w-[15px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2C2C2C]"
                        style={{ backgroundSize }}
                    />
                </div>
            </div>
            <div className="m-[4px]">
                <div className="mt-[16px]">
                    <input
                        type="number"
                        className="block w-[72px] [appearance:textfield] rounded-[4px] border border-[#E5E7EB] px-[12px] py-[8px] font-funnel text-[8px] font-semibold text-[#000000] focus:outline-0 md:text-[12px] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                        value={value}
                        disabled={true}
                        readOnly
                    />
                </div>
            </div>
        </>
    )
}

export default RangeSlider
