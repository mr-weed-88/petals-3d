import type { ChangeEvent } from 'react'

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
import type { Group } from '../../types/domain'

type SceneTab = 'groups' | 'render'
type GroupOperation = 'add' | 'rename' | 'copy' | 'delete'

export interface SceneOptionsPanelProps {
    /** True below the 768px breakpoint. Drives icon sizing. */
    isSmall: boolean
}

const SceneOptionsPanel = ({ isSmall }: SceneOptionsPanelProps) => {
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

    function handleSceneActiveOptions(option: SceneTab) {
        switch (option) {
            case 'groups':
                setRenderOptions(false)
                setGroupOptions(true)
                break
            case 'render':
                setGroupOptions(false)
                setRenderOptions(true)
                break
        }
    }

    function handleLightIntensitySlider(e: ChangeEvent<HTMLInputElement>) {
        e.preventDefault()

        // The DOM returns strings. The original stored the raw string in the
        // store and relied on later coercion.
        const currentVal = Number(e.target.value)
        const min = Number(e.target.min)
        const max = Number(e.target.max)

        setLightIntensity(currentVal)

        const span = max - min
        const filled = span === 0 ? 0 : ((currentVal - min) / span) * 100
        setIntensityBackground(`${filled}% 100%`)
    }

    function handleSelectGroup(e: ChangeEvent<HTMLInputElement>, data: Group) {
        if (e.target.checked) {
            addToSelectedGroup(data)
        } else {
            removeFromSelectedGroup(data.uuid)
        }
    }

    function handleGroupOperation(operation: GroupOperation) {
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
        }
    }

    async function handleGroupVisibility(data: Group) {
        canvasRenderStore
            .getState()
            .updateVisibleGroupProduct(data.uuid, !data.visible)
        await saveGroupToIndexDB(canvasRenderStore.getState().groupData)
    }

    async function handleActiveGroup(data: Group) {
        canvasRenderStore.getState().setActiveGroup(data)
        canvasRenderStore.getState().updateActiveGroupProduct(data.uuid)
        await saveGroupToIndexDB(canvasRenderStore.getState().groupData)
    }

    return (
        <>
            <div>
                <div className="absolute top-[72px] right-[12px] z-5 w-[180px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] drop-shadow-xl md:w-[240px]">
                    <div className="mb-[8px] flex justify-around">
                        <div
                            onClick={() => handleSceneActiveOptions('groups')}
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
                            onClick={() => handleSceneActiveOptions('render')}
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
                                onClick={() => handleGroupOperation('add')}
                                className="cursor-pointer rounded-[4px] p-[8px] hover:bg-[#5CA367]/25"
                            >
                                <IconPlus
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </div>
                            <div
                                onClick={() => handleGroupOperation('rename')}
                                className="cursor-pointer rounded-[4px] p-[8px] hover:bg-[#5CA367]/25"
                            >
                                <IconCursorText
                                    color="#000000"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </div>
                            <div
                                onClick={() => handleGroupOperation('delete')}
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

                    {/* `custom-scrollbar` carries no styles. Editor finds it
                        with closest() to exempt this list from the page-wide
                        gesture and scroll suppression. */}
                    <div className="custom-scrollbar max-h-[500px] touch-pan-y overflow-y-auto overscroll-contain contain-[layout_style_paint] [-webkit-overflow-scrolling:touch]">
                        {sceneOptions &&
                            groupOptions &&
                            groupData.map((data) => (
                                <div
                                    key={data.uuid}
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
                                                        group.uuid === data.uuid
                                                )}
                                                onChange={(e) =>
                                                    handleSelectGroup(e, data)
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
                                            onClick={() =>
                                                void handleActiveGroup(data)
                                            }
                                            className="mx-[8px] w-full p-[4px]"
                                        >
                                            {data.name.length > 13
                                                ? `${data.name.slice(0, 13)}...`
                                                : data.name}
                                        </div>

                                        <div
                                            onClick={() =>
                                                void handleGroupVisibility(data)
                                            }
                                            className="flex items-center justify-between gap-[8px] rounded-[4px] p-[4px]"
                                        >
                                            {data.visible ? (
                                                <IconEye
                                                    color="#000000"
                                                    size={isSmall ? 12 : 20}
                                                    stroke={1}
                                                />
                                            ) : (
                                                <IconEyeOff
                                                    color="#000000"
                                                    size={isSmall ? 12 : 20}
                                                    stroke={1}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                                                    onChange={
                                                        handleLightIntensitySlider
                                                    }
                                                    type="range"
                                                    name="range"
                                                    id="light-intensity-slider"
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
                                <div
                                    onClick={() => setPostProcess(!postProcess)}
                                    className="m-[12px] flex items-center rounded-[12px] bg-[#16b826]"
                                >
                                    <div
                                        className={`flex transform animate-fade-in items-center rounded-[12px] transition-all duration-200 ease-out ${
                                            postProcess
                                                ? 'bg-[#16b826]'
                                                : 'bg-[#A9A9A9]'
                                        }`}
                                    >
                                        <IconDropletHalf2
                                            color={
                                                postProcess
                                                    ? '#16b826'
                                                    : '#000000'
                                            }
                                            size={isSmall ? 12 : 20}
                                            stroke={1}
                                        />
                                        <IconDropletHalf2
                                            color={
                                                postProcess
                                                    ? '#000000'
                                                    : '#A9A9A9'
                                            }
                                            size={isSmall ? 12 : 20}
                                            stroke={1}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="m-[12px] flex items-center justify-between">
                                <div className="text-[8px] md:text-[12px]">
                                    Sequential Loading
                                </div>
                                <div
                                    onClick={() =>
                                        setSequentialLoading(!sequentialLoading)
                                    }
                                    className="m-[12px] flex items-center rounded-[12px] bg-[#16b826]"
                                >
                                    <div
                                        className={`flex transform animate-fade-in items-center rounded-[12px] transition-all duration-200 ease-out ${
                                            sequentialLoading
                                                ? 'bg-[#16b826]'
                                                : 'bg-[#A9A9A9]'
                                        }`}
                                    >
                                        <IconDropletHalf2
                                            color={
                                                sequentialLoading
                                                    ? '#16b826'
                                                    : '#000000'
                                            }
                                            size={isSmall ? 12 : 20}
                                            stroke={1}
                                        />
                                        <IconDropletHalf2
                                            color={
                                                sequentialLoading
                                                    ? '#000000'
                                                    : '#A9A9A9'
                                            }
                                            size={isSmall ? 12 : 20}
                                            stroke={1}
                                        />
                                    </div>
                                </div>
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
