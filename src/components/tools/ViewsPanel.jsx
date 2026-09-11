import React, { useCallback, useEffect } from 'react'

import {
    IconArrowBackUp,
    IconArrowForwardUp,
    IconGridDots,
    IconLock,
    IconMaximize,
    IconPerspective,
} from '@tabler/icons-react'

import OrthograhicView from '../svg-icons/OrthograhicView'

import { canvasViewStore } from '../../hooks/useCanvasViewStore'

import RangeSlider from '../RangeSlider'
import ToolTip from '../ToolTip'

const ViewsPanel = ({ isSmall }) => {
    const {
        orbitalLock,
        setOrbitalLock,

        showFovSlider,
        setShowFovSlider,

        gridPlaneX,
        gridPlaneY,
        gridPlaneZ,
        setGridPlaneX,
        setGridPlaneY,
        setGridPlaneZ,

        showGridOptions,
        setShowGridOptions,

        cameraFov,
        setCameraFov,

        fovBackground,
        setFovBackground,

        isOrthographic,
        setIsOrthographic,

        fullScreen,
        setFullScreen,
    } = canvasViewStore((state) => state)

    async function handleViewActions(action) {
        switch (action) {
            case 'fov_slider':
                setShowGridOptions(false)
                setShowFovSlider(!showFovSlider)
                break
            case 'grids':
                setShowFovSlider(false)
                setShowGridOptions(!showGridOptions)
                break
            default:
                break
        }
    }

    const handleFullscreenToggle = useCallback(async () => {
        if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen()
            } else if (document.documentElement.webkitRequestFullscreen) {
                await document.documentElement.webkitRequestFullscreen()
            }
            setFullScreen(true)
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen()
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen()
            }
            setFullScreen(false)
        }
    }, [])

    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullScreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        document.addEventListener(
            'webkitfullscreenchange',
            handleFullscreenChange
        )

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange
            )
            document.removeEventListener(
                'webkitfullscreenchange',
                handleFullscreenChange
            )
        }
    }, [])

    return (
        <>
            <div className="absolute bottom-[16px] left-[12px] flex flex-col gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl">
                <ToolTip text="Full screen" position="right" delay={100}>
                    <button
                        onClick={(e) => handleFullscreenToggle(e)}
                        className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF] ${
                            fullScreen
                                ? 'bg-[#5CA367]'
                                : 'hover:bg-[#5CA367]/75'
                        }`}
                    >
                        <IconMaximize
                            color="#000000"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </ToolTip>

                <ToolTip text="Perfect View" position="right" delay={100}>
                    <button
                        onClick={(e) => setIsOrthographic(!isOrthographic)}
                        className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF] ${
                            isOrthographic
                                ? 'bg-[#5CA367]'
                                : 'hover:bg-[#5CA367]/75'
                        }`}
                    >
                        <OrthograhicView
                            color="#000000"
                            size={isSmall ? 12 : 20}
                        />
                    </button>
                </ToolTip>

                <ToolTip text="Fov Slider" position="right" delay={100}>
                    <button
                        disabled={isOrthographic}
                        onClick={(e) => handleViewActions('fov_slider')}
                        className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF] ${
                            showFovSlider && !isOrthographic
                                ? 'bg-[#5CA367]'
                                : 'hover:bg-[#5CA367]/75'
                        }`}
                    >
                        <IconPerspective
                            color="#000000"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </ToolTip>

                <ToolTip text="Enable Grids" position="right" delay={100}>
                    <button
                        onClick={(e) => handleViewActions('grids')}
                        className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF] ${
                            showGridOptions
                                ? 'bg-[#5CA367]'
                                : 'hover:bg-[#5CA367]/75'
                        }`}
                    >
                        <IconGridDots
                            color="#000000"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </ToolTip>

                <ToolTip text="Orbit Lock" position="right" delay={100}>
                    <button
                        onClick={(e) => setOrbitalLock(!orbitalLock)}
                        className={`flex cursor-pointer justify-center rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF] ${
                            orbitalLock
                                ? 'bg-[#5CA367]'
                                : 'hover:bg-[#5CA367]/75'
                        }`}
                    >
                        <IconLock
                            color="#000000"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </ToolTip>

                <ToolTip text="Undo" position="right" delay={100}>
                    <button
                        className={`z-5 cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF] hover:bg-[#5CA367]/75`}
                    >
                        <IconArrowBackUp
                            color="#000000"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </ToolTip>

                <ToolTip text="Redo" position="right" delay={100}>
                    <button
                        className={`z-5 cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF] hover:bg-[#5CA367]/75`}
                    >
                        <IconArrowForwardUp
                            color="#000000"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </ToolTip>
            </div>

            {showFovSlider && !isOrthographic && (
                <div className="absolute bottom-[140px] left-[58px] z-5 w-[140px] justify-center rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl md:bottom-[184px] md:left-[72px] md:w-[198px]">
                    <RangeSlider
                        name="Camera Fov"
                        max={100}
                        min={0}
                        step={1}
                        value={cameraFov}
                        backgroundSize={fovBackground}
                        setUpdatingValue={setCameraFov}
                        setUpdatingBackground={setFovBackground}
                        isSmall={isSmall}
                    />
                </div>
            )}

            {showGridOptions && (
                <div className="absolute bottom-[208px] left-[58px] z-5 flex justify-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl md:bottom-[256px] md:left-[72px]">
                    <button
                        onClick={(e) => setGridPlaneX(!gridPlaneX)}
                        className={`${
                            gridPlaneX
                                ? 'bg-[#DE3163]/50'
                                : 'hover:bg-[#5CA367]/75'
                        } z-5 cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF]`}
                    >
                        <IconGridDots
                            color="#DE3163"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>

                    <button
                        onClick={(e) => setGridPlaneY(!gridPlaneY)}
                        className={`${
                            gridPlaneY
                                ? 'bg-[#50C878]/50'
                                : 'hover:bg-[#5CA367]/75'
                        } z-5 cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF]`}
                    >
                        <IconGridDots
                            color="#50C878"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>

                    <button
                        onClick={(e) => setGridPlaneZ(!gridPlaneZ)}
                        className={`${
                            gridPlaneZ
                                ? 'bg-[#0096FF]/50'
                                : 'hover:bg-[#5CA367]/75'
                        } z-5 cursor-pointer rounded-[4px] border-[0px] p-[8px] font-bold text-[#FFFFFF]`}
                    >
                        <IconGridDots
                            color="#0096FF"
                            size={isSmall ? 12 : 20}
                            stroke={1}
                        />
                    </button>
                </div>
            )}
        </>
    )
}

export default ViewsPanel
