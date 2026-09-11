import { useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

import { saveGroupToIndexDB } from '../../db/storage'
import { eraseLineType } from '../../config/objectsConfig'
import { notifySuccess } from '../../helpers/notify'

import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'
import { isLineMesh, type LineObjectType } from '../../types/domain'

/** Meshes here are built with a single material, but three.js allows an array. */
function forEachMaterial(
    mesh: THREE.Mesh,
    fn: (material: THREE.Material) => void
): void {
    const material = mesh.material
    if (Array.isArray(material)) {
        material.forEach(fn)
    } else {
        fn(material)
    }
}

const EraseLine = () => {
    const { camera, pointer, raycaster, scene } = useThree()
    const { activeGroup, setGroupData } = canvasRenderStore((state) => state)
    const { eraserActive, pointerType } = canvasDrawStore((state) => state)

    const highlighted = useRef<Set<THREE.Mesh>>(new Set())
    const [dragging, setDragging] = useState(false)

    const resetHighlight = useCallback(() => {
        highlighted.current.forEach((obj) => {
            forEachMaterial(obj, (material) => {
                material.opacity = 1
            })
        })
        highlighted.current.clear()
    }, [])

    const eraseObjects = useCallback(async () => {
        const totalLines = highlighted.current.size

        highlighted.current.forEach((obj) => {
            if (!obj.parent) return
            if (!isLineMesh(obj)) return

            obj.visible = false
            obj.userData.is_deleted = true

            // The mesh's userData and the stored record are the same object,
            // so this second write is only needed when they have diverged.
            const lineUuid = obj.userData.uuid
            const targetLineData = activeGroup?.objects.find(
                (line) => line.uuid === lineUuid
            )
            if (targetLineData) {
                targetLineData.is_deleted = true
            }
        })

        setGroupData([...canvasRenderStore.getState().groupData])

        await saveGroupToIndexDB(canvasRenderStore.getState().groupData)

        if (totalLines >= 1) {
            notifySuccess(`${totalLines} curves erased!`)
        }

        highlighted.current.clear()
    }, [setGroupData, activeGroup])

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType === pointerType && eraserActive) {
                resetHighlight()
                setDragging(true)
            }
        }

        const onPointerUp = () => {
            if (eraserActive) {
                setDragging(false)
                void eraseObjects()
            }
        }

        window.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointerup', onPointerUp)

        return () => {
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [resetHighlight, eraseObjects, eraserActive, pointerType])

    useFrame(() => {
        if (!dragging) return

        raycaster.setFromCamera(pointer, camera)

        // Dragging only starts on a pointer-down while the eraser is active,
        // by which point a group has always been loaded.
        const activeGroupUuid = activeGroup!.uuid

        const objectsToCheck = scene.children.filter((obj) => {
            if (!isLineMesh(obj)) return false
            return (
                !obj.userData.is_deleted &&
                eraseLineType.includes(obj.userData.type as LineObjectType) &&
                obj.userData.group_id === activeGroupUuid
            )
        })

        const intersects = raycaster.intersectObjects(objectsToCheck, true)
        const first = intersects[0]?.object

        if (first instanceof THREE.Mesh && !highlighted.current.has(first)) {
            highlighted.current.add(first)

            forEachMaterial(first, (material) => {
                material.transparent = true
                material.opacity = 0.5
                material.needsUpdate = true
            })
        }
    })

    return null
}

export default EraseLine
