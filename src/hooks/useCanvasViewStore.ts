import { create } from 'zustand'

export interface CanvasViewState {
    /** Freezes orbit rotation and pan so a drag draws instead of orbiting. */
    orbitalLock: boolean
    setOrbitalLock: (orbitalLockState: boolean) => void

    cameraFov: number
    setCameraFov: (value: number) => void

    showFovSlider: boolean
    setShowFovSlider: (bool: boolean) => void

    isOrthographic: boolean
    setIsOrthographic: (bool: boolean) => void

    showGridOptions: boolean
    setShowGridOptions: (bool: boolean) => void

    fullScreen: boolean
    setFullScreen: (bool: boolean) => void

    /** The three world grid planes, toggled independently. */
    gridPlaneX: boolean
    setGridPlaneX: (show: boolean) => void

    gridPlaneY: boolean
    setGridPlaneY: (show: boolean) => void

    gridPlaneZ: boolean
    setGridPlaneZ: (show: boolean) => void

    fovBackground: string
    setFovBackground: (value: string) => void
}

export const canvasViewStore = create<CanvasViewState>((set) => ({
    orbitalLock: false,
    setOrbitalLock: (orbitalLockState) =>
        set({ orbitalLock: orbitalLockState }),

    cameraFov: 30,
    setCameraFov: (value) => set({ cameraFov: value }),

    showFovSlider: false,
    setShowFovSlider: (bool) => set({ showFovSlider: bool }),

    isOrthographic: false,
    setIsOrthographic: (bool) => set({ isOrthographic: bool }),

    showGridOptions: false,
    setShowGridOptions: (bool) => set({ showGridOptions: bool }),

    fullScreen: false,
    setFullScreen: (bool) => set({ fullScreen: bool }),

    gridPlaneX: true,
    setGridPlaneX: (show) => set({ gridPlaneX: show }),

    gridPlaneY: false,
    setGridPlaneY: (show) => set({ gridPlaneY: show }),

    gridPlaneZ: false,
    setGridPlaneZ: (show) => set({ gridPlaneZ: show }),

    fovBackground: '30% 100%',
    setFovBackground: (value) => set({ fovBackground: value }),
}))
