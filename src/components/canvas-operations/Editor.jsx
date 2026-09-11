import React, { useEffect, useRef, useState } from 'react'

import {
    IconBallpen,
    IconBrandGithub,
    IconDownload,
    IconHandFinger,
    IconMenu2,
    IconMouse,
} from '@tabler/icons-react'
import { v4 as uuid } from 'uuid'
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
import { loadSceneFromIndexedDB, saveGroupToIndexDB } from '../../db/storage'

const Editor = () => {
    const [, setError] = useState(false)
    const [, setLoading] = useState(false)
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

    const { setNotesData, pointerType, setPointerType, setDrawGuide } =
        canvasDrawStore((state) => state)
    const { addNewGroup, activeScene, setGroupData, setActiveGroup } =
        canvasRenderStore((state) => state)
    const { setOrbitalLock } = canvasViewStore((state) => state)

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

        const onFirstPointerDown = (e) => {
            setPointerType(e.pointerType)
            setDrawGuide(true)
            setOrbitalLock(true)
            window.removeEventListener('pointerdown', onFirstPointerDown, true)
        }

        window.addEventListener('pointerdown', onFirstPointerDown, true)
        return () =>
            window.removeEventListener('pointerdown', onFirstPointerDown, true)
    }, [setPointerType])

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true

        fetchNoteData()
    }, [])

    const fetchNoteData = async () => {
        try {
            setLoading(true)
            setNotesData(null)

            const { groupData } = await loadSceneFromIndexedDB()

            if (groupData && groupData.length > 0) {
                setGroupData(groupData)
                const activeGroup = groupData.find((g) => g.active)
                setActiveGroup(activeGroup)
            } else {
                const data = {
                    uuid: uuid(),
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
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    async function downloadFile(e) {
        const sceneToExport = activeScene.clone()

        const exporter = new GLTFExporter()

        exporter.parse(
            sceneToExport,
            (result) => {
                if (result?.meshes?.length > 0) {
                    const output =
                        typeof result === 'string'
                            ? result
                            : JSON.stringify(result, null, 2)
                    const blob = new Blob([output], {
                        type: 'application/json',
                    })
                    const link = document.createElement('a')
                    link.href = URL.createObjectURL(blob)
                    link.download = `scene.gltf`
                    link.click()
                    URL.revokeObjectURL(link.href)
                }
            },
            { binary: false, includeCustomExtensions: true }
        )
    }

    const DisableBrowserGestures = () => {
        useEffect(() => {
            const preventDefaultTouch = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                if (e.target.tagName === 'CANVAS') {
                    return
                }
                if (e.touches && e.touches.length > 1) {
                    e.preventDefault()
                }
            }

            const preventPullToRefresh = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                if (e.target.tagName === 'CANVAS') {
                    return
                }
                if (window.scrollY === 0) {
                    e.preventDefault()
                }
            }

            const preventDefaultGestures = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                if (e.target.tagName === 'CANVAS') {
                    return
                }
                e.preventDefault()
            }

            const preventContextMenu = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                if (e.target.tagName === 'CANVAS') {
                    return
                }
                e.preventDefault()
            }

            let lastTouchEnd = 0
            const preventDoubleTapZoom = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                if (e.target.tagName === 'CANVAS') {
                    return
                }
                const now = Date.now()
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault()
                }
                lastTouchEnd = now
            }

            const preventScroll = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                if (e.target.tagName === 'CANVAS') {
                    return
                }
                e.preventDefault()
                e.stopPropagation()
                return false
            }

            const preventWheel = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                if (e.target.tagName === 'CANVAS') {
                    return
                }
                e.preventDefault()
            }

            const preventKeyboardScroll = (e) => {
                if (
                    e.target.closest(
                        '.overflow-y-auto, .custom-scrollbar, .gesture-allowed'
                    )
                ) {
                    return
                }
                const scrollKeys = [32, 33, 34, 35, 36, 37, 38, 39, 40]
                if (scrollKeys.includes(e.keyCode)) {
                    e.preventDefault()
                    return false
                }
            }

            document.addEventListener('gesturestart', preventDefaultGestures, {
                passive: false,
            })
            document.addEventListener('gesturechange', preventDefaultGestures, {
                passive: false,
            })
            document.addEventListener('gestureend', preventDefaultGestures, {
                passive: false,
            })

            document.addEventListener('touchmove', preventPullToRefresh, {
                passive: false,
            })
            document.addEventListener('touchstart', preventDefaultTouch, {
                passive: false,
            })
            document.addEventListener('touchend', preventDoubleTapZoom, {
                passive: false,
            })

            document.addEventListener('contextmenu', preventContextMenu)

            document.addEventListener('scroll', preventScroll, {
                passive: false,
            })
            document.addEventListener('wheel', preventWheel, { passive: false })
            document.addEventListener('mousewheel', preventWheel, {
                passive: false,
            })
            document.addEventListener('DOMMouseScroll', preventWheel, {
                passive: false,
            })
            document.addEventListener('keydown', preventKeyboardScroll, {
                passive: false,
            })

            document.body.addEventListener('scroll', preventScroll, {
                passive: false,
            })
            document.documentElement.addEventListener('scroll', preventScroll, {
                passive: false,
            })

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
                        onClick={(e) => setShowOptions(!showOptions)}
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
                                onClick={(e) => downloadFile(e)}
                                className="m-[4px] flex cursor-pointer items-center justify-between gap-[12px] rounded-[4px] font-funnel text-[8px] font-normal hover:bg-[#5CA367]/25 md:text-[12px]"
                            >
                                <ToolTip
                                    text="Download model"
                                    position="right-bottom"
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
                                <ToolTip
                                    text="GitHub"
                                    position="bottom-right"
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
                                            onClick={(e) =>
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
                                            onClick={(e) =>
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
                                            onClick={(e) =>
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
