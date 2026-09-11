import { useEffect, useRef, useState } from 'react'

import {
    IconBallpen,
    IconBrandGithub,
    IconDownload,
    IconHandFinger,
    IconMenu2,
    IconMouse,
} from '@tabler/icons-react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'react-toastify'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

import Canvas3d from './Canvas3d'
import ToolPanel from '../tools/ToolPanel'
import ViewsPanel from '../tools/ViewsPanel'

import { dashboardStore } from '../../hooks/useDashboardStore'
import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { canvasViewStore } from '../../hooks/useCanvasViewStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'

import CopyGroups from '../groups/CopyGroups'
import AddNewGroups from '../groups/AddNewGroups'
import RenameGroups from '../groups/RenameGroups'
import DeleteGroups from '../groups/DeleteGroups'

import ToolTip from '../ToolTip'
import { Fade } from '../../config/objectsConfig'
import { notifyError } from '../../helpers/notify'
import { loadSceneFromIndexedDB, saveGroupToIndexDB } from '../../db/storage'
import type { Group, PointerType } from '../../types/domain'

/**
 * Containers that keep native scrolling and browser gestures. Matched with
 * `closest()` below. `custom-scrollbar` and `gesture-allowed` carry no
 * styles and exist only as markers for this selector.
 */
const GESTURE_EXEMPT = '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'

/** Keys that scroll the page, suppressed so they cannot fire mid-stroke. */
const SCROLL_KEYS = [32, 33, 34, 35, 36, 37, 38, 39, 40]

/** True when the event started inside a container that keeps its gestures. */
function isExempt(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    if (target.closest(GESTURE_EXEMPT)) return true
    return target.tagName === 'CANVAS'
}

const Editor = () => {
    const [isSmall, setIsSmall] = useState(window.innerWidth < 768)
    const [showOptions, setShowOptions] = useState(true)

    const { sceneOptions } = canvasRenderStore((state) => state)

    const {
        newGroupModal,
        copyGroupModal,
        renameGroupModal,
        deleteGroupModal,
    } = dashboardStore((state) => state)

    const hasRun = useRef(false)

    const { pointerType, setPointerType, setDrawGuide } = canvasDrawStore(
        (state) => state
    )
    const { addNewGroup, activeScene, setGroupData, setActiveGroup } =
        canvasRenderStore((state) => state)
    const { setOrbitalLock } = canvasViewStore((state) => state)

    // The first pointer that touches the app decides which device the editor
    // binds to, so a resting palm cannot draw while a stylus is in use.
    useEffect(() => {
        toast.info(`Select Pointer type first!`, {
            position: 'top-center',
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: false,
            pauseOnHover: false,
            draggable: false,
            progress: undefined,
            theme: 'light',
            transition: Fade,
        })

        const onFirstPointerDown = (e: PointerEvent) => {
            setPointerType(e.pointerType as PointerType)
            setDrawGuide(true)
            setOrbitalLock(true)
            window.removeEventListener('pointerdown', onFirstPointerDown, true)
        }

        window.addEventListener('pointerdown', onFirstPointerDown, true)
        return () =>
            window.removeEventListener('pointerdown', onFirstPointerDown, true)
    }, [setPointerType, setDrawGuide, setOrbitalLock])

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true

        void fetchNoteData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchNoteData = async () => {
        try {
            const { groupData } = await loadSceneFromIndexedDB()

            if (groupData.length > 0) {
                setGroupData(groupData)
                setActiveGroup(groupData.find((g) => g.active) ?? null)
            } else {
                const data: Group = {
                    uuid: uuidv4(),
                    name: 'Group 1',
                    created_at: new Date().toISOString(),
                    deleted_at: null,
                    visible: true,
                    active: true,
                    objects: [],
                }
                addNewGroup(data)
                setActiveGroup(data)

                await saveGroupToIndexDB(canvasRenderStore.getState().groupData)
                setGroupData(canvasRenderStore.getState().groupData)
            }
        } catch (error) {
            console.error(error)
            notifyError(
                error instanceof Error
                    ? error.message
                    : 'Could not load your saved scene.'
            )
        }
    }

    function downloadFile() {
        if (!activeScene) return

        const sceneToExport = activeScene.clone()
        const exporter = new GLTFExporter()

        exporter.parse(
            sceneToExport,
            (result) => {
                const output =
                    typeof result === 'string'
                        ? result
                        : JSON.stringify(result, null, 2)

                const blob = new Blob([output], { type: 'application/json' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = `scene.gltf`
                link.click()
                URL.revokeObjectURL(link.href)
            },
            (error) => {
                console.error(error)
                notifyError('Could not export the scene.')
            },
            { binary: false, includeCustomExtensions: true }
        )
    }

    /**
     * Suppresses browser gestures across the page, so pull-to-refresh,
     * overscroll, pinch zoom and double-tap zoom cannot fire mid-stroke on a
     * tablet. Containers matching GESTURE_EXEMPT keep their normal behaviour.
     */
    const DisableBrowserGestures = () => {
        useEffect(() => {
            const preventDefaultTouch = (e: TouchEvent) => {
                if (isExempt(e.target)) return
                if (e.touches.length > 1) e.preventDefault()
            }

            const preventPullToRefresh = (e: TouchEvent) => {
                if (isExempt(e.target)) return
                if (window.scrollY === 0) e.preventDefault()
            }

            const preventDefaultGestures = (e: Event) => {
                if (isExempt(e.target)) return
                e.preventDefault()
            }

            const preventContextMenu = (e: MouseEvent) => {
                if (isExempt(e.target)) return
                e.preventDefault()
            }

            let lastTouchEnd = 0
            const preventDoubleTapZoom = (e: TouchEvent) => {
                if (isExempt(e.target)) return
                const now = Date.now()
                if (now - lastTouchEnd <= 300) e.preventDefault()
                lastTouchEnd = now
            }

            const preventScroll = (e: Event) => {
                if (isExempt(e.target)) return
                e.preventDefault()
                e.stopPropagation()
            }

            const preventWheel = (e: Event) => {
                if (isExempt(e.target)) return
                e.preventDefault()
            }

            const preventKeyboardScroll = (e: KeyboardEvent) => {
                if (
                    e.target instanceof Element &&
                    e.target.closest(GESTURE_EXEMPT)
                ) {
                    return
                }
                if (SCROLL_KEYS.includes(e.keyCode)) e.preventDefault()
            }

            const passive = { passive: false } as const

            document.addEventListener(
                'gesturestart',
                preventDefaultGestures,
                passive
            )
            document.addEventListener(
                'gesturechange',
                preventDefaultGestures,
                passive
            )
            document.addEventListener(
                'gestureend',
                preventDefaultGestures,
                passive
            )

            document.addEventListener(
                'touchmove',
                preventPullToRefresh,
                passive
            )
            document.addEventListener(
                'touchstart',
                preventDefaultTouch,
                passive
            )
            document.addEventListener('touchend', preventDoubleTapZoom, passive)

            document.addEventListener('contextmenu', preventContextMenu)

            document.addEventListener('scroll', preventScroll, passive)
            document.addEventListener('wheel', preventWheel, passive)
            document.addEventListener('mousewheel', preventWheel, passive)
            document.addEventListener('DOMMouseScroll', preventWheel, passive)
            document.addEventListener('keydown', preventKeyboardScroll, passive)

            document.body.addEventListener('scroll', preventScroll, passive)
            document.documentElement.addEventListener(
                'scroll',
                preventScroll,
                passive
            )

            window.scrollTo(0, 0)

            return () => {
                document.removeEventListener(
                    'gesturestart',
                    preventDefaultGestures
                )
                document.removeEventListener(
                    'gesturechange',
                    preventDefaultGestures
                )
                document.removeEventListener(
                    'gestureend',
                    preventDefaultGestures
                )

                document.removeEventListener('touchmove', preventPullToRefresh)
                document.removeEventListener('touchstart', preventDefaultTouch)
                document.removeEventListener('touchend', preventDoubleTapZoom)

                document.removeEventListener('contextmenu', preventContextMenu)

                document.removeEventListener('scroll', preventScroll)
                document.removeEventListener('wheel', preventWheel)
                document.removeEventListener('mousewheel', preventWheel)
                document.removeEventListener('DOMMouseScroll', preventWheel)
                document.removeEventListener('keydown', preventKeyboardScroll)

                document.body.removeEventListener('scroll', preventScroll)
                document.documentElement.removeEventListener(
                    'scroll',
                    preventScroll
                )
            }
        }, [])

        return null
    }

    useEffect(() => {
        const onResize = () => setIsSmall(window.innerWidth < 768)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    return (
        <>
            <DisableBrowserGestures />

            <div className="z-5 flex h-screen w-screen overflow-hidden select-none">
                <div className="absolute top-[12px] left-[12px] z-5 flex items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] p-[4px] hover:bg-[#5CA367]/75">
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className="flex justify-center rounded-[4px] p-[8px] font-bold"
                    >
                        <IconMenu2
                            color="#000000"
                            size={isSmall ? 8 : 12}
                            stroke={1}
                        />
                    </button>
                </div>

                {showOptions && (
                    <div className="absolute top-[72px] left-[12px] z-5 flex-col items-center gap-[4px] rounded-[8px] border-[1px] border-[#4B5563]/25 bg-[#FFFFFF] font-funnel text-[8px] font-normal drop-shadow-xl md:text-[12px]">
                        <ul>
                            <li
                                onClick={downloadFile}
                                className="m-[4px] flex cursor-pointer items-center justify-between gap-[12px] rounded-[4px] font-funnel text-[8px] font-normal hover:bg-[#5CA367]/25 md:text-[12px]"
                            >
                                {/* Was position="right-bottom", which is not
                                    one of the four supported positions, so the
                                    bubble rendered with no offset. */}
                                <ToolTip
                                    text="Download model"
                                    position="right"
                                    delay={100}
                                >
                                    <button className="flex cursor-pointer items-center justify-center rounded-[4px] px-[8px] font-bold">
                                        <IconDownload
                                            color="#000000"
                                            size={isSmall ? 12 : 16}
                                            stroke={1}
                                        />

                                        <div className="p-[12px] font-funnel font-normal">
                                            Download file
                                        </div>
                                    </button>
                                </ToolTip>
                            </li>

                            <li className="m-[4px] flex cursor-pointer items-center justify-between gap-[12px] rounded-[4px] font-funnel text-[8px] font-normal hover:bg-[#5CA367]/25 md:text-[12px]">
                                {/* Was position="bottom-right". Same issue. */}
                                <ToolTip
                                    text="GitHub"
                                    position="bottom"
                                    delay={100}
                                >
                                    <a
                                        className="flex cursor-pointer items-center justify-center rounded-[4px] px-[8px] font-bold"
                                        href="https://github.com/SW881/petals-3d"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <div>
                                            <IconBrandGithub
                                                color="#000000"
                                                size={isSmall ? 12 : 16}
                                                stroke={1}
                                            />
                                        </div>

                                        <div className="p-[12px] font-funnel font-normal">
                                            GitHub
                                        </div>
                                    </a>
                                </ToolTip>
                            </li>

                            <li className="flex border-b-[1px] border-[#4B5563]/25"></li>

                            <li className="m-[4px] flex items-center justify-between gap-[12px] p-[4px]">
                                <div>Pointer</div>
                                <div className="flex items-center justify-between gap-[4px]">
                                    <ToolTip
                                        text="Stylus"
                                        position="bottom"
                                        delay={100}
                                    >
                                        <button
                                            onClick={() =>
                                                setPointerType('pen')
                                            }
                                            className={`flex cursor-pointer justify-center rounded-[4px] p-[8px] font-bold ${
                                                pointerType === 'pen'
                                                    ? 'bg-[#5CA367]'
                                                    : 'hover:bg-[#5CA367]/25'
                                            }`}
                                        >
                                            <IconBallpen
                                                color="#000000"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        </button>
                                    </ToolTip>

                                    <ToolTip
                                        text="Mouse"
                                        position="bottom"
                                        delay={100}
                                    >
                                        <button
                                            onClick={() =>
                                                setPointerType('mouse')
                                            }
                                            className={`flex cursor-pointer justify-center rounded-[4px] p-[8px] font-bold ${
                                                pointerType === 'mouse'
                                                    ? 'bg-[#5CA367]'
                                                    : 'hover:bg-[#5CA367]/25'
                                            }`}
                                        >
                                            <IconMouse
                                                color="#000000"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        </button>
                                    </ToolTip>

                                    <ToolTip
                                        text="Touch"
                                        position="bottom"
                                        delay={100}
                                    >
                                        <button
                                            onClick={() =>
                                                setPointerType('touch')
                                            }
                                            className={`flex cursor-pointer justify-center rounded-[4px] p-[8px] font-bold ${
                                                pointerType === 'touch'
                                                    ? 'bg-[#5CA367]'
                                                    : 'hover:bg-[#5CA367]/25'
                                            }`}
                                        >
                                            <IconHandFinger
                                                color="#000000"
                                                size={isSmall ? 12 : 20}
                                                stroke={1}
                                            />
                                        </button>
                                    </ToolTip>
                                </div>
                            </li>
                        </ul>
                    </div>
                )}

                {sceneOptions && newGroupModal && <AddNewGroups />}
                {sceneOptions && renameGroupModal && <RenameGroups />}
                {sceneOptions && copyGroupModal && <CopyGroups />}
                {sceneOptions && deleteGroupModal && <DeleteGroups />}

                <div>
                    <ToolPanel isSmall={isSmall} />
                </div>
                <div className="size-full grow">
                    <Canvas3d />
                </div>
                <div>
                    <ViewsPanel isSmall={isSmall} />
                </div>
            </div>
        </>
    )
}

export default Editor
