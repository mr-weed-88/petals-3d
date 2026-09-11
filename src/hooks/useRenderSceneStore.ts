import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type * as THREE from 'three'

import type { Group } from '../types/domain'

export interface CanvasRenderState {
    /** Live three.js scene. Null until the Canvas has mounted. */
    activeScene: THREE.Scene | null
    setActiveScene: (obj: THREE.Scene | null) => void

    /* Lighting and render options -------------------------------- */

    lightIntensity: number
    setLightIntensity: (value: number) => void

    intensityBackground: string
    setIntensityBackground: (value: string) => void

    /** Enables the bloom pass. */
    postProcess: boolean
    setPostProcess: (bool: boolean) => void

    /** Reveals scene objects one at a time on load. */
    sequentialLoading: boolean
    setSequentialLoading: (bool: boolean) => void

    canvasBackgroundColor: string
    setCanvasBackgroundColor: (color: string) => void

    dprValue: number
    setDprValue: (value: number) => void

    /* Panel visibility -------------------------------------------- */

    sceneOptions: boolean
    setSceneOptions: (bool: boolean) => void

    groupOptions: boolean
    setGroupOptions: (bool: boolean) => void

    renderOptions: boolean
    setRenderOptions: (bool: boolean) => void

    renderMode: boolean
    setRenderMode: (bool: boolean) => void

    copyGroups: boolean
    setCopyGroups: (bool: boolean) => void

    /* Groups ------------------------------------------------------ */

    groupData: Group[]
    setGroupData: (data: Group[]) => void

    /** The group new strokes are added to. Null only before first load. */
    activeGroup: Group | null
    setActiveGroup: (value: Group | null) => void

    selectedGroups: Group[]
    addToSelectedGroup: (group: Group) => void
    removeFromSelectedGroup: (groupId: string) => void
    resetSelectedGroups: () => void

    addNewGroup: (newGroup: Group) => void
    copySelectedGroups: () => void
    deleteSelectedGroups: () => void
    updateGroupNamesFromSelected: (name: string) => void
    updateVisibleGroupProduct: (uuid: string, visiblity: boolean) => void
    updateActiveGroupProduct: (uuid: string) => void

    /** Orders groups by creation time, oldest first. */
    sortGroupsByName: () => void
}

export const canvasRenderStore = create<CanvasRenderState>((set, get) => ({
    activeScene: null,
    setActiveScene: (obj) => set({ activeScene: obj }),

    lightIntensity: 0,
    setLightIntensity: (value) => set({ lightIntensity: value }),

    intensityBackground: '10% 100%',
    setIntensityBackground: (value) => set({ intensityBackground: value }),

    postProcess: false,
    setPostProcess: (bool) => set({ postProcess: bool }),

    sequentialLoading: false,
    setSequentialLoading: (bool) => set({ sequentialLoading: bool }),

    canvasBackgroundColor: '#FFFFFF',
    setCanvasBackgroundColor: (color) => set({ canvasBackgroundColor: color }),

    dprValue: 1,
    setDprValue: (value) => set({ dprValue: value }),

    sceneOptions: false,
    setSceneOptions: (bool) => set({ sceneOptions: bool }),

    groupOptions: false,
    setGroupOptions: (bool) => set({ groupOptions: bool }),

    renderOptions: false,
    setRenderOptions: (bool) => set({ renderOptions: bool }),

    renderMode: false,
    // Previously assigned to `renderOptions`, the key belonging to the setter
    // below it, so `renderMode` could never change.
    setRenderMode: (bool) => set({ renderMode: bool }),

    copyGroups: false,
    setCopyGroups: (bool) => set({ copyGroups: bool }),

    groupData: [],
    setGroupData: (data) => set({ groupData: data }),

    activeGroup: null,
    setActiveGroup: (value) => set({ activeGroup: value }),

    selectedGroups: [],

    addToSelectedGroup: (group) =>
        set((state) => ({ selectedGroups: [...state.selectedGroups, group] })),

    removeFromSelectedGroup: (groupId) =>
        set((state) => ({
            selectedGroups: state.selectedGroups.filter(
                (item) => item.uuid !== groupId
            ),
        })),

    resetSelectedGroups: () => set({ selectedGroups: [] }),

    addNewGroup: (newGroup) =>
        set((state) => ({ groupData: [...state.groupData, newGroup] })),

    copySelectedGroups: () => {
        const { selectedGroups, groupData } = get()

        const newGroups: Group[] = selectedGroups.map((g) => ({
            uuid: uuidv4(),
            name: `${g.name}_copy`,
            created_at: new Date().toISOString(),
            deleted_at: null,
            visible: g.visible,
            active: false,
            objects: g.objects,
        }))

        set({ groupData: [...groupData, ...newGroups] })
    },

    deleteSelectedGroups: () => {
        const { selectedGroups, groupData } = get()
        const selectedIds = selectedGroups.map((g) => g.uuid)

        set({
            groupData: groupData.filter(
                (group) => !selectedIds.includes(group.uuid)
            ),
        })
    },

    updateGroupNamesFromSelected: (name) =>
        set((state) => ({
            groupData: state.groupData.map((group) =>
                state.selectedGroups.some((sel) => sel.uuid === group.uuid)
                    ? { ...group, name }
                    : group
            ),
        })),

    updateVisibleGroupProduct: (uuid, visiblity) =>
        set((state) => ({
            groupData: state.groupData.map((group) =>
                group.uuid === uuid ? { ...group, visible: visiblity } : group
            ),
        })),

    updateActiveGroupProduct: (uuid) =>
        set((state) => ({
            groupData: state.groupData.map((group) => ({
                ...group,
                active: group.uuid === uuid,
            })),
        })),

    sortGroupsByName: () =>
        set((state) => ({
            groupData: [...state.groupData].sort(
                (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
            ),
        })),
}))
