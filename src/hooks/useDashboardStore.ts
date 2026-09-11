import { create } from 'zustand'

/**
 * Visibility of the four group modals.
 *
 * This store previously also carried `session`, `activeTab`, `sortBy`,
 * `showSettings`, `isHovered`, `loading`, `newFolderModal` and
 * `newNoteModal`, all left over from the sign-in and dashboard flow that
 * was removed in 4dd500d / 65dc457. None had a single reader, so they
 * were dropped rather than given invented types.
 */
export interface DashboardState {
    newGroupModal: boolean
    setNewGroupModal: (bool: boolean) => void

    renameGroupModal: boolean
    setRenameGroupModal: (bool: boolean) => void

    copyGroupModal: boolean
    setCopyGroupModal: (bool: boolean) => void

    deleteGroupModal: boolean
    setDeleteGroupModal: (bool: boolean) => void
}

export const dashboardStore = create<DashboardState>((set) => ({
    newGroupModal: false,
    setNewGroupModal: (bool) => set({ newGroupModal: bool }),

    renameGroupModal: false,
    setRenameGroupModal: (bool) => set({ renameGroupModal: bool }),

    copyGroupModal: false,
    setCopyGroupModal: (bool) => set({ copyGroupModal: bool }),

    deleteGroupModal: false,
    setDeleteGroupModal: (bool) => set({ deleteGroupModal: bool }),
}))
