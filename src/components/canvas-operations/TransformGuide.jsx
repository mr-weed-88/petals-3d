import React, { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

import { guideObjectType } from '../../config/objectsConfig'
import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'

const TransformGuide = () => {
    const { camera, mouse, raycaster, scene, gl, invalidate } = useThree()
    const { axisMode, pointerType, transformMode } = canvasDrawStore(
        (state) => state
    )

    const transformRef = useRef()
    const dummyTarget = useRef(new THREE.Group())
    const selectedCenter = useRef(new THREE.Vector3())
    const isTransformDragging = useRef(false)
    const highlighted = useRef(new Set())

    const [attachedGizmos, setAttachedGizmos] = useState(false)
    const [draggingSelection, setDraggingSelection] = useState(false)

    const tempMatrix = useRef(new THREE.Matrix4())
    const tempPosition = useRef(new THREE.Vector3())
    const tempQuaternion = useRef(new THREE.Quaternion())
    const tempScale = useRef(new THREE.Vector3())

    const hideGizmoPlanes = (helper) => {
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
                child.name?.includes('XY') ||
                child.name?.includes('YZ') ||
                child.name?.includes('XZ') ||
                child.name?.includes('XYZ') ||
                child.name?.includes('E')
            ) {
                child.scale.set(0, 0, 0)
                child.material.visible = false
                child.visible = false
                child.updateMatrixWorld(true)
            }
        })
    }

    const toLocalSpace = (object, newParent) => {
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

    const computeCenter = (objects) => {
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
            if (obj.material) {
                obj.material.transparent = true
                obj.material.opacity = 0.25
            }
        })
        highlighted.current.clear()
    }

    useEffect(() => {
        const controls = new TransformControls(camera, gl.domElement)
        controls.setSpace(axisMode)
        controls.setMode(transformMode)
        transformRef.current = controls

        controls.setColors({
            x: '#ff0000',
            y: '#00ff00',
            z: '#0000ff',
            active: '#FF5F1F',
        })

        controls.showX = true
        controls.showY = true
        controls.showZ = true

        const helper = controls._gizmo.gizmo.translate.children

        helper.forEach((child) => {
            if (
                child.name == 'XY' ||
                child.name == 'XZ' ||
                child.name == 'YZ' ||
                child.name == 'XYZ' ||
                (child.geometry.type === 'CylinderGeometry' &&
                    child.geometry?.paramters?.radiusTop === 0.0075)
            ) {
                child.scale.set(0, 0, 0)
                child.material.visible = false
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
        const handleDraggingChanged = (e) => {
            isTransformDragging.current = e.value
        }

        controls.addEventListener('mouseDown', handleDragStart)
        controls.addEventListener('mouseUp', handleDragEnd)
        controls.addEventListener('dragging-changed', handleDraggingChanged)

        scene.add(controls.getHelper())

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

            const childrenToRestore = [...dummyTarget.current.children]
            childrenToRestore.forEach((child) => {
                if (child) {
                    child.updateMatrixWorld()
                    child.applyMatrix4(dummyTarget.current.matrixWorld)
                    if (!scene.children.includes(child)) scene.add(child)
                    dummyTarget.current.remove(child)
                }
            })
            if (scene.children.includes(dummyTarget.current)) {
                scene.remove(dummyTarget.current)
            }
            highlighted.current.clear()
        }
    }, [])

    useEffect(() => {
        const controls = transformRef.current
        if (!controls) return
        controls.setMode(transformMode)
        controls.setSpace(axisMode)
        hideGizmoPlanes(controls.getHelper())
    }, [transformMode, axisMode])

    useEffect(() => {
        const controls = transformRef.current
        if (!controls) return

        if (attachedGizmos && dummyTarget.current) {
            controls.attach(dummyTarget.current)
        } else {
            controls.detach()
        }
    }, [attachedGizmos])

    useEffect(() => {
        const onPointerDown = (event) => {
            if (event.pointerType === pointerType) {
                if (
                    event.target.localName === 'canvas' &&
                    !isTransformDragging.current &&
                    !attachedGizmos
                ) {
                    resetHighlight()
                    setDraggingSelection(true)
                }
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
                if (obj.material) {
                    obj.material.transparent = true
                    obj.material.opacity = 0.25
                }
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
    }, [draggingSelection, attachedGizmos])

    useFrame(() => {
        if (!draggingSelection || attachedGizmos) return

        raycaster.setFromCamera(mouse, camera)
        const objectsToTest = scene.children.filter(
            (obj) => obj.isMesh && guideObjectType.includes(obj.userData?.type)
        )

        const intersects = raycaster.intersectObjects(objectsToTest, true)
        let hasNewHighlight = false

        intersects.forEach(({ object }) => {
            if (!highlighted.current.has(object)) {
                highlighted.current.add(object)
                if (object.material) {
                    object.material.transparent = true
                    object.material.opacity = 0.5
                }
                hasNewHighlight = true
            }
        })

        if (hasNewHighlight) invalidate()
    })

    return null
}

export default TransformGuide
