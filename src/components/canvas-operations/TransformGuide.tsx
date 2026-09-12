import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { isGuideMesh } from '../../types/domain'

interface TransformControlsInternals {
    _gizmo: {
        gizmo: {
            translate: THREE.Object3D
        }
    }
}

function forEachMaterial(
    object: THREE.Object3D,
    fn: (material: THREE.Material) => void
): void {
    if (!(object instanceof THREE.Mesh)) return
    const material = object.material as THREE.Material | THREE.Material[]
    if (Array.isArray(material)) {
        material.forEach(fn)
    } else {
        fn(material)
    }
}

/** Gizmo for moving, rotating and scaling a selected guide surface. */
const TransformGuide = () => {
    const { camera, pointer, raycaster, scene, gl, invalidate } = useThree()
    const { axisMode, pointerType, transformMode } = canvasDrawStore(
        (state) => state
    )

    const transformRef = useRef<TransformControls | null>(null)
    const dummyTarget = useRef(new THREE.Group())
    const selectedCenter = useRef(new THREE.Vector3())
    const isTransformDragging = useRef(false)
    const highlighted = useRef<Set<THREE.Object3D>>(new Set())

    const [attachedGizmos, setAttachedGizmos] = useState(false)
    const [draggingSelection, setDraggingSelection] = useState(false)

    const tempMatrix = useRef(new THREE.Matrix4())
    const tempPosition = useRef(new THREE.Vector3())
    const tempQuaternion = useRef(new THREE.Quaternion())
    const tempScale = useRef(new THREE.Vector3())

    const hideGizmoPlanes = (helper: THREE.Object3D) => {
        const gizmoIndex =
            transformMode === 'translate'
                ? 0
                : transformMode === 'rotate'
                  ? 1
                  : 2

        const gizmo = helper.children[gizmoIndex]
        if (!gizmo) return

        gizmo.children.forEach((child) => {
            if (
                child.name.includes('XY') ||
                child.name.includes('YZ') ||
                child.name.includes('XZ') ||
                child.name.includes('XYZ') ||
                child.name.includes('E')
            ) {
                child.scale.set(0, 0, 0)
                forEachMaterial(child, (material) => {
                    material.visible = false
                })
                child.visible = false
                child.updateMatrixWorld(true)
            }
        })
    }

    const toLocalSpace = (
        object: THREE.Object3D,
        newParent: THREE.Object3D
    ) => {
        object.updateMatrixWorld(true)
        const objectWorldMatrix = object.matrixWorld

        newParent.updateMatrixWorld(true)
        const parentInverseMatrix = tempMatrix.current
            .copy(newParent.matrixWorld)
            .invert()

        const localMatrix = tempMatrix.current.multiplyMatrices(
            parentInverseMatrix,
            objectWorldMatrix
        )

        localMatrix.decompose(
            tempPosition.current,
            tempQuaternion.current,
            tempScale.current
        )

        object.position.copy(tempPosition.current)
        object.rotation.setFromQuaternion(tempQuaternion.current)
        object.scale.copy(tempScale.current)
    }

    const computeCenter = (objects: THREE.Object3D[]): THREE.Vector3 => {
        const box = new THREE.Box3()
        const center = new THREE.Vector3()
        objects.forEach((obj) => {
            obj.updateMatrixWorld(true)
            box.expandByObject(obj)
        })
        return box.getCenter(center)
    }

    const resetHighlight = () => {
        highlighted.current.forEach((obj) => {
            forEachMaterial(obj, (material) => {
                material.transparent = true
                material.opacity = 0.25
            })
        })
        highlighted.current.clear()
    }

    useEffect(() => {
        const controls = new TransformControls(camera, gl.domElement)
        controls.setSpace(axisMode)
        controls.setMode(transformMode)
        transformRef.current = controls

        controls.setColors('#ff0000', '#00ff00', '#0000ff', '#FF5F1F')

        controls.showX = true
        controls.showY = true
        controls.showZ = true

        const internals = controls as unknown as TransformControlsInternals
        const helper = internals._gizmo.gizmo.translate.children

        helper.forEach((child) => {
            const geometryParams = (
                child as THREE.Mesh & {
                    geometry?: {
                        type?: string
                        paramters?: { radiusTop?: number }
                    }
                }
            ).geometry

            if (
                child.name === 'XY' ||
                child.name === 'XZ' ||
                child.name === 'YZ' ||
                child.name === 'XYZ' ||
                (geometryParams?.type === 'CylinderGeometry' &&
                    geometryParams.paramters?.radiusTop === 0.0075)
            ) {
                child.scale.set(0, 0, 0)
                forEachMaterial(child, (material) => {
                    material.visible = false
                })
                child.visible = false
                child.updateMatrixWorld(true)
            }
        })

        const handleDragStart = () => {
            isTransformDragging.current = true
        }
        const handleDragEnd = () => {
            isTransformDragging.current = false
        }
        const handleDraggingChanged = (e: { value: unknown }) => {
            isTransformDragging.current = Boolean(e.value)
        }

        controls.addEventListener('mouseDown', handleDragStart)
        controls.addEventListener('mouseUp', handleDragEnd)
        controls.addEventListener('dragging-changed', handleDraggingChanged)

        scene.add(controls.getHelper())

        const dummy = dummyTarget.current

        return () => {
            controls.removeEventListener('mouseDown', handleDragStart)
            controls.removeEventListener('mouseUp', handleDragEnd)
            controls.removeEventListener(
                'dragging-changed',
                handleDraggingChanged
            )

            scene.remove(controls.getHelper())
            controls.detach()
            controls.dispose()

            const childrenToRestore = [...dummy.children]
            childrenToRestore.forEach((child) => {
                child.updateMatrixWorld()
                child.applyMatrix4(dummy.matrixWorld)
                if (!scene.children.includes(child)) scene.add(child)
                dummy.remove(child)
            })

            if (scene.children.includes(dummy)) {
                scene.remove(dummy)
            }

            highlighted.current.clear()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const controls = transformRef.current
        if (!controls) return
        controls.setMode(transformMode)
        controls.setSpace(axisMode)
        hideGizmoPlanes(controls.getHelper())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transformMode, axisMode])

    useEffect(() => {
        const controls = transformRef.current
        if (!controls) return

        if (attachedGizmos) {
            controls.attach(dummyTarget.current)
        } else {
            controls.detach()
        }
    }, [attachedGizmos])

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType !== pointerType) return

            const target = event.target
            if (
                target instanceof HTMLElement &&
                target.localName === 'canvas' &&
                !isTransformDragging.current &&
                !attachedGizmos
            ) {
                resetHighlight()
                setDraggingSelection(true)
            }
        }

        const onPointerUp = () => {
            if (
                !draggingSelection ||
                isTransformDragging.current ||
                attachedGizmos
            ) {
                setDraggingSelection(false)
                return
            }
            setDraggingSelection(false)

            const selectedObjects = Array.from(highlighted.current)
            if (selectedObjects.length === 0) return

            const center = computeCenter(selectedObjects)
            selectedCenter.current.copy(center)
            dummyTarget.current.position.copy(center)

            if (!scene.children.includes(dummyTarget.current)) {
                scene.add(dummyTarget.current)
            }

            selectedObjects.forEach((obj) => {
                toLocalSpace(obj, dummyTarget.current)
                dummyTarget.current.add(obj)
                forEachMaterial(obj, (material) => {
                    material.transparent = true
                    material.opacity = 0.25
                })
            })

            invalidate()
            setAttachedGizmos(true)
        }

        window.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointerup', onPointerUp)
        return () => {
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointerup', onPointerUp)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draggingSelection, attachedGizmos])

    useFrame(() => {
        if (!draggingSelection || attachedGizmos) return

        raycaster.setFromCamera(pointer, camera)

        const objectsToTest = scene.children.filter(isGuideMesh)
        const intersects = raycaster.intersectObjects(objectsToTest, true)

        let hasNewHighlight = false

        intersects.forEach(({ object }) => {
            if (!highlighted.current.has(object)) {
                highlighted.current.add(object)
                forEachMaterial(object, (material) => {
                    material.transparent = true
                    material.opacity = 0.5
                })
                hasNewHighlight = true
            }
        })

        if (hasNewHighlight) invalidate()
    })

    return null
}

export default TransformGuide
