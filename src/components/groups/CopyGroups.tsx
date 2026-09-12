import { useState } from 'react'

import { IconX } from '@tabler/icons-react'

import { saveGroupToIndexDB } from '../../db/storage'
import { notifyError } from '../../helpers/notify'

import { dashboardStore } from '../../hooks/useDashboardStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'

const CopyGroups = () => {
    const [loading, setLoading] = useState(false)

    const { setCopyGroupModal } = dashboardStore((state) => state)

    const {
        copySelectedGroups,
        resetSelectedGroups,
        copyGroups,
        setCopyGroups,
    } = canvasRenderStore((state) => state)

    function handleClose() {
        setCopyGroupModal(false)
    }

    async function handleCopyGroups() {
        try {
            setLoading(true)
            copySelectedGroups()

            const updatedGroupData = canvasRenderStore.getState().groupData

            setCopyGroups(!copyGroups)

            const response = await saveGroupToIndexDB(updatedGroupData)
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
                    : 'Could not copy groups.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="relative z-10 font-funnel font-normal text-ink">
                {/* Enter animation only. Closing unmounts immediately;
                    the old exit transition was a state flag plus a timer that
                    could fire after a reopen and shut the new dialog. */}
                <div className="fixed inset-0 animate-overlay-in bg-overlay/50"></div>

                <div className="fixed inset-0 z-10 overflow-y-auto text-[8px] md:text-[12px]">
                    <div className="flex h-full items-center justify-center text-center">
                        <div className="relative w-[320px] animate-modal-in overflow-hidden rounded-[12px] border-[1px] border-line/25 bg-surface drop-shadow-xl md:w-[420px]">
                            <div className="m-[4px] flex items-center justify-between border-b-[1px] border-line/25 p-[12px] text-left font-funnel text-[12px] font-semibold md:text-[16px]">
                                <div>Copy selected groups</div>
                                <button
                                    onClick={handleClose}
                                    className="flex cursor-pointer justify-center rounded-[8px] border-[0px] p-[4px] hover:bg-accent/25"
                                >
                                    <IconX
                                        color="currentColor"
                                        size={16}
                                        stroke={1}
                                    />
                                </button>
                            </div>

                            <div className="mx-[20px] mt-[12px]">
                                <div className="mt-[16px] text-left text-[12px] text-ink-muted">
                                    Are you sure you want to copy groups ?
                                </div>
                            </div>
                            <div className="mt-[12px] flex items-center justify-end gap-[12px] px-[16px] py-[12px]">
                                <button
                                    onClick={handleClose}
                                    className="cursor-pointer rounded-[8px] border-[1px] border-line/25 bg-surface px-[16px] py-[4px] text-ink hover:bg-surface-3"
                                >
                                    Cancel
                                </button>

                                <button
                                    disabled={loading}
                                    onClick={handleCopyGroups}
                                    className="cursor-pointer rounded-[8px] border-[1px] border-accent bg-accent px-[16px] py-[4px] font-semibold text-accent-ink hover:bg-accent/75 disabled:cursor-default disabled:opacity-50"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CopyGroups
