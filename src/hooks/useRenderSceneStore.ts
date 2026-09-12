import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type * as THREE from 'three'

import { cloneLineRecord } from '../helpers/records'
import type { Group } from '../types/domain'

/** Scene contents, groups and render settings. */
export interface CanvasRenderState {
    activeScene: THREE.Scene | null
    setActiveScene: (obj: THREE.Scene | null) => void

    lightIntensity: number
    setLightIntensity: (value: number) => void

    postProcess: boolean
    setPostProcess: (bool: boolean) => void

    sequentialLoading: boolean
    setSequentialLoading: (bool: boolean) => void

    canvasBackgroundColor: string
    setCanvasBackgroundColor: (color: string) => void

    dprValue: number
    setDprValue: (value: number) => void

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

    groupData: Group[]
    setGroupData: (data: Group[]) => void

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

    sortGroupsByName: () => void
}

export const canvasRenderStore = create<CanvasRenderState>((set, get) => ({
    activeScene: null,
    setActiveScene: (obj) => set({ activeScene: obj }),

    lightIntensity: 0,
    setLightIntensity: (value) => set({ lightIntensity: value }),

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

        const newGroups: Group[] = selectedGroups.map((g) => {
            const uuid = uuidv4()

            /* Deep copies with fresh ids. Sharing `g.objects` put the same
               records in two groups, so transforming one moved the other and
               the index wrote the same line ids under both. */
            const objects = g.objects.map((line) => {
                const copy = cloneLineRecord(line)
                copy.uuid = uuidv4()
                copy.group_id = uuid
                return copy
            })

            return {
                uuid,
                name: `${g.name}_copy`,
                created_at: new Date().toISOString(),
                deleted_at: null,
                visible: g.visible,
                active: false,
                objects,
            }
        })

        set({ groupData: [...groupData, ...newGroups] })
    },

    deleteSelectedGroups: () => {
        const { selectedGroups, groupData } = get()
        const selectedIds = new Set(selectedGroups.map((g) => g.uuid))

        const remaining = groupData.filter(
            (group) => !selectedIds.has(group.uuid)
        )

        if (remaining.some((group) => group.active)) {
            set({ groupData: remaining })
            return
        }

        /* The first survivor takes over. An `activeGroup` pointing at a group
           no longer in the document sends later strokes into an array nothing
           persists, and several paths assume one exists. */
        const promoted = remaining.map((group, index) => ({
            ...group,
            active: index === 0,
        }))

        set({ groupData: promoted, activeGroup: promoted[0] ?? null })
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
