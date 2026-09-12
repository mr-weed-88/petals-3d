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
import { editorPrefsStore } from '../../hooks/useEditorPrefsStore'

import ToolTip from '../ToolTip'
import ToolButton from '../ToolButton'
import Divider from '../Divider'
import RangeSlider from '../RangeSlider'
import ColorPicker from '../ColorPicker'

import PenOptionsPanel from './PenOptionsPanel'
import SceneOptionsPanel from './SceneOptionsPanel'
import { handleShape } from '../../helpers/toolHelper'

type DrawButton =
    | 'pen'
    | 'eraser'
    | 'selectLines'
    | 'selectGuide'
    | 'draw_guide'
    | 'erase_guide'
    | 'bend_guide'
    | 'loft_guide'
    | 'cancel_loft_guide'
    | 'generate_loft_guide'

export interface ToolPanelProps {
    isSmall: boolean
}

/** The top tool row: guide tools, drawing tools, scene tools. */
const ToolPanel = ({ isSmall }: ToolPanelProps) => {
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

    const { transformStyle } = editorPrefsStore((state) => state)

    const { sceneOptions, setSceneOptions, setGroupOptions, setRenderOptions } =
        canvasRenderStore((state) => state)

    /**
     * Modes are mutually exclusive, so every case clears the others. Orbit is
     * locked for the modes that draw, or a drag would rotate the view instead.
     */
    function handleDraw(button: DrawButton) {
        switch (button) {
            case 'pen':
                /*
                 * Selects rather than toggles. Finishing a guide already
                 * switches the pen on, so pressing the button then turned
                 * drawing off and handed the drag back to the orbit controls,
                 * which looked exactly like the pen being broken. Leave the
                 * pen by choosing another tool, or free the camera with the
                 * orbit lock in the views panel.
                 */
                setPenActive(true)
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

                setOrbitalLock(canvasDrawStore.getState().penActive)
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

                setOrbitalLock(canvasDrawStore.getState().eraserActive)
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

                setOrbitalLock(canvasDrawStore.getState().selectLines)
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

                setOrbitalLock(canvasDrawStore.getState().selectGuide)
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

                setOrbitalLock(canvasDrawStore.getState().drawGuide)
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

                setOrbitalLock(canvasDrawStore.getState().bendPlaneGuide)
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

                setOrbitalLock(canvasDrawStore.getState().loftGuidePlane)
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
        }
    }

    function handleSceneOptions() {
        setSceneOptions(!sceneOptions)
        setGroupOptions(true)
        setRenderOptions(false)
    }

    function handleShapeOptions() {
        setOpenColorOptions(false)
        setOpenOpacitySlider(false)
        setOpenWidthSlider(false)
        setMirrorOptions(false)
        setOpenStrokeStabler(false)
        setOpenStrokeOptions(false)
        setOpenDrawShapeOptions(!openDrawShapeOptions)
    }

    function handleColorChange() {
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
            <div className="absolute top-[12px] right-[12px] z-5 flex items-center gap-[4px] rounded-[12px] border-[1px] border-line/25 bg-surface p-[4px] drop-shadow-xl">
                {!dynamicDrawingPlaneMesh && (
                    <ToolTip text="Draw Guide" position="bottom" delay={100}>
                        <div onClick={() => handleDraw('draw_guide')}>
                            <ToolButton
                                condition={drawGuide}
                                icon={
                                    <GuideIcon
                                        color="currentColor"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                {dynamicDrawingPlaneMesh && (
                    <ToolTip text="Erase Guide" position="bottom" delay={100}>
                        <div onClick={() => handleDraw('erase_guide')}>
                            <ToolButton
                                condition={false}
                                icon={
                                    <EraseGuideIcon
                                        color="currentColor"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                {dynamicDrawingPlaneMesh && (
                    <ToolTip text="Bend Guide" position="bottom" delay={100}>
                        <div onClick={() => handleDraw('bend_guide')}>
                            <ToolButton
                                condition={bendPlaneGuide}
                                icon={
                                    <BendGuidePlaneIcon
                                        color="currentColor"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                <ToolTip text="Loft Guide" position="bottom" delay={100}>
                    <div onClick={() => handleDraw('loft_guide')}>
                        <ToolButton
                            condition={loftGuidePlane}
                            icon={
                                <LoftGuideIcon
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                {dynamicDrawingPlaneMesh && (
                    <ToolTip text="Select Guide" position="bottom" delay={100}>
                        <div onClick={() => handleDraw('selectGuide')}>
                            <ToolButton
                                condition={selectGuide}
                                icon={
                                    <SelectGuide
                                        color="currentColor"
                                        size={isSmall ? 12 : 20}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                )}

                <Divider />

                <ToolTip text="Pen" position="bottom" delay={100}>
                    <div onClick={() => handleDraw('pen')}>
                        <ToolButton
                            condition={penActive}
                            icon={
                                <IconBallpen
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                <ToolTip text="Eraser" position="bottom" delay={100}>
                    <div onClick={() => handleDraw('eraser')}>
                        <ToolButton
                            condition={eraserActive}
                            icon={
                                <IconEraser
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                <ToolTip text="Select Lines" position="bottom" delay={100}>
                    <div onClick={() => handleDraw('selectLines')}>
                        <ToolButton
                            condition={selectLines}
                            icon={
                                <IconPointer2
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>

                <Divider />

                <ToolTip text="Scene Options" position="bottom" delay={100}>
                    <div onClick={handleSceneOptions}>
                        <ToolButton
                            condition={sceneOptions}
                            icon={
                                <IconSparkles
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            }
                        />
                    </div>
                </ToolTip>
            </div>

            {loftGuidePlane && (
                <div className="absolute top-[72px] left-[12px] flex flex-col gap-[8px] font-funnel font-normal text-ink">
                    <div className="z-5 w-[140px] rounded-[12px] border-[1px] border-line/25 bg-surface drop-shadow-xl md:w-[198px]">
                        <RangeSlider
                            name="Radial Percentage"
                            max={100}
                            min={0}
                            step={1}
                            value={radialPercentage}
                            setUpdatingValue={setRadialPercentage}
                        />
                    </div>
                    <div className="z-5 w-[140px] rounded-[12px] border-[1px] border-line/25 bg-surface drop-shadow-xl md:w-[198px]">
                        <RangeSlider
                            name="Waist Percentage"
                            max={100}
                            min={0}
                            step={1}
                            value={waistPercentage}
                            setUpdatingValue={setWaistPercentage}
                        />
                    </div>

                    <div className="z-5 w-[140px] rounded-[12px] border-[1px] border-line/25 bg-surface drop-shadow-xl md:w-[198px]">
                        <RangeSlider
                            name="Poly count Percentage"
                            max={50}
                            min={0}
                            step={1}
                            value={polyCountPercentage}
                            setUpdatingValue={setPolyCountPercentage}
                        />
                    </div>
                </div>
            )}

            {penActive && <PenOptionsPanel isSmall={isSmall} />}

            {loftGuidePlane && (
                <div className="absolute bottom-[4px] left-1/2 z-5 -translate-1/2 rounded-[12px] border-[1px] border-line/25 bg-surface font-funnel font-normal drop-shadow-xl">
                    <div className="flex items-center justify-center gap-[8px] p-[4px]">
                        <div onClick={() => handleDraw('cancel_loft_guide')}>
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

                        <div onClick={() => handleDraw('cancel_loft_guide')}>
                            <ToolButton
                                condition={sceneOptions}
                                icon={
                                    <IconCheck
                                        color="var(--c-accent)"
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
                <div className="absolute top-[72px] left-[12px] z-5 flex flex-col justify-center rounded-[12px] border-[1px] border-line/25 bg-surface p-[4px] drop-shadow-xl">
                    <ToolTip text="Draw Shape" position="right" delay={100}>
                        <button
                            onClick={handleShapeOptions}
                            className="cursor-pointer rounded-[8px] p-[8px] font-bold hover:bg-accent/25"
                        >
                            {drawShapeType === 'free_hand' && (
                                <IconScribble
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}
                            {drawShapeType === 'straight' && (
                                <IconLine
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}
                            {drawShapeType === 'circle' && (
                                <IconCircle
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}

                            {drawShapeType === 'arc' && (
                                <IconVectorSpline
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            )}
                        </button>
                    </ToolTip>
                </div>
            )}

            {(drawGuide || bendPlaneGuide) && openDrawShapeOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 flex flex-col justify-items-center gap-[4px] rounded-[12px] border-[1px] border-line/25 bg-surface p-[4px] drop-shadow-xl">
                    <ToolTip text="Free hand" position="right" delay={100}>
                        <div
                            onClick={() =>
                                handleShape('free_hand', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={false}
                                icon={
                                    <IconScribble
                                        color="currentColor"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>

                    <ToolTip text="Straight" position="right" delay={100}>
                        <div
                            onClick={() =>
                                handleShape('straight', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={false}
                                icon={
                                    <IconLine
                                        color="currentColor"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                    <ToolTip text="Circle" position="right" delay={100}>
                        <div
                            onClick={() =>
                                handleShape('circle', setDrawShapeType)
                            }
                        >
                            <ToolButton
                                condition={false}
                                icon={
                                    <IconCircle
                                        color="currentColor"
                                        size={isSmall ? 12 : 20}
                                        stroke={1}
                                    />
                                }
                            />
                        </div>
                    </ToolTip>
                    <ToolTip text="Arc" position="right" delay={100}>
                        <div
                            onClick={() => handleShape('arc', setDrawShapeType)}
                        >
                            <ToolButton
                                condition={false}
                                icon={
                                    <IconVectorSpline
                                        color="currentColor"
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
                <div className="absolute top-[72px] left-[12px] z-5 flex flex-col justify-items-center gap-[4px] rounded-[12px] border-[1px] border-line/25 bg-surface p-[4px] drop-shadow-xl">
                    {selectLines && (
                        <ToolTip
                            text="Color Select"
                            position="right"
                            delay={100}
                        >
                            <button
                                onClick={handleColorChange}
                                className="flex cursor-pointer items-center justify-center rounded-[8px] border-[0px] p-[8px] font-bold hover:bg-accent/25"
                            >
                                <IconPalette
                                    color={lineColor}
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </button>
                        </ToolTip>
                    )}

                    {/* The joystick carries move, rotate and scale itself, so
                        these would be a second set of controls for one job. */}
                    {transformStyle === 'legacy' && (
                        <>
                            <ToolTip text="Move" position="right" delay={100}>
                                <div
                                    onClick={() =>
                                        setTransformMode('translate')
                                    }
                                >
                                    <ToolButton
                                        condition={
                                            transformMode === 'translate'
                                        }
                                        icon={
                                            <IconArrowsMove
                                                color="currentColor"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        }
                                    />
                                </div>
                            </ToolTip>

                            <ToolTip text="Rotate" position="right" delay={100}>
                                <div onClick={() => setTransformMode('rotate')}>
                                    <ToolButton
                                        condition={transformMode === 'rotate'}
                                        icon={
                                            <IconRotate
                                                color="currentColor"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        }
                                    />
                                </div>
                            </ToolTip>

                            <ToolTip text="Scale" position="right" delay={100}>
                                <div onClick={() => setTransformMode('scale')}>
                                    <ToolButton
                                        condition={transformMode === 'scale'}
                                        icon={
                                            <IconResize
                                                color="currentColor"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        }
                                    />
                                </div>
                            </ToolTip>
                        </>
                    )}

                    {axisMode === 'world' && (
                        <ToolTip
                            text="Global axis"
                            position="right"
                            delay={100}
                        >
                            <button
                                onClick={() => setAxisMode('local')}
                                className="cursor-pointer rounded-[8px] p-[8px] font-bold hover:bg-accent/25"
                            >
                                <GlobalModeIcon
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                />
                            </button>
                        </ToolTip>
                    )}

                    {axisMode === 'local' && (
                        <ToolTip text="Local axis" position="right" delay={100}>
                            <button
                                onClick={() => setAxisMode('world')}
                                className="cursor-pointer rounded-[8px] p-[8px] font-bold hover:bg-accent/25"
                            >
                                <LocalModeIcon
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                />
                            </button>
                        </ToolTip>
                    )}

                    {selectLines && (
                        <button
                            disabled={copy}
                            onClick={() => setCopy(!copy)}
                            className="cursor-pointer rounded-[8px] p-[8px] font-bold hover:bg-accent/25"
                        >
                            <IconCopy
                                color="currentColor"
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </button>
                    )}
                </div>
            )}

            {selectLines && openColorOptions && (
                <div className="absolute top-[72px] left-[72px] z-5 rounded-[12px] border-[1px] border-line/25 bg-surface p-[8px] font-funnel font-normal drop-shadow-xl">
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
