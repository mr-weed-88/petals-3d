import React, { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { canvasDrawStore } from '../../hooks/useCanvasDrawStore'
import { canvasRenderStore } from '../../hooks/useRenderSceneStore'

import {
    smoothArray,
    smoothPoints,
    filterPoints,
    getMirroredPoint,
    getActiveMaterial,
    applyTensionToPoints,
    getActiveMirrorModes,
    getAdaptiveStrokWidth,
    generateCirclePointsWorld,
    getSnappedLinePointsInPlane,
    generateSemiCircleOpenArcWorld,
} from '../../helpers/drawHelper'

import { saveGroupToIndexDB } from '../../db/storage'

const DrawLine = () => {
    const { camera, scene, gl } = useThree()
    const planeRef = useRef()

    const holdTimerRef = useRef(null)
    const lastPointRef = useRef(null)
    const tensionModeRef = useRef(false)
    const originalMirrorDataRef = useRef({})
    const initialTensionYRef = useRef(0)
    const [, setTension] = useState(0.05)

    const originalPointsRef = useRef([])
    const originalPressuresRef = useRef([])
    const originalNormalsRef = useRef([])
    const originalStrokeWidthsRef = useRef([])
    const originalShapeDataRef = useRef({
        points: [],
        normals: [],
        center: null,
        radius: 0,
        startAngle: 0,
        endAngle: 0,
    })

    const pointsRef = useRef([])
    const pressuresRef = useRef([])
    const normalsRef = useRef([])
    const currentMeshRef = useRef([null, null, null, null])
    const startPointRef = useRef(null)
    const currentNormalRef = useRef(null)
    const isDrawingRef = useRef(false)
    const mirrorDataRef = useRef({})
    const mirrorMeshesRef = useRef({
        X: [null, null, null, null],
        Y: [null, null, null, null],
        Z: [null, null, null, null],
    })

    const cachedWorldMatrixRef = useRef(null)
    const cachedWorldMatrixInverseRef = useRef(null)

    const {
        mirror,
        penActive,
        strokeType,
        pointerType,
        strokeColor,
        strokeWidth,
        pressureMode,
        drawShapeType,
        strokeOpacity,
        activeMaterialType,
        strokeStablePercentage,
        dynamicDrawingPlaneMesh,
    } = canvasDrawStore((state) => state)

    const { activeGroup, groupData, setGroupData } = canvasRenderStore(
        (state) => state
    )

    const MAX_POINTS = 50000
    const HOLD_DURATION = 1000
    const HOLD_THRESHOLD = 0.02
    const DISTANCE_THRESHOLD = 0.01
    const TENSION_SENSITIVITY = 0.005
    const OPTIMIZATION_THRESHOLD = 0.05
    const SMOOTH_PERCENTAGE = strokeStablePercentage

    const isMirroring = mirror.x || mirror.y || mirror.z
    const activeMirrorModes = isMirroring ? getActiveMirrorModes(mirror) : []

    useEffect(() => {
        return () => {
            clearHoldTimer()
        }
    }, [])

    const getPlaneIntersection = useCallback(
        (event) => {
            if (!planeRef.current) return null

            const canvas = gl.domElement
            const rect = canvas.getBoundingClientRect()

            const mouse = new THREE.Vector2(
                ((event.clientX - rect.left) / rect.width) * 2 - 1,
                -((event.clientY - rect.top) / rect.height) * 2 + 1
            )

            const raycaster = new THREE.Raycaster()
            raycaster.setFromCamera(mouse, camera)

            const intersects = raycaster.intersectObject(planeRef.current)
            if (intersects.length > 0) {
                const intersection = intersects[0]
                const normal = intersection.face.normal
                    .clone()
                    .transformDirection(intersection.object.matrixWorld)
                    .normalize()
                return {
                    point: intersection.point.clone(),
                    normal,
                }
            }
            return null
        },
        [camera, gl]
    )

    const updateTensionAndLine = useCallback(
        (clientY) => {
            if (!tensionModeRef.current) return

            const deltaY = initialTensionYRef.current - clientY
            let newTension = 0.5 + deltaY * TENSION_SENSITIVITY
            newTension = Math.max(0, Math.min(1, newTension))
            setTension(newTension)

            if (drawShapeType === 'free_hand') {
                if (originalPointsRef.current.length === 0) return

                const tensionedPoints = applyTensionToPoints(
                    originalPointsRef.current,
                    newTension
                )

                if (
                    currentMeshRef.current &&
                    originalStrokeWidthsRef.current.length > 0
                ) {
                    for (let i = 0; i <= 3; i++) {
                        updateLineWithTensionAndStoredWidths(
                            i,
                            currentMeshRef.current[i],
                            tensionedPoints,
                            originalNormalsRef.current,
                            originalStrokeWidthsRef.current
                        )

                        currentMeshRef.current[i].userData.points =
                            tensionedPoints.map((p) => p.clone())
                        currentMeshRef.current[i].userData.normals =
                            originalNormalsRef.current.map((n) => n.clone())
                        currentMeshRef.current[i].userData.pressures = [
                            ...originalPressuresRef.current,
                        ]
                    }
                }

                activeMirrorModes.forEach((mode) => {
                    for (let i = 0; i <= 3; i++) {
                        const originalMirrorData =
                            originalMirrorDataRef.current[mode]
                        if (
                            originalMirrorData &&
                            mirrorMeshesRef.current[mode][i]
                        ) {
                            const tensionedMirrorPoints = applyTensionToPoints(
                                originalMirrorData.points,
                                newTension
                            )
                            updateLineWithTensionAndStoredWidths(
                                i,
                                mirrorMeshesRef.current[mode][i],
                                tensionedMirrorPoints,
                                originalMirrorData.normals,
                                originalMirrorData.strokeWidths
                            )

                            mirrorMeshesRef.current[mode][i].userData.points =
                                tensionedMirrorPoints.map((p) => p.clone())
                            mirrorMeshesRef.current[mode][i].userData.normals =
                                originalMirrorData.normals.map((n) => n.clone())
                            mirrorMeshesRef.current[mode][
                                i
                            ].userData.pressures = [
                                ...originalMirrorData.pressures,
                            ]
                        }
                    }
                })
            }
        },
        [applyTensionToPoints, isMirroring, getActiveMirrorModes]
    )

    function createInitialLineMesh(mirror, stripId) {
        const maxVertices = MAX_POINTS * 4
        const positions = new Float32Array(maxVertices * 3)
        const meshNormals = new Float32Array(maxVertices * 3)
        const indices = new Uint32Array(MAX_POINTS * 24)

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(positions, 3)
        )
        geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(meshNormals, 3)
        )
        geometry.setIndex(new THREE.BufferAttribute(indices, 1))
        geometry.setDrawRange(0, 0)

        let material = getActiveMaterial(
            activeMaterialType,
            strokeOpacity,
            strokeColor
        )

        const mesh = new THREE.Mesh(geometry, material)
        if (mirror && (stripId === 1 || stripId === 2 || stripId === 3)) {
            mesh.visible = false
        }
        scene.add(mesh)
        return mesh
    }

    const startHoldTimer = (point) => {
        if (drawShapeType !== 'free_hand') {
            return
        }

        lastPointRef.current = point.clone()

        holdTimerRef.current = setTimeout(() => {
            tensionModeRef.current = true

            if (drawShapeType === 'free_hand') {
                if (pointsRef.current.length > 0) {
                    const smoothed = smoothPoints(
                        [...pointsRef.current],
                        SMOOTH_PERCENTAGE
                    )
                    const smoothedPressures = smoothArray(
                        [...pressuresRef.current],
                        SMOOTH_PERCENTAGE
                    )

                    originalPointsRef.current = smoothed.map((p) => p.clone())
                    originalPressuresRef.current = [...smoothedPressures]
                    originalNormalsRef.current = [...normalsRef.current]

                    originalStrokeWidthsRef.current = []
                    for (let i = 0; i < smoothed.length; i++) {
                        let taperFactor = 1
                        if (strokeType === 'taper') {
                            const t = i / (smoothed.length - 1)
                            const taperAmount = 1.0
                            taperFactor =
                                1 -
                                taperAmount +
                                taperAmount * Math.sin(t * Math.PI)
                        }
                        const effectivePressure =
                            smoothedPressures[i] * taperFactor
                        const { w, h } = getAdaptiveStrokWidth(
                            strokeType,
                            effectivePressure,
                            strokeWidth
                        )
                        originalStrokeWidthsRef.current.push({ w, h })
                    }

                    originalMirrorDataRef.current = {}

                    activeMirrorModes.forEach((mode) => {
                        for (let i = 0; i <= 3; i++) {
                            const mirrorData = mirrorDataRef.current[mode]
                            if (mirrorData && mirrorData.points.length > 0) {
                                const smoothedMirrorPoints = smoothPoints(
                                    [...mirrorData.points],
                                    SMOOTH_PERCENTAGE
                                )
                                const smoothedMirrorPressures = smoothArray(
                                    [...mirrorData.pressures],
                                    SMOOTH_PERCENTAGE
                                )

                                originalMirrorDataRef.current[mode] = {
                                    points: smoothedMirrorPoints.map((p) =>
                                        p.clone()
                                    ),
                                    pressures: [...smoothedMirrorPressures],
                                    normals: [...mirrorData.normals],
                                    strokeWidths: [],
                                }

                                for (
                                    let i = 0;
                                    i < smoothedMirrorPoints.length;
                                    i++
                                ) {
                                    let taperFactor = 1
                                    if (strokeType === 'taper') {
                                        const t =
                                            i /
                                            (smoothedMirrorPoints.length - 1)
                                        const taperAmount = 1.0
                                        taperFactor =
                                            1 -
                                            taperAmount +
                                            taperAmount * Math.sin(t * Math.PI)
                                    }
                                    const effectivePressure =
                                        smoothedMirrorPressures[i] * taperFactor
                                    const { w, h } = getAdaptiveStrokWidth(
                                        strokeType,
                                        effectivePressure,
                                        strokeWidth
                                    )
                                    originalMirrorDataRef.current[
                                        mode
                                    ].strokeWidths.push({ w, h })
                                }
                            }
                        }
                    })
                }
            }
        }, HOLD_DURATION)
    }

    const clearHoldTimer = () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
    }

    function updateLineWithTensionAndStoredWidths(
        stripId,
        mesh,
        tensionedPoints,
        normals,
        storedWidths
    ) {
        if (tensionedPoints.length < 2) return

        const geometry = mesh.geometry

        let pts = tensionedPoints
        let finalNormals = normals
        let finalWidths = storedWidths

        if (pts.length >= 2) {
            const filteredPts = [pts[0]]
            const filteredNormals = [normals[0]]
            const filteredWidths = [storedWidths[0]]

            let lastKeptIndex = 0

            for (let i = 1; i < pts.length; i++) {
                if (
                    pts[i].distanceTo(pts[lastKeptIndex]) >=
                    OPTIMIZATION_THRESHOLD
                ) {
                    filteredPts.push(pts[i])
                    filteredNormals.push(normals[i])
                    filteredWidths.push(storedWidths[i])
                    lastKeptIndex = i
                }
            }

            if (lastKeptIndex !== pts.length - 1) {
                filteredPts.push(pts[pts.length - 1])
                filteredNormals.push(normals[normals.length - 1])
                filteredWidths.push(storedWidths[storedWidths.length - 1])
            }

            pts = filteredPts
            finalNormals = filteredNormals
            finalWidths = filteredWidths
        }

        if (pts.length < 2) return

        const positions = []
        const meshNormals = []
        const indices = []

        const tangents = []
        for (let i = 0; i < pts.length - 1; i++) {
            tangents.push(
                new THREE.Vector3().subVectors(pts[i + 1], pts[i]).normalize()
            )
        }

        if (pts.length === 2 && tangents.length === 0) {
            tangents.push(
                new THREE.Vector3().subVectors(pts[1], pts[0]).normalize()
            )
        }

        const transportedRights = []
        let right = new THREE.Vector3()
            .crossVectors(
                finalNormals[0],
                tangents[0] || new THREE.Vector3(1, 0, 0)
            )
            .normalize()

        if (right.lengthSq() < 1e-6) {
            right.set(0, 1, 0)
            if (tangents.length > 0 && Math.abs(tangents[0].dot(right)) > 0.99)
                right.set(1, 0, 0)
            if (tangents.length > 0)
                right.crossVectors(finalNormals[0], tangents[0]).normalize()
            else
                right
                    .crossVectors(finalNormals[0], new THREE.Vector3(1, 0, 0))
                    .normalize()
        }
        transportedRights.push(right.clone())

        for (let i = 1; i < tangents.length; i++) {
            const prevT = tangents[i - 1]
            const currT = tangents[i]
            const axis = new THREE.Vector3().crossVectors(prevT, currT)
            const angle = Math.acos(Math.max(-1, Math.min(1, prevT.dot(currT))))

            if (axis.lengthSq() < 1e-6 || angle === 0) {
                transportedRights.push(transportedRights[i - 1].clone())
            } else {
                const q = new THREE.Quaternion().setFromAxisAngle(
                    axis.normalize(),
                    angle
                )
                transportedRights.push(
                    transportedRights[i - 1]
                        .clone()
                        .applyQuaternion(q)
                        .normalize()
                )
            }
        }

        for (let i = 0; i < pts.length; i++) {
            const curr = pts[i]
            const tangent =
                i === pts.length - 1
                    ? tangents[i - 1]
                    : tangents[i] || tangents[0]
            const rightVec =
                transportedRights[i] ||
                transportedRights[transportedRights.length - 1]
            const up = new THREE.Vector3()
                .crossVectors(tangent, rightVec)
                .normalize()

            const widthIndex = Math.min(i, finalWidths.length - 1)
            const halfW = finalWidths[widthIndex].w
            const halfH = finalWidths[widthIndex].h

            const tl = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, -halfW)
                .addScaledVector(up, halfH)
            const tr = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, halfW)
                .addScaledVector(up, halfH)
            const br = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, halfW)
                .addScaledVector(up, -halfH)
            const bl = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, -halfW)
                .addScaledVector(up, -halfH)

            const normal = finalNormals[i].clone()
            const baseIdx = positions.length / 3

            ;[tl, tr, br, bl, tl, tr, br, bl].forEach((v) => {
                positions.push(v.x, v.y, v.z)
                meshNormals.push(normal.x, normal.y, normal.z)
            })

            if (i > 0) {
                const prevBase = baseIdx - 4
                if (stripId === 0) {
                    indices.push(prevBase, prevBase + 1, baseIdx + 1)
                    indices.push(prevBase, baseIdx + 1, baseIdx)
                }
                if (stripId === 1) {
                    indices.push(prevBase + 1, prevBase + 2, baseIdx + 2)
                    indices.push(prevBase + 1, baseIdx + 2, baseIdx + 1)
                }
                if (stripId === 2) {
                    indices.push(prevBase + 2, prevBase + 3, baseIdx + 3)
                    indices.push(prevBase + 2, baseIdx + 3, baseIdx + 2)
                }
                if (stripId === 3) {
                    indices.push(prevBase + 3, prevBase, baseIdx)
                    indices.push(prevBase + 3, baseIdx, baseIdx + 3)
                }

                /* To generate all strips at once no seprate strips creates weird harsh edges and
                     is typically more visible as opacity is less than 1 thats
                     why we create seprate strip and then merge on pointerup
                     
                    const prevBase = baseIdx - 4
                    indices.push(prevBase, prevBase + 1, baseIdx + 1)
                    indices.push(prevBase, baseIdx + 1, baseIdx)
                    indices.push(prevBase + 1, prevBase + 2, baseIdx + 2)
                    indices.push(prevBase + 1, baseIdx + 2, baseIdx + 1)
                    indices.push(prevBase + 2, prevBase + 3, baseIdx + 3)
                    indices.push(prevBase + 2, baseIdx + 3, baseIdx + 2)
                    indices.push(prevBase + 3, prevBase, baseIdx)
                    indices.push(prevBase + 3, baseIdx, baseIdx + 3)
                */
            }
        }

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
        )
        geometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute(meshNormals, 3)
        )

        geometry.setIndex(indices)

        geometry.attributes.position.needsUpdate = true
        geometry.attributes.normal.needsUpdate = true
        geometry.index.needsUpdate = true
        geometry.setDrawRange(0, indices.length)

        if (mesh.material) {
            mesh.material.needsUpdate = true
        }
    }

    function updateLine(stripId, mesh, rawPts, pressuresArr, normalsArr) {
        if (rawPts.length < 2) return

        const geometry = mesh.geometry

        let pts = rawPts
        let pressures = pressuresArr
        let finalNormals = normalsArr

        if (drawShapeType === 'free_hand' && !tensionModeRef.current) {
            pts = smoothPoints(rawPts, SMOOTH_PERCENTAGE)
            pressures = smoothArray(pressuresArr, SMOOTH_PERCENTAGE)
            const filteredResult = filterPoints(
                pts,
                pressures,
                normalsArr,
                OPTIMIZATION_THRESHOLD
            )
            pts = filteredResult.filteredPts
            pressures = filteredResult.filteredPressures
            finalNormals = filteredResult.filteredNormals
        } else if (drawShapeType === 'straight') {
            const filteredResult = filterPoints(
                pts,
                pressures,
                normalsArr,
                OPTIMIZATION_THRESHOLD
            )
            pts = filteredResult.filteredPts
            pressures = filteredResult.filteredPressures
            finalNormals = filteredResult.filteredNormals
        }

        if (pts.length < 2) return

        const positions = []
        const meshNormals = []
        const indices = []
        const colors = []

        const baseColor = new THREE.Color(strokeColor)

        const tangents = []
        for (let i = 0; i < pts.length - 1; i++) {
            tangents.push(
                new THREE.Vector3().subVectors(pts[i + 1], pts[i]).normalize()
            )
        }

        if (pts.length === 2 && tangents.length === 0) {
            tangents.push(
                new THREE.Vector3().subVectors(pts[1], pts[0]).normalize()
            )
        }

        const transportedRights = []
        let right = new THREE.Vector3()
            .crossVectors(
                finalNormals[0],
                tangents[0] || new THREE.Vector3(1, 0, 0)
            )
            .normalize()

        if (right.lengthSq() < 1e-6) {
            right.set(0, 1, 0)
            if (tangents.length > 0 && Math.abs(tangents[0].dot(right)) > 0.99)
                right.set(1, 0, 0)
            if (tangents.length > 0)
                right.crossVectors(finalNormals[0], tangents[0]).normalize()
            else
                right
                    .crossVectors(finalNormals[0], new THREE.Vector3(1, 0, 0))
                    .normalize()
        }
        transportedRights.push(right.clone())

        for (let i = 1; i < tangents.length; i++) {
            const prevT = tangents[i - 1]
            const currT = tangents[i]
            const axis = new THREE.Vector3().crossVectors(prevT, currT)
            const angle = Math.acos(Math.max(-1, Math.min(1, prevT.dot(currT))))

            if (axis.lengthSq() < 1e-6 || angle === 0) {
                transportedRights.push(transportedRights[i - 1].clone())
            } else {
                const q = new THREE.Quaternion().setFromAxisAngle(
                    axis.normalize(),
                    angle
                )
                transportedRights.push(
                    transportedRights[i - 1]
                        .clone()
                        .applyQuaternion(q)
                        .normalize()
                )
            }
        }

        for (let i = 0; i < pts.length; i++) {
            const curr = pts[i]
            const tangent =
                i === pts.length - 1
                    ? tangents[i - 1]
                    : tangents[i] || tangents[0]
            const rightVec =
                transportedRights[i] ||
                transportedRights[transportedRights.length - 1]
            const up = new THREE.Vector3()
                .crossVectors(tangent, rightVec)
                .normalize()

            let taperFactor

            if (strokeType === 'taper') {
                const t = i / (pts.length - 1)
                const taperAmount = 1.0
                taperFactor =
                    1 - taperAmount + taperAmount * Math.sin(t * Math.PI)
            }

            const effectivePressure =
                pressures[i] * (strokeType === 'taper' ? taperFactor : 1)

            let { w, h } = getAdaptiveStrokWidth(
                strokeType,
                effectivePressure,
                strokeWidth
            )

            const halfW = w
            const halfH = h

            const tl = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, -halfW)
                .addScaledVector(up, halfH)
            const tr = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, halfW)
                .addScaledVector(up, halfH)
            const br = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, halfW)
                .addScaledVector(up, -halfH)
            const bl = new THREE.Vector3()
                .copy(curr)
                .addScaledVector(rightVec, -halfW)
                .addScaledVector(up, -halfH)

            const normal = finalNormals[i].clone()
            const baseIdx = positions.length / 3

            ;[tl, tr, br, bl, tl, tr, br, bl].forEach((v) => {
                positions.push(v.x, v.y, v.z)
                meshNormals.push(normal.x, normal.y, normal.z)
                colors.push(
                    baseColor.r,
                    baseColor.g,
                    baseColor.b,
                    strokeOpacity
                )
            })

            if (i > 0) {
                const prevBase = baseIdx - 4
                if (stripId === 0) {
                    indices.push(prevBase, prevBase + 1, baseIdx + 1)
                    indices.push(prevBase, baseIdx + 1, baseIdx)
                }
                if (stripId === 1) {
                    indices.push(prevBase + 1, prevBase + 2, baseIdx + 2)
                    indices.push(prevBase + 1, baseIdx + 2, baseIdx + 1)
                }
                if (stripId === 2) {
                    indices.push(prevBase + 2, prevBase + 3, baseIdx + 3)
                    indices.push(prevBase + 2, baseIdx + 3, baseIdx + 2)
                }
                if (stripId === 3) {
                    indices.push(prevBase + 3, prevBase, baseIdx)
                    indices.push(prevBase + 3, baseIdx, baseIdx + 3)
                }
            }
        }

        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(positions, 3)
        )
        geometry.setAttribute(
            'normal',
            new THREE.Float32BufferAttribute(meshNormals, 3)
        )
        geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colors, 4)
        )

        geometry.setIndex(indices)

        geometry.attributes.position.needsUpdate = true
        geometry.attributes.normal.needsUpdate = true
        geometry.index.needsUpdate = true
        geometry.setDrawRange(0, indices.length)
    }

    function startDrawing(event) {
        if (event.pointerType === pointerType) {
            if (!planeRef.current) return

            isDrawingRef.current = true
            tensionModeRef.current = false
            setTension(0.5)
            originalPointsRef.current = []
            originalPressuresRef.current = []
            originalNormalsRef.current = []
            originalStrokeWidthsRef.current = []
            originalMirrorDataRef.current = {}
            pointsRef.current = []
            pressuresRef.current = []
            normalsRef.current = []
            mirrorDataRef.current = {}

            cachedWorldMatrixRef.current = null
            cachedWorldMatrixInverseRef.current = null

            const intersection = getPlaneIntersection(event)
            if (!intersection) return
            const { point, normal } = intersection

            startPointRef.current = point.clone()
            currentNormalRef.current = normal.clone()
            for (let i = 0; i <= 3; i++) {
                currentMeshRef.current[i] = createInitialLineMesh({
                    is_mirror: false,
                    i,
                })
            }

            activeMirrorModes.forEach((mode) => {
                for (let i = 0; i <= 3; i++) {
                    mirrorMeshesRef.current[mode][i] = createInitialLineMesh({
                        is_mirror: true,
                        i,
                    })
                    mirrorDataRef.current[mode] = {
                        points: [],
                        pressures: [],
                        normals: [],
                    }
                }
            })

            const pressure = pressureMode ? event.pressure : 1.0

            pointsRef.current.push(startPointRef.current.clone())
            pressuresRef.current.push(pressure)
            normalsRef.current.push(currentNormalRef.current)

            activeMirrorModes.forEach((mode) => {
                const { mirroredPoint, mirroredNormal } = getMirroredPoint(
                    cachedWorldMatrixInverseRef,
                    cachedWorldMatrixRef,
                    startPointRef.current,
                    currentNormalRef.current,
                    mode,
                    planeRef.current
                )
                mirrorDataRef.current[mode].points.push(mirroredPoint.clone())
                mirrorDataRef.current[mode].pressures.push(pressure)
                mirrorDataRef.current[mode].normals.push(mirroredNormal)
            })

            startHoldTimer(startPointRef.current)
            initialTensionYRef.current = event.clientY

            if (drawShapeType === 'free_hand') {
                const secondPoint = new THREE.Vector3()
                    .copy(startPointRef.current)
                    .addScalar(0.001)
                pointsRef.current.push(secondPoint)
                pressuresRef.current.push(pressure)
                normalsRef.current.push(currentNormalRef.current)

                activeMirrorModes.forEach((mode) => {
                    const {
                        mirroredPoint: mirrorSecondPoint,
                        mirroredNormal: mirrorSecondNormal,
                    } = getMirroredPoint(
                        cachedWorldMatrixInverseRef,
                        cachedWorldMatrixRef,
                        secondPoint,
                        currentNormalRef.current,
                        mode,
                        planeRef.current
                    )
                    mirrorDataRef.current[mode].points.push(mirrorSecondPoint)
                    mirrorDataRef.current[mode].pressures.push(pressure)
                    mirrorDataRef.current[mode].normals.push(mirrorSecondNormal)
                })
            }

            for (let i = 0; i <= 3; i++) {
                updateLine(
                    i,
                    currentMeshRef.current[i],
                    pointsRef.current,
                    pressuresRef.current,
                    normalsRef.current
                )
            }

            activeMirrorModes.forEach((mode) => {
                const data = mirrorDataRef.current[mode]
                for (let i = 0; i <= 3; i++) {
                    updateLine(
                        i,
                        mirrorMeshesRef.current[mode][i],
                        data.points,
                        data.pressures,
                        data.normals
                    )
                }
            })
        }
    }

    function continueDrawing(event) {
        if (event.pointerType === pointerType) {
            if (!isDrawingRef.current || !planeRef.current) return

            if (tensionModeRef.current) {
                updateTensionAndLine(event.clientY)
                return
            }

            const intersection = getPlaneIntersection(event)
            if (!intersection) return

            const { point, normal } = intersection

            if (
                drawShapeType === 'free_hand' &&
                point &&
                lastPointRef.current
            ) {
                const distance = point.distanceTo(lastPointRef.current)
                if (distance > HOLD_THRESHOLD) {
                    clearHoldTimer()
                    startHoldTimer(point)
                    initialTensionYRef.current = event.clientY
                }
            }

            const pressure = pressureMode ? event.pressure : 1.0

            if (drawShapeType === 'free_hand') {
                let newPoint = point.clone()

                const last = pointsRef.current[pointsRef.current.length - 1]
                if (newPoint.distanceTo(last) < DISTANCE_THRESHOLD) return

                pointsRef.current.push(newPoint)
                pressuresRef.current.push(pressure)
                normalsRef.current.push(normal)

                activeMirrorModes.forEach((mode) => {
                    const { mirroredPoint, mirroredNormal } = getMirroredPoint(
                        cachedWorldMatrixInverseRef,
                        cachedWorldMatrixRef,
                        newPoint,
                        normal,
                        mode,
                        planeRef.current
                    )
                    mirrorDataRef.current[mode].points.push(mirroredPoint)
                    mirrorDataRef.current[mode].pressures.push(pressure)
                    mirrorDataRef.current[mode].normals.push(mirroredNormal)
                })

                if (pointsRef.current.length > MAX_POINTS) {
                    pointsRef.current.shift()
                    pressuresRef.current.shift()
                    normalsRef.current.shift()
                    activeMirrorModes.forEach((mode) => {
                        mirrorDataRef.current[mode].points.shift()
                        mirrorDataRef.current[mode].pressures.shift()
                        mirrorDataRef.current[mode].normals.shift()
                    })
                }

                for (let i = 0; i <= 3; i++) {
                    updateLine(
                        i,
                        currentMeshRef.current[i],
                        pointsRef.current,
                        pressuresRef.current,
                        normalsRef.current
                    )
                }

                activeMirrorModes.forEach((mode) => {
                    const data = mirrorDataRef.current[mode]
                    for (let i = 0; i <= 3; i++) {
                        updateLine(
                            i,
                            mirrorMeshesRef.current[mode][i],
                            data.points,
                            data.pressures,
                            data.normals
                        )
                    }
                })
            } else if (drawShapeType === 'straight') {
                if (!startPointRef.current || !currentNormalRef.current) return

                const { snappedEnd } = getSnappedLinePointsInPlane({
                    startPoint: startPointRef.current,
                    currentPoint: point,
                    normal,
                    camera,
                    snapAngle: 1,
                    pointDensity: 0.05,
                })

                pointsRef.current.length = 0
                pressuresRef.current.length = 0
                normalsRef.current.length = 0

                if (strokeType === 'taper') {
                    const positions = [
                        0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
                    ]

                    positions.forEach((t) => {
                        const point = new THREE.Vector3().lerpVectors(
                            startPointRef.current,
                            snappedEnd,
                            t
                        )
                        pointsRef.current.push(point)
                        pressuresRef.current.push(pressure)

                        const interpolatedNormal = new THREE.Vector3()
                            .lerpVectors(currentNormalRef.current, normal, t)
                            .normalize()
                        normalsRef.current.push(interpolatedNormal)
                    })
                } else {
                    const middlePoint = new THREE.Vector3().lerpVectors(
                        startPointRef.current,
                        snappedEnd,
                        0.5
                    )

                    pointsRef.current.push(startPointRef.current.clone())
                    pointsRef.current.push(middlePoint)
                    pointsRef.current.push(snappedEnd.clone())

                    pressuresRef.current.push(pressure)
                    pressuresRef.current.push(pressure)
                    pressuresRef.current.push(pressure)

                    normalsRef.current.push(currentNormalRef.current.clone())
                    normalsRef.current.push(normal.clone())
                    normalsRef.current.push(normal.clone())
                }

                for (let i = 0; i <= 3; i++) {
                    updateLine(
                        i,
                        currentMeshRef.current[i],
                        pointsRef.current,
                        pressuresRef.current,
                        normalsRef.current
                    )
                }

                activeMirrorModes.forEach((mode) => {
                    const {
                        mirroredPoint: mirroredStart,
                        mirroredNormal: mirroredNormal1,
                    } = getMirroredPoint(
                        cachedWorldMatrixInverseRef,
                        cachedWorldMatrixRef,
                        startPointRef.current,
                        currentNormalRef.current,
                        mode,
                        planeRef.current
                    )

                    const {
                        mirroredPoint: mirroredEnd,
                        mirroredNormal: mirroredNormal2,
                    } = getMirroredPoint(
                        cachedWorldMatrixInverseRef,
                        cachedWorldMatrixRef,
                        snappedEnd,
                        normal,
                        mode,
                        planeRef.current
                    )

                    mirrorDataRef.current[mode].points = []
                    mirrorDataRef.current[mode].pressures = []
                    mirrorDataRef.current[mode].normals = []

                    if (strokeType === 'taper') {
                        const positions = [0, 0.25, 0.5, 0.75, 1.0]

                        positions.forEach((t) => {
                            const mirroredPoint =
                                new THREE.Vector3().lerpVectors(
                                    mirroredStart,
                                    mirroredEnd,
                                    t
                                )
                            const mirroredNormal = new THREE.Vector3()
                                .lerpVectors(
                                    mirroredNormal1,
                                    mirroredNormal2,
                                    t
                                )
                                .normalize()

                            mirrorDataRef.current[mode].points.push(
                                mirroredPoint
                            )
                            mirrorDataRef.current[mode].pressures.push(pressure)
                            mirrorDataRef.current[mode].normals.push(
                                mirroredNormal
                            )
                        })
                    } else {
                        const mirroredMiddle = new THREE.Vector3().lerpVectors(
                            mirroredStart,
                            mirroredEnd,
                            0.5
                        )

                        mirrorDataRef.current[mode].points = [
                            mirroredStart,
                            mirroredMiddle,
                            mirroredEnd,
                        ]
                        mirrorDataRef.current[mode].pressures = [
                            pressure,
                            pressure,
                            pressure,
                        ]
                        mirrorDataRef.current[mode].normals = [
                            mirroredNormal1,
                            mirroredNormal2,
                            mirroredNormal2,
                        ]
                    }

                    for (let i = 0; i <= 3; i++) {
                        updateLine(
                            i,
                            mirrorMeshesRef.current[mode][i],
                            mirrorDataRef.current[mode].points,
                            mirrorDataRef.current[mode].pressures,
                            mirrorDataRef.current[mode].normals
                        )
                    }
                })
            } else if (drawShapeType === 'circle') {
                if (!startPointRef.current || !currentNormalRef.current) return

                const radius = startPointRef.current.distanceTo(point)
                const { circlePoints, circleNormals } =
                    generateCirclePointsWorld(
                        startPointRef.current,
                        currentNormalRef.current,
                        radius
                    )
                const circlePressures = Array(circlePoints.length).fill(
                    pressure
                )

                for (let i = 0; i <= 3; i++) {
                    updateLine(
                        i,
                        currentMeshRef.current[i],
                        circlePoints,
                        circlePressures,
                        circleNormals
                    )
                }

                activeMirrorModes.forEach((mode) => {
                    const {
                        mirroredPoint: mirrorCenter,
                        mirroredNormal: mirrorNormal,
                    } = getMirroredPoint(
                        cachedWorldMatrixInverseRef,
                        cachedWorldMatrixRef,
                        startPointRef.current,
                        currentNormalRef.current,
                        mode,
                        planeRef.current
                    )

                    const {
                        circlePoints: mirrorCirclePoints,
                        circleNormals: mirrorCircleNormals,
                    } = generateCirclePointsWorld(
                        mirrorCenter,
                        mirrorNormal,
                        radius
                    )
                    const mirrorCirclePressures = Array(
                        mirrorCirclePoints.length
                    ).fill(pressure)

                    for (let i = 0; i <= 3; i++) {
                        updateLine(
                            i,
                            mirrorMeshesRef.current[mode][i],
                            mirrorCirclePoints,
                            mirrorCirclePressures,
                            mirrorCircleNormals
                        )
                    }
                    mirrorDataRef.current[mode] = {
                        points: mirrorCirclePoints,
                        pressures: mirrorCirclePressures,
                        normals: mirrorCircleNormals,
                    }
                })
            } else if (drawShapeType === 'arc') {
                if (!startPointRef.current || !currentNormalRef.current) return

                const radius = startPointRef.current.distanceTo(point)
                const { arcPoints, arcNormals } =
                    generateSemiCircleOpenArcWorld(
                        startPointRef.current,
                        currentNormalRef.current,
                        radius
                    )
                const arcPressures = Array(arcPoints.length).fill(pressure)

                for (let i = 0; i <= 3; i++) {
                    updateLine(
                        i,
                        currentMeshRef.current[i],
                        arcPoints,
                        arcPressures,
                        arcNormals
                    )
                }

                activeMirrorModes.forEach((mode) => {
                    const {
                        mirroredPoint: mirrorCenter,
                        mirroredNormal: mirrorNormal,
                    } = getMirroredPoint(
                        cachedWorldMatrixInverseRef,
                        cachedWorldMatrixRef,
                        startPointRef.current,
                        currentNormalRef.current,
                        mode,
                        planeRef.current
                    )

                    const {
                        arcPoints: mirrorArcPoints,
                        arcNormals: mirrorArcNormals,
                    } = generateSemiCircleOpenArcWorld(
                        mirrorCenter,
                        mirrorNormal,
                        radius
                    )
                    const mirrorArcPressures = Array(
                        mirrorArcPoints.length
                    ).fill(pressure)

                    for (let i = 0; i <= 3; i++) {
                        updateLine(
                            i,
                            mirrorMeshesRef.current[mode][i],
                            mirrorArcPoints,
                            mirrorArcPressures,
                            mirrorArcNormals
                        )
                    }

                    mirrorDataRef.current[mode] = {
                        points: mirrorArcPoints,
                        pressures: mirrorArcPressures,
                        normals: mirrorArcNormals,
                    }
                })
            }
        }
    }

    async function stopDrawing(event) {
        clearHoldTimer()

        if (!isDrawingRef.current || !planeRef.current) return

        if (tensionModeRef.current) {
            tensionModeRef.current = false

            if (currentMeshRef.current?.userData?.points) {
                pointsRef.current = currentMeshRef.current.userData.points.map(
                    (p) => p.clone()
                )
                normalsRef.current =
                    currentMeshRef.current.userData.normals.map((n) =>
                        n.clone()
                    )
                pressuresRef.current = [
                    ...currentMeshRef.current.userData.pressures,
                ]
            }

            activeMirrorModes.forEach((mode) => {
                for (let i = 0; i <= 3; i++) {
                    if (mirrorMeshesRef.current[mode][i]?.userData?.points) {
                        mirrorDataRef.current[mode] = {
                            points: mirrorMeshesRef.current[mode][
                                i
                            ].userData.points.map((p) => p.clone()),
                            pressures: [
                                ...mirrorMeshesRef.current[mode][i].userData
                                    .pressures,
                            ],
                            normals: mirrorMeshesRef.current[mode][
                                i
                            ].userData.normals.map((n) => n.clone()),
                        }
                    }
                }
            })

            originalPointsRef.current = []
            originalPressuresRef.current = []
            originalNormalsRef.current = []
            originalStrokeWidthsRef.current = []
            originalMirrorDataRef.current = {}
            originalShapeDataRef.current = {
                points: [],
                normals: [],
                center: null,
                radius: 0,
                startAngle: 0,
                endAngle: 0,
            }
        }

        let ogLineData
        let mirrorLineData = []

        if (drawShapeType === 'free_hand' || drawShapeType === 'straight') {
            if (
                !currentMeshRef.current ||
                !startPointRef.current ||
                pointsRef.current.length < 2
            ) {
                if (currentMeshRef.current) scene.remove(currentMeshRef.current)
                Object.values(mirrorMeshesRef.current).forEach((mesh) =>
                    scene.remove(mesh)
                )
                currentMeshRef.current = [null, null, null, null]
                mirrorMeshesRef.current = {
                    X: [null, null, null, null],
                    Y: [null, null, null, null],
                    Z: [null, null, null, null],
                }
                startPointRef.current = null
                return
            }

            let ogGeometries = []
            for (let i = 0; i <= 3; i++) {
                const oldMesh = currentMeshRef.current[i]

                oldMesh.updateMatrixWorld(true)

                const g = oldMesh.geometry.clone()
                ogGeometries.push(g)

                scene.remove(oldMesh)
                oldMesh.geometry.dispose()
                if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach((m) => m.dispose())
                } else {
                    oldMesh.material?.dispose()
                }
            }

            const mergedGeo = BufferGeometryUtils.mergeGeometries(
                ogGeometries,
                false
            )

            const finalGeo = mergedGeo.toNonIndexed()
            mergedGeo.dispose()

            finalGeo.computeVertexNormals()
            finalGeo.computeBoundingBox()
            finalGeo.computeBoundingSphere()

            const material = getActiveMaterial(
                activeMaterialType,
                strokeOpacity,
                strokeColor
            )

            const combinedMesh = new THREE.Mesh(finalGeo, material)

            combinedMesh.position.set(0, 0, 0)
            combinedMesh.quaternion.identity()
            combinedMesh.scale.set(1, 1, 1)

            combinedMesh.updateMatrixWorld(true)

            ogLineData = {
                type: 'LINE',
                is_deleted: false,
                is_mirror: false,
                mirror_mode: 'NA',
                points: pointsRef.current,
                normals: normalsRef.current,
                pressures: pressuresRef.current,
                loft_points: pointsRef.current,
                optimization_threshold: OPTIMIZATION_THRESHOLD,
                smooth_percentage: SMOOTH_PERCENTAGE,
                color: strokeColor,
                width: strokeWidth,
                opacity: strokeOpacity,
                stroke_type: strokeType,
                shape_type: drawShapeType,
                uuid: combinedMesh.uuid,
                group_id: activeGroup.uuid,
                material_type: activeMaterialType,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0, w: 1 },
                scale: { x: 1, y: 1, z: 1 },
                visible: combinedMesh.visible,
            }
            combinedMesh.userData = ogLineData
            scene.add(combinedMesh)

            activeMirrorModes.forEach((mode) => {
                let ogMirrorGeometries = []
                let mirrorMaterial = getActiveMaterial(
                    activeMaterialType,
                    strokeOpacity,
                    strokeColor
                )

                for (let i = 0; i <= 3; i++) {
                    const mirrorOldMesh = mirrorMeshesRef.current[mode][i]
                    let geometry = mirrorOldMesh.geometry
                    geometry.computeBoundingBox()
                    geometry.computeBoundingSphere()
                    ogMirrorGeometries.push(geometry)

                    scene.remove(mirrorOldMesh)
                    mirrorOldMesh.geometry.dispose()

                    if (Array.isArray(mirrorOldMesh.material)) {
                        mirrorOldMesh.material.forEach((m) => m.dispose())
                    } else if (mirrorOldMesh.material) {
                        mirrorOldMesh.material.dispose()
                    }
                }

                const mergedMirrorGeo =
                    BufferGeometryUtils.mergeGeometries(ogMirrorGeometries)

                const combinedMirrorMesh = new THREE.Mesh(
                    mergedMirrorGeo,
                    mirrorMaterial
                )
                combinedMirrorMesh.geometry.computeVertexNormals()
                combinedMirrorMesh.geometry.computeBoundingBox()
                combinedMirrorMesh.geometry.computeBoundingSphere()

                let mData = {
                    type: 'LINE',
                    is_deleted: false,
                    is_mirror: true,
                    mirror_mode: 'NA',
                    points: mirrorDataRef.current[mode].points,
                    normals: mirrorDataRef.current[mode].normals,
                    pressures: mirrorDataRef.current[mode].pressures,
                    loft_points: mirrorDataRef.current[mode].points,
                    optimization_threshold: OPTIMIZATION_THRESHOLD,
                    smooth_percentage: SMOOTH_PERCENTAGE,
                    color: strokeColor,
                    width: strokeWidth,
                    opacity: strokeOpacity,
                    stroke_type: strokeType,
                    shape_type: drawShapeType,
                    uuid: combinedMirrorMesh.uuid,
                    group_id: activeGroup.uuid,
                    material_type: activeMaterialType,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                    scale: { x: 1, y: 1, z: 1 },
                    visible: combinedMesh.visible,
                }
                mirrorLineData.push(mData)
                combinedMirrorMesh.userData = mData
                scene.add(combinedMirrorMesh)
            })
        } else if (drawShapeType === 'circle') {
            const intersection = getPlaneIntersection(event)
            const lastPoint =
                intersection?.point ||
                pointsRef.current[pointsRef.current.length - 1]
            const radius = startPointRef.current.distanceTo(lastPoint)

            const { circlePoints, circleNormals } = generateCirclePointsWorld(
                startPointRef.current,
                currentNormalRef.current,
                radius
            )
            const finalPressures = Array(circlePoints.length).fill(
                pressuresRef.current[0] || 1.0
            )

            let ogGeometries = []
            for (let i = 0; i <= 3; i++) {
                const oldMesh = currentMeshRef.current[i]

                oldMesh.updateMatrixWorld(true)

                const g = oldMesh.geometry.clone()

                ogGeometries.push(g)

                scene.remove(oldMesh)
                oldMesh.geometry.dispose()
                if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach((m) => m.dispose())
                } else {
                    oldMesh.material?.dispose()
                }
            }

            const mergedGeo = BufferGeometryUtils.mergeGeometries(
                ogGeometries,
                false
            )

            const finalGeo = mergedGeo.toNonIndexed()
            mergedGeo.dispose()

            finalGeo.computeVertexNormals()
            finalGeo.computeBoundingBox()
            finalGeo.computeBoundingSphere()

            const material = getActiveMaterial(
                activeMaterialType,
                strokeOpacity,
                strokeColor
            )

            const combinedMesh = new THREE.Mesh(finalGeo, material)

            combinedMesh.position.set(0, 0, 0)
            combinedMesh.quaternion.identity()
            combinedMesh.scale.set(1, 1, 1)

            combinedMesh.updateMatrixWorld(true)

            ogLineData = {
                type: 'LINE',
                is_deleted: false,
                is_mirror: false,
                mirror_mode: 'NA',
                points: circlePoints,
                normals: circleNormals,
                pressures: finalPressures,
                loft_points: circlePoints,
                optimization_threshold: OPTIMIZATION_THRESHOLD,
                smooth_percentage: SMOOTH_PERCENTAGE,
                color: strokeColor,
                width: strokeWidth,
                opacity: strokeOpacity,
                stroke_type: strokeType,
                shape_type: drawShapeType,
                uuid: combinedMesh.uuid,
                group_id: activeGroup.uuid,
                material_type: activeMaterialType,
                position: {
                    x: combinedMesh.position.x,
                    y: combinedMesh.position.y,
                    z: combinedMesh.position.z,
                },
                rotation: {
                    x: combinedMesh.quaternion.x,
                    y: combinedMesh.quaternion.y,
                    z: combinedMesh.quaternion.z,
                    w: combinedMesh.quaternion.w,
                },
                scale: {
                    x: combinedMesh.scale.x,
                    y: combinedMesh.scale.y,
                    z: combinedMesh.scale.z,
                },
                visible: combinedMesh.visible,
            }

            combinedMesh.userData = ogLineData
            scene.add(combinedMesh)

            activeMirrorModes.forEach((mode) => {
                let ogMirrorGeometries = []
                let mirrorMaterial = getActiveMaterial(
                    activeMaterialType,
                    strokeOpacity,
                    strokeColor
                )

                for (let i = 0; i <= 3; i++) {
                    const mirrorOldMesh = mirrorMeshesRef.current[mode][i]
                    let geometry = mirrorOldMesh.geometry
                    geometry.computeBoundingBox()
                    geometry.computeBoundingSphere()
                    ogMirrorGeometries.push(geometry)

                    scene.remove(mirrorOldMesh)
                    mirrorOldMesh.geometry.dispose()

                    if (Array.isArray(mirrorOldMesh.material)) {
                        mirrorOldMesh.material.forEach((m) => m.dispose())
                    } else if (mirrorOldMesh.material) {
                        mirrorOldMesh.material.dispose()
                    }
                }

                const mergedMirrorGeo =
                    BufferGeometryUtils.mergeGeometries(ogMirrorGeometries)

                const combinedMirrorMesh = new THREE.Mesh(
                    mergedMirrorGeo,
                    mirrorMaterial
                )
                combinedMirrorMesh.geometry.computeVertexNormals()
                combinedMirrorMesh.geometry.computeBoundingBox()
                combinedMirrorMesh.geometry.computeBoundingSphere()

                let mData = {
                    type: 'LINE',
                    is_deleted: false,
                    is_mirror: true,
                    mirror_mode: 'NA',
                    points: mirrorDataRef.current[mode].points,
                    normals: mirrorDataRef.current[mode].normals,
                    pressures: mirrorDataRef.current[mode].pressures,
                    loft_points: mirrorDataRef.current[mode].points,
                    optimization_threshold: OPTIMIZATION_THRESHOLD,
                    smooth_percentage: SMOOTH_PERCENTAGE,
                    color: strokeColor,
                    width: strokeWidth,
                    opacity: strokeOpacity,
                    stroke_type: strokeType,
                    shape_type: drawShapeType,
                    uuid: combinedMirrorMesh.uuid,
                    group_id: activeGroup.uuid,
                    material_type: activeMaterialType,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                    scale: { x: 1, y: 1, z: 1 },
                    visible: combinedMesh.visible,
                    matrix: Array.from(combinedMirrorMesh.matrix.elements),
                }
                mirrorLineData.push(mData)
                combinedMirrorMesh.userData = mData
                scene.add(combinedMirrorMesh)
            })
        } else if (drawShapeType === 'arc') {
            const intersection = getPlaneIntersection(event)
            const lastPoint =
                intersection?.point ||
                pointsRef.current[pointsRef.current.length - 1]
            const radius = startPointRef.current.distanceTo(lastPoint)

            const { arcPoints, arcNormals } = generateSemiCircleOpenArcWorld(
                startPointRef.current,
                currentNormalRef.current,
                radius
            )
            const arcFinalPressures = Array(arcPoints.length).fill(
                pressuresRef.current[0] || 1.0
            )

            let ogGeometries = []

            for (let i = 0; i <= 3; i++) {
                const oldMesh = currentMeshRef.current[i]

                oldMesh.updateMatrixWorld(true)

                const g = oldMesh.geometry.clone()
                ogGeometries.push(g)

                scene.remove(oldMesh)
                oldMesh.geometry.dispose()
                if (Array.isArray(oldMesh.material)) {
                    oldMesh.material.forEach((m) => m.dispose())
                } else {
                    oldMesh.material?.dispose()
                }
            }

            const mergedGeo = BufferGeometryUtils.mergeGeometries(
                ogGeometries,
                false
            )

            const finalGeo = mergedGeo.toNonIndexed()
            mergedGeo.dispose()

            finalGeo.computeVertexNormals()
            finalGeo.computeBoundingBox()
            finalGeo.computeBoundingSphere()

            const material = getActiveMaterial(
                activeMaterialType,
                strokeOpacity,
                strokeColor
            )

            const combinedMesh = new THREE.Mesh(finalGeo, material)

            combinedMesh.position.set(0, 0, 0)
            combinedMesh.quaternion.identity()
            combinedMesh.scale.set(1, 1, 1)

            combinedMesh.updateMatrixWorld(true)

            ogLineData = {
                type: 'LINE',
                is_deleted: false,
                is_mirror: false,
                mirror_mode: 'NA',
                points: arcPoints,
                normals: arcNormals,
                pressures: arcFinalPressures,
                loft_points: arcPoints,
                optimization_threshold: OPTIMIZATION_THRESHOLD,
                smooth_percentage: SMOOTH_PERCENTAGE,
                color: strokeColor,
                width: strokeWidth,
                opacity: strokeOpacity,
                stroke_type: strokeType,
                shape_type: drawShapeType,
                uuid: combinedMesh.uuid,
                group_id: activeGroup.uuid,
                material_type: activeMaterialType,
                position: {
                    x: combinedMesh.position.x,
                    y: combinedMesh.position.y,
                    z: combinedMesh.position.z,
                },
                rotation: {
                    x: combinedMesh.quaternion.x,
                    y: combinedMesh.quaternion.y,
                    z: combinedMesh.quaternion.z,
                    w: combinedMesh.quaternion.w,
                },
                scale: {
                    x: combinedMesh.scale.x,
                    y: combinedMesh.scale.y,
                    z: combinedMesh.scale.z,
                },
                visible: combinedMesh.visible,
            }
            combinedMesh.userData = ogLineData
            scene.add(combinedMesh)

            activeMirrorModes.forEach((mode) => {
                let ogMirrorGeometries = []
                let mirrorMaterial = getActiveMaterial(
                    activeMaterialType,
                    strokeOpacity,
                    strokeColor
                )
                for (let i = 0; i <= 3; i++) {
                    const mirrorOldMesh = mirrorMeshesRef.current[mode][i]
                    let geometry = mirrorOldMesh.geometry
                    geometry.computeBoundingBox()
                    geometry.computeBoundingSphere()
                    ogMirrorGeometries.push(geometry)

                    scene.remove(mirrorOldMesh)
                    mirrorOldMesh.geometry.dispose()

                    if (Array.isArray(mirrorOldMesh.material)) {
                        mirrorOldMesh.material.forEach((m) => m.dispose())
                    } else if (mirrorOldMesh.material) {
                        mirrorOldMesh.material.dispose()
                    }
                }

                const mergedMirrorGeo =
                    BufferGeometryUtils.mergeGeometries(ogMirrorGeometries)

                const combinedMirrorMesh = new THREE.Mesh(
                    mergedMirrorGeo,
                    mirrorMaterial
                )
                combinedMirrorMesh.geometry.computeVertexNormals()
                combinedMirrorMesh.geometry.computeBoundingBox()
                combinedMirrorMesh.geometry.computeBoundingSphere()

                let mData = {
                    type: 'LINE',
                    is_deleted: false,
                    is_mirror: true,
                    mirror_mode: 'NA',
                    points: mirrorDataRef.current[mode].points,
                    normals: mirrorDataRef.current[mode].normals,
                    pressures: mirrorDataRef.current[mode].pressures,
                    loft_points: mirrorDataRef.current[mode].points,
                    optimization_threshold: OPTIMIZATION_THRESHOLD,
                    smooth_percentage: SMOOTH_PERCENTAGE,
                    color: strokeColor,
                    width: strokeWidth,
                    opacity: strokeOpacity,
                    stroke_type: strokeType,
                    shape_type: drawShapeType,
                    uuid: combinedMirrorMesh.uuid,
                    group_id: activeGroup.uuid,
                    material_type: activeMaterialType,
                    position: { x: 0, y: 0, z: 0 },
                    rotation: { x: 0, y: 0, z: 0, w: 1 },
                    scale: { x: 1, y: 1, z: 1 },
                    visible: combinedMesh.visible,
                }
                mirrorLineData.push(mData)
                combinedMirrorMesh.userData = mData
                scene.add(combinedMirrorMesh)
            })
        }

        currentMeshRef.current = [null, null, null, null]
        mirrorMeshesRef.current = {
            X: [null, null, null, null],
            Y: [null, null, null, null],
            Z: [null, null, null, null],
        }
        mirrorDataRef.current = {}
        startPointRef.current = null
        currentNormalRef.current = null
        isDrawingRef.current = false

        if (activeGroup) {
            activeGroup.objects.push(ogLineData)
            activeGroup.objects.push(...mirrorLineData)
        }
        setGroupData([...groupData])

        await saveGroupToIndexDB(canvasRenderStore.getState().groupData)
    }

    return (
        <>
            {dynamicDrawingPlaneMesh && (
                <primitive
                    object={dynamicDrawingPlaneMesh}
                    ref={planeRef}
                    onPointerDown={penActive && startDrawing}
                    onPointerMove={penActive && continueDrawing}
                    onPointerUp={penActive && stopDrawing}
                    onPointerOut={penActive && stopDrawing}
                />
            )}
        </>
    )
}

export default DrawLine
