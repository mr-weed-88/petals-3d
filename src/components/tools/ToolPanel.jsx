import {
    IconArrowsMove,
    IconBallpen,
    IconCheck,
    IconCircle,
    IconCopy,
    IconEraser,
    IconLine,
    IconPalette,
    IconPointer2,
    IconResize,
    IconRotate,
    IconScribble,
    IconSparkles,
    IconVectorSpline,
    IconX,
} from '@tabler/icons-react'

import GuideIcon from '../svg-icons/GuideIcon'
import SelectGuide from '../svg-icons/SelectGuide'
import LocalModeIcon from '../svg-icons/LocalModeIcon'
import LoftGuideIcon from '../svg-icons/LoftGuideIcon'
import GlobalModeIcon from '../svg-icons/GlobalModeIcon'
import EraseGuideIcon from '../svg-icons/EraseGuideIcon'
import BendGuidePlaneIcon from '../svg-icons/BendGuidePlaneIcon'

import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { canvasViewStore } from '../../hooks/useCanvasViewStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'

import ToolTip from '../ToolTip'
import ToolButton from '../ToolButton'
import RangeSlider from '../RangeSlider'
import ColorPicker from '../ColorPicker'

import PenOptionsPanel from './PenOptionsPanel'
import SceneOptionsPanel from './SceneOptionsPanel'
import { handleShape } from '../../helpers/toolHelper'

const ToolPanel = (props) => {
    const { isSmall } = props

    const {
        copy,
        setCopy,

        setMirrorOptions,

        axisMode,
        penActive,

        drawGuide,
        setDrawGuide,

        lineColor,
        setLineColor,

        setAxisMode,

        selectLines,
        setSelectLines,

        eraserActive,
        setEraserActive,

        dynamicDrawingPlaneMesh,
        setDynamicDrawingPlaneMesh,

        transformMode,
        setTransformMode,

        selectGuide,
        setSelectGuide,

        drawShapeType,
        setDrawShapeType,

        setPenActive,

        setOpenWidthSlider,

        openColorOptions,
        setOpenColorOptions,

        setOpenStrokeOptions,

        setOpenOpacitySlider,

        openDrawShapeOptions,
        setOpenDrawShapeOptions,

        bendPlaneGuide,
        setBendPlaneGuide,

        loftGuidePlane,
        setLoftGuidePlane,

        setEraseGuide,

        setOpenStrokeStabler,

        waistBackground,
        setWaistBackground,

        radialBackground,
        setRadialBackground,

        ployBackground,
        setPolyBackground,

        radialPercentage,
        setRadialPercentage,

        waistPercentage,
        setWaistPercentage,

        polyCountPercentage,
        setPolyCountPercentage,

        setGenerateLoftSurface,

        setHighlighted,
    } = canvasDrawStore((state) => state)

    const { setOrbitalLock } = canvasViewStore((state) => state)

    const {
        sceneOptions,
        setSceneOptions,

        setGroupOptions,

        setRenderOptions,
    } = canvasRenderStore((state) => state)

    function handleDraw(button) {
        switch (button) {
            case 'pen':
                setPenActive(!penActive)
                setOpenDrawShapeOptions(false)
                setEraserActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setGenerateLoftSurface(false)
                setLoftGuidePlane(false)

                if (canvasDrawStore.getState().penActive) {
                    setOrbitalLock(true)
                } else {
                    setOrbitalLock(false)
                }
                break

            case 'eraser':
                setEraserActive(!eraserActive)
                setPenActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setGenerateLoftSurface(false)
                setLoftGuidePlane(false)

                if (canvasDrawStore.getState().eraserActive) {
                    setOrbitalLock(true)
                } else {
                    setOrbitalLock(false)
                }
                break

            case 'selectLines':
                setSelectLines(!selectLines)
                setEraserActive(false)
                setSelectGuide(false)
                setPenActive(false)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setGenerateLoftSurface(false)
                setLoftGuidePlane(false)

                if (canvasDrawStore.getState().selectLines) {
                    setOrbitalLock(true)
                } else {
                    setOrbitalLock(false)
                }
                break

            case 'selectGuide':
                setSelectGuide(!selectGuide)
                setSelectLines(false)
                setEraserActive(false)
                setPenActive(false)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setGenerateLoftSurface(false)
                setLoftGuidePlane(false)

                if (canvasDrawStore.getState().selectGuide) {
                    setOrbitalLock(true)
                } else {
                    setOrbitalLock(false)
                }
                break

            case 'draw_guide':
                setDrawGuide(!drawGuide)
                setOpenDrawShapeOptions(false)
                setPenActive(false)
                setEraserActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setOrbitalLock(false)
                setGenerateLoftSurface(false)
                setLoftGuidePlane(false)

                if (canvasDrawStore.getState().drawGuide) {
                    setOrbitalLock(true)
                } else {
                    setOrbitalLock(false)
                }
                break

            case 'erase_guide':
                setEraseGuide(true)
                setDynamicDrawingPlaneMesh(null)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setPenActive(false)
                setEraserActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setOrbitalLock(false)
                setGenerateLoftSurface(false)
                setLoftGuidePlane(false)

                break

            case 'bend_guide':
                setBendPlaneGuide(!bendPlaneGuide)
                setLoftGuidePlane(false)
                setDrawGuide(false)
                setOpenDrawShapeOptions(false)
                setPenActive(false)
                setEraserActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setOrbitalLock(false)
                setGenerateLoftSurface(false)
                setLoftGuidePlane(false)

                if (canvasDrawStore.getState().bendPlaneGuide) {
                    setOrbitalLock(true)
                } else {
                    setOrbitalLock(false)
                }
                break

            case 'loft_guide':
                setLoftGuidePlane(!loftGuidePlane)
                setDynamicDrawingPlaneMesh(null)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setPenActive(false)
                setEraserActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setOrbitalLock(false)
                setGenerateLoftSurface(false)

                if (canvasDrawStore.getState().loftGuidePlane) {
                    setOrbitalLock(true)
                } else {
                    setOrbitalLock(false)
                }
                break

            case 'cancel_loft_guide':
                setLoftGuidePlane(!loftGuidePlane)
                setDynamicDrawingPlaneMesh(null)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setPenActive(false)
                setEraserActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setOrbitalLock(false)
                setGenerateLoftSurface(false)
                setHighlighted([])
                break

            case 'generate_loft_guide':
                setGenerateLoftSurface(true)
                setDynamicDrawingPlaneMesh(null)
                setDrawGuide(false)
                setBendPlaneGuide(false)
                setPenActive(false)
                setEraserActive(false)
                setSelectLines(false)
                setSelectGuide(false)
                setOpenColorOptions(false)
                setOpenStrokeOptions(false)
                setOrbitalLock(false)
                break

            default:
                break
        }
    }

    function handleSceneOptions() {
        setSceneOptions(!sceneOptions)
        setGroupOptions(true)
        setRenderOptions(false)
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

    return (
        <>
            <div className="absolute top-[12px] right-[12px] z-5 flex items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                {!dynamicDrawingPlaneMesh && (
                    <ToolTip text="Draw Guide" position="bottom" delay={100}>
                        <div onClick={(e) => handleDraw('draw_guide')}>
                            <ToolButton
                                condition={drawGuide}
                                icon={
                                    <GuideIcon
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                {dynamicDrawingPlaneMesh && (
                    <ToolTip text="Erase Guide" position="bottom" delay={100}>
                        <div onClick={(e) => handleDraw('erase_guide')}>
                            <ToolButton
                                condition={false}
                                icon={
                                    <EraseGuideIcon
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                {dynamicDrawingPlaneMesh && (
                    <ToolTip text="Bend Guide" position="bottom" delay={100}>
                        <div onClick={(e) => handleDraw('bend_guide')}>
                            <ToolButton
                                condition={bendPlaneGuide}
                                icon={
                                    <BendGuidePlaneIcon
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                <ToolTip text="Loft Guide" position="bottom" delay={100}>
                    <div onClick={(e) => handleDraw('loft_guide')}>
                        <ToolButton
                            condition={loftGuidePlane}
                            icon={
                                <LoftGuideIcon
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                {dynamicDrawingPlaneMesh && (
                    <ToolTip text="Select Guide" position="bottom" delay={100}>
                        <div onClick={(e) => handleDraw('selectGuide')}>
                            <ToolButton
                                condition={selectGuide}
                                icon={
                                    <SelectGuide
                                        color="#000000"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                <div className="px-[8px] text-[#000000]">|</div>

                <ToolTip text="Pen" position="bottom" delay={100}>
                    <div onClick={(e) => handleDraw('pen')}>
                        <ToolButton
                            condition={penActive}
                            icon={
                                <IconBallpen
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                <ToolTip text="Eraser" position="bottom" delay={100}>
                    <div onClick={(e) => handleDraw('eraser')}>
                        <ToolButton
                            condition={eraserActive}
                            icon={
                                <IconEraser
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                <ToolTip text="Select Lines" position="bottom" delay={100}>
                    <div onClick={(e) => handleDraw('selectLines')}>
                        <ToolButton
                            condition={selectLines}
                            icon={
                                <IconPointer2
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                <div className="px-[8px] text-[#000000]">|</div>

                <ToolTip text="Scene Options" position="bottom" delay={100}>
                    <div onClick={(e) => handleSceneOptions()}>
                        <ToolButton
                            condition={sceneOptions}
                            icon={
                                <IconSparkles
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>
            </div>

            {loftGuidePlane && (
                <div className="absolute top-[72px] left-[12px] flex flex-col gap-[8px] font-funnel font-normal text-[#000000]">
                    <div className="z-5 w-[140px] justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl md:w-[198px]">
                        <RangeSlider
                            name="Radial Percentage"
                            max={100}
                            min={0}
                            step={1}
                            value={radialPercentage}
                            backgroundSize={radialBackground}
                            setUpdatingValue={setRadialPercentage}
                            setUpdatingBackground={setRadialBackground}
                        />
                    </div>
                    <div className="z-5 w-[140px] justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl md:w-[198px]">
                        <RangeSlider
                            name="Waist Percentage"
                            max={100}
                            min={0}
                            step={1}
                            value={waistPercentage}
                            backgroundSize={waistBackground}
                            setUpdatingValue={setWaistPercentage}
                            setUpdatingBackground={setWaistBackground}
                        />
                    </div>

                    <div className="z-5 w-[140px] justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl md:w-[198px]">
                        <RangeSlider
                            name="Poly count Percentage"
                            max={50}
                            min={0}
                            step={1}
                            value={polyCountPercentage}
                            backgroundSize={ployBackground}
                            setUpdatingValue={setPolyCountPercentage}
                            setUpdatingBackground={setPolyBackground}
                        />
                    </div>
                </div>
            )}

            {penActive && <PenOptionsPanel isSmall={isSmall} />}

            {loftGuidePlane && (
                <div className="absolute bottom-[4px] left-1/2 z-5 -translate-1/2 rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] font-funnel font-normal drop-shadow-xl">
                    <div className="flex items-center justify-center gap-[8px] p-[4px]">
                        <div onClick={(e) => handleDraw('cancel_loft_guide')}>
                            <ToolButton
                                condition={sceneOptions}
                                icon={
                                    <IconX
                                        color="#DE3163"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>

                        <div onClick={(e) => handleDraw('cancel_loft_guide')}>
                            <ToolButton
                                condition={sceneOptions}
                                icon={
                                    <IconCheck
                                        color="#5CA367"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </div>
                </div>
            )}

            {(drawGuide || bendPlaneGuide) && (
                <div className="absolute top-[72px] left-[12px] z-5 flex flex-col justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    <ToolTip text="Draw Shape" position="right" delay={100}>
                        <button
                            onClick={(e) => handleShapeOptions(e)}
                            className="cursor-pointer rounded-[4px] p-[8px] font-bold hover:bg-[#5CA367]/25"
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
                </div>
            )}

            {(drawGuide || bendPlaneGuide) && openDrawShapeOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 flex flex-col justify-items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    <ToolTip text="Free hand" position="right" delay={100}>
                        <div
                            onClick={(e) =>
                                handleShape('free_hand', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={false}
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
                                condition={false}
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
                                condition={false}
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
                                condition={false}
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

            {(selectLines || selectGuide) && (
                <div className="absolute top-[72px] left-[12px] z-5 flex flex-col justify-items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                    {selectLines && (
                        <button
                            onClick={(e) => handleColorChange(e)}
                            className="m-[8px] flex cursor-pointer items-center justify-center rounded-[4px] border-[0px] font-bold hover:bg-[#5CA367]/25"
                        >
                            <IconPalette
                                color={lineColor}
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </button>
                    )}

                    <div onClick={(e) => setTransformMode('translate')}>
                        <ToolButton
                            condition={transformMode === 'translate'}
                            icon={
                                <IconArrowsMove
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>

                    <div onClick={(e) => setTransformMode('rotate')}>
                        <ToolButton
                            condition={transformMode === 'rotate'}
                            icon={
                                <IconRotate
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>

                    <div onClick={(e) => setTransformMode('scale')}>
                        <ToolButton
                            bg="bg-[#5CA367]"
                            condition={transformMode === 'scale'}
                            icon={
                                <IconResize
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>

                    {axisMode === 'world' && (
                        <button
                            onClick={(e) => setAxisMode('local')}
                            className="cursor-pointer rounded-[4px] p-[8px] font-bold hover:bg-[#5CA367]/25"
                        >
                            <GlobalModeIcon
                                color="#000000"
                                size={isSmall ? 12 : 20}
                            />
                        </button>
                    )}

                    {axisMode === 'local' && (
                        <button
                            onClick={(e) => setAxisMode('world')}
                            className="cursor-pointer rounded-[4px] p-[8px] font-bold hover:bg-[#5CA367]/25"
                        >
                            <LocalModeIcon color="#000000" />
                        </button>
                    )}

                    {selectLines && (
                        <button
                            disabled={copy}
                            onClick={(e) => setCopy(!copy)}
                            className="cursor-pointer rounded-[4px] p-[8px] font-bold hover:bg-[#5CA367]/25"
                        >
                            <IconCopy
                                color="#000000"
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </button>
                    )}
                </div>
            )}

            {selectLines && openColorOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[8px] font-funnel font-normal drop-shadow-xl">
                    <ColorPicker
                        value={lineColor}
                        onChange={setLineColor}
                        isSmall={isSmall}
                    />
                </div>
            )}

            {sceneOptions && <SceneOptionsPanel isSmall={isSmall} />}
        </>
    )
}

export default ToolPanel
