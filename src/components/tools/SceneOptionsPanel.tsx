import type { ChangeEvent } from 'react'

import {
    IconAdjustments,
    IconBulb,
    IconCheck,
    IconCursorText,
    IconEye,
    IconEyeOff,
    IconPlus,
    IconStack2,
    IconTrash,
} from '@tabler/icons-react'

import ColorPicker from '../ColorPicker'
import Toggle from '../Toggle'
import RangeSlider from '../RangeSlider'

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
                <div className="absolute top-[72px] right-[12px] z-5 w-[180px] rounded-[12px] border-[1px] border-line/25 bg-surface p-[4px] drop-shadow-xl md:w-[240px]">
                    <div className="mb-[8px] flex justify-around">
                        <div
                            onClick={() => handleSceneActiveOptions('groups')}
                            className={`${
                                groupOptions ? 'border-accent' : 'border-ink'
                            } cursor-pointer rounded-t-[4px] border-b-[2px] p-[8px] font-bold`}
                        >
                            <IconStack2
                                color="currentColor"
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </div>

                        <div
                            onClick={() => handleSceneActiveOptions('render')}
                            className={`${
                                renderOptions ? 'border-accent' : 'border-ink'
                            } cursor-pointer rounded-t-[4px] border-b-[2px] p-[8px] font-bold`}
                        >
                            <IconAdjustments
                                color="currentColor"
                                size={isSmall ? 12 : 20}
                                stroke={1}
                            />
                        </div>
                    </div>

                    {sceneOptions && groupOptions && (
                        <div className="mb-[8px] flex justify-center">
                            <div
                                onClick={() => handleGroupOperation('add')}
                                className="cursor-pointer rounded-[8px] p-[8px] hover:bg-accent/25"
                            >
                                <IconPlus
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </div>
                            <div
                                onClick={() => handleGroupOperation('rename')}
                                className="cursor-pointer rounded-[8px] p-[8px] hover:bg-accent/25"
                            >
                                <IconCursorText
                                    color="currentColor"
                                    size={isSmall ? 12 : 20}
                                    stroke={1}
                                />
                            </div>
                            <div
                                onClick={() => handleGroupOperation('delete')}
                                className="cursor-pointer rounded-[8px] p-[8px] hover:bg-accent/25"
                            >
                                <IconTrash
                                    color="currentColor"
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
                                    className="z-5 m-[4px] flex flex-col rounded-[8px] font-funnel text-[8px] font-normal text-ink md:text-[12px]"
                                >
                                    <div
                                        className={`${
                                            data.active
                                                ? 'bg-accent text-accent-ink'
                                                : 'bg-surface'
                                        } flex cursor-pointer items-center justify-between rounded-[8px] px-[8px]`}
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
                                                className={`flex size-[12px] items-center justify-center rounded-[20px] border-[1px] border-line/25 bg-surface peer-checked:bg-accent peer-checked:text-accent-ink md:size-[16px]`}
                                            >
                                                <IconCheck
                                                    size={isSmall ? 8 : 12}
                                                    color="currentColor"
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
                                            className="flex items-center justify-between gap-[8px] rounded-[8px] p-[4px]"
                                        >
                                            {data.visible ? (
                                                <IconEye
                                                    color="currentColor"
                                                    size={isSmall ? 12 : 20}
                                                    stroke={1}
                                                />
                                            ) : (
                                                <IconEyeOff
                                                    color="currentColor"
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
                        <div className="z-5 w-full items-center rounded-[12px] bg-surface font-funnel font-normal text-ink">
                            <div className="flex items-center justify-between border-b-[1px] border-line/25 px-[12px]">
                                <div className="flex items-center justify-between">
                                    <div className="flex cursor-pointer gap-[12px] p-[8px] font-bold">
                                        <IconBulb
                                            color="currentColor"
                                            size={isSmall ? 12 : 20}
                                            stroke={1}
                                        />
                                    </div>

                                    <div className="m-[4px] flex items-center">
                                        <RangeSlider
                                            name="Light Intensity"
                                            max={10}
                                            min={0}
                                            step={1}
                                            value={lightIntensity}
                                            setUpdatingValue={setLightIntensity}
                                            compact
                                        />
                                    </div>
                                </div>
                                {/* Fixed width and tabular digits, so the row
                                    holds still as the value crosses from one
                                    digit to two. */}
                                <div className="w-[24px] p-[4px] text-right text-[8px] font-bold tabular-nums md:text-[12px]">
                                    {lightIntensity}
                                </div>
                            </div>

                            <div className="m-[12px] flex items-center justify-between gap-[12px]">
                                <div className="text-[8px] md:text-[12px]">
                                    Post Process
                                </div>
                                <Toggle
                                    checked={postProcess}
                                    onChange={setPostProcess}
                                    isSmall={isSmall}
                                    label="Post Process"
                                />
                            </div>

                            <div className="m-[12px] flex items-center justify-between gap-[12px]">
                                <div className="text-[8px] md:text-[12px]">
                                    Sequential Loading
                                </div>
                                <Toggle
                                    checked={sequentialLoading}
                                    onChange={setSequentialLoading}
                                    isSmall={isSmall}
                                    label="Sequential Loading"
                                />
                            </div>

                            <div className="gesture-allowed border-t-[1px] border-line/25">
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
