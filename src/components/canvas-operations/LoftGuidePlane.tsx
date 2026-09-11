import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'

import {
    ensureEvenCount,
    alignCurvesForLofting,
    resampleCurveNoNormals,
    normalizeGuideSetNoNormals,
    createControlledLoftedSurface,
    detectAndCombineConnectedLoop,
    type ControlledLoft,
    type CurveSet,
    type GuideSetInput,
} from '../../helpers/loftGuideHelper'
import { isLineMesh, type LineMesh } from '../../types/domain'

export interface LoftGuidePlaneProps {
    /** Called with the finished surface, which becomes the drawing plane. */
    onDrawingFinished: (mesh: THREE.Mesh) => void
}

const TARGET_SEGMENTS = 128

const LoftGuidePlane = ({ onDrawingFinished }: LoftGuidePlaneProps) => {
    const { camera, pointer, raycaster, scene, invalidate } = useThree()

    const {
        radialPercentage,
        waistPercentage,
        polyCountPercentage,
        generateLoftSurface,
        loftGuidePlane,
        setHighlighted,
        addToHighlighted,
        pointerType,
    } = canvasDrawStore((state) => state)

    const { activeGroup } = canvasRenderStore((state) => state)

    const highlighted = useRef<Set<LineMesh>>(new Set())
    const [draggingSelection, setDraggingSelection] = useState(false)
    const loftedSurfaceRef = useRef<ControlledLoft | null>(null)
    const prevGenerateLoftRef = useRef(false)

    /** Puts every selected stroke back to its stored colour. */
    const resetHighlightedObjects = useCallback(() => {
        highlighted.current.forEach((obj) => {
            if (!obj.userData.color) return

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
        highlighted.current.clear()
    }, [])

    const onPointerDownWindow = useCallback(
        (event: PointerEvent) => {
            if (event.pointerType !== pointerType) return
            const target = event.target
            if (
                target instanceof HTMLElement &&
                target.localName === 'canvas'
            ) {
                setDraggingSelection(true)
            }
        },
        [pointerType]
    )

    const onPointerUpWindow = useCallback(() => {
        if (!draggingSelection) {
            setDraggingSelection(false)
            return
        }

        setDraggingSelection(false)

        const selectedObjects = Array.from(highlighted.current)
        if (selectedObjects.length === 0) return

        const guideDataSets: GuideSetInput[] = []

        // Several strokes that join end-to-end become one closed curve;
        // otherwise each is lofted as its own guide.
        const combinedGuide =
            selectedObjects.length > 1
                ? detectAndCombineConnectedLoop(selectedObjects)
                : null

        if (combinedGuide) {
            guideDataSets.push(combinedGuide)
        } else {
            selectedObjects.forEach((obj) => {
                guideDataSets.push({ guidePoints: obj.userData.loft_points })
            })
        }

        if (guideDataSets.length === 0) return

        const normalizedSets: CurveSet[] = guideDataSets.map((gs) => {
            const normalized = normalizeGuideSetNoNormals(gs)
            return {
                guidePoints: normalized.points,
                isClosed: normalized.isClosed,
            }
        })

        const alignedSets = alignCurvesForLofting(normalizedSets)

        const finalizedGuideSets: CurveSet[] = alignedSets.map((gs) => {
            const resampled = resampleCurveNoNormals(
                gs.guidePoints,
                TARGET_SEGMENTS,
                gs.isClosed
            )
            const evened = ensureEvenCount(resampled.points, gs.isClosed)
            return { guidePoints: evened.points, isClosed: gs.isClosed }
        })

        if (selectedObjects.length === finalizedGuideSets.length) {
            finalizedGuideSets.forEach((gs, i) => {
                const target = selectedObjects[i]
                if (target) target.userData.loft_points = gs.guidePoints
            })
        }

        if (finalizedGuideSets.length < 2) {
            console.warn(
                'Need at least 2 guide curves for lofting. Selected:',
                finalizedGuideSets.length
            )
            return
        }

        loftedSurfaceRef.current?.dispose()

        loftedSurfaceRef.current = createControlledLoftedSurface(
            finalizedGuideSets,
            {
                initialRadial: radialPercentage / 100,
                initialWaist: waistPercentage / 100,
                initialPolyCount: polyCountPercentage / 100,
            }
        )

        if (loftedSurfaceRef.current.mesh) {
            scene.add(loftedSurfaceRef.current.mesh)
        } else {
            console.error('Failed to create loft surface mesh')
        }

        invalidate()
    }, [
        draggingSelection,
        radialPercentage,
        waistPercentage,
        polyCountPercentage,
        scene,
        invalidate,
    ])

    // Live slider adjustments rebuild the surface in place.
    useEffect(() => {
        const loft = loftedSurfaceRef.current
        if (!loft) return

        loft.setRadial(radialPercentage / 100)
        loft.setWaist(waistPercentage / 100)
        loft.setPolyCount(polyCountPercentage / 100)
    }, [radialPercentage, waistPercentage, polyCountPercentage])

    useEffect(() => {
        if (loftGuidePlane) {
            if (generateLoftSurface && !prevGenerateLoftRef.current) {
                prevGenerateLoftRef.current = true

                const loft = loftedSurfaceRef.current
                if (!loft?.mesh) return

                // Freeze the adjustable wireframe into a plain static mesh
                // that strokes can then be drawn onto.
                let finalGeometry = loft.mesh.geometry.clone()
                if (finalGeometry.index !== null) {
                    finalGeometry = finalGeometry.toNonIndexed()
                }

                const staticMaterial = new THREE.MeshBasicMaterial({
                    color: new THREE.Color('#C0C0C0'),
                    wireframe: false,
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.DoubleSide,
                    forceSinglePass: true,
                    depthTest: true,
                    depthWrite: true,
                })

                const staticMesh = new THREE.Mesh(finalGeometry, staticMaterial)
                staticMesh.userData = {
                    type: 'LOFT_SURFACE',
                    isDrawable: true,
                }

                staticMesh.updateMatrix()
                staticMesh.updateMatrixWorld(true)

                loft.dispose()
                loftedSurfaceRef.current = null

                finalGeometry.computeBoundingBox()
                finalGeometry.computeBoundingSphere()
                const positionAttribute = finalGeometry.attributes.position
                if (positionAttribute) positionAttribute.needsUpdate = true

                scene.add(staticMesh)

                resetHighlightedObjects()
                setHighlighted([])

                invalidate()

                onDrawingFinished(staticMesh)
            }
        } else {
            resetHighlightedObjects()

            const loft = loftedSurfaceRef.current
            if (loft) {
                if (loft.mesh) scene.remove(loft.mesh)
                loft.dispose()
                loftedSurfaceRef.current = null
            }

            setDraggingSelection(false)
            prevGenerateLoftRef.current = false

            invalidate()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        generateLoftSurface,
        loftGuidePlane,
        scene,
        onDrawingFinished,
        invalidate,
        resetHighlightedObjects,
    ])

    useEffect(() => {
        if (!loftGuidePlane) return

        window.addEventListener('pointerdown', onPointerDownWindow)
        window.addEventListener('pointerup', onPointerUpWindow)

        return () => {
            window.removeEventListener('pointerdown', onPointerDownWindow)
            window.removeEventListener('pointerup', onPointerUpWindow)
        }
    }, [loftGuidePlane, onPointerDownWindow, onPointerUpWindow])

    useFrame(() => {
        if (!draggingSelection) return

        raycaster.setFromCamera(pointer, camera)

        // Selection only runs while loft mode is active, by which point a
        // group has always been loaded.
        const activeGroupUuid = activeGroup!.uuid

        const objectsToTest = scene.children.filter((obj): obj is LineMesh => {
            if (!isLineMesh(obj)) return false
            return (
                !obj.userData.is_deleted &&
                obj.userData.type === 'LINE' &&
                obj.userData.group_id === activeGroupUuid
            )
        })

        const intersects = raycaster.intersectObjects(objectsToTest, true)
        let hasNewHighlight = false

        intersects.forEach(({ object }) => {
            if (!isLineMesh(object)) return
            if (highlighted.current.has(object)) return

            highlighted.current.add(object)
            addToHighlighted(object)
            hasNewHighlight = true

            const colors = object.geometry.attributes.color
            if (!colors) return

            const selectionColor = new THREE.Color('#FF4433')
            for (let i = 0; i < colors.count; i++) {
                colors.setXYZW(
                    i,
                    selectionColor.r,
                    selectionColor.g,
                    selectionColor.b,
                    object.userData.opacity
                )
            }
            colors.needsUpdate = true
        })

        if (hasNewHighlight) invalidate()
    })

    return null
}

export default LoftGuidePlane
