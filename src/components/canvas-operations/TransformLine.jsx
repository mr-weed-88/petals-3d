import React, { useRef, useState, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { toast } from 'react-toastify'
import { Zoom } from 'react-toastify'

import { saveGroupToIndexDB } from '../../db/storage'
import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'
import { Fade } from '../../config/objectsConfig'

const TransformLine = () => {
    const { camera, mouse, raycaster, scene, gl, invalidate } = useThree()
    const {
        copy,
        setCopy,
        axisMode,
        lineColor,
        pointerType,
        strokeColor,
        selectLines,
        strokeOpacity,
        transformMode,
        setSelectLines,
        mergeGeometries,
        setMergeGeometries,
        activeMaterialType,
    } = canvasDrawStore((state) => state)
    const { activeGroup, setActiveScene, setGroupData } = canvasRenderStore(
        (state) => state
    )

    const transformRef = useRef()
    const dummyTarget = useRef(new THREE.Group())
    const selectedCenter = useRef(new THREE.Vector3())
    const isTransformDragging = useRef(false)
    const highlighted = useRef(new Set())
    const isCopying = useRef(false)
    const isMerging = useRef(false)

    const [attachedGizmos, setAttachedGizmos] = useState(false)
    const [draggingSelection, setDraggingSelection] = useState(false)

    const tempMatrix = useMemo(() => new THREE.Matrix4(), [])
    const tempPosition = useMemo(() => new THREE.Vector3(), [])
    const tempQuaternion = useMemo(() => new THREE.Quaternion(), [])
    const tempScale = useMemo(() => new THREE.Vector3(), [])

    const toLocalSpace = (object, newParent) => {
        object.updateMatrixWorld(true)
        const objectWorldMatrix = object.matrixWorld

        newParent.updateMatrixWorld(true)
        const parentInverseMatrix = tempMatrix
            .copy(newParent.matrixWorld)
            .invert()

        const localMatrix = tempMatrix.multiplyMatrices(
            parentInverseMatrix,
            objectWorldMatrix
        )

        localMatrix.decompose(tempPosition, tempQuaternion, tempScale)

        object.position.copy(tempPosition)
        object.rotation.setFromQuaternion(tempQuaternion)
        object.scale.copy(tempScale)
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

        const onDragStart = () => {
            isTransformDragging.current = true
        }

        const onDragEnd = async () => {
            isTransformDragging.current = false
            await updateLineWorldPoints()
        }

        const onDraggingChanged = (e) => {
            isTransformDragging.current = e.value
        }

        controls.addEventListener('mouseDown', onDragStart)
        controls.addEventListener('mouseUp', onDragEnd)
        controls.addEventListener('dragging-changed', onDraggingChanged)

        return () => {
            controls.removeEventListener('mouseDown', onDragStart)
            controls.removeEventListener('mouseUp', onDragEnd)
            controls.removeEventListener('dragging-changed', onDraggingChanged)

            const helper = controls.getHelper()
            if (scene.children.includes(helper)) {
                scene.remove(helper)
            }
            controls.detach()
            controls.dispose()

            const dummy = dummyTarget.current
            if (!dummy) return

            const childrenToRestore = [...dummy.children]
            childrenToRestore.forEach((child) => {
                if (!scene.children.includes(child)) {
                    child.updateMatrixWorld(true)
                    child.applyMatrix4(dummy.matrixWorld)
                    dummy.remove(child)
                    scene.add(child)
                }
            })

            if (scene.children.includes(dummy)) {
                scene.remove(dummy)
            }

            highlighted.current.clear()
            gl.info.autoReset = false
            gl.info.reset()
        }
    }, [camera, gl, scene])

    useEffect(() => {
        if (transformRef.current) {
            transformRef.current.setMode(transformMode)

            const helper = transformRef.current.getHelper()
            const gizmoIndex =
                transformMode === 'translate'
                    ? 0
                    : transformMode === 'rotate'
                      ? 1
                      : 2

            if (helper.children[gizmoIndex]) {
                const gizmo = helper.children[gizmoIndex]
                gizmo.children.forEach((child) => {
                    if (
                        child.name &&
                        (child.name.includes('XY') ||
                            child.name.includes('YZ') ||
                            child.name.includes('XZ') ||
                            child.name.includes('XYZ') ||
                            child.name.includes('E'))
                    ) {
                        child.scale.set(0, 0, 0)
                        child.material.visible = false
                        child.visible = false
                        child.updateMatrixWorld(true)
                    }
                })
            }
        }
    }, [transformMode])

    useEffect(() => {
        const controls = transformRef.current
        if (!controls) return

        if (attachedGizmos && dummyTarget.current) {
            controls.attach(dummyTarget.current)
            const helper = controls.getHelper()
            if (!scene.children.includes(helper)) {
                scene.add(helper)
            }
        } else {
            controls.detach()
            const helper = controls.getHelper()
            if (scene.children.includes(helper)) {
                scene.remove(helper)
            }
        }
    }, [attachedGizmos, scene])

    useEffect(() => {
        if (transformRef.current) {
            transformRef.current.setMode(transformMode)
        }
    }, [transformMode])

    useEffect(() => {
        if (transformRef.current) {
            transformRef.current.setSpace(axisMode)
        }
    }, [axisMode])

    const resetDummyTarget = () => {
        const dummy = dummyTarget.current
        if (dummy) {
            dummy.children.forEach((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose()
                    }
                    if (child.material) {
                        const materials = Array.isArray(child.material)
                            ? child.material
                            : [child.material]
                        materials.forEach((mat) => {
                            mat.dispose?.()
                        })
                    }
                }
                dummy.remove(child)
            })
            if (scene.children.includes(dummy)) {
                scene.remove(dummy)
            }
        }
        dummyTarget.current = new THREE.Group()
    }

    const computeCenter = (objects) => {
        const box = new THREE.Box3()
        const center = new THREE.Vector3()

        if (objects.length === 0) return center

        objects.forEach((obj) => {
            obj.updateMatrixWorld(true)
            box.expandByObject(obj)
        })

        return box.getCenter(center)
    }

    useEffect(() => {
        const onPointerDownWindow = (event) => {
            if (event.pointerType === pointerType) {
                if (
                    selectLines &&
                    event.target.localName === 'canvas' &&
                    !isTransformDragging.current &&
                    !attachedGizmos
                ) {
                    setDraggingSelection(true)
                }
            }
        }

        const onPointerUpWindow = () => {
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

            selectedObjects.forEach((object) => {
                toLocalSpace(object, dummyTarget.current)
                dummyTarget.current.add(object)

                if (object.material) {
                    object.material.transparent = object.userData.opacity < 1
                    object.material.opacity = object.userData.opacity
                    object.material.needsUpdate = true
                }
            })

            invalidate()
            setAttachedGizmos(true)
        }

        window.addEventListener('pointerdown', onPointerDownWindow)
        window.addEventListener('pointerup', onPointerUpWindow)
        return () => {
            window.removeEventListener('pointerdown', onPointerDownWindow)
            window.removeEventListener('pointerup', onPointerUpWindow)
        }
    }, [draggingSelection, attachedGizmos, selectLines])

    useFrame(() => {
        if (!draggingSelection || attachedGizmos) return

        raycaster.setFromCamera(mouse, camera)
        const objectsToTest = scene.children.filter(
            (obj) =>
                obj.isMesh &&
                obj.userData?.group_id === activeGroup.uuid &&
                (obj.userData?.type === 'LINE' ||
                    obj.userData?.type === 'MERGED_LINE' ||
                    obj.userData?.type === 'LOFT_SURFACE' ||
                    obj.userData?.type === 'BEND_GUIDE_PLANE' ||
                    obj.userData?.type === 'OG_GUIDE_PLANE')
        )

        const intersects = raycaster.intersectObjects(objectsToTest, true)
        let hasNewHighlight = false

        intersects.forEach(({ object }) => {
            if (!highlighted.current.has(object)) {
                highlighted.current.add(object)
                hasNewHighlight = true

                if (object.material) {
                    object.material.transparent = true
                    object.material.opacity = 0.5
                    object.material.needsUpdate = true
                }
            }
        })

        if (hasNewHighlight) {
            invalidate()
        }
    })

    useEffect(() => {
        if (dummyTarget.current?.children.length > 0) {
            dummyTarget.current.children.forEach((obj) => {
                if (
                    obj.isMesh &&
                    obj.userData?.group_id === activeGroup.uuid &&
                    (obj.userData?.type === 'LINE' ||
                        obj.userData?.type === 'MERGED_LINE' ||
                        obj.userData?.type === 'LOFT_SURFACE')
                ) {
                    obj.userData.color = lineColor
                    if (obj.material) {
                        // material.color is a THREE.Color, so it has to be
                        // set through .set() rather than reassigned to a
                        // hex string.
                        obj.material.color.set(lineColor)
                        obj.material.needsUpdate = true
                    }
                }
            })

            if (highlighted.current.size >= 1) {
                setGroupData([...canvasRenderStore.getState().groupData])
                saveGroupToIndexDB(canvasRenderStore.getState().groupData)
            }

            invalidate()
        }
    }, [lineColor, selectLines, invalidate])

    useEffect(() => {
        if (dummyTarget.current && copy && !isCopying.current) {
            isCopying.current = true
            setAttachedGizmos(false)

            const originalObjects = [...dummyTarget.current.children].map(
                (child) => {
                    child.updateMatrixWorld(true)
                    child.applyMatrix4(dummyTarget.current.matrixWorld)
                    dummyTarget.current.remove(child)
                    scene.add(child)
                    return child
                }
            )

            if (originalObjects.length === 0) {
                setCopy(false)
                isCopying.current = false
                return
            }

            let clGroup = []
            const clones = originalObjects.map((original) => {
                const clone = original.clone()

                clone.geometry = original.geometry.clone()

                if (Array.isArray(original.material)) {
                    clone.material = original.material.map((mat) => {
                        const clonedMat = mat.clone()
                        if (mat.flatShading) {
                            clonedMat.flatShading = true
                            clonedMat.needsUpdate = true
                        }
                        return clonedMat
                    })
                } else if (original.material) {
                    const clonedMat = original.material.clone()
                    if (original.material.flatShading) {
                        clonedMat.flatShading = true
                        clonedMat.needsUpdate = true
                    }
                    clone.material = clonedMat
                }

                if (clone.geometry.attributes.normal) {
                    clone.geometry.attributes.normal.needsUpdate = true
                }
                if (clone.geometry.attributes.position) {
                    clone.geometry.attributes.position.needsUpdate = true
                }

                clone.userData = { ...original.userData }
                clone.userData.uuid = clone.uuid
                clGroup.push(clone.userData)
                return clone
            })

            const center = computeCenter(clones)
            selectedCenter.current.copy(center)
            dummyTarget.current.position.copy(center)

            clones.forEach((clone) => {
                toLocalSpace(clone, dummyTarget.current)
                dummyTarget.current.add(clone)
            })

            setAttachedGizmos(true)
            setCopy(false)
            isCopying.current = false
            setActiveScene(scene)

            activeGroup.objects.push(...clGroup)

            setGroupData([...canvasRenderStore.getState().groupData])

            saveGroupToIndexDB(canvasRenderStore.getState().groupData)

            toast.success(`${clones.length} curves copied!`, {
                position: 'top-center',
                autoClose: 1000,
                hideProgressBar: true,
                closeOnClick: false,
                pauseOnHover: false,
                draggable: false,
                progress: undefined,
                theme: 'light',
                transition: Fade,
            })
        }
    }, [copy, scene, selectLines, setAttachedGizmos, setCopy, setActiveScene])

    useEffect(() => {
        if (dummyTarget.current && mergeGeometries && !isMerging.current) {
            isMerging.current = true
            setAttachedGizmos(false)

            const objectsToMerge = [...dummyTarget.current.children]

            if (objectsToMerge.length === 0) {
                setMergeGeometries(false)
                isMerging.current = false
                return
            }

            let lines = []
            let geometries = []
            let allGeometriesValid = true

            for (const mesh of objectsToMerge) {
                mesh.updateMatrixWorld(true)

                const objData = mesh.userData
                if (
                    objData.type === 'LINE' &&
                    objData.group_id === activeGroup.uuid
                ) {
                    lines = [...lines, objData]
                    objData.merged = true
                }

                if (!(mesh instanceof THREE.Mesh) || !mesh.geometry) {
                    allGeometriesValid = false
                    continue
                }

                const clonedGeometry = mesh.geometry.clone()
                clonedGeometry.applyMatrix4(mesh.matrixWorld)
                geometries.push(clonedGeometry)

                mesh.parent.remove(mesh)
                mesh.geometry.dispose()
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((m) => m.dispose())
                } else if (mesh.material) {
                    mesh.material.dispose()
                }
            }

            if (!allGeometriesValid || geometries.length === 0) {
                resetDummyTarget()
                setMergeGeometries(false)
                isMerging.current = false
                return
            }

            const mergedGeometry = BufferGeometryUtils.mergeGeometries(
                geometries,
                false
            )

            if (!mergedGeometry.attributes.color) {
                const count = mergedGeometry.attributes.position.count
                const colors = new Float32Array(count * 4)

                const strokeColorObj = new THREE.Color(strokeColor)
                for (let i = 0; i < count; i++) {
                    colors[i * 4 + 0] = strokeColorObj.r
                    colors[i * 4 + 1] = strokeColorObj.g
                    colors[i * 4 + 2] = strokeColorObj.b
                    colors[i * 4 + 3] = strokeOpacity ?? 1.0
                }

                mergedGeometry.setAttribute(
                    'color',
                    new THREE.BufferAttribute(colors, 4)
                )
            }

            let material
            switch (activeMaterialType) {
                case 'flat':
                    material = new THREE.MeshBasicMaterial({
                        vertexColors: true,
                        wireframe: false,
                        transparent: strokeOpacity < 1,
                        side: THREE.DoubleSide,
                        forceSinglePass: true,
                        depthTest: true,
                        depthWrite: strokeOpacity >= 1,
                        blending: THREE.NormalBlending,
                    })
                    break

                case 'shaded':
                    material = new THREE.MeshStandardMaterial({
                        vertexColors: true,
                        wireframe: false,
                        transparent: strokeOpacity < 1,
                        side: THREE.DoubleSide,
                        forceSinglePass: true,
                        depthTest: true,
                        depthWrite: true,
                        blending: THREE.NoBlending,
                    })
                    break

                case 'glow':
                    material = new THREE.MeshStandardMaterial({
                        vertexColors: true,
                        wireframe: false,
                        transparent: false,
                        side: THREE.DoubleSide,
                        forceSinglePass: true,
                        depthTest: true,
                        depthWrite: true,
                        blending: THREE.NoBlending,
                        emissive: new THREE.Color(strokeColor),
                        emissiveIntensity: 1,
                    })
                    break

                default:
                    break
            }

            const combinedMesh = new THREE.Mesh(mergedGeometry, material)
            combinedMesh.geometry.toNonIndexed()
            combinedMesh.geometry.computeVertexNormals()
            combinedMesh.geometry.computeBoundingBox()
            combinedMesh.geometry.computeBoundingSphere()

            combinedMesh.userData = {
                type: 'MERGED_LINE',
                is_mirror: false,
                mirror_mode: 'NA',
                color: strokeColor,
                opacity: strokeOpacity,
                uuid: combinedMesh.uuid,
                group_id: activeGroup.uuid,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 },
            }

            scene.add(combinedMesh)

            resetDummyTarget()
            setAttachedGizmos(false)

            setMergeGeometries(false)
            isMerging.current = false
            setActiveScene(scene)
            setSelectLines(!selectLines)
        }
    }, [
        mergeGeometries,
        scene,
        setAttachedGizmos,
        setActiveScene,
        resetDummyTarget,
    ])

    const _wp = new THREE.Vector3()
    const _wq = new THREE.Quaternion()
    const _ws = new THREE.Vector3()

    const asVector3 = (p) => {
        if (p?.isVector3) return p
        if (Array.isArray(p)) return new THREE.Vector3().fromArray(p)
        if (p && typeof p === 'object' && 'x' in p && 'y' in p && 'z' in p) {
            return new THREE.Vector3(p.x, p.y, p.z)
        }
        throw new Error('Point is not convertible to Vector3')
    }

    const updateLineWorldPoints = () => {
        dummyTarget.current.children.forEach((lineObj) => {
            if (lineObj.isMesh && lineObj.userData.type === 'LINE') {
                lineObj.updateMatrixWorld(true)

                const localPoints = lineObj.userData.loft_points
                if (!localPoints?.length) return

                const worldPoints = localPoints.map((p) =>
                    asVector3(p).clone().applyMatrix4(lineObj.matrixWorld)
                )
                lineObj.userData.loft_points = worldPoints

                lineObj.getWorldPosition(_wp)
                lineObj.getWorldQuaternion(_wq)
                lineObj.getWorldScale(_ws)

                const lineUuid = lineObj.userData.uuid

                const targetLineData = activeGroup?.objects.find(
                    (obj) => obj.uuid === lineUuid
                )

                if (targetLineData) {
                    targetLineData.position = { x: _wp.x, y: _wp.y, z: _wp.z }
                    targetLineData.rotation = {
                        x: _wq.x,
                        y: _wq.y,
                        z: _wq.z,
                        w: _wq.w,
                    }
                    targetLineData.scale = { x: _ws.x, y: _ws.y, z: _ws.z }
                    targetLineData.loft_points = worldPoints
                }
            }
        })

        setGroupData([...canvasRenderStore.getState().groupData])

        saveGroupToIndexDB(canvasRenderStore.getState().groupData)
    }

    return null
}

export default TransformLine
