import { useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

import { canvasViewStore } from '../../hooks/useCanvasViewStore'
import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'

import DrawLine from './DrawLine'
import EraseLine from './EraseLine'
import TransformLine from './TransformLine'
import JoystickCameraBridge from '../joystick/JoystickCameraBridge'
import HistoryBridge from './HistoryBridge'
import LoftGuidePlane from './LoftGuidePlane'
import TransformGuide from './TransformGuide'
import DynamicGuidePlane from './DynamicGuidePlane'
import DynamicBendGuidePlane from './DynamicBendGuidePlane'

import { saveWholeScene } from '../../db/storage'
import { generateScene } from '../../helpers/drawHelper'
import { isGuideMesh, isLineMesh, type Group } from '../../types/domain'

export default function CanvasOperations() {
    const { scene, gl } = useThree()

    const {
        setPlane,
        eraseGuide,
        selectLines,
        selectGuide,
        highlighted,
        setDrawGuide,
        setPenActive,
        setEraseGuide,
        bendPlaneGuide,
        setHighlighted,
        loftGuidePlane,
        setBendPlaneGuide,
        setLoftGuidePlane,
        setGenerateLoftSurface,
        dynamicDrawingPlaneMesh,
        setDynamicDrawingPlaneMesh,
    } = canvasDrawStore((state) => state)

    const { setActiveScene, setGroupData, groupData } = canvasRenderStore(
        (state) => state
    )

    const { setOrbitalLock } = canvasViewStore((state) => state)

    // The only wholesale write besides the first save of a new document. It
    // follows the mount rebuild, which purges erased records, so what is on
    // disk has to be replaced rather than added to.
    async function saveData() {
        await saveWholeScene(canvasRenderStore.getState().groupData)
    }

    // Mount only: rebuilds meshes from the loaded records once.
    useEffect(() => {
        const { newGeneratedGroups, newScene } = generateScene(scene, groupData)
        setGroupData([...newGeneratedGroups])
        setActiveScene(newScene)
        void saveData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /** A finished guide ribbon becomes the surface the pen now draws onto. */
    const handleGuideDrawingFinished = (guideMesh: THREE.Mesh) => {
        setDrawGuide(false)

        if (bendPlaneGuide) {
            setBendPlaneGuide(false)
            if (dynamicDrawingPlaneMesh) scene.remove(dynamicDrawingPlaneMesh)
        }

        if (loftGuidePlane) {
            setBendPlaneGuide(false)
            setLoftGuidePlane(false)
            setGenerateLoftSurface(false)
            if (dynamicDrawingPlaneMesh) scene.remove(dynamicDrawingPlaneMesh)
        }

        setDynamicDrawingPlaneMesh(guideMesh)
        setPlane(guideMesh)
        setPenActive(true)
        setOrbitalLock(true)
    }

    useEffect(() => {
        setActiveScene(scene)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /** Disposes meshes the eraser marked, once per scene change. */
    function ClearRemovedObjects() {
        useEffect(() => {
            const meshes: THREE.Mesh[] = []
            const selectedObjects = Array.from(highlighted)

            scene.traverse((child) => {
                if (
                    (isLineMesh(child) && child.userData.is_deleted) ||
                    isGuideMesh(child)
                ) {
                    meshes.push(child)
                }
            })

            meshes.forEach((mesh) => {
                scene.remove(mesh)
                mesh.geometry.dispose()

                const materials = Array.isArray(mesh.material)
                    ? mesh.material
                    : [mesh.material]

                materials.forEach((mat) => {
                    const withMap = mat as THREE.Material & {
                        map?: THREE.Texture | null
                    }
                    withMap.map?.dispose()
                    mat.dispose()
                })
            })

            gl.info.autoReset = false
            gl.info.reset()

            selectedObjects.forEach((obj) => {
                if (!isLineMesh(obj)) return

                const colors = obj.geometry.attributes.color
                if (!colors) return

                const baseColor = new THREE.Color(obj.userData.color)
                for (let i = 0; i < colors.count; i++) {
                    colors.setXYZW(
                        i,
                        baseColor.r,
                        baseColor.g,
                        baseColor.b,
                        obj.userData.opacity
                    )
                }
                colors.needsUpdate = true
            })

            setHighlighted([])
            setEraseGuide(false)
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [scene, gl])

        return null
    }

    const groupsByUuid = new Map<string, Group>(
        groupData.map((g) => [g.uuid, g])
    )

    useEffect(() => {
        scene.traverse((child) => {
            if (!isLineMesh(child)) return
            if (!child.userData.group_id) return

            if (child.userData.is_deleted) return

            // A mesh whose group is gone is hidden, not left alone: deleting a
            // group touches no mesh. This is also what makes undoing a group
            // deletion work, since the group coming back shows them again.
            const group = groupsByUuid.get(child.userData.group_id)
            child.visible = group ? group.visible : false
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupData])

    return (
        <>
            <DynamicGuidePlane onDrawingFinished={handleGuideDrawingFinished} />
            {bendPlaneGuide && (
                <DynamicBendGuidePlane
                    onDrawingFinished={handleGuideDrawingFinished}
                />
            )}

            <LoftGuidePlane onDrawingFinished={handleGuideDrawingFinished} />

            {selectGuide && <TransformGuide />}

            {eraseGuide && <ClearRemovedObjects />}

            <HistoryBridge />

            <DrawLine />
            {selectLines && <TransformLine />}
            {/* Both selection tools drive the joystick, and it needs to know
                where each world axis points on screen either way. */}
            {(selectLines || selectGuide) && <JoystickCameraBridge />}
            <EraseLine />
        </>
    )
}
