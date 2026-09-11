import React from 'react'

import {
    IconArrowsHorizontal,
    IconCircle,
    IconDropletHalf2,
    IconFlipHorizontal,
    IconLine,
    IconPalette,
    IconScribble,
    IconVectorSpline,
} from '@tabler/icons-react'

import FlatShadeIcon from '../svg-icons/FlatShadeIcon'
import GlowShadeIcon from '../svg-icons/GlowShadeIcon'
import CubeStrokeIcon from '../svg-icons/CubeStrokeIcon'
import BeltStrokeIcon from '../svg-icons/BeltStrokeIcon'
import TaperStrokeIcon from '../svg-icons/TaperStrokeIcon'
import PaintStrokeIcon from '../svg-icons/PaintStrokeIcon'
import StableStrokIcon from '../svg-icons/StableStrokIcon'
import RespondShadeIcon from '../svg-icons/RespondShadeIcon'
import PressureActiveIcon from '../svg-icons/PressureActiveIcon'
import PressureInActiveIcon from '../svg-icons/PressureInActiveIcon'

import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'

import ToolTip from '../ToolTip'
import ToolButton from '../ToolButton'
import ColorPicker from '../ColorPicker'
import RangeSlider from '../RangeSlider'

import {
    handleMirroring,
    handleShape,
    handleStroke,
} from '../../helpers/toolHelper'

const PenOptionsPanel = ({ isSmall }) => {
    const {
        mirror,
        setMirror,
        mirrorOptions,
        setMirrorOptions,

        strokeOpacity,
        setStrokeOpacity,

        penActive,

        strokeType,
        setStrokeType,

        strokeColor,
        setStrokeColor,

        strokeWidth,
        setStrokeWidth,

        pressureMode,
        setPressureMode,

        opacityBackground,
        setOpacityBackground,

        drawShapeType,
        setDrawShapeType,

        widthBackground,
        setWidthBackground,

        openWidthSlider,
        setOpenWidthSlider,

        openColorOptions,
        setOpenColorOptions,

        openStrokeOptions,
        setOpenStrokeOptions,

        openOpacitySlider,
        setOpenOpacitySlider,

        openDrawShapeOptions,
        setOpenDrawShapeOptions,

        setActiveMaterialType,

        openStrokeStabler,
        setOpenStrokeStabler,

        stableBackground,
        setStableBackground,

        strokeStablePercentage,
        setStrokeStablePercentage,
    } = canvasDrawStore((state) => state)

    function handleStrokeOptions(e) {
        setOpenColorOptions(false)
        setOpenOpacitySlider(false)
        setOpenWidthSlider(false)
        setMirrorOptions(false)
        setOpenStrokeStabler(false)
        setOpenDrawShapeOptions(false)
        setOpenStrokeOptions(!openStrokeOptions)
    }

    function handleShapeOptions(e) {
        setOpenColorOptions(false)
        setOpenOpacitySlider(false)
        setOpenWidthSlider(false)
        setMirrorOptions(false)
        setOpenStrokeStabler(false)
        setOpenStrokeOptions(false)
        setOpenDrawShapeOptions(!openDrawShapeOptions)
    }

    function handleColorChange(e) {
        setOpenStrokeOptions(false)
        setOpenOpacitySlider(false)
        setOpenWidthSlider(false)
        setMirrorOptions(false)
        setOpenDrawShapeOptions(false)
        setOpenStrokeStabler(false)
        setOpenColorOptions(!openColorOptions)
    }

    function handleOpacityOptions(e) {
        setOpenColorOptions(false)
        setOpenStrokeOptions(false)
        setOpenWidthSlider(false)
        setMirrorOptions(false)
        setOpenDrawShapeOptions(false)
        setOpenStrokeStabler(false)
        setOpenOpacitySlider(!openOpacitySlider)
    }

    function handleWidthOptions(e) {
        setOpenColorOptions(false)
        setOpenStrokeOptions(false)
        setOpenOpacitySlider(false)
        setMirrorOptions(false)
        setOpenDrawShapeOptions(false)
        setOpenStrokeStabler(false)
        setOpenWidthSlider(!openWidthSlider)
    }

    function handleMirrorOptions(e) {
        setOpenColorOptions(false)
        setOpenStrokeOptions(false)
        setOpenOpacitySlider(false)
        setOpenWidthSlider(false)
        setOpenDrawShapeOptions(false)
        setOpenStrokeStabler(false)
        setMirrorOptions(!mirrorOptions)
    }

    function handleStableStrokeOptions(e) {
        setOpenColorOptions(false)
        setOpenStrokeOptions(false)
        setOpenOpacitySlider(false)
        setOpenWidthSlider(false)
        setMirrorOptions(false)
        setOpenDrawShapeOptions(false)
        setOpenStrokeStabler(!openStrokeStabler)
    }

    return (
        <div>
            {penActive && (
                <div className="absolute top-[72px] left-[12px] z-5 flex flex-col justify-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    <ToolTip text="Color Select" position="right" delay={100}>
                        <button
                            onClick={(e) => handleColorChange(e)}
                            className="m-[8px] flex cursor-pointer items-center justify-center rounded-[4px] border-[0px] font-bold hover:bg-[#5CA367]/25"
                        >
                            <IconPalette
                                color={strokeColor}
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </button>
                    </ToolTip>

                    <ToolTip text="Brushes" position="right" delay={100}>
                        <button
                            onClick={(e) => handleStrokeOptions(e)}
                            className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold hover:bg-[#5CA367]/25`}
                        >
                            {strokeType === 'taper' && (
                                <TaperStrokeIcon
                                    color={strokeColor}
                                    size={isSmall ? 12 : 20}
                                />
                            )}
                            {strokeType === 'cube' && (
                                <CubeStrokeIcon
                                    color={strokeColor}
                                    size={isSmall ? 12 : 20}
                                />
                            )}
                            {strokeType === 'paint' && (
                                <PaintStrokeIcon
                                    color={strokeColor}
                                    size={isSmall ? 12 : 20}
                                />
                            )}
                            {strokeType === 'belt' && (
                                <BeltStrokeIcon
                                    color={strokeColor}
                                    size={isSmall ? 12 : 20}
                                />
                            )}
                        </button>
                    </ToolTip>

                    <ToolTip text="Draw Shape" position="right" delay={100}>
                        <button
                            onClick={(e) => handleShapeOptions(e)}
                            className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold ${
                                openDrawShapeOptions
                                    ? 'bg-[#5CA367]'
                                    : 'hover:bg-[#5CA367]/25'
                            }`}
                        >
                            {drawShapeType === 'free_hand' && (
                                <IconScribble
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}
                            {drawShapeType === 'straight' && (
                                <IconLine
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}
                            {drawShapeType === 'circle' && (
                                <IconCircle
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}
                            {drawShapeType === 'arc' && (
                                <IconVectorSpline
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}
                        </button>
                    </ToolTip>

                    <ToolTip text="Opacity" position="right" delay={100}>
                        <div onClick={(e) => handleOpacityOptions(e)}>
                            <ToolButton
                                condition={openOpacitySlider}
                                icon={
                                    <IconDropletHalf2
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                        opacity={strokeOpacity}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Width" position="right" delay={100}>
                        <div onClick={(e) => handleWidthOptions(e)}>
                            <ToolButton
                                condition={openWidthSlider}
                                icon={
                                    <IconArrowsHorizontal
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Stable Stroke" position="right" delay={100}>
                        <div onClick={(e) => handleStableStrokeOptions(e)}>
                            <ToolButton
                                condition={openStrokeStabler}
                                icon={
                                    <StableStrokIcon
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    {pressureMode && (
                        <ToolTip
                            text="Pressure On"
                            position="right"
                            delay={100}
                        >
                            <div onClick={(e) => setPressureMode(false)}>
                                <ToolButton
                                    condition={false}
                                    icon={
                                        <PressureActiveIcon
                                            color="#000000"
                                            size={isSmall ? 12 : 20}
                                        />
                                    }
                                />
                            </div>
                        </ToolTip>
                    )}

                    {!pressureMode && (
                        <ToolTip
                            text="Pressure Off"
                            position="right"
                            delay={100}
                        >
                            <div onClick={(e) => setPressureMode(true)}>
                                <ToolButton
                                    condition={false}
                                    icon={
                                        <PressureInActiveIcon
                                            color="#000000"
                                            size={isSmall ? 12 : 20}
                                        />
                                    }
                                />
                            </div>
                        </ToolTip>
                    )}

                    <ToolTip text="Mirror" position="right" delay={100}>
                        <div onClick={(e) => handleMirrorOptions(e)}>
                            <ToolButton
                                condition={mirrorOptions}
                                icon={
                                    <IconFlipHorizontal
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                </div>
            )}

            {penActive && openColorOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    <ColorPicker
                        value={strokeColor}
                        onChange={setStrokeColor}
                        isSmall={isSmall}
                    />
                    <div className="mx-[8px] my-[12px] font-funnel text-[8px] font-normal text-[#000000] md:text-[12px]">
                        Material
                    </div>
                    <div className="mt-[12px] flex items-center justify-around">
                        <ToolTip text="Flat" position="bottom" delay={100}>
                            <button
                                onClick={(e) => setActiveMaterialType('flat')}
                                className="cursor-pointer"
                            >
                                <FlatShadeIcon
                                    color="#000000"
                                    size={isSmall ? 20 : 32}
                                />
                            </button>
                        </ToolTip>
                        <ToolTip text="Shaded" position="bottom" delay={100}>
                            <button
                                onClick={(e) => setActiveMaterialType('shaded')}
                                className="cursor-pointer"
                            >
                                <RespondShadeIcon
                                    color="#000000"
                                    size={isSmall ? 20 : 32}
                                />
                            </button>
                        </ToolTip>
                        <ToolTip text="Emissive" position="bottom" delay={100}>
                            <button
                                onClick={(e) => setActiveMaterialType('glow')}
                                className="cursor-pointer"
                            >
                                <GlowShadeIcon
                                    color="#000000"
                                    size={isSmall ? 20 : 32}
                                />
                            </button>
                        </ToolTip>
                    </div>
                </div>
            )}

            {penActive && openStrokeOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 flex flex-col justify-items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    <ToolTip text="Taper" position="right" delay={100}>
                        <div
                            onClick={(e) =>
                                handleStroke('taper', setStrokeType)
                            }
                        >
                            <ToolButton
                                condition={strokeType === 'taper'}
                                icon={
                                    <TaperStrokeIcon
                                        color={strokeColor}
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Cube" position="right" delay={100}>
                        <div
                            onClick={(e) => handleStroke('cube', setStrokeType)}
                        >
                            <ToolButton
                                condition={strokeType === 'cube'}
                                icon={
                                    <CubeStrokeIcon
                                        color={strokeColor}
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Paint" position="right" delay={100}>
                        <div
                            onClick={(e) =>
                                handleStroke('paint', setStrokeType)
                            }
                        >
                            <ToolButton
                                condition={strokeType === 'paint'}
                                icon={
                                    <PaintStrokeIcon
                                        color={strokeColor}
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Belt" position="right" delay={100}>
                        <div
                            onClick={(e) => handleStroke('belt', setStrokeType)}
                        >
                            <ToolButton
                                condition={strokeType === 'belt'}
                                icon={
                                    <BeltStrokeIcon
                                        color={strokeColor}
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                </div>
            )}

            {penActive && openDrawShapeOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 flex flex-col justify-items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    <ToolTip text="Free hand" position="right" delay={100}>
                        <div
                            onClick={(e) =>
                                handleShape('free_hand', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={drawShapeType === 'free_hand'}
                                icon={
                                    <IconScribble
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Straight" position="right" delay={100}>
                        <div
                            onClick={(e) =>
                                handleShape('straight', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={drawShapeType === 'straight'}
                                icon={
                                    <IconLine
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Circle" position="right" delay={100}>
                        <div
                            onClick={(e) =>
                                handleShape('circle', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={drawShapeType === 'circle'}
                                icon={
                                    <IconCircle
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Arc" position="right" delay={100}>
                        <div
                            onClick={(e) =>
                                handleShape('arc', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={drawShapeType === 'arc'}
                                icon={
                                    <IconVectorSpline
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                </div>
            )}

            {penActive && openOpacitySlider && (
                <div className="absolute top-[72px] left-[72px] z-5 w-[140px] justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] text-[#000000] drop-shadow-xl md:w-[198px]">
                    <RangeSlider
                        name="Stroke Opacity"
                        max={1}
                        min={0.0}
                        step={0.1}
                        value={strokeOpacity}
                        backgroundSize={opacityBackground}
                        setUpdatingValue={setStrokeOpacity}
                        setUpdatingBackground={setOpacityBackground}
                    />
                </div>
            )}

            {penActive && openWidthSlider && (
                <div className="absolute top-[72px] left-[72px] z-5 w-[140px] justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] text-[#000000] drop-shadow-xl md:w-[198px]">
                    <RangeSlider
                        name="Stroke Width"
                        max={5}
                        min={0}
                        step={0.05}
                        value={strokeWidth}
                        backgroundSize={widthBackground}
                        setUpdatingValue={setStrokeWidth}
                        setUpdatingBackground={setWidthBackground}
                    />
                </div>
            )}

            {penActive && openStrokeStabler && (
                <div className="absolute top-[72px] left-[72px] z-5 w-[140px] justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] text-[#000000] drop-shadow-xl md:w-[198px]">
                    <RangeSlider
                        name="Stroke Stable Percentage"
                        max={100}
                        min={0}
                        step={1}
                        value={strokeStablePercentage}
                        backgroundSize={stableBackground}
                        setUpdatingValue={setStrokeStablePercentage}
                        setUpdatingBackground={setStableBackground}
                    />
                </div>
            )}

            {penActive && mirrorOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 flex flex-col justify-items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    <button
                        onClick={(e) => handleMirroring('X', mirror, setMirror)}
                        className={`${
                            mirror.x
                                ? 'bg-[#DE3163]/50'
                                : 'hover:bg-[#5CA367]/25'
                        } cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold`}
                    >
                        <IconFlipHorizontal
                            color="#DE3163"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                    <button
                        onClick={(e) => handleMirroring('Y', mirror, setMirror)}
                        className={`${
                            mirror.y
                                ? 'bg-[#50C878]/50'
                                : 'hover:bg-[#5CA367]/25'
                        } cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold`}
                    >
                        <IconFlipHorizontal
                            color="#50C878"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                    <button
                        onClick={(e) => handleMirroring('Z', mirror, setMirror)}
                        className={`${
                            mirror.z
                                ? 'bg-[#0096FF]/50'
                                : 'hover:bg-[#5CA367]/25'
                        } cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold`}
                    >
                        <IconFlipHorizontal
                            color="#0096FF"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </div>
            )}
        </div>
    )
}

export default PenOptionsPanel
