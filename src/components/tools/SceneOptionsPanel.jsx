import React from 'react'

import {
    IconAdjustments,
    IconBulb,
    IconCheck,
    IconCursorText,
    IconDropletHalf2,
    IconEye,
    IconEyeOff,
    IconPlus,
    IconStack2,
    IconTrash,
} from '@tabler/icons-react'

import ColorPicker from '../ColorPicker'

import { saveGroupToIndexDB } from '../../db/storage'
import { dashboardStore } from '../../hooks/useDashboardStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'

const SceneOptionsPanel = ({ isSmall }) => {
    const {
        sceneOptions,

        groupOptions,
        setGroupOptions,

        groupData,

        selectedGroups,
        addToSelectedGroup,
        removeFromSelectedGroup,

        renderOptions,
        setRenderOptions,

        postProcess,
        setPostProcess,

        sequentialLoading,
        setSequentialLoading,

        canvasBackgroundColor,
        setCanvasBackgroundColor,

        intensityBackground,
        setIntensityBackground,

        lightIntensity,
        setLightIntensity,
    } = canvasRenderStore((state) => state)

    const {
        setNewGroupModal,
        setCopyGroupModal,
        setRenameGroupModal,
        setDeleteGroupModal,
    } = dashboardStore((state) => state)

    function handleSceneActiveOptions(option) {
        switch (option) {
            case 'groups':
                setRenderOptions(false)
                setGroupOptions(true)
                break
            case 'render':
                setGroupOptions(false)
                setRenderOptions(true)
                break

            default:
                break
        }
    }

    function handleLightIntensitySlider(e) {
        e.preventDefault()
        setLightIntensity(e.target.value)
        const min = e.target.min
        const max = e.target.max
        const currentVal = e.target.value
        setIntensityBackground(
            ((currentVal - min) / (max - min)) * 100 + '% 100%'
        )
    }

    async function handleSelectGroup(e, data) {
        if (e.target.checked) {
            addToSelectedGroup(data)
        } else {
            removeFromSelectedGroup(data.uuid)
        }
    }

    function handleGroupOperation(operation) {
        switch (operation) {
            case 'add':
                setNewGroupModal(true)
                break
            case 'rename':
                setRenameGroupModal(true)
                break
            case 'copy':
                setCopyGroupModal(true)
                break
            case 'delete':
                setDeleteGroupModal(true)
                break
            default:
                break
        }
    }

    async function handleGroupVisibility(data) {
        canvasRenderStore
            .getState()
            .updateVisibleGroupProduct(data.uuid, !data.visible)
        const updatedGroupData = canvasRenderStore.getState().groupData
        await saveGroupToIndexDB(updatedGroupData)
    }

    async function handleActiveGroup(data) {
        canvasRenderStore.getState().setActiveGroup(data)
        canvasRenderStore.getState().updateActiveGroupProduct(data.uuid)
        const updatedGroupData = canvasRenderStore.getState().groupData
        await saveGroupToIndexDB(updatedGroupData)
    }

    return (
        <>
            <div>
                <div className="absolute top-[72px] right-[12px] z-5 w-[180px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl md:w-[240px]">
                    <div className="mb-[8px] flex justify-around">
                        <div
                            onClick={(e) => handleSceneActiveOptions('groups')}
                            className={`${
                                groupOptions
                                    ? 'border-[#00A36C]'
                                    : 'border-[#121212]'
                            } cursor-pointer rounded-t-[4px] border-b-[2px] p-[8px] font-bold`}
                        >
                            <IconStack2
                                color="#000000"
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </div>

                        <div
                            onClick={(e) => handleSceneActiveOptions('render')}
                            className={`${
                                renderOptions
                                    ? 'border-[#00A36C]'
                                    : 'border-[#121212]'
                            } cursor-pointer rounded-t-[4px] border-b-[2px] p-[8px] font-bold`}
                        >
                            <IconAdjustments
                                color="#000000"
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </div>
                    </div>

                    {sceneOptions && groupOptions && (
                        <div className="mb-[8px] flex justify-center">
                            <div
                                onClick={(e) => handleGroupOperation('add')}
                                className="cursor-pointer rounded-[4px] p-[8px] hover:bg-[#5CA367]/25"
                            >
                                <IconPlus
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </div>
                            <div
                                onClick={(e) => handleGroupOperation('rename')}
                                className="cursor-pointer rounded-[4px] p-[8px] hover:bg-[#5CA367]/25"
                            >
                                <IconCursorText
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </div>
                            <div
                                onClick={(e) => handleGroupOperation('delete')}
                                className="cursor-pointer rounded-[4px] p-[8px] hover:bg-[#5CA367]/25"
                            >
                                <IconTrash
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </div>
                        </div>
                    )}

                    {/* `custom-scrollbar` carries no styles. Editor.jsx finds
                        it with closest() to exempt this list from the
                        page-wide gesture and scroll suppression. */}
                    <div className="custom-scrollbar max-h-[500px] touch-pan-y overflow-y-auto overscroll-contain contain-[layout_style_paint] [-webkit-overflow-scrolling:touch]">
                        {sceneOptions &&
                            groupOptions &&
                            groupData.map((data, key) => {
                                return (
                                    <div
                                        key={key}
                                        className="z-5 m-[4px] flex flex-col rounded-[4px] font-funnel text-[8px] font-normal text-[#000000] md:text-[12px]"
                                    >
                                        <div
                                            className={`${
                                                data.active
                                                    ? 'bg-[#5CA367]'
                                                    : 'bg-[#FFFFFF]'
                                            } flex cursor-pointer items-center justify-between rounded-[4px] px-[8px]`}
                                        >
                                            <label className="cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only border-[1px]"
                                                    checked={selectedGroups.some(
                                                        (group) =>
                                                            group.uuid ===
                                                            data.uuid
                                                    )}
                                                    onChange={(e) =>
                                                        handleSelectGroup(
                                                            e,
                                                            data
                                                        )
                                                    }
                                                    onFocus={(e) =>
                                                        e.preventDefault()
                                                    }
                                                />
                                                <div
                                                    className={`flex size-[12px] items-center justify-center rounded-[20px] border-[1px] border-[#4B5563]/25 bg-[#ffffff] peer-checked:bg-[#005eff] md:size-[16px]`}
                                                >
                                                    <IconCheck
                                                        size={isSmall ? 8 : 12}
                                                        color="#FFFFFF"
                                                        stroke={1}
                                                    />
                                                </div>
                                            </label>
                                            <div
                                                onClick={(e) =>
                                                    handleActiveGroup(data)
                                                }
                                                className="mx-[8px] w-full p-[4px]"
                                            >
                                                {data.name.length > 13
                                                    ? `${data.name.slice(
                                                          0,
                                                          13
                                                      )}...`
                                                    : data.name}
                                            </div>

                                            <div
                                                onClick={(e) =>
                                                    handleGroupVisibility(data)
                                                }
                                                className="flex items-center justify-between gap-[8px] rounded-[4px] p-[4px]"
                                            >
                                                {data.visible && (
                                                    <IconEye
                                                        color="#000000"
                                                        size={isSmall ? 12 : 20}
                                                        stroke={1}
                                                    />
                                                )}
                                                {!data.visible && (
                                                    <IconEyeOff
                                                        color="#000000"
                                                        size={isSmall ? 12 : 20}
                                                        stroke={1}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                    </div>

                    {sceneOptions && renderOptions && (
                        <div className="z-5 w-full items-center rounded-[8px] bg-[#FFFFFF] font-funnel font-normal text-[#000000]">
                            <div className="flex items-center justify-between border-b-[1px] border-[#4B5563]/25 px-[12px]">
                                <div className="flex items-center justify-between">
                                    <div className="flex cursor-pointer gap-[12px] p-[8px] font-bold">
                                        <IconBulb
                                            color="#000000"
                                            size={isSmall ? 12 : 20}
                                            stroke={1}
                                        />
                                    </div>

                                    <div className="gesture-allowed m-[4px] flex flex-col">
                                        <div className="flex size-full items-center justify-start gap-[15px] bg-[#FFFFFF]">
                                            <div className="flex w-full items-center">
                                                <input
                                                    className="h-[5px] cursor-pointer appearance-none rounded-[50px] bg-[#A7A7A7] bg-[linear-gradient(#5CA367,#5CA367)] bg-no-repeat [&::-moz-range-thumb]:size-[15px] [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-[#D5D4D8] [&::-webkit-slider-thumb]:size-[15px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#2C2C2C]"
                                                    onChange={(e) =>
                                                        handleLightIntensitySlider(
                                                            e
                                                        )
                                                    }
                                                    type="range"
                                                    name="range"
                                                    id="range-slider"
                                                    step={1}
                                                    value={lightIntensity}
                                                    min={0}
                                                    max={10}
                                                    style={{
                                                        width: isSmall
                                                            ? '80px'
                                                            : '120px',
                                                        backgroundSize:
                                                            intensityBackground,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex cursor-pointer p-[4px] text-[8px] font-bold md:text-[12px]">
                                    {lightIntensity}
                                </div>
                            </div>

                            <div className="m-[12px] flex items-center justify-between">
                                <div className="text-[8px] md:text-[12px]">
                                    Post Process
                                </div>
                                {postProcess && (
                                    <div
                                        onClick={(e) =>
                                            setPostProcess(!postProcess)
                                        }
                                        className="m-[12px] flex items-center rounded-[12px] bg-[#16b826]"
                                    >
                                        <div className="flex transform animate-fade-in items-center rounded-[12px] bg-[#16b826] transition-all duration-200 ease-out">
                                            <IconDropletHalf2
                                                color="#16b826"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                            <IconDropletHalf2
                                                color="#000000"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        </div>
                                    </div>
                                )}
                                {!postProcess && (
                                    <div
                                        onClick={(e) =>
                                            setPostProcess(!postProcess)
                                        }
                                        className="m-[12px] flex items-center rounded-[12px] bg-[#16b826]"
                                    >
                                        <div className="flex transform animate-fade-in items-center rounded-[12px] bg-[#A9A9A9] transition-all duration-200 ease-out">
                                            <IconDropletHalf2
                                                color="#000000"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                            <IconDropletHalf2
                                                color="#A9A9A9"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="m-[12px] flex items-center justify-between">
                                <div className="text-[8px] md:text-[12px]">
                                    Sequential Loading
                                </div>
                                {sequentialLoading && (
                                    <div
                                        onClick={(e) =>
                                            setSequentialLoading(
                                                !sequentialLoading
                                            )
                                        }
                                        className="m-[12px] flex items-center rounded-[12px] bg-[#16b826]"
                                    >
                                        <div className="flex transform animate-fade-in items-center rounded-[12px] bg-[#16b826] transition-all duration-200 ease-out">
                                            <IconDropletHalf2
                                                color="#16b826"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                            <IconDropletHalf2
                                                color="#000000"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        </div>
                                    </div>
                                )}

                                {!sequentialLoading && (
                                    <div
                                        onClick={(e) =>
                                            setSequentialLoading(
                                                !sequentialLoading
                                            )
                                        }
                                        className="m-[12px] flex-col items-center rounded-[12px] bg-[#16b826]"
                                    >
                                        <div className="flex transform animate-fade-in items-center rounded-[12px] bg-[#A9A9A9] transition-all duration-200 ease-out">
                                            <IconDropletHalf2
                                                color="#000000"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                            <IconDropletHalf2
                                                color="#A9A9A9"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="gesture-allowed border-t-[1px] border-[#4B5563]/25">
                                <ColorPicker
                                    value={canvasBackgroundColor}
                                    onChange={setCanvasBackgroundColor}
                                    isSmall={isSmall}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default SceneOptionsPanel
