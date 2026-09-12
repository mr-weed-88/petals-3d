import { create } from 'zustand'

/** Which group modal is open. Only ever one at a time. */
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
