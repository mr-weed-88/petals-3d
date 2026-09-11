import { useState, type ChangeEvent } from 'react'

import { IconX } from '@tabler/icons-react'
import { v4 as uuidv4 } from 'uuid'

import { saveGroupToIndexDB } from '../../db/storage'
import { notifyError } from '../../helpers/notify'

import { dashboardStore } from '../../hooks/useDashboardStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'
import type { Group } from '../../types/domain'

const AddNewGroups = () => {
    const [loading, setLoading] = useState(false)
    const [groupName, setGroupName] = useState('')
    const [animateOut, setAnimateOut] = useState(false)

    const { setNewGroupModal } = dashboardStore((state) => state)

    const { resetSelectedGroups, groupData, addNewGroup, sortGroupsByName } =
        canvasRenderStore((state) => state)

    function handleClose() {
        setAnimateOut(true)
        setGroupName('')
        setTimeout(() => {
            setNewGroupModal(false)
            setAnimateOut(false)
        }, 200)
    }

    function handleNameChange(e: ChangeEvent<HTMLInputElement>) {
        setGroupName(e.target.value)
    }

    async function handleCreateNewGroup() {
        try {
            setLoading(true)

            if (groupName.length === 0) {
                setLoading(false)
                return
            }

            const data: Group = {
                uuid: uuidv4(),
                name: groupName,
                created_at: new Date().toISOString(),
                deleted_at: null,
                visible: true,
                active: false,
                objects: [],
            }

            addNewGroup(data)
            sortGroupsByName()

            const response = await saveGroupToIndexDB([...groupData, data])

            if (response) {
                resetSelectedGroups()
            } else {
                notifyError(
                    'Could not save the group. Your changes are not stored.'
                )
            }
            handleClose()
        } catch (error) {
            console.error(error)
            notifyError(
                error instanceof Error
                    ? error.message
                    : 'Could not create the group.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="relative z-10 font-funnel font-normal">
                <div className="fixed inset-0 bg-[#606060]/50 transition-opacity duration-200"></div>

                <div className="fixed inset-0 z-10 overflow-y-auto text-[8px] md:text-[12px]">
                    <div className="flex h-full items-center justify-center text-center">
                        <div
                            className={`relative w-[320px] transform overflow-hidden rounded-[8px] bg-[#FFFFFF] transition-all duration-200 ease-out md:w-[420px] ${
                                animateOut
                                    ? 'animate-fade-out'
                                    : 'animate-fade-in'
                            }`}
                        >
                            <div className="m-[4px] flex items-center justify-between border-b-[1px] border-[#D9D9D9] p-[12px] text-left font-funnel text-[12px] font-semibold md:text-[16px]">
                                <div className="text-[#000000]">
                                    Create new group
                                </div>
                                <div
                                    onClick={handleClose}
                                    className="cursor-pointer rounded-[8px] p-[4px]"
                                >
                                    <IconX
                                        color="#000000"
                                        size={16}
                                        stroke={1}
                                    />
                                </div>
                            </div>
                            <div className="mx-[20px] mt-[12px]">
                                <div className="mt-[16px]">
                                    <label className="mb-[8px] block text-left font-funnel text-[12px] font-normal text-[#000000]">
                                        Name
                                    </label>
                                    <input
                                        onChange={handleNameChange}
                                        type="text"
                                        className="block w-full rounded-[8px] border-[1px] border-[#d9d9d9] px-[12px] py-[8px] font-funnel text-[12px] font-semibold text-[#000000] focus:outline-0"
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="mt-[12px] flex items-center justify-end gap-[12px] px-4 py-3">
                                <button
                                    onClick={handleClose}
                                    className="cursor-pointer rounded-[8px] border-[1px] border-[#d9d9d9] px-[12px] py-[4px] text-[#000000]"
                                >
                                    Cancel
                                </button>

                                <button
                                    disabled={loading}
                                    onClick={handleCreateNewGroup}
                                    className="cursor-pointer rounded-[8px] border-[1px] border-[#5CA367] bg-[#5CA367]/25 px-[12px] py-[4px] text-[#000000]"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddNewGroups
